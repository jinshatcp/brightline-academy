// Package models defines data models for the application.
package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// RecordingStatus represents the status of a recording.
type RecordingStatus string

const (
	RecordingStatusUploading  RecordingStatus = "uploading"
	RecordingStatusProcessing RecordingStatus = "processing"
	RecordingStatusReady      RecordingStatus = "ready"
	RecordingStatusFailed     RecordingStatus = "failed"
)

// Recording represents a recorded class session.
type Recording struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	ScheduleID  primitive.ObjectID `bson:"scheduleId" json:"scheduleId"`
	BatchID     primitive.ObjectID `bson:"batchId" json:"batchId"`
	PresenterID primitive.ObjectID `bson:"presenterId" json:"presenterId"`
	Title       string             `bson:"title" json:"title"`
	Description string             `bson:"description" json:"description"`
	FileName    string             `bson:"fileName" json:"fileName"`
	FilePath    string             `bson:"filePath" json:"-"` // Internal path, not exposed
	FileSize    int64              `bson:"fileSize" json:"fileSize"`
	Duration    int                `bson:"duration" json:"duration"` // Duration in seconds
	MimeType    string             `bson:"mimeType" json:"mimeType"`
	Status      RecordingStatus    `bson:"status" json:"status"`
	RecordedAt  time.Time          `bson:"recordedAt" json:"recordedAt"`
	CreatedAt   time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt   time.Time          `bson:"updatedAt" json:"updatedAt"`
}

// RecordingResponse is the API response for a recording.
type RecordingResponse struct {
	ID            string          `json:"id"`
	ScheduleID    string          `json:"scheduleId"`
	BatchID       string          `json:"batchId"`
	BatchName     string          `json:"batchName,omitempty"`
	PresenterID   string          `json:"presenterId"`
	PresenterName string          `json:"presenterName,omitempty"`
	Title         string          `json:"title"`
	Description   string          `json:"description"`
	FileSize      int64           `json:"fileSize"`
	Duration      int             `json:"duration"`
	Status        RecordingStatus `json:"status"`
	RecordedAt    time.Time       `json:"recordedAt"`
	StreamURL     string          `json:"streamUrl,omitempty"`
}

// ToResponse converts Recording to RecordingResponse.
func (r *Recording) ToResponse() RecordingResponse {
	return RecordingResponse{
		ID:          r.ID.Hex(),
		ScheduleID:  r.ScheduleID.Hex(),
		BatchID:     r.BatchID.Hex(),
		PresenterID: r.PresenterID.Hex(),
		Title:       r.Title,
		Description: r.Description,
		FileSize:    r.FileSize,
		Duration:    r.Duration,
		Status:      r.Status,
		RecordedAt:  r.RecordedAt,
	}
}

// IsReady checks if the recording is ready for playback.
func (r *Recording) IsReady() bool {
	return r.Status == RecordingStatusReady
}

// FormatDuration returns duration as a formatted string (e.g., "1h 30m").
func (r *Recording) FormatDuration() string {
	hours := r.Duration / 3600
	minutes := (r.Duration % 3600) / 60

	if hours > 0 {
		return string(rune(hours)) + "h " + string(rune(minutes)) + "m"
	}
	return string(rune(minutes)) + "m"
}

// FormatFileSize returns file size as a human-readable string.
func (r *Recording) FormatFileSize() string {
	const (
		KB = 1024
		MB = KB * 1024
		GB = MB * 1024
	)

	switch {
	case r.FileSize >= GB:
		return string(rune(r.FileSize/GB)) + " GB"
	case r.FileSize >= MB:
		return string(rune(r.FileSize/MB)) + " MB"
	case r.FileSize >= KB:
		return string(rune(r.FileSize/KB)) + " KB"
	default:
		return string(rune(r.FileSize)) + " B"
	}
}
