package room

import (
	"encoding/json"
	"log"
	"sync"
)

// Room represents a live class session where one presenter streams to multiple viewers.
type Room struct {
	ID           string
	Participants map[string]*Participant
	Presenter    *Participant
	StreamReady  bool

	// Track if presenter's ICE connection is fully established
	PresenterICEConnected bool

	mu sync.RWMutex
}

// NewRoom creates a new room with the given ID.
func NewRoom(id string) *Room {
	return &Room{
		ID:           id,
		Participants: make(map[string]*Participant),
	}
}

// AddParticipant adds a participant to the room.
func (r *Room) AddParticipant(p *Participant) {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.Participants[p.ID] = p

	if p.IsPresenter {
		r.Presenter = p
	} else {
		// Mark viewer as waiting for stream
		p.SetState(StateWaiting)
	}

	log.Printf("[Room %s] Participant %s (%s) joined (presenter: %v)",
		r.ID, p.Name, p.ID, p.IsPresenter)
}

// RemoveParticipant removes a participant from the room and cleans up resources.
func (r *Room) RemoveParticipant(participantID string) {
	r.mu.Lock()
	defer r.mu.Unlock()

	p, exists := r.Participants[participantID]
	if !exists {
		return
	}

	wasPresenter := p.IsPresenter

	p.Cleanup()
	delete(r.Participants, participantID)

	if r.Presenter != nil && r.Presenter.ID == participantID {
		r.Presenter = nil
		r.StreamReady = false
		r.PresenterICEConnected = false

		// Reset all viewers to waiting state since presenter left
		for _, viewer := range r.Participants {
			if !viewer.IsPresenter {
				viewer.SetState(StateWaiting)
				// Close their old peer connection
				if viewer.PeerConn != nil {
					viewer.PeerConn.Close()
					viewer.PeerConn = nil
				}
				viewer.ClearPendingICE()
			}
		}
		log.Printf("[Room %s] Presenter left, reset %d viewers to waiting state", r.ID, len(r.Participants))
	}

	if wasPresenter {
		log.Printf("[Room %s] Presenter %s left", r.ID, participantID)
	} else {
		log.Printf("[Room %s] Participant %s left", r.ID, participantID)
	}
}

// GetParticipant returns a participant by ID.
func (r *Room) GetParticipant(id string) (*Participant, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	p, exists := r.Participants[id]
	return p, exists
}

// ParticipantCount returns the number of participants in the room.
func (r *Room) ParticipantCount() int {
	r.mu.RLock()
	defer r.mu.RUnlock()

	return len(r.Participants)
}

// HasPresenter returns true if the room has an active presenter.
func (r *Room) HasPresenter() bool {
	r.mu.RLock()
	defer r.mu.RUnlock()

	return r.Presenter != nil
}

// IsStreamReady returns true if the presenter's stream is ready.
func (r *Room) IsStreamReady() bool {
	r.mu.RLock()
	defer r.mu.RUnlock()

	return r.StreamReady
}

// SetStreamReady sets the stream ready status.
func (r *Room) SetStreamReady(ready bool) {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.StreamReady = ready
}

// IsPresenterICEConnected returns true if presenter's ICE connection is established.
func (r *Room) IsPresenterICEConnected() bool {
	r.mu.RLock()
	defer r.mu.RUnlock()

	return r.PresenterICEConnected
}

// SetPresenterICEConnected sets the presenter's ICE connection status.
func (r *Room) SetPresenterICEConnected(connected bool) {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.PresenterICEConnected = connected
}

// IsFullyReady returns true if the presenter stream is ready AND ICE is connected.
// This is the condition for pushing offers to viewers.
func (r *Room) IsFullyReady() bool {
	r.mu.RLock()
	defer r.mu.RUnlock()

	return r.StreamReady && r.PresenterICEConnected && r.Presenter != nil && r.Presenter.VideoTrack != nil
}

// GetPresenter returns the current presenter.
func (r *Room) GetPresenter() *Participant {
	r.mu.RLock()
	defer r.mu.RUnlock()

	return r.Presenter
}

// GetWaitingViewers returns all viewers in the waiting state.
func (r *Room) GetWaitingViewers() []*Participant {
	r.mu.RLock()
	defer r.mu.RUnlock()

	viewers := make([]*Participant, 0)
	for _, p := range r.Participants {
		if !p.IsPresenter && p.GetState() == StateWaiting {
			viewers = append(viewers, p)
		}
	}
	return viewers
}

// GetAllViewers returns all non-presenter participants.
func (r *Room) GetAllViewers() []*Participant {
	r.mu.RLock()
	defer r.mu.RUnlock()

	viewers := make([]*Participant, 0)
	for _, p := range r.Participants {
		if !p.IsPresenter {
			viewers = append(viewers, p)
		}
	}
	return viewers
}

// BroadcastToViewers sends a message to all non-presenter participants.
func (r *Room) BroadcastToViewers(message interface{}) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	data, err := json.Marshal(message)
	if err != nil {
		log.Printf("[Room %s] Error marshaling broadcast message: %v", r.ID, err)
		return
	}

	for _, p := range r.Participants {
		if !p.IsPresenter && p.Conn != nil {
			p.Conn.Send(data)
		}
	}
}

// BroadcastToAll sends a message to all participants except the excluded one.
func (r *Room) BroadcastToAll(message interface{}, excludeID string) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	data, err := json.Marshal(message)
	if err != nil {
		log.Printf("[Room %s] Error marshaling broadcast message: %v", r.ID, err)
		return
	}

	for _, p := range r.Participants {
		if p.ID != excludeID && p.Conn != nil {
			p.Conn.Send(data)
		}
	}
}

// GetParticipantInfoList returns a list of participant info for all participants.
func (r *Room) GetParticipantInfoList() []ParticipantInfo {
	r.mu.RLock()
	defer r.mu.RUnlock()

	list := make([]ParticipantInfo, 0, len(r.Participants))
	for _, p := range r.Participants {
		list = append(list, p.Info())
	}
	return list
}
