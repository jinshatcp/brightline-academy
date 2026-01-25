// Package repository provides data access operations.
package repository

import (
	"context"
	"errors"
	"time"

	"github.com/jinshatcp/brightline-academy/learn/internal/cache"
	"github.com/jinshatcp/brightline-academy/learn/internal/database"
	"github.com/jinshatcp/brightline-academy/learn/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const recordingsCollection = "recordings"

// Recording cache key prefixes
const (
	recordingByIDPrefix       = "recording:id:"
	recordingBySchedulePrefix = "recording:schedule:"
)

// Recording errors
var (
	ErrRecordingNotFound = errors.New("recording not found")
)

// RecordingRepository handles recording data operations with caching.
type RecordingRepository struct {
	db    *database.MongoDB
	cache *cache.Cache[*models.Recording]
}

// NewRecordingRepository creates a new RecordingRepository.
func NewRecordingRepository(db *database.MongoDB) *RecordingRepository {
	return &RecordingRepository{
		db:    db,
		cache: cache.New[*models.Recording](2*time.Minute, 1*time.Minute),
	}
}

// CreateIndexes creates necessary indexes for the recordings collection.
func (r *RecordingRepository) CreateIndexes(ctx context.Context) error {
	collection := r.db.Collection(recordingsCollection)

	indexes := []mongo.IndexModel{
		{
			Keys: bson.D{{Key: "batchId", Value: 1}},
		},
		{
			Keys: bson.D{{Key: "presenterId", Value: 1}},
		},
		{
			Keys: bson.D{{Key: "scheduleId", Value: 1}},
		},
		{
			Keys: bson.D{{Key: "status", Value: 1}},
		},
		{
			Keys: bson.D{{Key: "recordedAt", Value: -1}},
		},
		// Compound index for common query
		{
			Keys: bson.D{{Key: "batchId", Value: 1}, {Key: "status", Value: 1}, {Key: "recordedAt", Value: -1}},
		},
	}

	_, err := collection.Indexes().CreateMany(ctx, indexes)
	return err
}

// Create creates a new recording.
func (r *RecordingRepository) Create(ctx context.Context, recording *models.Recording) error {
	collection := r.db.Collection(recordingsCollection)

	recording.ID = primitive.NewObjectID()
	recording.CreatedAt = time.Now()
	recording.UpdatedAt = time.Now()

	_, err := collection.InsertOne(ctx, recording)
	if err == nil {
		r.cache.Set(recordingByIDPrefix+recording.ID.Hex(), recording)
	}
	return err
}

// FindByID finds a recording by ID with caching.
func (r *RecordingRepository) FindByID(ctx context.Context, id string) (*models.Recording, error) {
	cacheKey := recordingByIDPrefix + id

	// Try cache first
	if recording, found := r.cache.Get(cacheKey); found {
		return recording, nil
	}

	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, ErrRecordingNotFound
	}

	collection := r.db.Collection(recordingsCollection)

	var recording models.Recording
	err = collection.FindOne(ctx, bson.M{"_id": objectID}).Decode(&recording)
	if err == mongo.ErrNoDocuments {
		return nil, ErrRecordingNotFound
	}
	if err != nil {
		return nil, err
	}

	// Cache the result
	r.cache.Set(cacheKey, &recording)

	return &recording, nil
}

// FindBySchedule finds a recording by schedule ID with caching.
func (r *RecordingRepository) FindBySchedule(ctx context.Context, scheduleID string) (*models.Recording, error) {
	cacheKey := recordingBySchedulePrefix + scheduleID

	// Try cache first
	if recording, found := r.cache.Get(cacheKey); found {
		return recording, nil
	}

	objectID, err := primitive.ObjectIDFromHex(scheduleID)
	if err != nil {
		return nil, ErrRecordingNotFound
	}

	collection := r.db.Collection(recordingsCollection)

	var recording models.Recording
	err = collection.FindOne(ctx, bson.M{"scheduleId": objectID}).Decode(&recording)
	if err == mongo.ErrNoDocuments {
		return nil, ErrRecordingNotFound
	}
	if err != nil {
		return nil, err
	}

	// Cache the result
	r.cache.Set(cacheKey, &recording)
	r.cache.Set(recordingByIDPrefix+recording.ID.Hex(), &recording)

	return &recording, nil
}

// FindByBatch returns recordings for a specific batch.
func (r *RecordingRepository) FindByBatch(ctx context.Context, batchID string) ([]models.Recording, error) {
	objectID, err := primitive.ObjectIDFromHex(batchID)
	if err != nil {
		return nil, err
	}

	collection := r.db.Collection(recordingsCollection)

	filter := bson.M{
		"batchId": objectID,
		"status":  models.RecordingStatusReady,
	}

	opts := options.Find().
		SetSort(bson.D{{Key: "recordedAt", Value: -1}}).
		SetBatchSize(100)

	cursor, err := collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var recordings []models.Recording
	if err := cursor.All(ctx, &recordings); err != nil {
		return nil, err
	}

	// Cache individual recordings
	for i := range recordings {
		r.cache.Set(recordingByIDPrefix+recordings[i].ID.Hex(), &recordings[i])
	}

	return recordings, nil
}

// FindByBatches returns recordings for multiple batches.
func (r *RecordingRepository) FindByBatches(ctx context.Context, batchIDs []string) ([]models.Recording, error) {
	objectIDs := make([]primitive.ObjectID, 0, len(batchIDs))
	for _, id := range batchIDs {
		oid, err := primitive.ObjectIDFromHex(id)
		if err != nil {
			continue
		}
		objectIDs = append(objectIDs, oid)
	}

	if len(objectIDs) == 0 {
		return []models.Recording{}, nil
	}

	collection := r.db.Collection(recordingsCollection)

	filter := bson.M{
		"batchId": bson.M{"$in": objectIDs},
		"status":  models.RecordingStatusReady,
	}

	opts := options.Find().
		SetSort(bson.D{{Key: "recordedAt", Value: -1}}).
		SetBatchSize(100)

	cursor, err := collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var recordings []models.Recording
	if err := cursor.All(ctx, &recordings); err != nil {
		return nil, err
	}

	// Cache individual recordings
	for i := range recordings {
		r.cache.Set(recordingByIDPrefix+recordings[i].ID.Hex(), &recordings[i])
	}

	return recordings, nil
}

// FindByPresenter returns recordings by a specific presenter.
func (r *RecordingRepository) FindByPresenter(ctx context.Context, presenterID string) ([]models.Recording, error) {
	objectID, err := primitive.ObjectIDFromHex(presenterID)
	if err != nil {
		return nil, err
	}

	collection := r.db.Collection(recordingsCollection)

	opts := options.Find().
		SetSort(bson.D{{Key: "recordedAt", Value: -1}}).
		SetBatchSize(100)

	cursor, err := collection.Find(ctx, bson.M{"presenterId": objectID}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var recordings []models.Recording
	if err := cursor.All(ctx, &recordings); err != nil {
		return nil, err
	}

	// Cache individual recordings
	for i := range recordings {
		r.cache.Set(recordingByIDPrefix+recordings[i].ID.Hex(), &recordings[i])
	}

	return recordings, nil
}

// FindAll returns all recordings (for admin).
func (r *RecordingRepository) FindAll(ctx context.Context) ([]models.Recording, error) {
	collection := r.db.Collection(recordingsCollection)

	opts := options.Find().
		SetSort(bson.D{{Key: "recordedAt", Value: -1}}).
		SetBatchSize(100)

	cursor, err := collection.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var recordings []models.Recording
	if err := cursor.All(ctx, &recordings); err != nil {
		return nil, err
	}

	// Cache individual recordings
	for i := range recordings {
		r.cache.Set(recordingByIDPrefix+recordings[i].ID.Hex(), &recordings[i])
	}

	return recordings, nil
}

// Update updates a recording and invalidates cache.
func (r *RecordingRepository) Update(ctx context.Context, recording *models.Recording) error {
	collection := r.db.Collection(recordingsCollection)

	recording.UpdatedAt = time.Now()

	result, err := collection.ReplaceOne(ctx, bson.M{"_id": recording.ID}, recording)
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 {
		return ErrRecordingNotFound
	}

	// Update cache
	r.cache.Set(recordingByIDPrefix+recording.ID.Hex(), recording)

	return nil
}

// UpdateStatus updates the status of a recording and invalidates cache.
func (r *RecordingRepository) UpdateStatus(ctx context.Context, id string, status models.RecordingStatus) error {
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return ErrRecordingNotFound
	}

	collection := r.db.Collection(recordingsCollection)

	update := bson.M{
		"$set": bson.M{
			"status":    status,
			"updatedAt": time.Now(),
		},
	}

	result, err := collection.UpdateOne(ctx, bson.M{"_id": objectID}, update)
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 {
		return ErrRecordingNotFound
	}

	// Invalidate cache
	r.cache.Delete(recordingByIDPrefix + id)

	return nil
}

// Delete deletes a recording and invalidates cache.
func (r *RecordingRepository) Delete(ctx context.Context, id string) error {
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return ErrRecordingNotFound
	}

	collection := r.db.Collection(recordingsCollection)

	result, err := collection.DeleteOne(ctx, bson.M{"_id": objectID})
	if err != nil {
		return err
	}
	if result.DeletedCount == 0 {
		return ErrRecordingNotFound
	}

	// Invalidate cache
	r.cache.Delete(recordingByIDPrefix + id)

	return nil
}

// ClearCache clears all cached recordings.
func (r *RecordingRepository) ClearCache() {
	r.cache.Clear()
}
