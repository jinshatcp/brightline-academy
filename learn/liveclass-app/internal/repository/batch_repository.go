// Package repository provides data access operations.
package repository

import (
	"context"
	"errors"
	"time"

	"github.com/mjamal5/learn/internal/cache"
	"github.com/mjamal5/learn/internal/database"
	"github.com/mjamal5/learn/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const batchesCollection = "batches"

// Batch cache key prefixes
const (
	batchByIDPrefix        = "batch:id:"
	batchByPresenterPrefix = "batch:presenter:"
	batchByStudentPrefix   = "batch:student:"
	batchAllKey            = "batch:all"
)

// Batch errors
var (
	ErrBatchNotFound = errors.New("batch not found")
)

// BatchRepository handles batch data operations with caching.
type BatchRepository struct {
	db    *database.MongoDB
	cache *cache.Cache[interface{}]
}

// NewBatchRepository creates a new BatchRepository.
func NewBatchRepository(db *database.MongoDB) *BatchRepository {
	return &BatchRepository{
		db:    db,
		cache: cache.New[interface{}](1*time.Minute, 30*time.Second),
	}
}

// NewBatchRepositoryWithCache creates a new BatchRepository with custom cache TTL.
func NewBatchRepositoryWithCache(db *database.MongoDB, cacheTTL time.Duration) *BatchRepository {
	return &BatchRepository{
		db:    db,
		cache: cache.New[interface{}](cacheTTL, 30*time.Second),
	}
}

// CreateIndexes creates necessary indexes for the batches collection.
func (r *BatchRepository) CreateIndexes(ctx context.Context) error {
	collection := r.db.Collection(batchesCollection)

	indexes := []mongo.IndexModel{
		{
			Keys: bson.D{{Key: "presenterId", Value: 1}},
		},
		{
			Keys: bson.D{{Key: "studentIds", Value: 1}},
		},
		{
			Keys: bson.D{{Key: "createdAt", Value: -1}},
		},
	}

	_, err := collection.Indexes().CreateMany(ctx, indexes)
	return err
}

// Create creates a new batch.
func (r *BatchRepository) Create(ctx context.Context, batch *models.Batch) error {
	collection := r.db.Collection(batchesCollection)

	batch.ID = primitive.NewObjectID()
	batch.CreatedAt = time.Now()
	batch.UpdatedAt = time.Now()
	if batch.StudentIDs == nil {
		batch.StudentIDs = []primitive.ObjectID{}
	}

	_, err := collection.InsertOne(ctx, batch)
	if err == nil {
		// Invalidate list caches
		r.invalidateListCaches()
		// Cache the new batch
		r.cache.Set(batchByIDPrefix+batch.ID.Hex(), batch)
	}
	return err
}

// FindByID finds a batch by ID with caching.
func (r *BatchRepository) FindByID(ctx context.Context, id string) (*models.Batch, error) {
	cacheKey := batchByIDPrefix + id

	// Try cache first
	if cached, found := r.cache.Get(cacheKey); found {
		if batch, ok := cached.(*models.Batch); ok {
			return batch, nil
		}
	}

	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, ErrBatchNotFound
	}

	collection := r.db.Collection(batchesCollection)

	var batch models.Batch
	err = collection.FindOne(ctx, bson.M{"_id": objectID}).Decode(&batch)
	if err == mongo.ErrNoDocuments {
		return nil, ErrBatchNotFound
	}
	if err != nil {
		return nil, err
	}

	// Cache the result
	r.cache.Set(cacheKey, &batch)

	return &batch, nil
}

// FindAll returns all batches with caching.
func (r *BatchRepository) FindAll(ctx context.Context) ([]models.Batch, error) {
	// Try cache first
	if cached, found := r.cache.Get(batchAllKey); found {
		if batches, ok := cached.([]models.Batch); ok {
			return batches, nil
		}
	}

	collection := r.db.Collection(batchesCollection)

	opts := options.Find().
		SetSort(bson.D{{Key: "createdAt", Value: -1}}).
		SetBatchSize(100)

	cursor, err := collection.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var batches []models.Batch
	if err := cursor.All(ctx, &batches); err != nil {
		return nil, err
	}

	// Cache the result and individual batches
	r.cache.Set(batchAllKey, batches)
	for i := range batches {
		r.cache.Set(batchByIDPrefix+batches[i].ID.Hex(), &batches[i])
	}

	return batches, nil
}

// FindByPresenter returns batches for a specific presenter with caching.
func (r *BatchRepository) FindByPresenter(ctx context.Context, presenterID string) ([]models.Batch, error) {
	cacheKey := batchByPresenterPrefix + presenterID

	// Try cache first
	if cached, found := r.cache.Get(cacheKey); found {
		if batches, ok := cached.([]models.Batch); ok {
			return batches, nil
		}
	}

	objectID, err := primitive.ObjectIDFromHex(presenterID)
	if err != nil {
		return nil, err
	}

	collection := r.db.Collection(batchesCollection)

	opts := options.Find().
		SetSort(bson.D{{Key: "createdAt", Value: -1}}).
		SetBatchSize(100)

	cursor, err := collection.Find(ctx, bson.M{"presenterId": objectID}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var batches []models.Batch
	if err := cursor.All(ctx, &batches); err != nil {
		return nil, err
	}

	// Cache the result
	r.cache.Set(cacheKey, batches)

	return batches, nil
}

// FindByStudent returns batches containing a specific student with caching.
func (r *BatchRepository) FindByStudent(ctx context.Context, studentID string) ([]models.Batch, error) {
	cacheKey := batchByStudentPrefix + studentID

	// Try cache first
	if cached, found := r.cache.Get(cacheKey); found {
		if batches, ok := cached.([]models.Batch); ok {
			return batches, nil
		}
	}

	objectID, err := primitive.ObjectIDFromHex(studentID)
	if err != nil {
		return nil, err
	}

	collection := r.db.Collection(batchesCollection)

	opts := options.Find().
		SetSort(bson.D{{Key: "createdAt", Value: -1}}).
		SetBatchSize(100)

	cursor, err := collection.Find(ctx, bson.M{"studentIds": objectID}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var batches []models.Batch
	if err := cursor.All(ctx, &batches); err != nil {
		return nil, err
	}

	// Cache the result
	r.cache.Set(cacheKey, batches)

	return batches, nil
}

// Update updates a batch and invalidates caches.
func (r *BatchRepository) Update(ctx context.Context, batch *models.Batch) error {
	collection := r.db.Collection(batchesCollection)

	batch.UpdatedAt = time.Now()

	result, err := collection.ReplaceOne(ctx, bson.M{"_id": batch.ID}, batch)
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 {
		return ErrBatchNotFound
	}

	// Invalidate and update caches
	r.invalidateBatchCaches(batch.ID.Hex())
	r.cache.Set(batchByIDPrefix+batch.ID.Hex(), batch)

	return nil
}

// AddStudents adds students to a batch and invalidates caches.
func (r *BatchRepository) AddStudents(ctx context.Context, batchID string, studentIDs []string) error {
	objectID, err := primitive.ObjectIDFromHex(batchID)
	if err != nil {
		return ErrBatchNotFound
	}

	studentObjectIDs := make([]primitive.ObjectID, len(studentIDs))
	for i, id := range studentIDs {
		oid, err := primitive.ObjectIDFromHex(id)
		if err != nil {
			return err
		}
		studentObjectIDs[i] = oid
	}

	collection := r.db.Collection(batchesCollection)

	update := bson.M{
		"$addToSet": bson.M{"studentIds": bson.M{"$each": studentObjectIDs}},
		"$set":      bson.M{"updatedAt": time.Now()},
	}

	result, err := collection.UpdateOne(ctx, bson.M{"_id": objectID}, update)
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 {
		return ErrBatchNotFound
	}

	// Invalidate caches
	r.invalidateBatchCaches(batchID)
	for _, sid := range studentIDs {
		r.cache.Delete(batchByStudentPrefix + sid)
	}

	return nil
}

// RemoveStudent removes a student from a batch and invalidates caches.
func (r *BatchRepository) RemoveStudent(ctx context.Context, batchID, studentID string) error {
	batchObjID, err := primitive.ObjectIDFromHex(batchID)
	if err != nil {
		return ErrBatchNotFound
	}

	studentObjID, err := primitive.ObjectIDFromHex(studentID)
	if err != nil {
		return err
	}

	collection := r.db.Collection(batchesCollection)

	update := bson.M{
		"$pull": bson.M{"studentIds": studentObjID},
		"$set":  bson.M{"updatedAt": time.Now()},
	}

	result, err := collection.UpdateOne(ctx, bson.M{"_id": batchObjID}, update)
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 {
		return ErrBatchNotFound
	}

	// Invalidate caches
	r.invalidateBatchCaches(batchID)
	r.cache.Delete(batchByStudentPrefix + studentID)

	return nil
}

// Delete deletes a batch and invalidates caches.
func (r *BatchRepository) Delete(ctx context.Context, id string) error {
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return ErrBatchNotFound
	}

	collection := r.db.Collection(batchesCollection)

	result, err := collection.DeleteOne(ctx, bson.M{"_id": objectID})
	if err != nil {
		return err
	}
	if result.DeletedCount == 0 {
		return ErrBatchNotFound
	}

	// Invalidate all caches
	r.invalidateBatchCaches(id)
	r.invalidateListCaches()

	return nil
}

// invalidateBatchCaches invalidates caches for a specific batch.
func (r *BatchRepository) invalidateBatchCaches(batchID string) {
	r.cache.Delete(batchByIDPrefix + batchID)
	r.invalidateListCaches()
}

// invalidateListCaches invalidates all list caches.
func (r *BatchRepository) invalidateListCaches() {
	r.cache.Delete(batchAllKey)
	r.cache.DeletePrefix(batchByPresenterPrefix)
	r.cache.DeletePrefix(batchByStudentPrefix)
}

// ClearCache clears all cached batches.
func (r *BatchRepository) ClearCache() {
	r.cache.Clear()
}
