// Package models defines the data structures for MongoDB documents.
package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// NoteType represents the type of note/document.
type NoteType string

const (
	NoteTypePDF      NoteType = "pdf"
	NoteTypeDocument NoteType = "document"
	NoteTypeImage    NoteType = "image"
	NoteTypeOther    NoteType = "other"
)

// Note represents a document/note uploaded by presenters or admins.
type Note struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Title        string             `bson:"title" json:"title"`
	Description  string             `bson:"description,omitempty" json:"description"`
	FileName     string             `bson:"fileName" json:"fileName"`
	FilePath     string             `bson:"filePath" json:"-"` // Don't expose internal path
	FileSize     int64              `bson:"fileSize" json:"fileSize"`
	FileType     NoteType           `bson:"fileType" json:"fileType"`
	MimeType     string             `bson:"mimeType" json:"mimeType"`
	BatchID      primitive.ObjectID `bson:"batchId" json:"batchId"`
	BatchName    string             `bson:"batchName" json:"batchName"`
	UploaderID   primitive.ObjectID `bson:"uploaderId" json:"uploaderId"`
	UploaderName string             `bson:"uploaderName" json:"uploaderName"`
	UploaderRole string             `bson:"uploaderRole" json:"uploaderRole"`
	DownloadURL  string             `bson:"-" json:"downloadUrl"` // Generated, not stored
	CreatedAt    time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt    time.Time          `bson:"updatedAt" json:"updatedAt"`
}

// GetNoteType determines the note type from MIME type.
func GetNoteType(mimeType string) NoteType {
	switch mimeType {
	case "application/pdf":
		return NoteTypePDF
	case "application/msword",
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		"application/vnd.ms-excel",
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		"application/vnd.ms-powerpoint",
		"application/vnd.openxmlformats-officedocument.presentationml.presentation",
		"text/plain":
		return NoteTypeDocument
	case "image/jpeg", "image/png", "image/gif", "image/webp":
		return NoteTypeImage
	default:
		return NoteTypeOther
	}
}

