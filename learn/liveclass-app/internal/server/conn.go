// Package server provides the HTTP and WebSocket server for LiveClass.
package server

import (
	"log"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/mjamal5/learn/internal/room"
)

// Ensure WSConn implements room.Connection interface.
var _ room.Connection = (*WSConn)(nil)

// WSConn wraps a WebSocket connection with thread-safe operations.
type WSConn struct {
	ws   *websocket.Conn
	send chan []byte
	mu   sync.Mutex
}

// NewWSConn creates a new WebSocket connection wrapper.
func NewWSConn(ws *websocket.Conn) *WSConn {
	return &WSConn{
		ws:   ws,
		send: make(chan []byte, 256),
	}
}

// Send queues a message to be sent to the client.
func (c *WSConn) Send(message []byte) {
	select {
	case c.send <- message:
	default:
		log.Println("[WS] Send buffer full, dropping message")
	}
}

// WritePump handles writing messages to the WebSocket connection.
// This should be run in a separate goroutine.
func (c *WSConn) WritePump() {
	defer c.ws.Close()

	for message := range c.send {
		c.mu.Lock()
		err := c.ws.WriteMessage(websocket.TextMessage, message)
		c.mu.Unlock()

		if err != nil {
			log.Printf("[WS] Write error: %v", err)
			return
		}
	}
}

// ReadMessage reads a message from the WebSocket connection.
func (c *WSConn) ReadMessage() ([]byte, error) {
	_, message, err := c.ws.ReadMessage()
	return message, err
}

// Close closes the connection and its send channel.
func (c *WSConn) Close() {
	close(c.send)
}

