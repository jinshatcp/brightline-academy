package server

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/mjamal5/learn/internal/auth"
	"github.com/mjamal5/learn/internal/models"
	"github.com/mjamal5/learn/internal/repository"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ScheduleHandler handles schedule-related endpoints.
type ScheduleHandler struct {
	authService  *auth.Service
	scheduleRepo *repository.ScheduleRepository
	batchRepo    *repository.BatchRepository
	userRepo     *repository.UserRepository
}

// NewScheduleHandler creates a new ScheduleHandler.
func NewScheduleHandler(authService *auth.Service, scheduleRepo *repository.ScheduleRepository, batchRepo *repository.BatchRepository, userRepo *repository.UserRepository) *ScheduleHandler {
	return &ScheduleHandler{
		authService:  authService,
		scheduleRepo: scheduleRepo,
		batchRepo:    batchRepo,
		userRepo:     userRepo,
	}
}

// ListSchedules returns scheduled classes based on user role.
func (h *ScheduleHandler) ListSchedules(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	token := extractToken(r)
	user, err := h.authService.GetUserFromToken(r.Context(), token)
	if err != nil {
		sendJSONError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Parse date range from query params
	fromStr := r.URL.Query().Get("from")
	toStr := r.URL.Query().Get("to")

	var fromDate, toDate time.Time
	if fromStr != "" {
		fromDate, _ = time.Parse("2006-01-02", fromStr)
	} else {
		fromDate = time.Now().AddDate(0, 0, -7) // Default: 7 days ago
	}
	if toStr != "" {
		toDate, _ = time.Parse("2006-01-02", toStr)
		toDate = toDate.Add(24*time.Hour - time.Second) // End of day
	} else {
		toDate = time.Now().AddDate(0, 1, 0) // Default: 1 month from now
	}

	var schedules []models.ScheduledClass

	switch user.Role {
	case models.RoleAdmin:
		// Admin sees all schedules - get all batches first
		batches, _ := h.batchRepo.FindAll(r.Context())
		batchIDs := make([]string, len(batches))
		for i, b := range batches {
			batchIDs[i] = b.ID.Hex()
		}
		schedules, err = h.scheduleRepo.FindByBatches(r.Context(), batchIDs, fromDate, toDate)

	case models.RolePresenter:
		schedules, err = h.scheduleRepo.FindByPresenter(r.Context(), user.ID.Hex(), fromDate, toDate)

	case models.RoleStudent:
		// Get batches the student is in
		batches, _ := h.batchRepo.FindByStudent(r.Context(), user.ID.Hex())
		batchIDs := make([]string, len(batches))
		for i, b := range batches {
			batchIDs[i] = b.ID.Hex()
		}
		schedules, err = h.scheduleRepo.FindByBatches(r.Context(), batchIDs, fromDate, toDate)
	}

	if err != nil {
		sendJSONError(w, "Failed to fetch schedules", http.StatusInternalServerError)
		return
	}

	// Enrich response with batch and presenter names
	response := make([]models.ScheduledClassResponse, len(schedules))
	for i, s := range schedules {
		resp := s.ToResponse()
		if batch, err := h.batchRepo.FindByID(r.Context(), s.BatchID.Hex()); err == nil {
			resp.BatchName = batch.Name
		}
		if presenter, err := h.userRepo.FindByID(r.Context(), s.PresenterID.Hex()); err == nil {
			resp.PresenterName = presenter.Name
		}
		response[i] = resp
	}

	sendJSON(w, response, http.StatusOK)
}

// CreateSchedule creates a new scheduled class.
func (h *ScheduleHandler) CreateSchedule(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	token := extractToken(r)
	user, err := h.authService.GetUserFromToken(r.Context(), token)
	if err != nil {
		sendJSONError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if user.Role != models.RoleAdmin && user.Role != models.RolePresenter {
		sendJSONError(w, "Only admins and presenters can schedule classes", http.StatusForbidden)
		return
	}

	var req struct {
		Title       string `json:"title"`
		Description string `json:"description"`
		BatchID     string `json:"batchId"`
		StartTime   string `json:"startTime"` // ISO 8601 format
		EndTime     string `json:"endTime"`   // ISO 8601 format
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendJSONError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Title == "" || req.BatchID == "" || req.StartTime == "" || req.EndTime == "" {
		sendJSONError(w, "Title, batch ID, start time, and end time are required", http.StatusBadRequest)
		return
	}

	startTime, err := time.Parse(time.RFC3339, req.StartTime)
	if err != nil {
		sendJSONError(w, "Invalid start time format", http.StatusBadRequest)
		return
	}

	endTime, err := time.Parse(time.RFC3339, req.EndTime)
	if err != nil {
		sendJSONError(w, "Invalid end time format", http.StatusBadRequest)
		return
	}

	if endTime.Before(startTime) {
		sendJSONError(w, "End time must be after start time", http.StatusBadRequest)
		return
	}

	// Verify batch exists
	batch, err := h.batchRepo.FindByID(r.Context(), req.BatchID)
	if err != nil {
		sendJSONError(w, "Batch not found", http.StatusBadRequest)
		return
	}

	// For presenters, verify they own the batch
	if user.Role == models.RolePresenter && batch.PresenterID.Hex() != user.ID.Hex() {
		sendJSONError(w, "You can only schedule classes for your own batches", http.StatusForbidden)
		return
	}

	batchObjID, _ := primitive.ObjectIDFromHex(req.BatchID)

	schedule := &models.ScheduledClass{
		Title:       req.Title,
		Description: req.Description,
		BatchID:     batchObjID,
		PresenterID: batch.PresenterID,
		StartTime:   startTime,
		EndTime:     endTime,
	}

	if err := h.scheduleRepo.Create(r.Context(), schedule); err != nil {
		sendJSONError(w, "Failed to create schedule", http.StatusInternalServerError)
		return
	}

	resp := schedule.ToResponse()
	resp.BatchName = batch.Name
	if presenter, err := h.userRepo.FindByID(r.Context(), batch.PresenterID.Hex()); err == nil {
		resp.PresenterName = presenter.Name
	}

	sendJSON(w, resp, http.StatusCreated)
}

// GetSchedule returns a single scheduled class.
func (h *ScheduleHandler) GetSchedule(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract schedule ID from URL: /api/schedules/{id}
	path := strings.TrimPrefix(r.URL.Path, "/api/schedules/")
	scheduleID := strings.Split(path, "/")[0]

	schedule, err := h.scheduleRepo.FindByID(r.Context(), scheduleID)
	if err != nil {
		sendJSONError(w, "Schedule not found", http.StatusNotFound)
		return
	}

	resp := schedule.ToResponse()
	if batch, err := h.batchRepo.FindByID(r.Context(), schedule.BatchID.Hex()); err == nil {
		resp.BatchName = batch.Name
	}
	if presenter, err := h.userRepo.FindByID(r.Context(), schedule.PresenterID.Hex()); err == nil {
		resp.PresenterName = presenter.Name
	}

	sendJSON(w, resp, http.StatusOK)
}

// StartClass starts a scheduled class (creates room).
func (h *ScheduleHandler) StartClass(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	token := extractToken(r)
	user, err := h.authService.GetUserFromToken(r.Context(), token)
	if err != nil {
		sendJSONError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Extract schedule ID from URL: /api/schedules/{id}/start
	path := strings.TrimPrefix(r.URL.Path, "/api/schedules/")
	parts := strings.Split(path, "/")
	scheduleID := parts[0]

	schedule, err := h.scheduleRepo.FindByID(r.Context(), scheduleID)
	if err != nil {
		sendJSONError(w, "Schedule not found", http.StatusNotFound)
		return
	}

	// Verify presenter
	if user.Role != models.RoleAdmin && schedule.PresenterID.Hex() != user.ID.Hex() {
		sendJSONError(w, "Only the assigned presenter can start this class", http.StatusForbidden)
		return
	}

	// Generate room ID
	roomID := strings.ToUpper(primitive.NewObjectID().Hex()[:8])

	// Update schedule status
	if err := h.scheduleRepo.UpdateStatus(r.Context(), scheduleID, models.ClassStatusLive, roomID); err != nil {
		sendJSONError(w, "Failed to start class", http.StatusInternalServerError)
		return
	}

	sendJSON(w, map[string]string{
		"message": "Class started",
		"roomId":  roomID,
	}, http.StatusOK)
}

// EndClass ends a live class.
func (h *ScheduleHandler) EndClass(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	token := extractToken(r)
	user, err := h.authService.GetUserFromToken(r.Context(), token)
	if err != nil {
		sendJSONError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Extract schedule ID from URL: /api/schedules/{id}/end
	path := strings.TrimPrefix(r.URL.Path, "/api/schedules/")
	parts := strings.Split(path, "/")
	scheduleID := parts[0]

	schedule, err := h.scheduleRepo.FindByID(r.Context(), scheduleID)
	if err != nil {
		sendJSONError(w, "Schedule not found", http.StatusNotFound)
		return
	}

	// Verify presenter
	if user.Role != models.RoleAdmin && schedule.PresenterID.Hex() != user.ID.Hex() {
		sendJSONError(w, "Only the assigned presenter can end this class", http.StatusForbidden)
		return
	}

	if err := h.scheduleRepo.UpdateStatus(r.Context(), scheduleID, models.ClassStatusCompleted, schedule.RoomID); err != nil {
		sendJSONError(w, "Failed to end class", http.StatusInternalServerError)
		return
	}

	sendJSON(w, map[string]string{"message": "Class ended"}, http.StatusOK)
}

// JoinClass allows a student to join a scheduled class.
func (h *ScheduleHandler) JoinClass(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	token := extractToken(r)
	user, err := h.authService.GetUserFromToken(r.Context(), token)
	if err != nil {
		sendJSONError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Extract schedule ID from URL: /api/schedules/{id}/join
	path := strings.TrimPrefix(r.URL.Path, "/api/schedules/")
	parts := strings.Split(path, "/")
	scheduleID := parts[0]

	schedule, err := h.scheduleRepo.FindByID(r.Context(), scheduleID)
	if err != nil {
		sendJSONError(w, "Schedule not found", http.StatusNotFound)
		return
	}

	// Check if class is live
	if schedule.Status != models.ClassStatusLive {
		sendJSONError(w, "Class is not live yet", http.StatusBadRequest)
		return
	}

	// Check if user is in the batch (unless admin)
	if user.Role != models.RoleAdmin {
		batch, err := h.batchRepo.FindByID(r.Context(), schedule.BatchID.Hex())
		if err != nil {
			sendJSONError(w, "Batch not found", http.StatusInternalServerError)
			return
		}

		if user.Role == models.RoleStudent && !batch.HasStudent(user.ID.Hex()) {
			sendJSONError(w, "You are not enrolled in this class", http.StatusForbidden)
			return
		}
	}

	sendJSON(w, map[string]interface{}{
		"message":     "Join approved",
		"roomId":      schedule.RoomID,
		"isPresenter": user.Role == models.RolePresenter && schedule.PresenterID.Hex() == user.ID.Hex(),
	}, http.StatusOK)
}

// DeleteSchedule deletes a scheduled class.
func (h *ScheduleHandler) DeleteSchedule(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	token := extractToken(r)
	user, err := h.authService.GetUserFromToken(r.Context(), token)
	if err != nil {
		sendJSONError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Extract schedule ID from URL
	path := strings.TrimPrefix(r.URL.Path, "/api/schedules/")
	scheduleID := strings.TrimSuffix(path, "/")

	schedule, err := h.scheduleRepo.FindByID(r.Context(), scheduleID)
	if err != nil {
		sendJSONError(w, "Schedule not found", http.StatusNotFound)
		return
	}

	// Verify ownership
	if user.Role != models.RoleAdmin && schedule.PresenterID.Hex() != user.ID.Hex() {
		sendJSONError(w, "You can only delete your own schedules", http.StatusForbidden)
		return
	}

	if err := h.scheduleRepo.Delete(r.Context(), scheduleID); err != nil {
		sendJSONError(w, "Failed to delete schedule", http.StatusInternalServerError)
		return
	}

	sendJSON(w, map[string]string{"message": "Schedule deleted"}, http.StatusOK)
}

// CancelSchedule cancels a scheduled class.
func (h *ScheduleHandler) CancelSchedule(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	token := extractToken(r)
	user, err := h.authService.GetUserFromToken(r.Context(), token)
	if err != nil {
		sendJSONError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Extract schedule ID from URL: /api/schedules/{id}/cancel
	path := strings.TrimPrefix(r.URL.Path, "/api/schedules/")
	parts := strings.Split(path, "/")
	scheduleID := parts[0]

	schedule, err := h.scheduleRepo.FindByID(r.Context(), scheduleID)
	if err != nil {
		sendJSONError(w, "Schedule not found", http.StatusNotFound)
		return
	}

	// Verify ownership - admin or presenter can cancel
	if user.Role != models.RoleAdmin && schedule.PresenterID.Hex() != user.ID.Hex() {
		sendJSONError(w, "Only admin or the assigned presenter can cancel this class", http.StatusForbidden)
		return
	}

	// Can't cancel completed classes
	if schedule.Status == models.ClassStatusCompleted {
		sendJSONError(w, "Cannot cancel a completed class", http.StatusBadRequest)
		return
	}

	// Can't cancel already cancelled classes
	if schedule.Status == models.ClassStatusCancelled {
		sendJSONError(w, "Class is already cancelled", http.StatusBadRequest)
		return
	}

	if err := h.scheduleRepo.UpdateStatus(r.Context(), scheduleID, models.ClassStatusCancelled, schedule.RoomID); err != nil {
		sendJSONError(w, "Failed to cancel class", http.StatusInternalServerError)
		return
	}

	sendJSON(w, map[string]string{"message": "Class cancelled"}, http.StatusOK)
}

// UpdateSchedule updates a scheduled class.
func (h *ScheduleHandler) UpdateSchedule(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	token := extractToken(r)
	user, err := h.authService.GetUserFromToken(r.Context(), token)
	if err != nil {
		sendJSONError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Extract schedule ID from URL: /api/schedules/{id}
	path := strings.TrimPrefix(r.URL.Path, "/api/schedules/")
	scheduleID := strings.Split(path, "/")[0]

	schedule, err := h.scheduleRepo.FindByID(r.Context(), scheduleID)
	if err != nil {
		sendJSONError(w, "Schedule not found", http.StatusNotFound)
		return
	}

	// Verify ownership - admin or presenter can update
	if user.Role != models.RoleAdmin && schedule.PresenterID.Hex() != user.ID.Hex() {
		sendJSONError(w, "Only admin or the assigned presenter can update this class", http.StatusForbidden)
		return
	}

	// Can't update completed or cancelled classes
	if schedule.Status == models.ClassStatusCompleted || schedule.Status == models.ClassStatusCancelled {
		sendJSONError(w, "Cannot update a completed or cancelled class", http.StatusBadRequest)
		return
	}

	// Can't update live classes
	if schedule.Status == models.ClassStatusLive {
		sendJSONError(w, "Cannot update a live class", http.StatusBadRequest)
		return
	}

	var req struct {
		Title       string `json:"title"`
		Description string `json:"description"`
		StartTime   string `json:"startTime"`
		EndTime     string `json:"endTime"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendJSONError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Update fields if provided
	if req.Title != "" {
		schedule.Title = req.Title
	}
	if req.Description != "" {
		schedule.Description = req.Description
	}
	if req.StartTime != "" {
		startTime, err := time.Parse(time.RFC3339, req.StartTime)
		if err != nil {
			sendJSONError(w, "Invalid start time format", http.StatusBadRequest)
			return
		}
		schedule.StartTime = startTime
	}
	if req.EndTime != "" {
		endTime, err := time.Parse(time.RFC3339, req.EndTime)
		if err != nil {
			sendJSONError(w, "Invalid end time format", http.StatusBadRequest)
			return
		}
		schedule.EndTime = endTime
	}

	// Validate times
	if schedule.EndTime.Before(schedule.StartTime) {
		sendJSONError(w, "End time must be after start time", http.StatusBadRequest)
		return
	}

	if err := h.scheduleRepo.Update(r.Context(), schedule); err != nil {
		sendJSONError(w, "Failed to update schedule", http.StatusInternalServerError)
		return
	}

	resp := schedule.ToResponse()
	if batch, err := h.batchRepo.FindByID(r.Context(), schedule.BatchID.Hex()); err == nil {
		resp.BatchName = batch.Name
	}
	if presenter, err := h.userRepo.FindByID(r.Context(), schedule.PresenterID.Hex()); err == nil {
		resp.PresenterName = presenter.Name
	}

	sendJSON(w, resp, http.StatusOK)
}
