// Package room provides room and participant management for live classes.
package room

import (
	"sync"

	"github.com/pion/webrtc/v3"
)

// ConnectionState represents the current state of a participant's WebRTC connection.
type ConnectionState string

const (
	// StateIdle - No active connection
	StateIdle ConnectionState = "idle"
	// StateWaiting - Waiting for presenter stream
	StateWaiting ConnectionState = "waiting"
	// StateConnecting - Offer sent, waiting for answer
	StateConnecting ConnectionState = "connecting"
	// StateConnected - Fully connected and receiving media
	StateConnected ConnectionState = "connected"
	// StateFailed - Connection failed
	StateFailed ConnectionState = "failed"
)

// Participant represents a user in a live class room.
type Participant struct {
	ID          string
	Name        string
	IsPresenter bool
	PeerConn    *webrtc.PeerConnection
	Conn        Connection
	VideoTrack  *webrtc.TrackLocalStaticRTP
	AudioTrack  *webrtc.TrackLocalStaticRTP

	// Connection state machine
	ConnState ConnectionState
	stateMu   sync.RWMutex

	// Pending ICE candidates (received before remote description is set)
	PendingICE []webrtc.ICECandidateInit
	iceMu      sync.Mutex
}

// Connection defines the interface for WebSocket communication.
type Connection interface {
	Send(message []byte)
	ReadMessage() ([]byte, error)
	Close()
}

// NewParticipant creates a new participant with the given details.
func NewParticipant(id, name string, isPresenter bool, conn Connection) *Participant {
	return &Participant{
		ID:          id,
		Name:        name,
		IsPresenter: isPresenter,
		Conn:        conn,
		ConnState:   StateIdle,
		PendingICE:  make([]webrtc.ICECandidateInit, 0),
	}
}

// Cleanup closes the participant's peer connection and releases resources.
func (p *Participant) Cleanup() {
	p.stateMu.Lock()
	p.ConnState = StateIdle
	p.stateMu.Unlock()

	p.iceMu.Lock()
	p.PendingICE = nil
	p.iceMu.Unlock()

	if p.PeerConn != nil {
		p.PeerConn.Close()
		p.PeerConn = nil
	}
}

// SetState sets the connection state.
func (p *Participant) SetState(state ConnectionState) {
	p.stateMu.Lock()
	defer p.stateMu.Unlock()
	p.ConnState = state
}

// GetState returns the current connection state.
func (p *Participant) GetState() ConnectionState {
	p.stateMu.RLock()
	defer p.stateMu.RUnlock()
	return p.ConnState
}

// AddPendingICE adds an ICE candidate to the pending queue.
func (p *Participant) AddPendingICE(candidate webrtc.ICECandidateInit) {
	p.iceMu.Lock()
	defer p.iceMu.Unlock()
	p.PendingICE = append(p.PendingICE, candidate)
}

// GetAndClearPendingICE returns all pending ICE candidates and clears the queue.
func (p *Participant) GetAndClearPendingICE() []webrtc.ICECandidateInit {
	p.iceMu.Lock()
	defer p.iceMu.Unlock()
	candidates := p.PendingICE
	p.PendingICE = make([]webrtc.ICECandidateInit, 0)
	return candidates
}

// ClearPendingICE clears all pending ICE candidates.
func (p *Participant) ClearPendingICE() {
	p.iceMu.Lock()
	defer p.iceMu.Unlock()
	p.PendingICE = make([]webrtc.ICECandidateInit, 0)
}

// Info returns a ParticipantInfo struct for JSON serialization.
func (p *Participant) Info() ParticipantInfo {
	return ParticipantInfo{
		ID:          p.ID,
		Name:        p.Name,
		IsPresenter: p.IsPresenter,
	}
}

// ParticipantInfo represents public participant information for API responses.
type ParticipantInfo struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	IsPresenter bool   `json:"isPresenter"`
}
