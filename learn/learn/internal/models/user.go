// Package models defines data models for the application.
package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// UserRole represents the role of a user.
type UserRole string

const (
	RoleAdmin     UserRole = "admin"
	RolePresenter UserRole = "presenter"
	RoleStudent   UserRole = "student"
)

// UserStatus represents the account status.
type UserStatus string

const (
	StatusPending   UserStatus = "pending"
	StatusApproved  UserStatus = "approved"
	StatusRejected  UserStatus = "rejected"
	StatusSuspended UserStatus = "suspended"
)

// User represents a user in the system.
type User struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Email        string             `bson:"email" json:"email"`
	PasswordHash string             `bson:"passwordHash" json:"-"`
	Name         string             `bson:"name" json:"name"`
	Role         UserRole           `bson:"role" json:"role"`
	Status       UserStatus         `bson:"status" json:"status"`
	CreatedAt    time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt    time.Time          `bson:"updatedAt" json:"updatedAt"`
	ApprovedBy   primitive.ObjectID `bson:"approvedBy,omitempty" json:"approvedBy,omitempty"`
	ApprovedAt   *time.Time         `bson:"approvedAt,omitempty" json:"approvedAt,omitempty"`
}

// UserResponse is the safe user response without sensitive data.
type UserResponse struct {
	ID        string     `json:"id"`
	Email     string     `json:"email"`
	Name      string     `json:"name"`
	Role      UserRole   `json:"role"`
	Status    UserStatus `json:"status"`
	CreatedAt time.Time  `json:"createdAt"`
}

// ToResponse converts User to UserResponse.
func (u *User) ToResponse() UserResponse {
	return UserResponse{
		ID:        u.ID.Hex(),
		Email:     u.Email,
		Name:      u.Name,
		Role:      u.Role,
		Status:    u.Status,
		CreatedAt: u.CreatedAt,
	}
}

// IsApproved checks if user is approved.
func (u *User) IsApproved() bool {
	return u.Status == StatusApproved
}

// CanAccessClassroom checks if user can access classroom features.
func (u *User) CanAccessClassroom() bool {
	return u.Status == StatusApproved && (u.Role == RolePresenter || u.Role == RoleStudent)
}

// IsAdmin checks if user is admin.
func (u *User) IsAdmin() bool {
	return u.Role == RoleAdmin
}
