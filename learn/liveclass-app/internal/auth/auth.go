// Package auth provides authentication and authorization services.
package auth

import (
	"context"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jinshatcp/brightline-academy/learn/internal/models"
	"github.com/jinshatcp/brightline-academy/learn/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

// Common errors
var (
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrAccountPending     = errors.New("account is pending approval")
	ErrAccountRejected    = errors.New("account has been rejected")
	ErrAccountSuspended   = errors.New("account has been suspended")
	ErrInvalidToken       = errors.New("invalid or expired token")
)

// Claims represents JWT claims.
type Claims struct {
	UserID string          `json:"userId"`
	Email  string          `json:"email"`
	Name   string          `json:"name"`
	Role   models.UserRole `json:"role"`
	jwt.RegisteredClaims
}

// Service handles authentication operations.
type Service struct {
	userRepo  *repository.UserRepository
	jwtSecret []byte
	jwtExpiry time.Duration
}

// NewService creates a new auth service.
func NewService(userRepo *repository.UserRepository, jwtSecret string, jwtExpiryHours int) *Service {
	return &Service{
		userRepo:  userRepo,
		jwtSecret: []byte(jwtSecret),
		jwtExpiry: time.Duration(jwtExpiryHours) * time.Hour,
	}
}

// RegisterRequest represents a registration request.
type RegisterRequest struct {
	Email    string          `json:"email"`
	Password string          `json:"password"`
	Name     string          `json:"name"`
	Role     models.UserRole `json:"role"`
}

// LoginRequest represents a login request.
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// AuthResponse represents an authentication response.
type AuthResponse struct {
	Token string              `json:"token"`
	User  models.UserResponse `json:"user"`
}

// Register creates a new user account.
func (s *Service) Register(ctx context.Context, req RegisterRequest) (*models.User, error) {
	// Validate role
	if req.Role != models.RolePresenter && req.Role != models.RoleStudent {
		req.Role = models.RoleStudent
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := &models.User{
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
		Name:         req.Name,
		Role:         req.Role,
		Status:       models.StatusPending,
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, err
	}

	return user, nil
}

// Login authenticates a user and returns a JWT token.
func (s *Service) Login(ctx context.Context, req LoginRequest) (*AuthResponse, error) {
	user, err := s.userRepo.FindByEmail(ctx, req.Email)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			return nil, ErrInvalidCredentials
		}
		return nil, err
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, ErrInvalidCredentials
	}

	// Check account status
	switch user.Status {
	case models.StatusPending:
		return nil, ErrAccountPending
	case models.StatusRejected:
		return nil, ErrAccountRejected
	case models.StatusSuspended:
		return nil, ErrAccountSuspended
	}

	// Generate JWT token
	token, err := s.generateToken(user)
	if err != nil {
		return nil, err
	}

	return &AuthResponse{
		Token: token,
		User:  user.ToResponse(),
	}, nil
}

// ValidateToken validates a JWT token and returns the claims.
func (s *Service) ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		return s.jwtSecret, nil
	})

	if err != nil {
		return nil, ErrInvalidToken
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, ErrInvalidToken
	}

	return claims, nil
}

// GetUserFromToken retrieves the full user from a token.
func (s *Service) GetUserFromToken(ctx context.Context, tokenString string) (*models.User, error) {
	claims, err := s.ValidateToken(tokenString)
	if err != nil {
		return nil, err
	}

	return s.userRepo.FindByID(ctx, claims.UserID)
}

// generateToken creates a JWT token for a user.
func (s *Service) generateToken(user *models.User) (string, error) {
	claims := &Claims{
		UserID: user.ID.Hex(),
		Email:  user.Email,
		Name:   user.Name,
		Role:   user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(s.jwtExpiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.jwtSecret)
}

// CreateDefaultAdmin creates the default admin user if none exists.
func (s *Service) CreateDefaultAdmin(ctx context.Context, email, password, name string) error {
	exists, err := s.userRepo.ExistsAdmin(ctx)
	if err != nil {
		return err
	}
	if exists {
		return nil // Admin already exists
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	admin := &models.User{
		Email:        email,
		PasswordHash: string(hashedPassword),
		Name:         name,
		Role:         models.RoleAdmin,
		Status:       models.StatusApproved,
	}

	return s.userRepo.Create(ctx, admin)
}

// ChangePassword changes a user's password.
func (s *Service) ChangePassword(ctx context.Context, userID, oldPassword, newPassword string) error {
	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		return err
	}

	// Verify old password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(oldPassword)); err != nil {
		return ErrInvalidCredentials
	}

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	user.PasswordHash = string(hashedPassword)
	return s.userRepo.Update(ctx, user)
}
