// Package repository provides data access operations.
package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/mjamal5/learn/internal/cache"
	"github.com/mjamal5/learn/internal/database"
	"github.com/mjamal5/learn/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const schedulesCollection = "scheduled_classes"

// Schedule cache key prefixes
const (
	scheduleByIDPrefix     = "schedule:id:"
	scheduleByRoomPrefix   = "schedule:room:"
	scheduleByBatchPrefix  = "schedule:batch:"
	scheduleUpcomingPrefix = "schedule:upcoming:"
)

// Schedule errors
var (
	ErrScheduleNotFound = errors.New("scheduled class not found")
)

// ScheduleRepository handles scheduled class data operations with caching.
type ScheduleRepository struct {
	db    *database.MongoDB
	cache *cache.Cache[interface{}]
}

// NewScheduleRepository creates a new ScheduleRepository.
func NewScheduleRepository(db *database.MongoDB) *ScheduleRepository {
	return &ScheduleRepository{
		db:    db,
		cache: cache.New[interface{}](30*time.Second, 15*time.Second),
	}
}

// NewScheduleRepositoryWithCache creates a new ScheduleRepository with custom cache TTL.
func NewScheduleRepositoryWithCache(db *database.MongoDB, cacheTTL time.Duration) *ScheduleRepository {
	return &ScheduleRepository{
		db:    db,
		cache: cache.New[interface{}](cacheTTL, 15*time.Second),
	}
}

// CreateIndexes creates necessary indexes for the schedules collection.
func (r *ScheduleRepository) CreateIndexes(ctx context.Context) error {
	collection := r.db.Collection(schedulesCollection)

	indexes := []mongo.IndexModel{
		{
			Keys: bson.D{{Key: "presenterId", Value: 1}},
		},
		{
			Keys: bson.D{{Key: "batchId", Value: 1}},
		},
		{
			Keys: bson.D{{Key: "roomId", Value: 1}},
		},
		{
			Keys: bson.D{{Key: "startTime", Value: 1}},
		},
		{
			Keys: bson.D{{Key: "status", Value: 1}},
		},
		// Compound indexes for common queries
		{
			Keys: bson.D{{Key: "batchId", Value: 1}, {Key: "startTime", Value: 1}},
		},
		{
			Keys: bson.D{{Key: "presenterId", Value: 1}, {Key: "startTime", Value: 1}},
		},
	}

	_, err := collection.Indexes().CreateMany(ctx, indexes)
	return err
}

// Create creates a new scheduled class.
func (r *ScheduleRepository) Create(ctx context.Context, schedule *models.ScheduledClass) error {
	collection := r.db.Collection(schedulesCollection)

	schedule.ID = primitive.NewObjectID()
	schedule.Status = models.ClassStatusScheduled
	schedule.CreatedAt = time.Now()
	schedule.UpdatedAt = time.Now()

	_, err := collection.InsertOne(ctx, schedule)
	if err == nil {
		// Cache the new schedule
		r.cache.Set(scheduleByIDPrefix+schedule.ID.Hex(), schedule)
		// Invalidate list caches
		r.invalidateListCaches()
	}
	return err
}

// FindByID finds a scheduled class by ID with caching.
func (r *ScheduleRepository) FindByID(ctx context.Context, id string) (*models.ScheduledClass, error) {
	cacheKey := scheduleByIDPrefix + id

	// Try cache first
	if cached, found := r.cache.Get(cacheKey); found {
		if schedule, ok := cached.(*models.ScheduledClass); ok {
			return schedule, nil
		}
	}

	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, ErrScheduleNotFound
	}

	collection := r.db.Collection(schedulesCollection)

	var schedule models.ScheduledClass
	err = collection.FindOne(ctx, bson.M{"_id": objectID}).Decode(&schedule)
	if err == mongo.ErrNoDocuments {
		return nil, ErrScheduleNotFound
	}
	if err != nil {
		return nil, err
	}

	// Cache the result
	r.cache.Set(cacheKey, &schedule)

	return &schedule, nil
}

// FindByRoomID finds a scheduled class by room ID with caching.
func (r *ScheduleRepository) FindByRoomID(ctx context.Context, roomID string) (*models.ScheduledClass, error) {
	cacheKey := scheduleByRoomPrefix + roomID

	// Try cache first
	if cached, found := r.cache.Get(cacheKey); found {
		if schedule, ok := cached.(*models.ScheduledClass); ok {
			return schedule, nil
		}
	}

	collection := r.db.Collection(schedulesCollection)

	var schedule models.ScheduledClass
	err := collection.FindOne(ctx, bson.M{"roomId": roomID}).Decode(&schedule)
	if err == mongo.ErrNoDocuments {
		return nil, ErrScheduleNotFound
	}
	if err != nil {
		return nil, err
	}

	// Cache the result
	r.cache.Set(cacheKey, &schedule)
	r.cache.Set(scheduleByIDPrefix+schedule.ID.Hex(), &schedule)

	return &schedule, nil
}

// FindByPresenter returns scheduled classes for a presenter.
func (r *ScheduleRepository) FindByPresenter(ctx context.Context, presenterID string, fromDate, toDate time.Time) ([]models.ScheduledClass, error) {
	objectID, err := primitive.ObjectIDFromHex(presenterID)
	if err != nil {
		return nil, err
	}

	collection := r.db.Collection(schedulesCollection)

	filter := bson.M{
		"presenterId": objectID,
		"startTime": bson.M{
			"$gte": fromDate,
			"$lte": toDate,
		},
	}

	opts := options.Find().
		SetSort(bson.D{{Key: "startTime", Value: 1}}).
		SetBatchSize(100)

	cursor, err := collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var schedules []models.ScheduledClass
	if err := cursor.All(ctx, &schedules); err != nil {
		return nil, err
	}

	// Cache individual schedules
	for i := range schedules {
		r.cache.Set(scheduleByIDPrefix+schedules[i].ID.Hex(), &schedules[i])
	}

	return schedules, nil
}

// FindByBatch returns scheduled classes for a batch with caching.
func (r *ScheduleRepository) FindByBatch(ctx context.Context, batchID string, fromDate, toDate time.Time) ([]models.ScheduledClass, error) {
	cacheKey := fmt.Sprintf("%s%s:%d:%d", scheduleByBatchPrefix, batchID, fromDate.Unix(), toDate.Unix())

	// Try cache first
	if cached, found := r.cache.Get(cacheKey); found {
		if schedules, ok := cached.([]models.ScheduledClass); ok {
			return schedules, nil
		}
	}

	objectID, err := primitive.ObjectIDFromHex(batchID)
	if err != nil {
		return nil, err
	}

	collection := r.db.Collection(schedulesCollection)

	filter := bson.M{
		"batchId": objectID,
		"startTime": bson.M{
			"$gte": fromDate,
			"$lte": toDate,
		},
	}

	opts := options.Find().
		SetSort(bson.D{{Key: "startTime", Value: 1}}).
		SetBatchSize(100)

	cursor, err := collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var schedules []models.ScheduledClass
	if err := cursor.All(ctx, &schedules); err != nil {
		return nil, err
	}

	// Cache the result and individual schedules
	r.cache.Set(cacheKey, schedules)
	for i := range schedules {
		r.cache.Set(scheduleByIDPrefix+schedules[i].ID.Hex(), &schedules[i])
	}

	return schedules, nil
}

// FindByBatches returns scheduled classes for multiple batches.
func (r *ScheduleRepository) FindByBatches(ctx context.Context, batchIDs []string, fromDate, toDate time.Time) ([]models.ScheduledClass, error) {
	objectIDs := make([]primitive.ObjectID, 0, len(batchIDs))
	for _, id := range batchIDs {
		oid, err := primitive.ObjectIDFromHex(id)
		if err != nil {
			continue
		}
		objectIDs = append(objectIDs, oid)
	}

	if len(objectIDs) == 0 {
		return []models.ScheduledClass{}, nil
	}

	collection := r.db.Collection(schedulesCollection)

	filter := bson.M{
		"batchId": bson.M{"$in": objectIDs},
		"startTime": bson.M{
			"$gte": fromDate,
			"$lte": toDate,
		},
	}

	opts := options.Find().
		SetSort(bson.D{{Key: "startTime", Value: 1}}).
		SetBatchSize(100)

	cursor, err := collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var schedules []models.ScheduledClass
	if err := cursor.All(ctx, &schedules); err != nil {
		return nil, err
	}

	// Cache individual schedules
	for i := range schedules {
		r.cache.Set(scheduleByIDPrefix+schedules[i].ID.Hex(), &schedules[i])
	}

	return schedules, nil
}

// FindUpcoming returns upcoming classes (next 7 days) with caching.
func (r *ScheduleRepository) FindUpcoming(ctx context.Context, batchIDs []string) ([]models.ScheduledClass, error) {
	now := time.Now()
	endDate := now.AddDate(0, 0, 7)
	return r.FindByBatches(ctx, batchIDs, now, endDate)
}

// Update updates a scheduled class and invalidates caches.
func (r *ScheduleRepository) Update(ctx context.Context, schedule *models.ScheduledClass) error {
	collection := r.db.Collection(schedulesCollection)

	schedule.UpdatedAt = time.Now()

	result, err := collection.ReplaceOne(ctx, bson.M{"_id": schedule.ID}, schedule)
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 {
		return ErrScheduleNotFound
	}

	// Update cache
	r.cache.Set(scheduleByIDPrefix+schedule.ID.Hex(), schedule)
	if schedule.RoomID != "" {
		r.cache.Set(scheduleByRoomPrefix+schedule.RoomID, schedule)
	}
	r.invalidateListCaches()

	return nil
}

// UpdateStatus updates the status of a scheduled class and invalidates caches.
func (r *ScheduleRepository) UpdateStatus(ctx context.Context, id string, status models.ClassStatus, roomID string) error {
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return ErrScheduleNotFound
	}

	collection := r.db.Collection(schedulesCollection)

	update := bson.M{
		"$set": bson.M{
			"status":    status,
			"roomId":    roomID,
			"updatedAt": time.Now(),
		},
	}

	result, err := collection.UpdateOne(ctx, bson.M{"_id": objectID}, update)
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 {
		return ErrScheduleNotFound
	}

	// Invalidate caches
	r.cache.Delete(scheduleByIDPrefix + id)
	if roomID != "" {
		r.cache.Delete(scheduleByRoomPrefix + roomID)
	}
	r.invalidateListCaches()

	return nil
}

// Delete deletes a scheduled class and invalidates caches.
func (r *ScheduleRepository) Delete(ctx context.Context, id string) error {
	// Get schedule first to invalidate room cache
	schedule, _ := r.FindByID(ctx, id)

	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return ErrScheduleNotFound
	}

	collection := r.db.Collection(schedulesCollection)

	result, err := collection.DeleteOne(ctx, bson.M{"_id": objectID})
	if err != nil {
		return err
	}
	if result.DeletedCount == 0 {
		return ErrScheduleNotFound
	}

	// Invalidate caches
	r.cache.Delete(scheduleByIDPrefix + id)
	if schedule != nil && schedule.RoomID != "" {
		r.cache.Delete(scheduleByRoomPrefix + schedule.RoomID)
	}
	r.invalidateListCaches()

	return nil
}

// invalidateListCaches invalidates all list caches.
func (r *ScheduleRepository) invalidateListCaches() {
	r.cache.DeletePrefix(scheduleByBatchPrefix)
	r.cache.DeletePrefix(scheduleUpcomingPrefix)
}

// ClearCache clears all cached schedules.
func (r *ScheduleRepository) ClearCache() {
	r.cache.Clear()
}
