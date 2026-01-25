package server

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/jinshatcp/brightline-academy/learn/internal/auth"
	"github.com/jinshatcp/brightline-academy/learn/internal/models"
	"github.com/jinshatcp/brightline-academy/learn/internal/repository"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// BatchHandler handles batch-related endpoints.
type BatchHandler struct {
	authService *auth.Service
	batchRepo   *repository.BatchRepository
	userRepo    *repository.UserRepository
}

// NewBatchHandler creates a new BatchHandler.
func NewBatchHandler(authService *auth.Service, batchRepo *repository.BatchRepository, userRepo *repository.UserRepository) *BatchHandler {
	return &BatchHandler{
		authService: authService,
		batchRepo:   batchRepo,
		userRepo:    userRepo,
	}
}

// requireAuth middleware ensures the request is authenticated.
func (h *BatchHandler) requireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := extractToken(r)
		if token == "" {
			sendJSONError(w, "Authorization required", http.StatusUnauthorized)
			return
		}

		_, err := h.authService.ValidateToken(token)
		if err != nil {
			sendJSONError(w, "Invalid or expired token", http.StatusUnauthorized)
			return
		}

		next(w, r)
	}
}

// requireAdminOrPresenter middleware ensures the request is from admin or presenter.
func (h *BatchHandler) requireAdminOrPresenter(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := extractToken(r)
		if token == "" {
			sendJSONError(w, "Authorization required", http.StatusUnauthorized)
			return
		}

		user, err := h.authService.GetUserFromToken(r.Context(), token)
		if err != nil {
			sendJSONError(w, "Invalid or expired token", http.StatusUnauthorized)
			return
		}

		if user.Role != models.RoleAdmin && user.Role != models.RolePresenter {
			sendJSONError(w, "Admin or presenter access required", http.StatusForbidden)
			return
		}

		next(w, r)
	}
}

// ListBatches returns batches based on user role.
func (h *BatchHandler) ListBatches(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	token := extractToken(r)
	user, _ := h.authService.GetUserFromToken(r.Context(), token)

	var batches []models.Batch
	var err error

	switch user.Role {
	case models.RoleAdmin:
		batches, err = h.batchRepo.FindAll(r.Context())
	case models.RolePresenter:
		batches, err = h.batchRepo.FindByPresenter(r.Context(), user.ID.Hex())
	case models.RoleStudent:
		batches, err = h.batchRepo.FindByStudent(r.Context(), user.ID.Hex())
	}

	if err != nil {
		sendJSONError(w, "Failed to fetch batches", http.StatusInternalServerError)
		return
	}

	// Enrich with presenter names
	response := make([]models.BatchResponse, len(batches))
	for i, b := range batches {
		resp := b.ToResponse()
		if presenter, err := h.userRepo.FindByID(r.Context(), b.PresenterID.Hex()); err == nil {
			resp.PresenterName = presenter.Name
		}
		response[i] = resp
	}

	sendJSON(w, response, http.StatusOK)
}

// CreateBatch creates a new batch.
func (h *BatchHandler) CreateBatch(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Name        string `json:"name"`
		Description string `json:"description"`
		PresenterID string `json:"presenterId"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendJSONError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Name == "" || req.PresenterID == "" {
		sendJSONError(w, "Name and presenter ID are required", http.StatusBadRequest)
		return
	}

	presenterObjID, err := primitive.ObjectIDFromHex(req.PresenterID)
	if err != nil {
		sendJSONError(w, "Invalid presenter ID", http.StatusBadRequest)
		return
	}

	// Verify presenter exists and is a presenter
	presenter, err := h.userRepo.FindByID(r.Context(), req.PresenterID)
	if err != nil || presenter.Role != models.RolePresenter {
		sendJSONError(w, "Invalid presenter", http.StatusBadRequest)
		return
	}

	token := extractToken(r)
	claims, _ := h.authService.ValidateToken(token)
	createdByID, _ := primitive.ObjectIDFromHex(claims.UserID)

	batch := &models.Batch{
		Name:        req.Name,
		Description: req.Description,
		PresenterID: presenterObjID,
		CreatedBy:   createdByID,
	}

	if err := h.batchRepo.Create(r.Context(), batch); err != nil {
		sendJSONError(w, "Failed to create batch", http.StatusInternalServerError)
		return
	}

	resp := batch.ToResponse()
	resp.PresenterName = presenter.Name
	sendJSON(w, resp, http.StatusCreated)
}

// GetBatch returns a single batch with details.
func (h *BatchHandler) GetBatch(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract batch ID from URL: /api/batches/{id}
	path := strings.TrimPrefix(r.URL.Path, "/api/batches/")
	batchID := strings.Split(path, "/")[0]

	batch, err := h.batchRepo.FindByID(r.Context(), batchID)
	if err != nil {
		sendJSONError(w, "Batch not found", http.StatusNotFound)
		return
	}

	// Get students in batch
	students := make([]models.UserResponse, 0)
	for _, studentID := range batch.StudentIDs {
		if student, err := h.userRepo.FindByID(r.Context(), studentID.Hex()); err == nil {
			students = append(students, student.ToResponse())
		}
	}

	// Get presenter
	var presenterName string
	if presenter, err := h.userRepo.FindByID(r.Context(), batch.PresenterID.Hex()); err == nil {
		presenterName = presenter.Name
	}

	response := map[string]interface{}{
		"id":            batch.ID.Hex(),
		"name":          batch.Name,
		"description":   batch.Description,
		"presenterId":   batch.PresenterID.Hex(),
		"presenterName": presenterName,
		"students":      students,
		"createdAt":     batch.CreatedAt,
	}

	sendJSON(w, response, http.StatusOK)
}

// AddStudentsToBatch adds students to a batch.
func (h *BatchHandler) AddStudentsToBatch(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract batch ID from URL: /api/batches/{id}/students
	path := strings.TrimPrefix(r.URL.Path, "/api/batches/")
	parts := strings.Split(path, "/")
	if len(parts) < 2 {
		sendJSONError(w, "Invalid URL", http.StatusBadRequest)
		return
	}
	batchID := parts[0]

	var req struct {
		StudentIDs []string `json:"studentIds"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendJSONError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if len(req.StudentIDs) == 0 {
		sendJSONError(w, "At least one student ID required", http.StatusBadRequest)
		return
	}

	// Verify all students exist and are students
	for _, id := range req.StudentIDs {
		student, err := h.userRepo.FindByID(r.Context(), id)
		if err != nil || student.Role != models.RoleStudent {
			sendJSONError(w, "Invalid student ID: "+id, http.StatusBadRequest)
			return
		}
	}

	if err := h.batchRepo.AddStudents(r.Context(), batchID, req.StudentIDs); err != nil {
		sendJSONError(w, "Failed to add students", http.StatusInternalServerError)
		return
	}

	sendJSON(w, map[string]string{"message": "Students added successfully"}, http.StatusOK)
}

// RemoveStudentFromBatch removes a student from a batch.
func (h *BatchHandler) RemoveStudentFromBatch(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract batch ID and student ID from URL: /api/batches/{id}/students/{studentId}
	path := strings.TrimPrefix(r.URL.Path, "/api/batches/")
	parts := strings.Split(path, "/")
	if len(parts) < 3 {
		sendJSONError(w, "Invalid URL", http.StatusBadRequest)
		return
	}
	batchID := parts[0]
	studentID := parts[2]

	if err := h.batchRepo.RemoveStudent(r.Context(), batchID, studentID); err != nil {
		sendJSONError(w, "Failed to remove student", http.StatusInternalServerError)
		return
	}

	sendJSON(w, map[string]string{"message": "Student removed successfully"}, http.StatusOK)
}

// DeleteBatch deletes a batch.
func (h *BatchHandler) DeleteBatch(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract batch ID from URL: /api/batches/{id}
	path := strings.TrimPrefix(r.URL.Path, "/api/batches/")
	batchID := strings.TrimSuffix(path, "/")

	if err := h.batchRepo.Delete(r.Context(), batchID); err != nil {
		sendJSONError(w, "Failed to delete batch", http.StatusInternalServerError)
		return
	}

	sendJSON(w, map[string]string{"message": "Batch deleted successfully"}, http.StatusOK)
}

// GetAvailableStudents returns students not in a batch (for adding to batch).
func (h *BatchHandler) GetAvailableStudents(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get all approved students
	studentRole := models.RoleStudent
	approvedStatus := models.StatusApproved
	students, err := h.userRepo.FindAll(r.Context(), &approvedStatus, &studentRole)
	if err != nil {
		sendJSONError(w, "Failed to fetch students", http.StatusInternalServerError)
		return
	}

	response := make([]models.UserResponse, len(students))
	for i, s := range students {
		response[i] = s.ToResponse()
	}

	sendJSON(w, response, http.StatusOK)
}

