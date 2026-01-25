// Package models defines data models for the application.
package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ClassStatus represents the status of a scheduled class.
type ClassStatus string

const (
	ClassStatusScheduled ClassStatus = "scheduled"
	ClassStatusLive      ClassStatus = "live"
	ClassStatusCompleted ClassStatus = "completed"
	ClassStatusCancelled ClassStatus = "cancelled"
)

// ScheduledClass represents a scheduled class session.
type ScheduledClass struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Title       string             `bson:"title" json:"title"`
	Description string             `bson:"description" json:"description"`
	BatchID     primitive.ObjectID `bson:"batchId" json:"batchId"`
	PresenterID primitive.ObjectID `bson:"presenterId" json:"presenterId"`
	StartTime   time.Time          `bson:"startTime" json:"startTime"`
	EndTime     time.Time          `bson:"endTime" json:"endTime"`
	Status      ClassStatus        `bson:"status" json:"status"`
	RoomID      string             `bson:"roomId,omitempty" json:"roomId,omitempty"`
	CreatedAt   time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt   time.Time          `bson:"updatedAt" json:"updatedAt"`
}

// ScheduledClassResponse is the API response for a scheduled class.
type ScheduledClassResponse struct {
	ID            string      `json:"id"`
	Title         string      `json:"title"`
	Description   string      `json:"description"`
	BatchID       string      `json:"batchId"`
	BatchName     string      `json:"batchName,omitempty"`
	PresenterID   string      `json:"presenterId"`
	PresenterName string      `json:"presenterName,omitempty"`
	StartTime     time.Time   `json:"startTime"`
	EndTime       time.Time   `json:"endTime"`
	Status        ClassStatus `json:"status"`
	RoomID        string      `json:"roomId,omitempty"`
	CanJoin       bool        `json:"canJoin"`
}

// ToResponse converts ScheduledClass to ScheduledClassResponse.
func (s *ScheduledClass) ToResponse() ScheduledClassResponse {
	return ScheduledClassResponse{
		ID:          s.ID.Hex(),
		Title:       s.Title,
		Description: s.Description,
		BatchID:     s.BatchID.Hex(),
		PresenterID: s.PresenterID.Hex(),
		StartTime:   s.StartTime,
		EndTime:     s.EndTime,
		Status:      s.EffectiveStatus(),
		RoomID:      s.RoomID,
		CanJoin:     s.CanJoin(),
	}
}

// EffectiveStatus returns the actual status considering time constraints.
// If a class is marked "live" but time is over, return "completed".
// If a class is "scheduled" but time is over, return "completed".
func (s *ScheduledClass) EffectiveStatus() ClassStatus {
	now := time.Now()

	// If already completed or cancelled, return as-is
	if s.Status == ClassStatusCompleted || s.Status == ClassStatusCancelled {
		return s.Status
	}

	// If time is over, it should be completed regardless of stored status
	if now.After(s.EndTime) {
		return ClassStatusCompleted
	}

	// Return stored status if within time window
	return s.Status
}

// CanJoin checks if the class can be joined (within 15 min before start or during class).
func (s *ScheduledClass) CanJoin() bool {
	now := time.Now()
	effectiveStatus := s.EffectiveStatus()

	// Can't join completed or cancelled classes
	if effectiveStatus == ClassStatusCompleted || effectiveStatus == ClassStatusCancelled {
		return false
	}

	// Can join if class is live (and not past end time - handled by EffectiveStatus)
	if effectiveStatus == ClassStatusLive {
		return true
	}

	// Can join scheduled class within 15 min before start until end time
	joinWindow := s.StartTime.Add(-15 * time.Minute)
	return now.After(joinWindow) && now.Before(s.EndTime)
}

// IsUpcoming checks if the class is upcoming.
func (s *ScheduledClass) IsUpcoming() bool {
	return s.Status == ClassStatusScheduled && time.Now().Before(s.StartTime)
}

// Duration returns the class duration.
func (s *ScheduledClass) Duration() time.Duration {
	return s.EndTime.Sub(s.StartTime)
}
