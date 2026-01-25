// Package cache provides caching implementations.
package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// RedisCache provides a Redis-based cache implementation.
type RedisCache struct {
	client            *redis.Client
	prefix            string
	defaultExpiration time.Duration
}

// NewRedisCache creates a new Redis cache.
func NewRedisCache(client *redis.Client, prefix string, defaultExpiration time.Duration) *RedisCache {
	return &RedisCache{
		client:            client,
		prefix:            prefix,
		defaultExpiration: defaultExpiration,
	}
}

// key generates a prefixed key.
func (c *RedisCache) key(k string) string {
	return c.prefix + ":" + k
}

// Set stores a value in the cache.
func (c *RedisCache) Set(ctx context.Context, key string, value interface{}) error {
	return c.SetWithExpiration(ctx, key, value, c.defaultExpiration)
}

// SetWithExpiration stores a value with custom expiration.
func (c *RedisCache) SetWithExpiration(ctx context.Context, key string, value interface{}, expiration time.Duration) error {
	data, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("failed to marshal value: %w", err)
	}
	return c.client.Set(ctx, c.key(key), data, expiration).Err()
}

// Get retrieves a value from the cache.
func (c *RedisCache) Get(ctx context.Context, key string, dest interface{}) error {
	data, err := c.client.Get(ctx, c.key(key)).Bytes()
	if err != nil {
		if err == redis.Nil {
			return ErrCacheMiss
		}
		return err
	}
	return json.Unmarshal(data, dest)
}

// Delete removes a value from the cache.
func (c *RedisCache) Delete(ctx context.Context, key string) error {
	return c.client.Del(ctx, c.key(key)).Err()
}

// DeletePrefix removes all keys with a given prefix.
func (c *RedisCache) DeletePrefix(ctx context.Context, prefix string) error {
	pattern := c.key(prefix) + "*"
	iter := c.client.Scan(ctx, 0, pattern, 100).Iterator()

	var keys []string
	for iter.Next(ctx) {
		keys = append(keys, iter.Val())
	}

	if err := iter.Err(); err != nil {
		return err
	}

	if len(keys) > 0 {
		return c.client.Del(ctx, keys...).Err()
	}
	return nil
}

// Exists checks if a key exists.
func (c *RedisCache) Exists(ctx context.Context, key string) (bool, error) {
	n, err := c.client.Exists(ctx, c.key(key)).Result()
	return n > 0, err
}

// ErrCacheMiss indicates a cache miss.
var ErrCacheMiss = fmt.Errorf("cache miss")

// CacheInterface defines the cache interface for both in-memory and Redis caches.
type CacheInterface interface {
	Set(ctx context.Context, key string, value interface{}) error
	Get(ctx context.Context, key string, dest interface{}) error
	Delete(ctx context.Context, key string) error
	DeletePrefix(ctx context.Context, prefix string) error
}

// InMemoryAdapter wraps the in-memory cache to implement CacheInterface.
type InMemoryAdapter struct {
	cache *Cache[interface{}]
}

// NewInMemoryAdapter creates an adapter for in-memory cache.
func NewInMemoryAdapter(cache *Cache[interface{}]) *InMemoryAdapter {
	return &InMemoryAdapter{cache: cache}
}

// Set stores a value.
func (a *InMemoryAdapter) Set(ctx context.Context, key string, value interface{}) error {
	a.cache.Set(key, value)
	return nil
}

// Get retrieves a value.
func (a *InMemoryAdapter) Get(ctx context.Context, key string, dest interface{}) error {
	val, found := a.cache.Get(key)
	if !found {
		return ErrCacheMiss
	}

	// For in-memory, we need to copy the value
	data, err := json.Marshal(val)
	if err != nil {
		return err
	}
	return json.Unmarshal(data, dest)
}

// Delete removes a value.
func (a *InMemoryAdapter) Delete(ctx context.Context, key string) error {
	a.cache.Delete(key)
	return nil
}

// DeletePrefix removes keys with prefix.
func (a *InMemoryAdapter) DeletePrefix(ctx context.Context, prefix string) error {
	a.cache.DeletePrefix(prefix)
	return nil
}

