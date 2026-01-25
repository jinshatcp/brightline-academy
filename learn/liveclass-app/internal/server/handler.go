package server

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/jinshatcp/brightline-academy/learn/internal/room"
	"github.com/jinshatcp/brightline-academy/learn/internal/rtc"
	"github.com/pion/webrtc/v3"
)

// Message represents a WebSocket message.
type Message struct {
	Type        string          `json:"type"`
	RoomID      string          `json:"roomId,omitempty"`
	Name        string          `json:"name,omitempty"`
	IsPresenter bool            `json:"isPresenter,omitempty"`
	Payload     json.RawMessage `json:"payload,omitempty"`
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for development
	},
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

// Handler handles WebSocket connections and signaling.
type Handler struct {
	hub        *room.Hub
	rtcService *rtc.Service
}

// NewHandler creates a new WebSocket handler.
func NewHandler(hub *room.Hub, rtcService *rtc.Service) *Handler {
	return &Handler{
		hub:        hub,
		rtcService: rtcService,
	}
}

// ServeHTTP handles WebSocket upgrade and message processing.
func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[Handler] WebSocket upgrade error: %v", err)
		return
	}

	conn := NewWSConn(ws)
	go conn.WritePump()

	var participant *room.Participant
	var currentRoom *room.Room

	defer h.cleanup(conn, &participant, &currentRoom)

	for {
		data, err := conn.ReadMessage()
		if err != nil {
			log.Printf("[Handler] Read error: %v", err)
			return
		}

		var msg Message
		if err := json.Unmarshal(data, &msg); err != nil {
			log.Printf("[Handler] JSON unmarshal error: %v", err)
			continue
		}

		h.handleMessage(conn, msg, &participant, &currentRoom)
	}
}

// cleanup handles disconnection cleanup.
func (h *Handler) cleanup(conn *WSConn, participant **room.Participant, currentRoom **room.Room) {
	if *currentRoom != nil && *participant != nil {
		wasPresenter := (*participant).IsPresenter

		(*currentRoom).RemoveParticipant((*participant).ID)

		// Notify others
		(*currentRoom).BroadcastToAll(Message{
			Type:    "participant-left",
			Payload: mustMarshal((*participant).Info()),
		}, (*participant).ID)

		// If presenter left, notify all viewers that stream ended
		if wasPresenter {
			(*currentRoom).BroadcastToViewers(rtc.Message{Type: "stream-ended"})
		}

		// Clean up empty rooms
		h.hub.CleanupEmptyRoom((*currentRoom).ID)
	}
	conn.Close()
}

// handleMessage routes messages to appropriate handlers.
func (h *Handler) handleMessage(conn *WSConn, msg Message, participant **room.Participant, currentRoom **room.Room) {
	switch msg.Type {
	case "join":
		h.handleJoin(conn, msg, participant, currentRoom)
	case "offer":
		h.handleOffer(conn, msg, *participant, *currentRoom)
	case "answer":
		h.handleAnswer(conn, msg, *participant)
	case "ice-candidate":
		h.handleICECandidate(msg, *participant)
	case "request-stream":
		h.handleRequestStream(conn, *participant, *currentRoom)
	case "chat":
		h.handleChat(msg, *participant, *currentRoom)
	case "raise-hand":
		h.handleRaiseHand(*participant, *currentRoom)
	default:
		log.Printf("[Handler] Unknown message type: %s", msg.Type)
	}
}

// handleJoin processes a join request.
func (h *Handler) handleJoin(conn *WSConn, msg Message, participant **room.Participant, currentRoom **room.Room) {
	roomID := msg.RoomID
	if roomID == "" {
		roomID = generateRoomID()
	}

	*currentRoom = h.hub.GetOrCreateRoom(roomID)

	// Check if room already has a presenter
	if msg.IsPresenter && (*currentRoom).HasPresenter() {
		sendError(conn, "Room already has a presenter")
		return
	}

	*participant = room.NewParticipant(
		uuid.New().String(),
		msg.Name,
		msg.IsPresenter,
		conn,
	)

	(*currentRoom).AddParticipant(*participant)

	// Determine if stream is ready for this viewer
	streamReady := (*currentRoom).IsFullyReady()

	// Send room info
	response := map[string]interface{}{
		"type":          "joined",
		"roomId":        (*currentRoom).ID,
		"participantId": (*participant).ID,
		"participants":  (*currentRoom).GetParticipantInfoList(),
		"hasPresenter":  (*currentRoom).HasPresenter(),
		"streamReady":   streamReady,
	}
	respData, _ := json.Marshal(response)
	conn.Send(respData)

	// Notify others
	(*currentRoom).BroadcastToAll(Message{
		Type:    "participant-joined",
		Payload: mustMarshal((*participant).Info()),
	}, (*participant).ID)

	// If viewer joins and stream is already fully ready, push the offer immediately
	if !msg.IsPresenter && streamReady {
		log.Printf("[Handler] Stream ready, pushing to new viewer %s immediately", (*participant).Name)
		go func(p *room.Participant, r *room.Room) {
			if err := h.rtcService.HandleViewerJoin(r, p); err != nil {
				log.Printf("[Handler] Failed to push stream to new viewer %s: %v", p.Name, err)
			}
		}(*participant, *currentRoom)
	} else if !msg.IsPresenter {
		// Viewer joined but stream not ready - they're in waiting state
		log.Printf("[Handler] Viewer %s joined, waiting for presenter stream", (*participant).Name)
		// Send waiting status
		waitingMsg, _ := json.Marshal(map[string]interface{}{
			"type":   "waiting-for-stream",
			"reason": "Waiting for presenter to start streaming",
		})
		conn.Send(waitingMsg)
	}
}

// handleOffer processes a WebRTC offer from the presenter.
func (h *Handler) handleOffer(conn *WSConn, msg Message, participant *room.Participant, currentRoom *room.Room) {
	if participant == nil || currentRoom == nil {
		sendError(conn, "Not in a room")
		return
	}

	if !participant.IsPresenter {
		sendError(conn, "Only presenter can send offers")
		return
	}

	var offer webrtc.SessionDescription
	if err := json.Unmarshal(msg.Payload, &offer); err != nil {
		sendError(conn, "Invalid offer format")
		return
	}

	if err := h.rtcService.HandlePresenterOffer(currentRoom, participant, offer); err != nil {
		log.Printf("[Handler] Error handling presenter offer: %v", err)
		sendError(conn, "Failed to process offer")
		return
	}

	log.Printf("[Handler] Presenter offer processed, waiting for tracks and ICE connection...")
}

// handleAnswer processes a WebRTC answer from a viewer.
func (h *Handler) handleAnswer(conn *WSConn, msg Message, participant *room.Participant) {
	if participant == nil {
		sendError(conn, "Not in a room")
		return
	}

	var answer webrtc.SessionDescription
	if err := json.Unmarshal(msg.Payload, &answer); err != nil {
		sendError(conn, "Invalid answer format")
		return
	}

	if err := h.rtcService.HandleViewerAnswer(participant, answer); err != nil {
		log.Printf("[Handler] Error handling viewer answer: %v", err)
		sendError(conn, "Failed to process answer")
	}
}

// handleICECandidate processes an ICE candidate.
func (h *Handler) handleICECandidate(msg Message, participant *room.Participant) {
	if participant == nil {
		return
	}

	var candidate webrtc.ICECandidateInit
	if err := json.Unmarshal(msg.Payload, &candidate); err != nil {
		log.Printf("[Handler] Invalid ICE candidate format: %v", err)
		return
	}

	h.rtcService.AddICECandidate(participant, candidate)
}

// handleRequestStream processes a stream request from a viewer.
// This is now mainly used as a retry mechanism - the server will push offers automatically.
func (h *Handler) handleRequestStream(conn *WSConn, participant *room.Participant, currentRoom *room.Room) {
	if participant == nil || currentRoom == nil {
		sendError(conn, "Not in a room")
		return
	}

	if participant.IsPresenter {
		sendError(conn, "Presenter cannot request stream")
		return
	}

	log.Printf("[Handler] 📥 Stream request from viewer %s (%s) in room %s",
		participant.ID, participant.Name, currentRoom.ID)

	// If already connected, ignore
	if participant.GetState() == room.StateConnected {
		log.Printf("[Handler] Viewer %s already connected, ignoring request", participant.Name)
		return
	}

	// If already connecting, ignore
	if participant.GetState() == room.StateConnecting {
		log.Printf("[Handler] Viewer %s already connecting, ignoring request", participant.Name)
		return
	}

	// Try to push stream
	if err := h.rtcService.HandleViewerJoin(currentRoom, participant); err != nil {
		log.Printf("[Handler] ⚠️ Cannot push stream to %s: %v", participant.Name, err)

		// Send appropriate message based on error type
		var response map[string]interface{}
		switch err {
		case rtc.ErrNoPresenter:
			response = map[string]interface{}{
				"type":    "waiting-for-stream",
				"reason":  "no_presenter",
				"message": "Waiting for presenter to join",
			}
		case rtc.ErrStreamNotReady:
			response = map[string]interface{}{
				"type":    "waiting-for-stream",
				"reason":  "not_ready",
				"message": "Presenter is connecting, please wait",
			}
		case rtc.ErrNoVideoTrack:
			response = map[string]interface{}{
				"type":    "waiting-for-stream",
				"reason":  "no_video",
				"message": "Waiting for presenter video",
			}
		default:
			response = map[string]interface{}{
				"type":    "stream-not-ready",
				"reason":  "error",
				"message": "Failed to setup stream, retrying...",
			}
		}

		data, _ := json.Marshal(response)
		conn.Send(data)
	} else {
		log.Printf("[Handler] ✅ Stream push initiated for viewer %s", participant.Name)
	}
}

// handleChat processes a chat message.
func (h *Handler) handleChat(msg Message, participant *room.Participant, currentRoom *room.Room) {
	if participant == nil || currentRoom == nil {
		return
	}

	chatMsg := map[string]interface{}{
		"type": "chat",
		"payload": map[string]interface{}{
			"senderId":   participant.ID,
			"senderName": participant.Name,
			"message":    string(msg.Payload),
		},
	}
	data, _ := json.Marshal(chatMsg)

	// Broadcast to everyone
	currentRoom.BroadcastToAll(json.RawMessage(data), "")
}

// handleRaiseHand processes a raise hand event.
func (h *Handler) handleRaiseHand(participant *room.Participant, currentRoom *room.Room) {
	if participant == nil || currentRoom == nil {
		return
	}

	handMsg := Message{
		Type:    "hand-raised",
		Payload: mustMarshal(participant.Info()),
	}
	currentRoom.BroadcastToAll(handMsg, "")
}

// sendError sends an error message to the client.
func sendError(conn *WSConn, message string) {
	msg := map[string]string{
		"type":    "error",
		"message": message,
	}
	data, _ := json.Marshal(msg)
	conn.Send(data)
}

// mustMarshal marshals data or returns empty JSON object.
func mustMarshal(v interface{}) json.RawMessage {
	data, err := json.Marshal(v)
	if err != nil {
		return json.RawMessage("{}")
	}
	return data
}

// generateRoomID generates a short unique room ID in uppercase.
func generateRoomID() string {
	return strings.ToUpper(uuid.New().String()[:8])
}
