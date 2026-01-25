// Package repository provides data access operations.
package repository

import (
	"context"
	"time"

	"github.com/jinshatcp/brightline-academy/learn/internal/cache"
	"github.com/jinshatcp/brightline-academy/learn/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Note cache key prefix
const noteByIDPrefix = "note:id:"

// NoteRepository handles note database operations with caching.
type NoteRepository struct {
	collection *mongo.Collection
	cache      *cache.Cache[*models.Note]
}

// NewNoteRepository creates a new note repository.
func NewNoteRepository(db *mongo.Database) *NoteRepository {
	return &NoteRepository{
		collection: db.Collection("notes"),
		cache:      cache.New[*models.Note](2*time.Minute, 1*time.Minute),
	}
}

// CreateIndexes creates necessary indexes for the notes collection.
func (r *NoteRepository) CreateIndexes(ctx context.Context) error {
	indexes := []mongo.IndexModel{
		{
			Keys: bson.D{{Key: "batchId", Value: 1}},
		},
		{
			Keys: bson.D{{Key: "uploaderId", Value: 1}},
		},
		{
			Keys: bson.D{{Key: "createdAt", Value: -1}},
		},
		// Compound index for common query
		{
			Keys: bson.D{{Key: "batchId", Value: 1}, {Key: "createdAt", Value: -1}},
		},
	}

	_, err := r.collection.Indexes().CreateMany(ctx, indexes)
	return err
}

// Create inserts a new note into the database.
func (r *NoteRepository) Create(ctx context.Context, note *models.Note) error {
	note.CreatedAt = time.Now()
	note.UpdatedAt = time.Now()

	result, err := r.collection.InsertOne(ctx, note)
	if err != nil {
		return err
	}

	note.ID = result.InsertedID.(primitive.ObjectID)

	// Cache the new note
	r.cache.Set(noteByIDPrefix+note.ID.Hex(), note)

	return nil
}

// FindByID retrieves a note by its ID with caching.
func (r *NoteRepository) FindByID(ctx context.Context, id primitive.ObjectID) (*models.Note, error) {
	cacheKey := noteByIDPrefix + id.Hex()

	// Try cache first
	if note, found := r.cache.Get(cacheKey); found {
		return note, nil
	}

	var note models.Note
	err := r.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&note)
	if err != nil {
		return nil, err
	}

	// Cache the result
	r.cache.Set(cacheKey, &note)

	return &note, nil
}

// FindAll retrieves all notes (for admin).
func (r *NoteRepository) FindAll(ctx context.Context) ([]*models.Note, error) {
	opts := options.Find().
		SetSort(bson.D{{Key: "createdAt", Value: -1}}).
		SetBatchSize(100)

	cursor, err := r.collection.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var notes []*models.Note
	if err = cursor.All(ctx, &notes); err != nil {
		return nil, err
	}

	// Cache individual notes
	for _, note := range notes {
		r.cache.Set(noteByIDPrefix+note.ID.Hex(), note)
	}

	return notes, nil
}

// FindByBatch retrieves all notes for a specific batch.
func (r *NoteRepository) FindByBatch(ctx context.Context, batchID primitive.ObjectID) ([]*models.Note, error) {
	opts := options.Find().
		SetSort(bson.D{{Key: "createdAt", Value: -1}}).
		SetBatchSize(100)

	cursor, err := r.collection.Find(ctx, bson.M{"batchId": batchID}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var notes []*models.Note
	if err = cursor.All(ctx, &notes); err != nil {
		return nil, err
	}

	// Cache individual notes
	for _, note := range notes {
		r.cache.Set(noteByIDPrefix+note.ID.Hex(), note)
	}

	return notes, nil
}

// FindByBatches retrieves all notes for multiple batches (for students in multiple batches).
func (r *NoteRepository) FindByBatches(ctx context.Context, batchIDs []primitive.ObjectID) ([]*models.Note, error) {
	if len(batchIDs) == 0 {
		return []*models.Note{}, nil
	}

	opts := options.Find().
		SetSort(bson.D{{Key: "createdAt", Value: -1}}).
		SetBatchSize(100)

	cursor, err := r.collection.Find(ctx, bson.M{"batchId": bson.M{"$in": batchIDs}}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var notes []*models.Note
	if err = cursor.All(ctx, &notes); err != nil {
		return nil, err
	}

	// Cache individual notes
	for _, note := range notes {
		r.cache.Set(noteByIDPrefix+note.ID.Hex(), note)
	}

	return notes, nil
}

// FindByUploader retrieves all notes uploaded by a specific user.
func (r *NoteRepository) FindByUploader(ctx context.Context, uploaderID primitive.ObjectID) ([]*models.Note, error) {
	opts := options.Find().
		SetSort(bson.D{{Key: "createdAt", Value: -1}}).
		SetBatchSize(100)

	cursor, err := r.collection.Find(ctx, bson.M{"uploaderId": uploaderID}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var notes []*models.Note
	if err = cursor.All(ctx, &notes); err != nil {
		return nil, err
	}

	// Cache individual notes
	for _, note := range notes {
		r.cache.Set(noteByIDPrefix+note.ID.Hex(), note)
	}

	return notes, nil
}

// Update updates an existing note and invalidates cache.
func (r *NoteRepository) Update(ctx context.Context, note *models.Note) error {
	note.UpdatedAt = time.Now()

	update := bson.M{
		"$set": bson.M{
			"title":       note.Title,
			"description": note.Description,
			"updatedAt":   note.UpdatedAt,
		},
	}

	_, err := r.collection.UpdateOne(ctx, bson.M{"_id": note.ID}, update)
	if err == nil {
		// Update cache
		r.cache.Set(noteByIDPrefix+note.ID.Hex(), note)
	}
	return err
}

// Delete removes a note by its ID and invalidates cache.
func (r *NoteRepository) Delete(ctx context.Context, id primitive.ObjectID) error {
	_, err := r.collection.DeleteOne(ctx, bson.M{"_id": id})
	if err == nil {
		// Invalidate cache
		r.cache.Delete(noteByIDPrefix + id.Hex())
	}
	return err
}

// CountByBatch returns the number of notes in a batch.
func (r *NoteRepository) CountByBatch(ctx context.Context, batchID primitive.ObjectID) (int64, error) {
	return r.collection.CountDocuments(ctx, bson.M{"batchId": batchID})
}

// ClearCache clears all cached notes.
func (r *NoteRepository) ClearCache() {
	r.cache.Clear()
}
