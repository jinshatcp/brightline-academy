package server

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/mjamal5/learn/internal/auth"
	"github.com/mjamal5/learn/internal/models"
	"github.com/mjamal5/learn/internal/repository"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// NoteHandler handles note/document related requests.
type NoteHandler struct {
	authService *auth.Service
	noteRepo    *repository.NoteRepository
	batchRepo   *repository.BatchRepository
	userRepo    *repository.UserRepository
	storagePath string
}

// NewNoteHandler creates a new note handler.
func NewNoteHandler(authService *auth.Service, noteRepo *repository.NoteRepository, batchRepo *repository.BatchRepository, userRepo *repository.UserRepository, storagePath string) *NoteHandler {
	// Ensure notes directory exists
	notesPath := filepath.Join(storagePath, "notes")
	if err := os.MkdirAll(notesPath, 0755); err != nil {
		log.Printf("Warning: Could not create notes directory: %v", err)
	}

	return &NoteHandler{
		authService: authService,
		noteRepo:    noteRepo,
		batchRepo:   batchRepo,
		userRepo:    userRepo,
		storagePath: storagePath,
	}
}

// Upload handles document upload (POST /api/notes).
// Access: Admin and Presenter only.
func (h *NoteHandler) Upload(w http.ResponseWriter, r *http.Request) {
	token := extractToken(r)
	user, err := h.authService.GetUserFromToken(r.Context(), token)
	if err != nil {
		http.Error(w, `{"error":"Unauthorized"}`, http.StatusUnauthorized)
		return
	}

	// Only admin and presenter can upload
	if user.Role != models.RoleAdmin && user.Role != models.RolePresenter {
		http.Error(w, `{"error":"Permission denied"}`, http.StatusForbidden)
		return
	}

	// Parse multipart form (max 50MB)
	if err := r.ParseMultipartForm(50 << 20); err != nil {
		http.Error(w, `{"error":"File too large or invalid form"}`, http.StatusBadRequest)
		return
	}

	// Get form values
	title := r.FormValue("title")
	description := r.FormValue("description")
	batchIDStr := r.FormValue("batchId")

	if title == "" || batchIDStr == "" {
		http.Error(w, `{"error":"Title and batch ID are required"}`, http.StatusBadRequest)
		return
	}

	// Verify batch exists
	batch, err := h.batchRepo.FindByID(r.Context(), batchIDStr)
	if err != nil {
		http.Error(w, `{"error":"Batch not found"}`, http.StatusNotFound)
		return
	}

	batchID := batch.ID

	// Get the file
	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, `{"error":"No file uploaded"}`, http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Validate file type
	mimeType := header.Header.Get("Content-Type")
	if !isAllowedFileType(mimeType) {
		http.Error(w, `{"error":"File type not allowed. Supported: PDF, Word, Excel, PowerPoint, images, and text files"}`, http.StatusBadRequest)
		return
	}

	// Generate unique filename
	ext := filepath.Ext(header.Filename)
	uniqueName := primitive.NewObjectID().Hex() + "_" + time.Now().Format("20060102_150405") + ext
	filePath := filepath.Join(h.storagePath, "notes", uniqueName)

	// Save file
	dst, err := os.Create(filePath)
	if err != nil {
		log.Printf("[Notes] Failed to create file: %v", err)
		http.Error(w, `{"error":"Failed to save file"}`, http.StatusInternalServerError)
		return
	}
	defer dst.Close()

	fileSize, err := io.Copy(dst, file)
	if err != nil {
		log.Printf("[Notes] Failed to save file content: %v", err)
		os.Remove(filePath)
		http.Error(w, `{"error":"Failed to save file"}`, http.StatusInternalServerError)
		return
	}

	// Create note record
	note := &models.Note{
		Title:        title,
		Description:  description,
		FileName:     header.Filename,
		FilePath:     filePath,
		FileSize:     fileSize,
		FileType:     models.GetNoteType(mimeType),
		MimeType:     mimeType,
		BatchID:      batchID,
		BatchName:    batch.Name,
		UploaderID:   user.ID,
		UploaderName: user.Name,
		UploaderRole: string(user.Role),
	}

	if err := h.noteRepo.Create(r.Context(), note); err != nil {
		log.Printf("[Notes] Failed to create note record: %v", err)
		os.Remove(filePath)
		http.Error(w, `{"error":"Failed to save note"}`, http.StatusInternalServerError)
		return
	}

	// Set download URL
	note.DownloadURL = "/api/notes/" + note.ID.Hex() + "/download"

	log.Printf("[Notes] Uploaded: %s by %s (role: %s) for batch %s",
		note.Title, user.Name, user.Role, note.BatchName)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(note)
}

// ListNotes handles listing notes (GET /api/notes).
// Access: Admin sees all, Presenter sees their uploads + batches they teach, Student sees their batch notes.
func (h *NoteHandler) ListNotes(w http.ResponseWriter, r *http.Request) {
	token := extractToken(r)
	user, err := h.authService.GetUserFromToken(r.Context(), token)
	if err != nil {
		http.Error(w, `{"error":"Unauthorized"}`, http.StatusUnauthorized)
		return
	}

	ctx := r.Context()
	var notes []*models.Note

	switch user.Role {
	case models.RoleAdmin:
		// Admin sees all notes
		notes, err = h.noteRepo.FindAll(ctx)

	case models.RolePresenter:
		// Presenter sees notes they uploaded + notes from batches they present
		// Get batches where user is presenter
		batches, batchErr := h.batchRepo.FindByPresenter(ctx, user.ID.Hex())
		if batchErr != nil {
			log.Printf("[Notes] Error finding presenter batches: %v", batchErr)
		}

		// Get notes from presenter's batches
		var batchIDs []primitive.ObjectID
		for _, b := range batches {
			batchIDs = append(batchIDs, b.ID)
		}

		if len(batchIDs) > 0 {
			notes, err = h.noteRepo.FindByBatches(ctx, batchIDs)
		} else {
			// Fallback to just their own uploads
			notes, err = h.noteRepo.FindByUploader(ctx, user.ID)
		}

	case models.RoleStudent:
		// Student sees notes from their batches only
		// Find batches where this student is enrolled
		batches, batchErr := h.batchRepo.FindByStudent(ctx, user.ID.Hex())
		if batchErr != nil {
			log.Printf("[Notes] Error finding student batches: %v", batchErr)
			http.Error(w, `{"error":"Failed to find batches"}`, http.StatusInternalServerError)
			return
		}

		if len(batches) == 0 {
			notes = []*models.Note{}
		} else {
			var batchIDs []primitive.ObjectID
			for _, b := range batches {
				batchIDs = append(batchIDs, b.ID)
			}
			notes, err = h.noteRepo.FindByBatches(ctx, batchIDs)
		}

	default:
		http.Error(w, `{"error":"Unknown role"}`, http.StatusForbidden)
		return
	}

	if err != nil {
		log.Printf("[Notes] Error listing notes: %v", err)
		http.Error(w, `{"error":"Failed to fetch notes"}`, http.StatusInternalServerError)
		return
	}

	// Set download URLs
	for _, note := range notes {
		note.DownloadURL = "/api/notes/" + note.ID.Hex() + "/download"
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(notes)
}

// Download handles file download (GET /api/notes/{id}/download).
// Access: Admin always, Presenter if in their batches, Student if in their batch.
func (h *NoteHandler) Download(w http.ResponseWriter, r *http.Request) {
	token := extractToken(r)
	user, err := h.authService.GetUserFromToken(r.Context(), token)
	if err != nil {
		http.Error(w, `{"error":"Unauthorized"}`, http.StatusUnauthorized)
		return
	}

	// Extract note ID from URL
	path := strings.TrimPrefix(r.URL.Path, "/api/notes/")
	parts := strings.Split(path, "/")
	if len(parts) < 2 || parts[1] != "download" {
		http.Error(w, `{"error":"Invalid URL"}`, http.StatusBadRequest)
		return
	}

	noteID, err := primitive.ObjectIDFromHex(parts[0])
	if err != nil {
		http.Error(w, `{"error":"Invalid note ID"}`, http.StatusBadRequest)
		return
	}

	note, err := h.noteRepo.FindByID(r.Context(), noteID)
	if err != nil {
		http.Error(w, `{"error":"Note not found"}`, http.StatusNotFound)
		return
	}

	// Check access permissions
	hasAccess := false

	switch user.Role {
	case models.RoleAdmin:
		hasAccess = true
	case models.RolePresenter:
		// Presenter can access notes from their batches
		batches, _ := h.batchRepo.FindByPresenter(r.Context(), user.ID.Hex())
		for _, b := range batches {
			if b.ID == note.BatchID {
				hasAccess = true
				break
			}
		}
	case models.RoleStudent:
		// Student can access notes from batches they're enrolled in
		batches, _ := h.batchRepo.FindByStudent(r.Context(), user.ID.Hex())
		for _, b := range batches {
			if b.ID == note.BatchID {
				hasAccess = true
				break
			}
		}
	}

	if !hasAccess {
		http.Error(w, `{"error":"Access denied"}`, http.StatusForbidden)
		return
	}

	// Open file
	file, err := os.Open(note.FilePath)
	if err != nil {
		log.Printf("[Notes] File not found: %s", note.FilePath)
		http.Error(w, `{"error":"File not found"}`, http.StatusNotFound)
		return
	}
	defer file.Close()

	// Set headers for download
	w.Header().Set("Content-Type", note.MimeType)
	w.Header().Set("Content-Disposition", "inline; filename=\""+note.FileName+"\"")
	w.Header().Set("Cache-Control", "private, max-age=3600")

	log.Printf("[Notes] Download: %s by %s (role: %s)", note.Title, user.Name, user.Role)

	// Stream file
	io.Copy(w, file)
}

// Update handles note update (PUT /api/notes/{id}).
// Access: Admin only.
func (h *NoteHandler) Update(w http.ResponseWriter, r *http.Request) {
	token := extractToken(r)
	user, err := h.authService.GetUserFromToken(r.Context(), token)
	if err != nil {
		http.Error(w, `{"error":"Unauthorized"}`, http.StatusUnauthorized)
		return
	}

	// Only admin can update
	if user.Role != models.RoleAdmin {
		http.Error(w, `{"error":"Only admin can update notes"}`, http.StatusForbidden)
		return
	}

	// Extract note ID
	path := strings.TrimPrefix(r.URL.Path, "/api/notes/")
	noteID, err := primitive.ObjectIDFromHex(path)
	if err != nil {
		http.Error(w, `{"error":"Invalid note ID"}`, http.StatusBadRequest)
		return
	}

	note, err := h.noteRepo.FindByID(r.Context(), noteID)
	if err != nil {
		http.Error(w, `{"error":"Note not found"}`, http.StatusNotFound)
		return
	}

	// Parse update data
	var updateData struct {
		Title       string `json:"title"`
		Description string `json:"description"`
	}
	if err := json.NewDecoder(r.Body).Decode(&updateData); err != nil {
		http.Error(w, `{"error":"Invalid request body"}`, http.StatusBadRequest)
		return
	}

	if updateData.Title != "" {
		note.Title = updateData.Title
	}
	note.Description = updateData.Description

	if err := h.noteRepo.Update(r.Context(), note); err != nil {
		log.Printf("[Notes] Failed to update note: %v", err)
		http.Error(w, `{"error":"Failed to update note"}`, http.StatusInternalServerError)
		return
	}

	note.DownloadURL = "/api/notes/" + note.ID.Hex() + "/download"

	log.Printf("[Notes] Updated: %s by admin %s", note.Title, user.Name)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(note)
}

// Delete handles note deletion (DELETE /api/notes/{id}).
// Access: Admin only.
func (h *NoteHandler) Delete(w http.ResponseWriter, r *http.Request) {
	token := extractToken(r)
	user, err := h.authService.GetUserFromToken(r.Context(), token)
	if err != nil {
		http.Error(w, `{"error":"Unauthorized"}`, http.StatusUnauthorized)
		return
	}

	// Only admin can delete
	if user.Role != models.RoleAdmin {
		http.Error(w, `{"error":"Only admin can delete notes"}`, http.StatusForbidden)
		return
	}

	// Extract note ID
	path := strings.TrimPrefix(r.URL.Path, "/api/notes/")
	noteID, err := primitive.ObjectIDFromHex(path)
	if err != nil {
		http.Error(w, `{"error":"Invalid note ID"}`, http.StatusBadRequest)
		return
	}

	note, err := h.noteRepo.FindByID(r.Context(), noteID)
	if err != nil {
		http.Error(w, `{"error":"Note not found"}`, http.StatusNotFound)
		return
	}

	// Delete file from storage
	if err := os.Remove(note.FilePath); err != nil {
		log.Printf("[Notes] Warning: Failed to delete file: %v", err)
	}

	// Delete from database
	if err := h.noteRepo.Delete(r.Context(), noteID); err != nil {
		log.Printf("[Notes] Failed to delete note: %v", err)
		http.Error(w, `{"error":"Failed to delete note"}`, http.StatusInternalServerError)
		return
	}

	log.Printf("[Notes] Deleted: %s by admin %s", note.Title, user.Name)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Note deleted successfully"})
}

// isAllowedFileType checks if the MIME type is allowed for upload.
func isAllowedFileType(mimeType string) bool {
	allowedTypes := map[string]bool{
		// PDF
		"application/pdf": true,
		// Word
		"application/msword": true,
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document": true,
		// Excel
		"application/vnd.ms-excel": true,
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": true,
		// PowerPoint
		"application/vnd.ms-powerpoint":                                             true,
		"application/vnd.openxmlformats-officedocument.presentationml.presentation": true,
		// Images
		"image/jpeg": true,
		"image/png":  true,
		"image/gif":  true,
		"image/webp": true,
		// Text
		"text/plain": true,
	}
	return allowedTypes[mimeType]
}
