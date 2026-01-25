package server

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/jinshatcp/brightline-academy/learn/internal/auth"
	"github.com/jinshatcp/brightline-academy/learn/internal/repository"
)

// AuthHandler handles authentication endpoints.
type AuthHandler struct {
	authService *auth.Service
}

// NewAuthHandler creates a new AuthHandler.
func NewAuthHandler(authService *auth.Service) *AuthHandler {
	return &AuthHandler{authService: authService}
}

// Register handles user registration.
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req auth.RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendJSONError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate required fields
	if req.Email == "" || req.Password == "" || req.Name == "" {
		sendJSONError(w, "Email, password, and name are required", http.StatusBadRequest)
		return
	}

	if len(req.Password) < 6 {
		sendJSONError(w, "Password must be at least 6 characters", http.StatusBadRequest)
		return
	}

	user, err := h.authService.Register(r.Context(), req)
	if err != nil {
		if errors.Is(err, repository.ErrEmailAlreadyExists) {
			sendJSONError(w, "Email already registered", http.StatusConflict)
			return
		}
		sendJSONError(w, "Registration failed", http.StatusInternalServerError)
		return
	}

	sendJSON(w, map[string]interface{}{
		"message": "Registration successful. Please wait for admin approval.",
		"user":    user.ToResponse(),
	}, http.StatusCreated)
}

// Login handles user login.
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req auth.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendJSONError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Email == "" || req.Password == "" {
		sendJSONError(w, "Email and password are required", http.StatusBadRequest)
		return
	}

	response, err := h.authService.Login(r.Context(), req)
	if err != nil {
		switch {
		case errors.Is(err, auth.ErrInvalidCredentials):
			sendJSONError(w, "Invalid email or password", http.StatusUnauthorized)
		case errors.Is(err, auth.ErrAccountPending):
			sendJSONError(w, "Your account is pending approval", http.StatusForbidden)
		case errors.Is(err, auth.ErrAccountRejected):
			sendJSONError(w, "Your account has been rejected", http.StatusForbidden)
		case errors.Is(err, auth.ErrAccountSuspended):
			sendJSONError(w, "Your account has been suspended", http.StatusForbidden)
		default:
			sendJSONError(w, "Login failed", http.StatusInternalServerError)
		}
		return
	}

	sendJSON(w, response, http.StatusOK)
}

// Me returns the current user's profile.
func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

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

	sendJSON(w, user.ToResponse(), http.StatusOK)
}

// ChangePassword handles password change for authenticated users.
func (h *AuthHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	token := extractToken(r)
	if token == "" {
		sendJSONError(w, "Authorization required", http.StatusUnauthorized)
		return
	}

	claims, err := h.authService.ValidateToken(token)
	if err != nil {
		sendJSONError(w, "Invalid or expired token", http.StatusUnauthorized)
		return
	}

	var req struct {
		CurrentPassword string `json:"currentPassword"`
		NewPassword     string `json:"newPassword"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendJSONError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.CurrentPassword == "" || req.NewPassword == "" {
		sendJSONError(w, "Current password and new password are required", http.StatusBadRequest)
		return
	}

	if len(req.NewPassword) < 6 {
		sendJSONError(w, "New password must be at least 6 characters", http.StatusBadRequest)
		return
	}

	if req.CurrentPassword == req.NewPassword {
		sendJSONError(w, "New password must be different from current password", http.StatusBadRequest)
		return
	}

	err = h.authService.ChangePassword(r.Context(), claims.UserID, req.CurrentPassword, req.NewPassword)
	if err != nil {
		if err.Error() == "invalid email or password" {
			sendJSONError(w, "Current password is incorrect", http.StatusUnauthorized)
			return
		}
		sendJSONError(w, "Failed to change password", http.StatusInternalServerError)
		return
	}

	sendJSON(w, map[string]string{"message": "Password changed successfully"}, http.StatusOK)
}

// extractToken extracts the JWT token from the Authorization header or query parameter.
// Query parameter is used for video streaming where browsers can't send custom headers.
func extractToken(r *http.Request) string {
	// First try Authorization header
	authHeader := r.Header.Get("Authorization")
	if authHeader != "" {
		parts := strings.Split(authHeader, " ")
		if len(parts) == 2 && strings.ToLower(parts[0]) == "bearer" {
			return parts[1]
		}
	}

	// Fall back to query parameter (for video streaming)
	if token := r.URL.Query().Get("token"); token != "" {
		return token
	}

	return ""
}

// sendJSON sends a JSON response.
func sendJSON(w http.ResponseWriter, data interface{}, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

// sendJSONError sends a JSON error response.
func sendJSONError(w http.ResponseWriter, message string, status int) {
	sendJSON(w, map[string]string{"error": message}, status)
}

