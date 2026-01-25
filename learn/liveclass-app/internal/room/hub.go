package room

import (
	"strings"
	"sync"
)

// Hub manages all active rooms in the application.
type Hub struct {
	rooms map[string]*Room
	mu    sync.RWMutex
}

// NewHub creates a new Hub instance.
func NewHub() *Hub {
	return &Hub{
		rooms: make(map[string]*Room),
	}
}

// GetOrCreateRoom returns an existing room or creates a new one.
// Room IDs are normalized to uppercase for consistency.
func (h *Hub) GetOrCreateRoom(roomID string) *Room {
	h.mu.Lock()
	defer h.mu.Unlock()

	// Normalize room ID to uppercase
	normalizedID := strings.ToUpper(roomID)

	if room, exists := h.rooms[normalizedID]; exists {
		return room
	}

	room := NewRoom(normalizedID)
	h.rooms[normalizedID] = room
	return room
}

// GetRoom returns a room by ID if it exists.
func (h *Hub) GetRoom(roomID string) (*Room, bool) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	room, exists := h.rooms[strings.ToUpper(roomID)]
	return room, exists
}

// RemoveRoom removes a room from the hub.
func (h *Hub) RemoveRoom(roomID string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	delete(h.rooms, strings.ToUpper(roomID))
}

// RoomCount returns the number of active rooms.
func (h *Hub) RoomCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()

	return len(h.rooms)
}

// CleanupEmptyRoom removes a room if it has no participants.
func (h *Hub) CleanupEmptyRoom(roomID string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	normalizedID := strings.ToUpper(roomID)
	if room, exists := h.rooms[normalizedID]; exists {
		if room.ParticipantCount() == 0 {
			delete(h.rooms, normalizedID)
		}
	}
}
