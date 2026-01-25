package server

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/jinshatcp/brightline-academy/learn/internal/auth"
	"github.com/jinshatcp/brightline-academy/learn/internal/models"
	"github.com/jinshatcp/brightline-academy/learn/internal/repository"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

const (
	maxUploadSize = 2 * 1024 * 1024 * 1024 // 2GB max upload
	recordingsDir = "recordings"
)

// RecordingHandler handles recording-related endpoints.
type RecordingHandler struct {
	authService   *auth.Service
	recordingRepo *repository.RecordingRepository
	scheduleRepo  *repository.ScheduleRepository
	batchRepo     *repository.BatchRepository
	userRepo      *repository.UserRepository
	storagePath   string
}

// NewRecordingHandler creates a new RecordingHandler.
func NewRecordingHandler(
	authService *auth.Service,
	recordingRepo *repository.RecordingRepository,
	scheduleRepo *repository.ScheduleRepository,
	batchRepo *repository.BatchRepository,
	userRepo *repository.UserRepository,
	storagePath string,
) *RecordingHandler {
	// Create recordings directory if it doesn't exist
	fullPath := filepath.Join(storagePath, recordingsDir)
	os.MkdirAll(fullPath, 0755)

	return &RecordingHandler{
		authService:   authService,
		recordingRepo: recordingRepo,
		scheduleRepo:  scheduleRepo,
		batchRepo:     batchRepo,
		userRepo:      userRepo,
		storagePath:   storagePath,
	}
}

// Upload handles recording file uploads.
func (h *RecordingHandler) Upload(w http.ResponseWriter, r *http.Request) {
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

	// Only presenters can upload recordings
	if user.Role != models.RolePresenter && user.Role != models.RoleAdmin {
		sendJSONError(w, "Only presenters can upload recordings", http.StatusForbidden)
		return
	}

	// Limit upload size
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize)

	// Parse multipart form
	if err := r.ParseMultipartForm(maxUploadSize); err != nil {
		sendJSONError(w, "File too large (max 2GB)", http.StatusBadRequest)
		return
	}

	// Get form values
	scheduleID := r.FormValue("scheduleId")
	title := r.FormValue("title")
	description := r.FormValue("description")
	durationStr := r.FormValue("duration")

	if scheduleID == "" || title == "" {
		sendJSONError(w, "Schedule ID and title are required", http.StatusBadRequest)
		return
	}

	// Parse duration
	duration, _ := strconv.Atoi(durationStr)

	// Verify schedule exists and belongs to the presenter
	schedule, err := h.scheduleRepo.FindByID(r.Context(), scheduleID)
	if err != nil {
		sendJSONError(w, "Schedule not found", http.StatusNotFound)
		return
	}

	if user.Role != models.RoleAdmin && schedule.PresenterID.Hex() != user.ID.Hex() {
		sendJSONError(w, "You can only upload recordings for your own classes", http.StatusForbidden)
		return
	}

	// Get the file
	file, header, err := r.FormFile("recording")
	if err != nil {
		sendJSONError(w, "Recording file is required", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Validate file type
	contentType := header.Header.Get("Content-Type")
	if !isValidVideoType(contentType) {
		sendJSONError(w, "Invalid file type. Supported: video/webm, video/mp4", http.StatusBadRequest)
		return
	}

	// Generate unique filename
	ext := filepath.Ext(header.Filename)
	if ext == "" {
		ext = ".webm"
	}
	fileName := fmt.Sprintf("%s_%s%s", scheduleID, time.Now().Format("20060102_150405"), ext)
	filePath := filepath.Join(h.storagePath, recordingsDir, fileName)

	// Create the file
	dst, err := os.Create(filePath)
	if err != nil {
		sendJSONError(w, "Failed to save recording", http.StatusInternalServerError)
		return
	}
	defer dst.Close()

	// Copy the uploaded file
	fileSize, err := io.Copy(dst, file)
	if err != nil {
		os.Remove(filePath)
		sendJSONError(w, "Failed to save recording", http.StatusInternalServerError)
		return
	}

	// Create recording record
	scheduleObjID, _ := primitive.ObjectIDFromHex(scheduleID)
	recording := &models.Recording{
		ScheduleID:  scheduleObjID,
		BatchID:     schedule.BatchID,
		PresenterID: schedule.PresenterID,
		Title:       title,
		Description: description,
		FileName:    fileName,
		FilePath:    filePath,
		FileSize:    fileSize,
		Duration:    duration,
		MimeType:    contentType,
		Status:      models.RecordingStatusReady,
		RecordedAt:  schedule.StartTime,
	}

	if err := h.recordingRepo.Create(r.Context(), recording); err != nil {
		os.Remove(filePath)
		sendJSONError(w, "Failed to save recording metadata", http.StatusInternalServerError)
		return
	}

	resp := recording.ToResponse()
	resp.StreamURL = fmt.Sprintf("/api/recordings/%s/stream", recording.ID.Hex())
	sendJSON(w, resp, http.StatusCreated)
}

// ListRecordings returns recordings based on user role.
func (h *RecordingHandler) ListRecordings(w http.ResponseWriter, r *http.Request) {
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

	var recordings []models.Recording

	switch user.Role {
	case models.RoleAdmin:
		recordings, err = h.recordingRepo.FindAll(r.Context())

	case models.RolePresenter:
		recordings, err = h.recordingRepo.FindByPresenter(r.Context(), user.ID.Hex())

	case models.RoleStudent:
		// Get batches the student is in
		batches, _ := h.batchRepo.FindByStudent(r.Context(), user.ID.Hex())
		batchIDs := make([]string, len(batches))
		for i, b := range batches {
			batchIDs[i] = b.ID.Hex()
		}
		recordings, err = h.recordingRepo.FindByBatches(r.Context(), batchIDs)
	}

	if err != nil {
		sendJSONError(w, "Failed to fetch recordings", http.StatusInternalServerError)
		return
	}

	// Enrich response
	response := make([]models.RecordingResponse, len(recordings))
	for i, rec := range recordings {
		resp := rec.ToResponse()
		resp.StreamURL = fmt.Sprintf("/api/recordings/%s/stream", rec.ID.Hex())

		if batch, err := h.batchRepo.FindByID(r.Context(), rec.BatchID.Hex()); err == nil {
			resp.BatchName = batch.Name
		}
		if presenter, err := h.userRepo.FindByID(r.Context(), rec.PresenterID.Hex()); err == nil {
			resp.PresenterName = presenter.Name
		}
		response[i] = resp
	}

	sendJSON(w, response, http.StatusOK)
}

// GetRecording returns a single recording.
func (h *RecordingHandler) GetRecording(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract recording ID from URL: /api/recordings/{id}
	path := strings.TrimPrefix(r.URL.Path, "/api/recordings/")
	recordingID := strings.Split(path, "/")[0]

	recording, err := h.recordingRepo.FindByID(r.Context(), recordingID)
	if err != nil {
		sendJSONError(w, "Recording not found", http.StatusNotFound)
		return
	}

	resp := recording.ToResponse()
	resp.StreamURL = fmt.Sprintf("/api/recordings/%s/stream", recording.ID.Hex())

	if batch, err := h.batchRepo.FindByID(r.Context(), recording.BatchID.Hex()); err == nil {
		resp.BatchName = batch.Name
	}
	if presenter, err := h.userRepo.FindByID(r.Context(), recording.PresenterID.Hex()); err == nil {
		resp.PresenterName = presenter.Name
	}

	sendJSON(w, resp, http.StatusOK)
}

// StreamRecording streams a recording file.
func (h *RecordingHandler) StreamRecording(w http.ResponseWriter, r *http.Request) {
	// Extract recording ID from URL: /api/recordings/{id}/stream
	path := strings.TrimPrefix(r.URL.Path, "/api/recordings/")
	parts := strings.Split(path, "/")
	if len(parts) < 2 {
		log.Printf("[Recording] Invalid stream URL: %s", r.URL.Path)
		http.NotFound(w, r)
		return
	}
	recordingID := parts[0]
	log.Printf("[Recording] Stream request for recording: %s", recordingID)

	// Verify auth
	token := extractToken(r)
	if token == "" {
		log.Printf("[Recording] No token provided for stream request")
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	user, err := h.authService.GetUserFromToken(r.Context(), token)
	if err != nil {
		log.Printf("[Recording] Invalid token: %v", err)
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	log.Printf("[Recording] Stream access by user: %s (role: %s)", user.Name, user.Role)

	recording, err := h.recordingRepo.FindByID(r.Context(), recordingID)
	if err != nil {
		log.Printf("[Recording] Recording not found: %s", recordingID)
		http.NotFound(w, r)
		return
	}
	log.Printf("[Recording] Found recording: %s, file: %s", recording.Title, recording.FilePath)

	// Check access for students
	if user.Role == models.RoleStudent {
		batch, err := h.batchRepo.FindByID(r.Context(), recording.BatchID.Hex())
		if err != nil || !batch.HasStudent(user.ID.Hex()) {
			log.Printf("[Recording] Access denied for student %s", user.Name)
			http.Error(w, "Access denied", http.StatusForbidden)
			return
		}
	}

	// Open the file
	file, err := os.Open(recording.FilePath)
	if err != nil {
		log.Printf("[Recording] Failed to open file %s: %v", recording.FilePath, err)
		http.Error(w, "Recording file not found", http.StatusNotFound)
		return
	}
	defer file.Close()

	// Get file info
	stat, err := file.Stat()
	if err != nil {
		log.Printf("[Recording] Failed to stat file: %v", err)
		http.Error(w, "Failed to get file info", http.StatusInternalServerError)
		return
	}

	// Normalize MIME type - remove codecs parameter for Content-Type header
	// Browsers handle the codecs internally
	mimeType := recording.MimeType
	if idx := strings.Index(mimeType, ";"); idx != -1 {
		mimeType = strings.TrimSpace(mimeType[:idx])
	}
	if mimeType == "" {
		mimeType = "video/webm" // Default fallback
	}

	log.Printf("[Recording] Streaming file: %s, size: %d bytes, type: %s (original: %s)",
		recording.FileName, stat.Size(), mimeType, recording.MimeType)

	// Set headers for video streaming
	w.Header().Set("Content-Type", mimeType)
	w.Header().Set("Accept-Ranges", "bytes")
	w.Header().Set("Cache-Control", "no-cache")

	// CORS headers for video streaming
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Range")

	// Handle range requests for video seeking
	http.ServeContent(w, r, recording.FileName, stat.ModTime(), file)
}

// DeleteRecording deletes a recording.
func (h *RecordingHandler) DeleteRecording(w http.ResponseWriter, r *http.Request) {
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

	// Extract recording ID
	path := strings.TrimPrefix(r.URL.Path, "/api/recordings/")
	recordingID := strings.TrimSuffix(path, "/")

	recording, err := h.recordingRepo.FindByID(r.Context(), recordingID)
	if err != nil {
		sendJSONError(w, "Recording not found", http.StatusNotFound)
		return
	}

	// Check ownership
	if user.Role != models.RoleAdmin && recording.PresenterID.Hex() != user.ID.Hex() {
		sendJSONError(w, "You can only delete your own recordings", http.StatusForbidden)
		return
	}

	// Delete file
	os.Remove(recording.FilePath)

	// Delete record
	if err := h.recordingRepo.Delete(r.Context(), recordingID); err != nil {
		sendJSONError(w, "Failed to delete recording", http.StatusInternalServerError)
		return
	}

	sendJSON(w, map[string]string{"message": "Recording deleted"}, http.StatusOK)
}

// isValidVideoType checks if the content type is a valid video type.
func isValidVideoType(contentType string) bool {
	validTypes := []string{
		"video/webm",
		"video/mp4",
		"video/x-matroska",
		"video/quicktime",
	}
	for _, t := range validTypes {
		if strings.HasPrefix(contentType, t) {
			return true
		}
	}
	return false
}
