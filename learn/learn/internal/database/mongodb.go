// Package database provides MongoDB connection and operations.
package database

import (
	"context"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.mongodb.org/mongo-driver/mongo/readpref"
)

// MongoDB holds the MongoDB client and database reference.
type MongoDB struct {
	Client   *mongo.Client
	Database *mongo.Database
}

// ConnectionConfig holds MongoDB connection pool settings.
type ConnectionConfig struct {
	URI                    string
	DBName                 string
	MaxPoolSize            uint64
	MinPoolSize            uint64
	MaxConnIdleTime        time.Duration
	ConnectTimeout         time.Duration
	ServerSelectionTimeout time.Duration
	SocketTimeout          time.Duration
	MaxConnecting          uint64
}

// DefaultConnectionConfig returns optimized default connection settings.
func DefaultConnectionConfig(uri, dbName string) *ConnectionConfig {
	return &ConnectionConfig{
		URI:                    uri,
		DBName:                 dbName,
		MaxPoolSize:            100,              // Maximum connections in pool
		MinPoolSize:            10,               // Keep minimum connections ready
		MaxConnIdleTime:        30 * time.Second, // Close idle connections after 30s
		ConnectTimeout:         10 * time.Second, // Connection timeout
		ServerSelectionTimeout: 5 * time.Second,  // Fast server selection
		SocketTimeout:          30 * time.Second, // Socket timeout
		MaxConnecting:          10,               // Maximum concurrent connecting
	}
}

// NewMongoDB creates a new MongoDB connection with default settings.
func NewMongoDB(uri, dbName string) (*MongoDB, error) {
	return NewMongoDBWithConfig(DefaultConnectionConfig(uri, dbName))
}

// NewMongoDBWithConfig creates a new MongoDB connection with custom settings.
func NewMongoDBWithConfig(cfg *ConnectionConfig) (*MongoDB, error) {
	ctx, cancel := context.WithTimeout(context.Background(), cfg.ConnectTimeout)
	defer cancel()

	// Create optimized client options
	clientOpts := options.Client().
		ApplyURI(cfg.URI).
		SetMaxPoolSize(cfg.MaxPoolSize).
		SetMinPoolSize(cfg.MinPoolSize).
		SetMaxConnIdleTime(cfg.MaxConnIdleTime).
		SetConnectTimeout(cfg.ConnectTimeout).
		SetServerSelectionTimeout(cfg.ServerSelectionTimeout).
		SetSocketTimeout(cfg.SocketTimeout).
		SetMaxConnecting(cfg.MaxConnecting).
		// Enable compression for faster data transfer
		SetCompressors([]string{"zstd", "snappy", "zlib"}).
		// Use direct connection for single server setups (faster)
		SetRetryWrites(true).
		SetRetryReads(true)

	client, err := mongo.Connect(ctx, clientOpts)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to MongoDB: %w", err)
	}

	// Verify connection with read preference
	if err := client.Ping(ctx, readpref.Primary()); err != nil {
		return nil, fmt.Errorf("failed to ping MongoDB: %w", err)
	}

	return &MongoDB{
		Client:   client,
		Database: client.Database(cfg.DBName),
	}, nil
}

// Close disconnects from MongoDB.
func (m *MongoDB) Close() error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	return m.Client.Disconnect(ctx)
}

// Collection returns a MongoDB collection.
func (m *MongoDB) Collection(name string) *mongo.Collection {
	return m.Database.Collection(name)
}

// HealthCheck performs a quick database health check.
func (m *MongoDB) HealthCheck(ctx context.Context) error {
	return m.Client.Ping(ctx, readpref.Primary())
}
