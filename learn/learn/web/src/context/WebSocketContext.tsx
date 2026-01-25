import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import type { WSMessage, Participant, ChatMessage } from '../types';

// Connection states for viewers
export type ViewerConnectionState = 'idle' | 'waiting' | 'connecting' | 'connected' | 'failed';

interface WebSocketContextType {
  isConnected: boolean;
  roomId: string | null;
  participantId: string | null;
  participants: Participant[];
  hasPresenter: boolean;
  isStreamReady: boolean;
  viewerConnectionState: ViewerConnectionState;
  chatMessages: ChatMessage[];
  error: string | null;
  connect: () => void;
  disconnect: () => void;
  sendMessage: (message: WSMessage) => void;
  joinRoom: (name: string, isPresenter: boolean, roomId?: string) => void;
  sendChat: (message: string) => void;
  raiseHand: () => void;
  requestStream: () => void;
  onOffer: (callback: (offer: RTCSessionDescriptionInit) => void) => void;
  onAnswer: (callback: (answer: RTCSessionDescriptionInit) => void) => void;
  onIceCandidate: (callback: (candidate: RTCIceCandidateInit) => void) => void;
  onStreamAvailable: (callback: () => void) => void;
  onStreamEnded: (callback: () => void) => void;
  onStreamConnected: (callback: () => void) => void;
  onConnectionFailed: (callback: () => void) => void;
  onWaitingForStream: (callback: (reason: string) => void) => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

/**
 * useWebSocket - Hook to access WebSocket context for real-time communication.
 */
export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
};

interface Props {
  children: React.ReactNode;
}

/**
 * WebSocketProvider - Provides WebSocket connection and state management for the application.
 */
export const WebSocketProvider: React.FC<Props> = ({ children }) => {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [hasPresenter, setHasPresenter] = useState(false);
  const [isStreamReady, setIsStreamReady] = useState(false);
  const [viewerConnectionState, setViewerConnectionState] = useState<ViewerConnectionState>('idle');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Callbacks for WebRTC events
  const onOfferRef = useRef<((offer: RTCSessionDescriptionInit) => void) | null>(null);
  const onAnswerRef = useRef<((answer: RTCSessionDescriptionInit) => void) | null>(null);
  const onIceCandidateRef = useRef<((candidate: RTCIceCandidateInit) => void) | null>(null);
  const onStreamAvailableRef = useRef<(() => void) | null>(null);
  const onStreamEndedRef = useRef<(() => void) | null>(null);
  const onStreamConnectedRef = useRef<(() => void) | null>(null);
  const onConnectionFailedRef = useRef<(() => void) | null>(null);
  const onWaitingForStreamRef = useRef<((reason: string) => void) | null>(null);
  
  // Queue for messages that arrive before handlers are registered
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws.current = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.current.onopen = () => {
      console.log('[WS] Connected');
      setIsConnected(true);
      setError(null);
    };

    ws.current.onclose = (event) => {
      console.log('[WS] Disconnected, code:', event.code, 'reason:', event.reason);
      setIsConnected(false);
      
      // Don't reset room state on unexpected disconnection - might reconnect
      if (event.code !== 1000) {
        console.log('[WS] Unexpected disconnect, room state preserved');
      }
    };

    ws.current.onerror = () => {
      setError('Connection error');
    };

    ws.current.onmessage = (event) => {
      const msg: WSMessage = JSON.parse(event.data);
      handleMessage(msg);
    };
  }, []);

  const disconnect = useCallback(() => {
    console.log('[WS] Disconnecting...');
    ws.current?.close();
    ws.current = null;
    setIsConnected(false);
    setRoomId(null);
    setParticipantId(null);
    setParticipants([]);
    setHasPresenter(false);
    setIsStreamReady(false);
    setViewerConnectionState('idle');
    setChatMessages([]);
    setError(null);
    
    // Clear callback refs and pending data
    onOfferRef.current = null;
    onAnswerRef.current = null;
    onIceCandidateRef.current = null;
    onStreamAvailableRef.current = null;
    onStreamEndedRef.current = null;
    onStreamConnectedRef.current = null;
    onConnectionFailedRef.current = null;
    onWaitingForStreamRef.current = null;
    pendingOfferRef.current = null;
    pendingIceCandidatesRef.current = [];
  }, []);

  const handleMessage = (msg: WSMessage) => {
    console.log('[WS] Received:', msg.type);

    switch (msg.type) {
      case 'joined':
        setRoomId(msg.roomId || null);
        setParticipantId(msg.participantId || null);
        setParticipants(msg.participants || []);
        setHasPresenter(msg.hasPresenter || false);
        // Use streamReady from server response
        setIsStreamReady((msg as { streamReady?: boolean }).streamReady || false);
        break;

      case 'participant-joined': {
        const newParticipant = msg.payload as Participant;
        setParticipants(prev => [...prev, newParticipant]);
        if (newParticipant.isPresenter) setHasPresenter(true);
        break;
      }

      case 'participant-left': {
        const leftParticipant = msg.payload as Participant;
        setParticipants(prev => prev.filter(p => p.id !== leftParticipant.id));
        if (leftParticipant.isPresenter) {
          setHasPresenter(false);
          setIsStreamReady(false);
          setViewerConnectionState('idle');
        }
        break;
      }

      case 'offer':
        console.log('[WS] 📥 Received offer from server');
        setViewerConnectionState('connecting');
        const offer = msg.payload as RTCSessionDescriptionInit;
        if (onOfferRef.current) {
          onOfferRef.current(offer);
        } else {
          // Queue the offer for when handler is registered
          console.log('[WS] ⏳ Queueing offer (handler not ready yet)');
          pendingOfferRef.current = offer;
        }
        break;

      case 'answer':
        onAnswerRef.current?.(msg.payload as RTCSessionDescriptionInit);
        break;

      case 'ice-candidate': {
        const candidate = msg.payload as RTCIceCandidateInit;
        if (onIceCandidateRef.current) {
          onIceCandidateRef.current(candidate);
        } else {
          // Queue the candidate for when handler is registered
          pendingIceCandidatesRef.current.push(candidate);
        }
        break;
      }

      case 'stream-available':
        console.log('[WS] ✅ Stream is now available');
        setIsStreamReady(true);
        onStreamAvailableRef.current?.();
        break;

      case 'stream-connected':
        console.log('[WS] ✅ Stream connected successfully');
        setViewerConnectionState('connected');
        onStreamConnectedRef.current?.();
        break;

      case 'waiting-for-stream': {
        const reason = (msg as { reason?: string }).reason || 'unknown';
        console.log('[WS] ⏳ Waiting for stream:', reason);
        setViewerConnectionState('waiting');
        onWaitingForStreamRef.current?.(reason);
        break;
      }

      case 'stream-not-ready': {
        const reason = (msg as { reason?: string }).reason || 'unknown';
        console.log('[WS] ⏳ Stream not ready:', reason);
        setViewerConnectionState('waiting');
        onWaitingForStreamRef.current?.(reason);
        break;
      }

      case 'stream-ended':
        console.log('[WS] Stream ended');
        setIsStreamReady(false);
        setViewerConnectionState('idle');
        onStreamEndedRef.current?.();
        break;

      case 'connection-failed':
        console.log('[WS] ❌ Connection failed notification');
        setViewerConnectionState('failed');
        onConnectionFailedRef.current?.();
        break;

      case 'chat': {
        const chatPayload = msg.payload as { senderId: string; senderName: string; message: string };
        setChatMessages(prev => [...prev, {
          ...chatPayload,
          timestamp: Date.now(),
        }]);
        break;
      }

      case 'hand-raised': {
        const raiser = msg.payload as Participant;
        // Could trigger a notification
        console.log(`${raiser.name} raised their hand`);
        break;
      }

      case 'error':
        setError(msg.message || 'Unknown error');
        break;
    }
  };

  const sendMessage = useCallback((message: WSMessage) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  }, []);

  const joinRoom = useCallback((name: string, isPresenter: boolean, roomIdToJoin?: string) => {
    sendMessage({
      type: 'join',
      name,
      isPresenter,
      roomId: roomIdToJoin,
    });
  }, [sendMessage]);

  const sendChat = useCallback((message: string) => {
    sendMessage({
      type: 'chat',
      payload: message,
    });
  }, [sendMessage]);

  const raiseHand = useCallback(() => {
    sendMessage({ type: 'raise-hand' });
  }, [sendMessage]);

  // Request stream - mainly used as retry mechanism
  const requestStream = useCallback(() => {
    console.log('[WS] Requesting stream from server');
    sendMessage({ type: 'request-stream' });
  }, [sendMessage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      ws.current?.close();
    };
  }, []);

  const value: WebSocketContextType = {
    isConnected,
    roomId,
    participantId,
    participants,
    hasPresenter,
    isStreamReady,
    viewerConnectionState,
    chatMessages,
    error,
    connect,
    disconnect,
    sendMessage,
    joinRoom,
    sendChat,
    raiseHand,
    requestStream,
    onOffer: useCallback((cb: (offer: RTCSessionDescriptionInit) => void) => { 
      console.log('[WS] Registering onOffer callback');
      onOfferRef.current = cb;
      // Process any pending offer
      if (pendingOfferRef.current) {
        console.log('[WS] 📥 Processing queued offer');
        const offer = pendingOfferRef.current;
        pendingOfferRef.current = null;
        // Use setTimeout to ensure the callback is fully registered
        setTimeout(() => cb(offer), 0);
      }
    }, []),
    onAnswer: useCallback((cb: (answer: RTCSessionDescriptionInit) => void) => { onAnswerRef.current = cb; }, []),
    onIceCandidate: useCallback((cb: (candidate: RTCIceCandidateInit) => void) => { 
      onIceCandidateRef.current = cb;
      // Process any pending ICE candidates
      if (pendingIceCandidatesRef.current.length > 0) {
        console.log(`[WS] 📥 Processing ${pendingIceCandidatesRef.current.length} queued ICE candidates`);
        const candidates = [...pendingIceCandidatesRef.current];
        pendingIceCandidatesRef.current = [];
        candidates.forEach(c => cb(c));
      }
    }, []),
    onStreamAvailable: useCallback((cb: () => void) => { onStreamAvailableRef.current = cb; }, []),
    onStreamEnded: useCallback((cb: () => void) => { onStreamEndedRef.current = cb; }, []),
    onStreamConnected: useCallback((cb: () => void) => { onStreamConnectedRef.current = cb; }, []),
    onConnectionFailed: useCallback((cb: () => void) => { onConnectionFailedRef.current = cb; }, []),
    onWaitingForStream: useCallback((cb: (reason: string) => void) => { onWaitingForStreamRef.current = cb; }, []),
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};
