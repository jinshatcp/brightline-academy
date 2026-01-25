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

const usersCollection = "users"

// Cache key prefixes
const (
	userByIDPrefix    = "user:id:"
	userByEmailPrefix = "user:email:"
	usersListPrefix   = "users:list:"
)

// Common errors
var (
	ErrUserNotFound       = errors.New("user not found")
	ErrEmailAlreadyExists = errors.New("email already exists")
)

// UserRepository handles user data operations with caching.
type UserRepository struct {
	db    *database.MongoDB
	cache *cache.Cache[*models.User]
}

// NewUserRepository creates a new UserRepository.
func NewUserRepository(db *database.MongoDB) *UserRepository {
	return &UserRepository{
		db:    db,
		cache: cache.New[*models.User](5*time.Minute, 1*time.Minute),
	}
}

// NewUserRepositoryWithCache creates a new UserRepository with custom cache TTL.
func NewUserRepositoryWithCache(db *database.MongoDB, cacheTTL time.Duration) *UserRepository {
	return &UserRepository{
		db:    db,
		cache: cache.New[*models.User](cacheTTL, 1*time.Minute),
	}
}

// CreateIndexes creates necessary indexes for the users collection.
func (r *UserRepository) CreateIndexes(ctx context.Context) error {
	collection := r.db.Collection(usersCollection)

	indexes := []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "email", Value: 1}},
			Options: options.Index().SetUnique(true),
		},
		{
			Keys: bson.D{{Key: "role", Value: 1}},
		},
		{
			Keys: bson.D{{Key: "status", Value: 1}},
		},
		{
			Keys: bson.D{{Key: "createdAt", Value: -1}},
		},
		// Compound index for common queries
		{
			Keys: bson.D{{Key: "status", Value: 1}, {Key: "role", Value: 1}},
		},
	}

	_, err := collection.Indexes().CreateMany(ctx, indexes)
	return err
}

// Create creates a new user.
func (r *UserRepository) Create(ctx context.Context, user *models.User) error {
	collection := r.db.Collection(usersCollection)

	user.ID = primitive.NewObjectID()
	user.CreatedAt = time.Now()
	user.UpdatedAt = time.Now()

	_, err := collection.InsertOne(ctx, user)
	if mongo.IsDuplicateKeyError(err) {
		return ErrEmailAlreadyExists
	}

	if err == nil {
		// Cache the new user
		r.cacheUser(user)
	}

	return err
}

// FindByID finds a user by ID with caching.
func (r *UserRepository) FindByID(ctx context.Context, id string) (*models.User, error) {
	cacheKey := userByIDPrefix + id

	// Try cache first
	if user, found := r.cache.Get(cacheKey); found {
		return user, nil
	}

	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, ErrUserNotFound
	}

	collection := r.db.Collection(usersCollection)

	var user models.User
	err = collection.FindOne(ctx, bson.M{"_id": objectID}).Decode(&user)
	if err == mongo.ErrNoDocuments {
		return nil, ErrUserNotFound
	}
	if err != nil {
		return nil, err
	}

	// Cache the result
	r.cacheUser(&user)

	return &user, nil
}

// FindByEmail finds a user by email with caching.
func (r *UserRepository) FindByEmail(ctx context.Context, email string) (*models.User, error) {
	cacheKey := userByEmailPrefix + email

	// Try cache first
	if user, found := r.cache.Get(cacheKey); found {
		return user, nil
	}

	collection := r.db.Collection(usersCollection)

	var user models.User
	err := collection.FindOne(ctx, bson.M{"email": email}).Decode(&user)
	if err == mongo.ErrNoDocuments {
		return nil, ErrUserNotFound
	}
	if err != nil {
		return nil, err
	}

	// Cache the result
	r.cacheUser(&user)

	return &user, nil
}

// FindAll returns all users with optional filters.
func (r *UserRepository) FindAll(ctx context.Context, status *models.UserStatus, role *models.UserRole) ([]models.User, error) {
	collection := r.db.Collection(usersCollection)

	filter := bson.M{}
	if status != nil {
		filter["status"] = *status
	}
	if role != nil {
		filter["role"] = *role
	}

	opts := options.Find().
		SetSort(bson.D{{Key: "createdAt", Value: -1}}).
		SetBatchSize(100) // Optimize cursor batch size

	cursor, err := collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var users []models.User
	if err := cursor.All(ctx, &users); err != nil {
		return nil, err
	}

	// Cache individual users
	for i := range users {
		r.cacheUser(&users[i])
	}

	return users, nil
}

// FindPendingUsers returns all users with pending status.
func (r *UserRepository) FindPendingUsers(ctx context.Context) ([]models.User, error) {
	status := models.StatusPending
	return r.FindAll(ctx, &status, nil)
}

// UpdateStatus updates a user's status and invalidates cache.
func (r *UserRepository) UpdateStatus(ctx context.Context, userID string, status models.UserStatus, approvedBy string) error {
	objectID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return ErrUserNotFound
	}

	collection := r.db.Collection(usersCollection)

	update := bson.M{
		"$set": bson.M{
			"status":    status,
			"updatedAt": time.Now(),
		},
	}

	if status == models.StatusApproved && approvedBy != "" {
		approverID, _ := primitive.ObjectIDFromHex(approvedBy)
		now := time.Now()
		update["$set"].(bson.M)["approvedBy"] = approverID
		update["$set"].(bson.M)["approvedAt"] = &now
	}

	result, err := collection.UpdateOne(ctx, bson.M{"_id": objectID}, update)
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 {
		return ErrUserNotFound
	}

	// Invalidate cache
	r.invalidateUserCache(userID)

	return nil
}

// Update updates user fields and invalidates cache.
func (r *UserRepository) Update(ctx context.Context, user *models.User) error {
	collection := r.db.Collection(usersCollection)

	user.UpdatedAt = time.Now()

	result, err := collection.ReplaceOne(ctx, bson.M{"_id": user.ID}, user)
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 {
		return ErrUserNotFound
	}

	// Update cache with new data
	r.cacheUser(user)

	return nil
}

// Delete deletes a user by ID and invalidates cache.
func (r *UserRepository) Delete(ctx context.Context, id string) error {
	// Get user first to invalidate email cache
	user, _ := r.FindByID(ctx, id)

	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return ErrUserNotFound
	}

	collection := r.db.Collection(usersCollection)

	result, err := collection.DeleteOne(ctx, bson.M{"_id": objectID})
	if err != nil {
		return err
	}
	if result.DeletedCount == 0 {
		return ErrUserNotFound
	}

	// Invalidate cache
	r.invalidateUserCache(id)
	if user != nil {
		r.cache.Delete(userByEmailPrefix + user.Email)
	}

	return nil
}

// CountByRole counts users by role.
func (r *UserRepository) CountByRole(ctx context.Context, role models.UserRole) (int64, error) {
	collection := r.db.Collection(usersCollection)
	return collection.CountDocuments(ctx, bson.M{"role": role})
}

// ExistsAdmin checks if an admin user exists.
func (r *UserRepository) ExistsAdmin(ctx context.Context) (bool, error) {
	count, err := r.CountByRole(ctx, models.RoleAdmin)
	return count > 0, err
}

// cacheUser caches a user by both ID and email.
func (r *UserRepository) cacheUser(user *models.User) {
	r.cache.Set(userByIDPrefix+user.ID.Hex(), user)
	r.cache.Set(userByEmailPrefix+user.Email, user)
}

// invalidateUserCache invalidates user cache by ID.
func (r *UserRepository) invalidateUserCache(userID string) {
	r.cache.Delete(userByIDPrefix + userID)
}

// ClearCache clears all cached users.
func (r *UserRepository) ClearCache() {
	r.cache.Clear()
}
