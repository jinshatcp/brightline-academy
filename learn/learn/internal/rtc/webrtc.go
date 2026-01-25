// Package rtc provides WebRTC functionality for real-time video streaming.
package rtc

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"sync"

	"github.com/mjamal5/learn/internal/room"
	"github.com/pion/webrtc/v3"
)

var (
	// ErrNoPresenter is returned when there's no presenter in the room.
	ErrNoPresenter = errors.New("no presenter in room")
	// ErrStreamNotReady is returned when the presenter's stream isn't ready.
	ErrStreamNotReady = errors.New("presenter stream not ready")
	// ErrNoVideoTrack is returned when the presenter has no video track.
	ErrNoVideoTrack = errors.New("no video track available")
	// ErrNoPeerConnection is returned when there's no peer connection.
	ErrNoPeerConnection = errors.New("no peer connection")
)

// Message represents a WebSocket signaling message.
type Message struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload,omitempty"`
}

// Service handles WebRTC operations for the live class.
type Service struct {
	config webrtc.Configuration
	mu     sync.Mutex
}

// NewService creates a new WebRTC service with optimized configuration.
func NewService(stunServers []string) *Service {
	iceServers := make([]webrtc.ICEServer, len(stunServers))
	for i, url := range stunServers {
		iceServers[i] = webrtc.ICEServer{URLs: []string{url}}
	}

	return &Service{
		config: webrtc.Configuration{
			ICEServers:         iceServers,
			ICETransportPolicy: webrtc.ICETransportPolicyAll,
			BundlePolicy:       webrtc.BundlePolicyMaxBundle,
			RTCPMuxPolicy:      webrtc.RTCPMuxPolicyRequire,
		},
	}
}

// HandlePresenterOffer processes a WebRTC offer from the presenter and establishes
// the connection for receiving their media stream.
func (s *Service) HandlePresenterOffer(r *room.Room, participant *room.Participant, offer webrtc.SessionDescription) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	log.Printf("[RTC] Processing presenter offer for room %s", r.ID)

	// Clean up any existing peer connection
	if participant.PeerConn != nil {
		log.Printf("[RTC] Closing existing presenter peer connection")
		participant.PeerConn.Close()
		participant.PeerConn = nil
		participant.VideoTrack = nil
		participant.AudioTrack = nil
	}
	participant.ClearPendingICE()

	// Create peer connection with default settings (aggressive timeouts were causing ICE failures)
	peerConn, err := webrtc.NewPeerConnection(s.config)
	if err != nil {
		return fmt.Errorf("failed to create peer connection: %w", err)
	}
	participant.PeerConn = peerConn

	// Create local tracks for forwarding to viewers
	if err := s.createPresenterTracks(participant); err != nil {
		peerConn.Close()
		participant.PeerConn = nil
		return err
	}

	// Set up event handlers
	s.setupPresenterHandlers(peerConn, r, participant)

	// Set remote description
	if err := peerConn.SetRemoteDescription(offer); err != nil {
		return fmt.Errorf("failed to set remote description: %w", err)
	}
	log.Printf("[RTC] Remote description set for presenter")

	// Process any pending ICE candidates
	s.processPendingICE(participant)

	// Create and set local description (answer)
	answer, err := peerConn.CreateAnswer(nil)
	if err != nil {
		return fmt.Errorf("failed to create answer: %w", err)
	}

	if err := peerConn.SetLocalDescription(answer); err != nil {
		return fmt.Errorf("failed to set local description: %w", err)
	}
	log.Printf("[RTC] Answer created for presenter")

	// Send answer immediately (ICE trickle)
	s.sendAnswerToPresenter(peerConn, participant)

	return nil
}

// createPresenterTracks creates the local tracks for forwarding media to viewers.
func (s *Service) createPresenterTracks(participant *room.Participant) error {
	videoTrack, err := webrtc.NewTrackLocalStaticRTP(
		webrtc.RTPCodecCapability{MimeType: webrtc.MimeTypeVP8},
		"video",
		"presenter-stream",
	)
	if err != nil {
		return fmt.Errorf("failed to create video track: %w", err)
	}
	participant.VideoTrack = videoTrack

	audioTrack, err := webrtc.NewTrackLocalStaticRTP(
		webrtc.RTPCodecCapability{MimeType: webrtc.MimeTypeOpus},
		"audio",
		"presenter-stream",
	)
	if err != nil {
		return fmt.Errorf("failed to create audio track: %w", err)
	}
	participant.AudioTrack = audioTrack

	return nil
}

// setupPresenterHandlers configures event handlers for the presenter's peer connection.
func (s *Service) setupPresenterHandlers(peerConn *webrtc.PeerConnection, r *room.Room, participant *room.Participant) {
	tracksReceived := 0
	tracksMu := sync.Mutex{}

	// Handle incoming media tracks from presenter
	peerConn.OnTrack(func(track *webrtc.TrackRemote, _ *webrtc.RTPReceiver) {
		tracksMu.Lock()
		tracksReceived++
		currentTracks := tracksReceived
		tracksMu.Unlock()

		log.Printf("[RTC] ✅ Received %s track from presenter (codec: %s, track #%d)",
			track.Kind().String(), track.Codec().MimeType, currentTracks)

		// Start forwarding this track to local track IMMEDIATELY
		go s.forwardTrack(track, participant)

		// Set stream ready after receiving video track (primary track)
		if track.Kind() == webrtc.RTPCodecTypeVideo && !r.IsStreamReady() {
			log.Printf("[RTC] 🎬 Presenter video track received in room %s", r.ID)
			r.SetStreamReady(true)

			// Check if we can now push to waiting viewers
			s.checkAndPushToViewers(r)
		}
	})

	// Handle ICE connection state changes
	peerConn.OnICEConnectionStateChange(func(state webrtc.ICEConnectionState) {
		log.Printf("[RTC] Presenter ICE state: %s", state.String())

		switch state {
		case webrtc.ICEConnectionStateConnected:
			log.Printf("[RTC] ✅ Presenter ICE connected in room %s", r.ID)
			r.SetPresenterICEConnected(true)
			// Check if we can now push to waiting viewers
			s.checkAndPushToViewers(r)

		case webrtc.ICEConnectionStateFailed:
			log.Printf("[RTC] ❌ Presenter ICE failed in room %s", r.ID)
			r.SetPresenterICEConnected(false)

		case webrtc.ICEConnectionStateDisconnected:
			log.Printf("[RTC] ⚠️ Presenter ICE disconnected in room %s", r.ID)
			// Don't immediately mark as not ready - might reconnect
		}
	})

	// Handle peer connection state changes
	peerConn.OnConnectionStateChange(func(state webrtc.PeerConnectionState) {
		log.Printf("[RTC] Presenter connection state: %s", state.String())

		switch state {
		case webrtc.PeerConnectionStateConnected:
			log.Printf("[RTC] ✅ Presenter fully connected in room %s", r.ID)
		case webrtc.PeerConnectionStateFailed:
			log.Printf("[RTC] ❌ Presenter connection failed in room %s", r.ID)
			r.SetStreamReady(false)
			r.SetPresenterICEConnected(false)
			r.BroadcastToViewers(Message{Type: "stream-ended"})
		case webrtc.PeerConnectionStateClosed:
			log.Printf("[RTC] Presenter connection closed in room %s", r.ID)
			r.SetStreamReady(false)
			r.SetPresenterICEConnected(false)
			r.BroadcastToViewers(Message{Type: "stream-ended"})
		}
	})

	// Handle ICE candidates
	peerConn.OnICECandidate(func(c *webrtc.ICECandidate) {
		if c == nil {
			log.Printf("[RTC] Presenter ICE gathering complete in room %s", r.ID)
			return
		}
		s.sendICECandidate(participant, c)
	})
}

// checkAndPushToViewers checks if the stream is fully ready and pushes offers to waiting viewers.
func (s *Service) checkAndPushToViewers(r *room.Room) {
	if !r.IsFullyReady() {
		log.Printf("[RTC] Stream not fully ready yet (StreamReady: %v, ICEConnected: %v)",
			r.IsStreamReady(), r.IsPresenterICEConnected())
		return
	}

	log.Printf("[RTC] 🚀 Presenter fully ready in room %s, pushing to waiting viewers", r.ID)

	// Notify all viewers that stream is available
	r.BroadcastToViewers(Message{Type: "stream-available"})

	// Get ALL viewers and push offers to them IMMEDIATELY (more robust than just waiting)
	// This handles cases where viewer state might be incorrect after reconnections
	allViewers := r.GetAllViewers()
	log.Printf("[RTC] Found %d viewers to push stream to", len(allViewers))

	for _, viewer := range allViewers {
		// Skip if viewer already has an active connection
		if viewer.PeerConn != nil && viewer.GetState() == room.StateConnected {
			log.Printf("[RTC] Viewer %s already connected, skipping", viewer.ID)
			continue
		}
		go func(v *room.Participant) {
			// Push immediately - no artificial delay
			if err := s.pushStreamToViewer(r, v); err != nil {
				log.Printf("[RTC] Failed to push stream to viewer %s: %v", v.ID, err)
			}
		}(viewer)
	}
}

// pushStreamToViewer creates and sends an offer to a specific viewer.
func (s *Service) pushStreamToViewer(r *room.Room, viewer *room.Participant) error {
	presenter := r.GetPresenter()
	if presenter == nil {
		return ErrNoPresenter
	}

	if presenter.VideoTrack == nil {
		return ErrNoVideoTrack
	}

	log.Printf("[RTC] 📤 Pushing stream to viewer %s (%s) in room %s", viewer.ID, viewer.Name, r.ID)

	// Clean up any existing peer connection
	if viewer.PeerConn != nil {
		log.Printf("[RTC] Closing existing viewer peer connection for %s", viewer.ID)
		viewer.PeerConn.Close()
		viewer.PeerConn = nil
	}
	viewer.ClearPendingICE()
	viewer.SetState(room.StateConnecting)

	// Create peer connection
	peerConn, err := webrtc.NewPeerConnection(s.config)
	if err != nil {
		viewer.SetState(room.StateFailed)
		return fmt.Errorf("failed to create peer connection: %w", err)
	}
	viewer.PeerConn = peerConn

	// Add presenter's tracks to viewer
	if err := s.addTracksToViewer(peerConn, presenter); err != nil {
		peerConn.Close()
		viewer.PeerConn = nil
		viewer.SetState(room.StateFailed)
		return err
	}

	// Set up event handlers
	s.setupViewerHandlers(peerConn, viewer, r)

	// Create and send offer
	if err := s.createAndSendOffer(peerConn, viewer); err != nil {
		peerConn.Close()
		viewer.PeerConn = nil
		viewer.SetState(room.StateFailed)
		return err
	}

	return nil
}

// forwardTrack reads RTP packets from the remote track and writes them to the local track.
func (s *Service) forwardTrack(remoteTrack *webrtc.TrackRemote, participant *room.Participant) {
	buf := make([]byte, 1500)
	for {
		n, _, err := remoteTrack.Read(buf)
		if err != nil {
			if err != io.EOF {
				log.Printf("[RTC] Track read error: %v", err)
			}
			return
		}

		var localTrack *webrtc.TrackLocalStaticRTP
		if remoteTrack.Kind() == webrtc.RTPCodecTypeVideo {
			localTrack = participant.VideoTrack
		} else {
			localTrack = participant.AudioTrack
		}

		if localTrack != nil {
			if _, err := localTrack.Write(buf[:n]); err != nil && err != io.ErrClosedPipe {
				// Don't log every write error to avoid spam
			}
		}
	}
}

// sendAnswerToPresenter sends the SDP answer to the presenter.
func (s *Service) sendAnswerToPresenter(peerConn *webrtc.PeerConnection, participant *room.Participant) {
	answerJSON, _ := json.Marshal(*peerConn.LocalDescription())
	msg := Message{Type: "answer", Payload: answerJSON}
	data, _ := json.Marshal(msg)
	participant.Conn.Send(data)

	log.Printf("[RTC] Answer sent to presenter (ICE trickle)")
}

// HandleViewerJoin handles a viewer requesting to join the stream.
// If the stream is ready, it pushes an offer immediately.
// If not, the viewer is marked as waiting and will receive an offer when ready.
func (s *Service) HandleViewerJoin(r *room.Room, viewer *room.Participant) error {
	// Clean up any stale connection first
	if viewer.PeerConn != nil {
		log.Printf("[RTC] Cleaning up stale viewer connection for %s", viewer.Name)
		viewer.PeerConn.Close()
		viewer.PeerConn = nil
	}
	viewer.ClearPendingICE()

	presenter := r.GetPresenter()
	if presenter == nil {
		log.Printf("[RTC] No presenter in room %s, viewer %s will wait", r.ID, viewer.Name)
		viewer.SetState(room.StateWaiting)
		return ErrNoPresenter
	}

	// Check if stream is fully ready
	if !r.IsFullyReady() {
		log.Printf("[RTC] Stream not fully ready in room %s, viewer %s will wait", r.ID, viewer.Name)
		viewer.SetState(room.StateWaiting)
		return ErrStreamNotReady
	}

	// Stream is ready, push immediately
	return s.pushStreamToViewer(r, viewer)
}

// addTracksToViewer adds the presenter's tracks to the viewer's peer connection.
func (s *Service) addTracksToViewer(peerConn *webrtc.PeerConnection, presenter *room.Participant) error {
	if presenter.VideoTrack != nil {
		if _, err := peerConn.AddTrack(presenter.VideoTrack); err != nil {
			return fmt.Errorf("failed to add video track: %w", err)
		}
		log.Printf("[RTC] Added video track for viewer")
	}

	if presenter.AudioTrack != nil {
		if _, err := peerConn.AddTrack(presenter.AudioTrack); err != nil {
			return fmt.Errorf("failed to add audio track: %w", err)
		}
		log.Printf("[RTC] Added audio track for viewer")
	}

	return nil
}

// setupViewerHandlers configures event handlers for the viewer's peer connection.
func (s *Service) setupViewerHandlers(peerConn *webrtc.PeerConnection, viewer *room.Participant, r *room.Room) {
	peerConn.OnConnectionStateChange(func(state webrtc.PeerConnectionState) {
		log.Printf("[RTC] Viewer %s (%s) connection state: %s", viewer.ID, viewer.Name, state.String())

		switch state {
		case webrtc.PeerConnectionStateConnected:
			log.Printf("[RTC] ✅ Viewer %s successfully connected and receiving stream", viewer.ID)
			viewer.SetState(room.StateConnected)

			// Send confirmation to viewer
			msg := Message{Type: "stream-connected"}
			data, _ := json.Marshal(msg)
			viewer.Conn.Send(data)

		case webrtc.PeerConnectionStateFailed:
			log.Printf("[RTC] ❌ Viewer %s connection failed", viewer.ID)
			// Set to waiting so they can be pushed a new stream when ready
			viewer.SetState(room.StateWaiting)
			// Clean up the failed peer connection
			if viewer.PeerConn != nil {
				viewer.PeerConn.Close()
				viewer.PeerConn = nil
			}
			viewer.ClearPendingICE()

			// Notify viewer to retry - they can request again
			msg := Message{Type: "connection-failed"}
			data, _ := json.Marshal(msg)
			viewer.Conn.Send(data)

		case webrtc.PeerConnectionStateDisconnected:
			log.Printf("[RTC] ⚠️ Viewer %s disconnected, may reconnect", viewer.ID)

		case webrtc.PeerConnectionStateClosed:
			log.Printf("[RTC] Viewer %s connection closed", viewer.ID)
			viewer.SetState(room.StateIdle)
		}
	})

	peerConn.OnICEConnectionStateChange(func(state webrtc.ICEConnectionState) {
		log.Printf("[RTC] Viewer %s ICE state: %s", viewer.ID, state.String())

		if state == webrtc.ICEConnectionStateFailed {
			log.Printf("[RTC] Viewer %s ICE failed, attempting ICE restart", viewer.ID)
			// ICE restart can help recover failed connections
			if peerConn.ConnectionState() != webrtc.PeerConnectionStateClosed {
				go func() {
					offer, err := peerConn.CreateOffer(&webrtc.OfferOptions{ICERestart: true})
					if err != nil {
						log.Printf("[RTC] ICE restart offer failed: %v", err)
						return
					}
					if err := peerConn.SetLocalDescription(offer); err != nil {
						log.Printf("[RTC] ICE restart setLocalDescription failed: %v", err)
						return
					}
					// Send new offer to viewer
					offerJSON, _ := json.Marshal(*peerConn.LocalDescription())
					msg := Message{Type: "offer", Payload: offerJSON}
					data, _ := json.Marshal(msg)
					viewer.Conn.Send(data)
					log.Printf("[RTC] ICE restart offer sent to viewer %s", viewer.ID)
				}()
			}
		}

		if state == webrtc.ICEConnectionStateConnected {
			log.Printf("[RTC] ✅ Viewer %s ICE connected", viewer.ID)
		}
	})

	peerConn.OnICECandidate(func(c *webrtc.ICECandidate) {
		if c == nil {
			log.Printf("[RTC] Viewer %s ICE gathering complete", viewer.ID)
			return
		}
		s.sendICECandidate(viewer, c)
	})
}

// createAndSendOffer creates an SDP offer and sends it to the viewer.
func (s *Service) createAndSendOffer(peerConn *webrtc.PeerConnection, viewer *room.Participant) error {
	offer, err := peerConn.CreateOffer(nil)
	if err != nil {
		return fmt.Errorf("failed to create offer: %w", err)
	}

	if err := peerConn.SetLocalDescription(offer); err != nil {
		return fmt.Errorf("failed to set local description: %w", err)
	}

	// Send offer immediately - ICE candidates will trickle
	offerJSON, _ := json.Marshal(*peerConn.LocalDescription())
	msg := Message{Type: "offer", Payload: offerJSON}
	data, _ := json.Marshal(msg)
	viewer.Conn.Send(data)
	log.Printf("[RTC] Offer sent to viewer %s (ICE trickle)", viewer.ID)

	return nil
}

// HandleViewerAnswer processes an SDP answer from a viewer.
func (s *Service) HandleViewerAnswer(viewer *room.Participant, answer webrtc.SessionDescription) error {
	if viewer.PeerConn == nil {
		return ErrNoPeerConnection
	}

	if err := viewer.PeerConn.SetRemoteDescription(answer); err != nil {
		return fmt.Errorf("failed to set remote description: %w", err)
	}

	log.Printf("[RTC] Viewer %s answer processed, processing pending ICE candidates", viewer.ID)

	// Process any pending ICE candidates now that remote description is set
	s.processPendingICE(viewer)

	return nil
}

// processPendingICE processes all pending ICE candidates for a participant.
func (s *Service) processPendingICE(participant *room.Participant) {
	candidates := participant.GetAndClearPendingICE()
	if len(candidates) == 0 {
		return
	}

	log.Printf("[RTC] Processing %d pending ICE candidates for %s", len(candidates), participant.ID)

	for _, candidate := range candidates {
		if participant.PeerConn != nil {
			if err := participant.PeerConn.AddICECandidate(candidate); err != nil {
				log.Printf("[RTC] Warning: Failed to add pending ICE candidate: %v", err)
			}
		}
	}
}

// AddICECandidate adds an ICE candidate to a participant's peer connection.
// If the remote description isn't set yet, the candidate is queued.
func (s *Service) AddICECandidate(participant *room.Participant, candidate webrtc.ICECandidateInit) error {
	if participant.PeerConn == nil {
		// Queue for later - peer connection not created yet
		log.Printf("[RTC] Queueing ICE candidate for %s (no peer connection)", participant.ID)
		participant.AddPendingICE(candidate)
		return nil
	}

	// Check if remote description is set
	if participant.PeerConn.RemoteDescription() == nil {
		// Queue for later - remote description not set
		log.Printf("[RTC] Queueing ICE candidate for %s (no remote description)", participant.ID)
		participant.AddPendingICE(candidate)
		return nil
	}

	// Safe to add immediately
	if err := participant.PeerConn.AddICECandidate(candidate); err != nil {
		log.Printf("[RTC] Warning: Failed to add ICE candidate: %v", err)
		return nil // Don't fail on ICE candidate errors
	}

	return nil
}

// sendICECandidate sends an ICE candidate to a participant.
func (s *Service) sendICECandidate(participant *room.Participant, candidate *webrtc.ICECandidate) {
	candidateJSON, _ := json.Marshal(candidate.ToJSON())
	msg := Message{Type: "ice-candidate", Payload: candidateJSON}
	data, _ := json.Marshal(msg)
	participant.Conn.Send(data)
}
