package server

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/jinshatcp/brightline-academy/learn/internal/auth"
	"github.com/jinshatcp/brightline-academy/learn/internal/models"
	"github.com/jinshatcp/brightline-academy/learn/internal/repository"
)

// AdminHandler handles admin-only endpoints.
type AdminHandler struct {
	authService *auth.Service
	userRepo    *repository.UserRepository
}

// NewAdminHandler creates a new AdminHandler.
func NewAdminHandler(authService *auth.Service, userRepo *repository.UserRepository) *AdminHandler {
	return &AdminHandler{
		authService: authService,
		userRepo:    userRepo,
	}
}

// requireAdmin is middleware that ensures the request is from an admin.
func (h *AdminHandler) requireAdmin(next http.HandlerFunc) http.HandlerFunc {
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

		if !user.IsAdmin() {
			sendJSONError(w, "Admin access required", http.StatusForbidden)
			return
		}

		next(w, r)
	}
}

// ListUsers returns all users with optional status filter.
func (h *AdminHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var statusFilter *models.UserStatus
	var roleFilter *models.UserRole

	if s := r.URL.Query().Get("status"); s != "" {
		status := models.UserStatus(s)
		statusFilter = &status
	}

	if r := r.URL.Query().Get("role"); r != "" {
		role := models.UserRole(r)
		roleFilter = &role
	}

	users, err := h.userRepo.FindAll(r.Context(), statusFilter, roleFilter)
	if err != nil {
		sendJSONError(w, "Failed to fetch users", http.StatusInternalServerError)
		return
	}

	// Convert to response format
	response := make([]models.UserResponse, len(users))
	for i, u := range users {
		response[i] = u.ToResponse()
	}

	sendJSON(w, response, http.StatusOK)
}

// GetPendingUsers returns all users pending approval.
func (h *AdminHandler) GetPendingUsers(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	users, err := h.userRepo.FindPendingUsers(r.Context())
	if err != nil {
		sendJSONError(w, "Failed to fetch pending users", http.StatusInternalServerError)
		return
	}

	response := make([]models.UserResponse, len(users))
	for i, u := range users {
		response[i] = u.ToResponse()
	}

	sendJSON(w, response, http.StatusOK)
}

// UpdateUserStatus handles approve/reject/suspend actions.
func (h *AdminHandler) UpdateUserStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut && r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract user ID from URL path: /api/admin/users/{id}/status
	path := strings.TrimPrefix(r.URL.Path, "/api/admin/users/")
	parts := strings.Split(path, "/")
	if len(parts) < 2 || parts[1] != "status" {
		sendJSONError(w, "Invalid URL", http.StatusBadRequest)
		return
	}
	userID := parts[0]

	var req struct {
		Status models.UserStatus `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendJSONError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate status
	if req.Status != models.StatusApproved && req.Status != models.StatusRejected && req.Status != models.StatusSuspended {
		sendJSONError(w, "Invalid status. Must be: approved, rejected, or suspended", http.StatusBadRequest)
		return
	}

	// Get admin user ID from token
	token := extractToken(r)
	claims, _ := h.authService.ValidateToken(token)
	adminID := ""
	if claims != nil {
		adminID = claims.UserID
	}

	err := h.userRepo.UpdateStatus(r.Context(), userID, req.Status, adminID)
	if err != nil {
		if err == repository.ErrUserNotFound {
			sendJSONError(w, "User not found", http.StatusNotFound)
			return
		}
		sendJSONError(w, "Failed to update user status", http.StatusInternalServerError)
		return
	}

	sendJSON(w, map[string]string{
		"message": "User status updated successfully",
		"status":  string(req.Status),
	}, http.StatusOK)
}

// DeleteUser deletes a user account.
func (h *AdminHandler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract user ID from URL path: /api/admin/users/{id}
	path := strings.TrimPrefix(r.URL.Path, "/api/admin/users/")
	userID := strings.TrimSuffix(path, "/")

	if userID == "" {
		sendJSONError(w, "User ID required", http.StatusBadRequest)
		return
	}

	// Prevent admin from deleting themselves
	token := extractToken(r)
	claims, _ := h.authService.ValidateToken(token)
	if claims != nil && claims.UserID == userID {
		sendJSONError(w, "Cannot delete your own account", http.StatusBadRequest)
		return
	}

	err := h.userRepo.Delete(r.Context(), userID)
	if err != nil {
		if err == repository.ErrUserNotFound {
			sendJSONError(w, "User not found", http.StatusNotFound)
			return
		}
		sendJSONError(w, "Failed to delete user", http.StatusInternalServerError)
		return
	}

	sendJSON(w, map[string]string{"message": "User deleted successfully"}, http.StatusOK)
}

// GetStats returns admin dashboard statistics.
func (h *AdminHandler) GetStats(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	ctx := r.Context()

	pendingStatus := models.StatusPending
	approvedStatus := models.StatusApproved

	pending, _ := h.userRepo.FindAll(ctx, &pendingStatus, nil)
	approved, _ := h.userRepo.FindAll(ctx, &approvedStatus, nil)
	
	presenterRole := models.RolePresenter
	studentRole := models.RoleStudent
	
	presenters, _ := h.userRepo.FindAll(ctx, nil, &presenterRole)
	students, _ := h.userRepo.FindAll(ctx, nil, &studentRole)

	sendJSON(w, map[string]interface{}{
		"pendingCount":   len(pending),
		"approvedCount":  len(approved),
		"presenterCount": len(presenters),
		"studentCount":   len(students),
	}, http.StatusOK)
}

