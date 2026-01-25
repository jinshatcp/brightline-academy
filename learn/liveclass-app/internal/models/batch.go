// Package models defines data models for the application.
package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Batch represents a group of students assigned to a presenter.
type Batch struct {
	ID          primitive.ObjectID   `bson:"_id,omitempty" json:"id"`
	Name        string               `bson:"name" json:"name"`
	Description string               `bson:"description" json:"description"`
	PresenterID primitive.ObjectID   `bson:"presenterId" json:"presenterId"`
	StudentIDs  []primitive.ObjectID `bson:"studentIds" json:"studentIds"`
	CreatedAt   time.Time            `bson:"createdAt" json:"createdAt"`
	UpdatedAt   time.Time            `bson:"updatedAt" json:"updatedAt"`
	CreatedBy   primitive.ObjectID   `bson:"createdBy" json:"createdBy"`
}

// BatchResponse is the API response for a batch.
type BatchResponse struct {
	ID            string    `json:"id"`
	Name          string    `json:"name"`
	Description   string    `json:"description"`
	PresenterID   string    `json:"presenterId"`
	PresenterName string    `json:"presenterName,omitempty"`
	StudentCount  int       `json:"studentCount"`
	CreatedAt     time.Time `json:"createdAt"`
}

// ToResponse converts Batch to BatchResponse.
func (b *Batch) ToResponse() BatchResponse {
	return BatchResponse{
		ID:           b.ID.Hex(),
		Name:         b.Name,
		Description:  b.Description,
		PresenterID:  b.PresenterID.Hex(),
		StudentCount: len(b.StudentIDs),
		CreatedAt:    b.CreatedAt,
	}
}

// HasStudent checks if a student is in the batch.
func (b *Batch) HasStudent(studentID string) bool {
	objID, err := primitive.ObjectIDFromHex(studentID)
	if err != nil {
		return false
	}
	for _, id := range b.StudentIDs {
		if id == objID {
			return true
		}
	}
	return false
}

