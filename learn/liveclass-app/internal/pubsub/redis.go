// Package pubsub provides Redis-based pub/sub for multi-instance communication.
package pubsub

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

// Message represents a pub/sub message.
type Message struct {
	Type      string          `json:"type"`
	Room      string          `json:"room"`
	Sender    string          `json:"sender"`
	Target    string          `json:"target,omitempty"`
	Payload   json.RawMessage `json:"payload"`
	Timestamp int64           `json:"timestamp"`
	Instance  string          `json:"instance"`
}

// Handler is called when a message is received.
type Handler func(msg *Message)

// RedisPubSub handles pub/sub for multi-instance WebSocket communication.
type RedisPubSub struct {
	client     *redis.Client
	instanceID string
	handlers   map[string][]Handler
	mu         sync.RWMutex
	ctx        context.Context
	cancel     context.CancelFunc
	wg         sync.WaitGroup
}

// NewRedisPubSub creates a new Redis pub/sub client.
func NewRedisPubSub(redisURL, instanceID string) (*RedisPubSub, error) {
	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("invalid redis URL: %w", err)
	}

	// Optimize Redis connection
	opt.PoolSize = 20
	opt.MinIdleConns = 5
	opt.MaxRetries = 3
	opt.DialTimeout = 5 * time.Second
	opt.ReadTimeout = 3 * time.Second
	opt.WriteTimeout = 3 * time.Second

	client := redis.NewClient(opt)

	ctx, cancel := context.WithCancel(context.Background())

	// Test connection
	if err := client.Ping(ctx).Err(); err != nil {
		cancel()
		return nil, fmt.Errorf("redis connection failed: %w", err)
	}

	ps := &RedisPubSub{
		client:     client,
		instanceID: instanceID,
		handlers:   make(map[string][]Handler),
		ctx:        ctx,
		cancel:     cancel,
	}

	return ps, nil
}

// Subscribe subscribes to a channel.
func (ps *RedisPubSub) Subscribe(channel string, handler Handler) {
	ps.mu.Lock()
	ps.handlers[channel] = append(ps.handlers[channel], handler)
	ps.mu.Unlock()

	// Start subscriber goroutine for this channel if not already running
	ps.wg.Add(1)
	go ps.subscribeLoop(channel)
}

// subscribeLoop handles message receiving for a channel.
func (ps *RedisPubSub) subscribeLoop(channel string) {
	defer ps.wg.Done()

	pubsub := ps.client.Subscribe(ps.ctx, channel)
	defer pubsub.Close()

	ch := pubsub.Channel()

	for {
		select {
		case <-ps.ctx.Done():
			return
		case msg, ok := <-ch:
			if !ok {
				return
			}

			var m Message
			if err := json.Unmarshal([]byte(msg.Payload), &m); err != nil {
				log.Printf("⚠️ Failed to unmarshal pubsub message: %v", err)
				continue
			}

			// Skip messages from this instance
			if m.Instance == ps.instanceID {
				continue
			}

			ps.mu.RLock()
			handlers := ps.handlers[channel]
			ps.mu.RUnlock()

			for _, h := range handlers {
				h(&m)
			}
		}
	}
}

// Publish publishes a message to a channel.
func (ps *RedisPubSub) Publish(ctx context.Context, channel string, msg *Message) error {
	msg.Timestamp = time.Now().UnixMilli()
	msg.Instance = ps.instanceID

	data, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	return ps.client.Publish(ctx, channel, data).Err()
}

// PublishToRoom publishes a message to a room channel.
func (ps *RedisPubSub) PublishToRoom(ctx context.Context, room string, msg *Message) error {
	msg.Room = room
	return ps.Publish(ctx, "room:"+room, msg)
}

// SubscribeToRoom subscribes to a room channel.
func (ps *RedisPubSub) SubscribeToRoom(room string, handler Handler) {
	ps.Subscribe("room:"+room, handler)
}

// Close closes the pub/sub client.
func (ps *RedisPubSub) Close() error {
	ps.cancel()
	ps.wg.Wait()
	return ps.client.Close()
}

// HealthCheck checks Redis connectivity.
func (ps *RedisPubSub) HealthCheck(ctx context.Context) error {
	return ps.client.Ping(ctx).Err()
}

// GetClient returns the underlying Redis client for direct cache operations.
func (ps *RedisPubSub) GetClient() *redis.Client {
	return ps.client
}

