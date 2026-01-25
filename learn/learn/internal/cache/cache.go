// Package cache provides a high-performance in-memory caching layer with TTL support.
package cache

import (
	"sync"
	"time"
)

// Item represents a cached item with expiration.
type Item[T any] struct {
	Value      T
	Expiration int64
}

// Expired returns true if the item has expired.
func (item Item[T]) Expired() bool {
	if item.Expiration == 0 {
		return false
	}
	return time.Now().UnixNano() > item.Expiration
}

// Cache is a generic thread-safe in-memory cache with TTL support.
type Cache[T any] struct {
	items             sync.Map
	defaultExpiration time.Duration
	cleanupInterval   time.Duration
	stopCleanup       chan bool
}

// New creates a new cache with the given default expiration and cleanup interval.
func New[T any](defaultExpiration, cleanupInterval time.Duration) *Cache[T] {
	c := &Cache[T]{
		defaultExpiration: defaultExpiration,
		cleanupInterval:   cleanupInterval,
		stopCleanup:       make(chan bool),
	}

	// Start background cleanup goroutine
	go c.startCleanup()

	return c
}

// Set adds an item to the cache with the default expiration.
func (c *Cache[T]) Set(key string, value T) {
	c.SetWithExpiration(key, value, c.defaultExpiration)
}

// SetWithExpiration adds an item to the cache with a custom expiration.
func (c *Cache[T]) SetWithExpiration(key string, value T, expiration time.Duration) {
	var exp int64
	if expiration > 0 {
		exp = time.Now().Add(expiration).UnixNano()
	}

	c.items.Store(key, Item[T]{
		Value:      value,
		Expiration: exp,
	})
}

// Get retrieves an item from the cache.
func (c *Cache[T]) Get(key string) (T, bool) {
	var zero T

	obj, found := c.items.Load(key)
	if !found {
		return zero, false
	}

	item := obj.(Item[T])
	if item.Expired() {
		c.items.Delete(key)
		return zero, false
	}

	return item.Value, true
}

// Delete removes an item from the cache.
func (c *Cache[T]) Delete(key string) {
	c.items.Delete(key)
}

// DeletePrefix removes all items with the given prefix.
func (c *Cache[T]) DeletePrefix(prefix string) {
	c.items.Range(func(key, _ interface{}) bool {
		if k, ok := key.(string); ok && len(k) >= len(prefix) && k[:len(prefix)] == prefix {
			c.items.Delete(key)
		}
		return true
	})
}

// Clear removes all items from the cache.
func (c *Cache[T]) Clear() {
	c.items.Range(func(key, _ interface{}) bool {
		c.items.Delete(key)
		return true
	})
}

// Count returns the number of items in the cache.
func (c *Cache[T]) Count() int {
	count := 0
	c.items.Range(func(_, _ interface{}) bool {
		count++
		return true
	})
	return count
}

// startCleanup runs the cleanup routine periodically.
func (c *Cache[T]) startCleanup() {
	ticker := time.NewTicker(c.cleanupInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			c.deleteExpired()
		case <-c.stopCleanup:
			return
		}
	}
}

// deleteExpired removes all expired items from the cache.
func (c *Cache[T]) deleteExpired() {
	now := time.Now().UnixNano()
	c.items.Range(func(key, value interface{}) bool {
		item := value.(Item[T])
		if item.Expiration > 0 && now > item.Expiration {
			c.items.Delete(key)
		}
		return true
	})
}

// Close stops the cleanup goroutine.
func (c *Cache[T]) Close() {
	close(c.stopCleanup)
}

// CacheManager manages multiple caches for different entity types.
type CacheManager struct {
	Users     *Cache[interface{}]
	Batches   *Cache[interface{}]
	Schedules *Cache[interface{}]
	Stats     *CacheStats
}

// CacheStats tracks cache hit/miss statistics.
type CacheStats struct {
	mu     sync.RWMutex
	hits   int64
	misses int64
}

// RecordHit increments the hit counter.
func (s *CacheStats) RecordHit() {
	s.mu.Lock()
	s.hits++
	s.mu.Unlock()
}

// RecordMiss increments the miss counter.
func (s *CacheStats) RecordMiss() {
	s.mu.Lock()
	s.misses++
	s.mu.Unlock()
}

// GetStats returns the current hit/miss counts.
func (s *CacheStats) GetStats() (hits, misses int64) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.hits, s.misses
}

// HitRate returns the cache hit rate as a percentage.
func (s *CacheStats) HitRate() float64 {
	s.mu.RLock()
	defer s.mu.RUnlock()
	total := s.hits + s.misses
	if total == 0 {
		return 0
	}
	return float64(s.hits) / float64(total) * 100
}

// NewCacheManager creates a new cache manager with default settings.
func NewCacheManager(userTTL, batchTTL, scheduleTTL time.Duration) *CacheManager {
	cleanupInterval := 1 * time.Minute

	return &CacheManager{
		Users:     New[interface{}](userTTL, cleanupInterval),
		Batches:   New[interface{}](batchTTL, cleanupInterval),
		Schedules: New[interface{}](scheduleTTL, cleanupInterval),
		Stats:     &CacheStats{},
	}
}

// Close closes all caches.
func (cm *CacheManager) Close() {
	cm.Users.Close()
	cm.Batches.Close()
	cm.Schedules.Close()
}
