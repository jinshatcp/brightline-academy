import { useRef, useState, useCallback, useEffect } from 'react';
import type { MutableRefObject } from 'react';
import { useWebSocket } from '../context/WebSocketContext';

// Optimized ICE configuration for FASTEST connections
const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 5, // Pre-gather candidates for faster connection
  bundlePolicy: 'max-bundle', // Single transport for all media
  rtcpMuxPolicy: 'require', // Multiplex RTP and RTCP
  iceTransportPolicy: 'all', // Use all available transports
};

// Maximum retries for failed connections
const MAX_CONNECTION_RETRIES = 3;
const RETRY_DELAY = 1500;

interface UseWebRTCOptions {
  isPresenter: boolean;
  localVideoRef: MutableRefObject<HTMLVideoElement | null>;
  remoteVideoRef: MutableRefObject<HTMLVideoElement | null>;
}

/**
 * useWebRTC - Hook for managing WebRTC peer connections in the classroom.
 * Uses a server-push model where the server initiates offers to viewers when the stream is ready.
 * Supports both scenarios:
 * - Student joins first, presenter joins later
 * - Presenter joins first, student joins later
 */
export const useWebRTC = ({ isPresenter, localVideoRef, remoteVideoRef }: UseWebRTCOptions) => {
  const { 
    sendMessage, 
    onOffer, 
    onAnswer, 
    onIceCandidate, 
    onStreamConnected, 
    onConnectionFailed,
    onStreamEnded,
    onStreamAvailable,
    requestStream,
    viewerConnectionState,
  } = useWebSocket();
  
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const screenStream = useRef<MediaStream | null>(null);
  const pendingIceCandidates = useRef<RTCIceCandidateInit[]>([]);
  const connectionRetries = useRef(0);
  const retryTimer = useRef<number | null>(null);
  
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');

  // Use a ref to store sendMessage to avoid recreating callbacks
  const sendMessageRef = useRef(sendMessage);
  sendMessageRef.current = sendMessage;

  // Clear any pending retry timers
  const clearRetryTimer = useCallback(() => {
    if (retryTimer.current) {
      clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }
  }, []);

  // Prepare video element for instant playback
  const prepareVideoElement = useCallback((video: HTMLVideoElement) => {
    video.autoplay = true;
    video.playsInline = true;
    video.muted = false; // Allow audio
    // Preload metadata for faster start
    video.preload = 'auto';
  }, []);

  // Process pending ICE candidates after remote description is set
  const processPendingIceCandidates = useCallback(async () => {
    const pc = peerConnection.current;
    if (!pc || !pc.remoteDescription) return;

    console.log(`[RTC] Processing ${pendingIceCandidates.current.length} pending ICE candidates`);
    const candidates = [...pendingIceCandidates.current];
    pendingIceCandidates.current = [];
    
    for (const candidate of candidates) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn('[RTC] Error adding queued ICE candidate:', err);
      }
    }
  }, []);

  // Initialize presenter stream
  const startPresenterStream = useCallback(async (): Promise<boolean> => {
    // Clean up any existing connection first
    if (peerConnection.current) {
      console.log('[RTC] Cleaning up existing peer connection before starting new one');
      peerConnection.current.close();
      peerConnection.current = null;
    }
    pendingIceCandidates.current = [];

    try {
      console.log('[RTC] Getting user media...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      
      console.log('[RTC] Got media stream with tracks:', stream.getTracks().map(t => t.kind));
      localStream.current = stream;
      
      // Set local video immediately
      if (localVideoRef.current) {
        console.log('[RTC] Setting local video srcObject');
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true; // Mute local preview
        localVideoRef.current.play().catch(e => console.log('[RTC] Video play error:', e));
      } else {
        console.warn('[RTC] Local video ref not available!');
      }

      // Create peer connection
      console.log('[RTC] Creating peer connection...');
      const pc = new RTCPeerConnection(RTC_CONFIG);
      peerConnection.current = pc;

      // Add tracks
      stream.getTracks().forEach(track => {
        console.log('[RTC] Adding track to peer connection:', track.kind);
        pc.addTrack(track, stream);
      });

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('[RTC] Sending ICE candidate');
          sendMessageRef.current({
            type: 'ice-candidate',
            payload: event.candidate,
          });
        }
      };

      // Handle connection state
      pc.onconnectionstatechange = () => {
        console.log('[RTC] Connection state:', pc.connectionState);
        setConnectionState(pc.connectionState);
        
        if (pc.connectionState === 'failed') {
          console.log('[RTC] Connection failed, may need to restart');
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log('[RTC] ICE connection state:', pc.iceConnectionState);
        
        if (pc.iceConnectionState === 'failed') {
          console.log('[RTC] ICE failed, attempting restart...');
          pc.restartIce();
        }
      };

      // Create and send offer immediately
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      // Send offer - ICE candidates will trickle separately
      sendMessageRef.current({
        type: 'offer',
        payload: offer,
      });

      return true;
    } catch (err) {
      console.error('[RTC] Error starting stream:', err);
      peerConnection.current = null;
      return false;
    }
  }, [localVideoRef]);

  // Handle answer from server (for presenter)
  useEffect(() => {
    if (!isPresenter) return;

    const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
      console.log('[RTC] Received answer from server');
      const pc = peerConnection.current;
      if (pc && pc.signalingState !== 'stable') {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          console.log('[RTC] Remote description set successfully');
          // Process any pending ICE candidates immediately
          await processPendingIceCandidates();
        } catch (err) {
          console.error('[RTC] Error setting remote description:', err);
        }
      } else {
        console.warn('[RTC] Cannot set remote description, state:', pc?.signalingState);
      }
    };

    onAnswer(handleAnswer);
  }, [isPresenter, onAnswer, processPendingIceCandidates]);

  // Handle ICE candidates
  useEffect(() => {
    const handleIceCandidate = async (candidate: RTCIceCandidateInit) => {
      const pc = peerConnection.current;
      
      // Queue candidate if peer connection or remote description isn't ready
      if (!pc || !pc.remoteDescription) {
        console.log('[RTC] Queueing ICE candidate (peer not ready)');
        pendingIceCandidates.current.push(candidate);
        return;
      }
      
      try {
        console.log('[RTC] Adding ICE candidate from server');
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('[RTC] Error adding ICE candidate:', err);
        // Queue for later if it fails
        pendingIceCandidates.current.push(candidate);
      }
    };

    onIceCandidate(handleIceCandidate);
  }, [onIceCandidate]);

  // Handle offer from server (for viewer) - SERVER PUSH MODEL - OPTIMIZED FOR INSTANT VIDEO
  useEffect(() => {
    if (isPresenter) return;

    console.log('[RTC] Registering offer handler for viewer');

    const handleOffer = async (offer: RTCSessionDescriptionInit) => {
      console.log('[RTC] 📥 Received offer from server - setting up instant video');
      console.log('[RTC] Offer type:', offer.type, 'SDP length:', offer.sdp?.length);
      
      // Close existing connection and clear pending candidates
      if (peerConnection.current) {
        console.log('[RTC] Closing existing viewer peer connection, state:', peerConnection.current.connectionState);
        peerConnection.current.close();
        peerConnection.current = null;
      }
      pendingIceCandidates.current = [];
      clearRetryTimer();
      connectionRetries.current = 0;

      const pc = new RTCPeerConnection(RTC_CONFIG);
      peerConnection.current = pc;

      // Pre-warm the video element with empty stream for instant display
      const video = remoteVideoRef.current;
      if (video) {
        prepareVideoElement(video);
        // Create MediaStream early so tracks can be added immediately
        const stream = new MediaStream();
        video.srcObject = stream;
      }

      // Handle incoming tracks - INSTANT DISPLAY
      pc.ontrack = (event) => {
        if (!video) return;
        
        // Add track to existing stream for fastest display
        const stream = video.srcObject as MediaStream;
        if (stream && event.track) {
          // Remove old tracks of same kind to avoid duplicates
          stream.getTracks()
            .filter(t => t.kind === event.track.kind)
            .forEach(t => stream.removeTrack(t));
          stream.addTrack(event.track);
        } else if (event.streams?.[0]) {
          video.srcObject = event.streams[0];
        }
        
        // Play immediately - don't wait
        video.play().catch(() => {
          // Retry on user interaction if autoplay blocked
          const playOnClick = () => {
            video.play().catch(() => {});
            document.removeEventListener('click', playOnClick);
          };
          document.addEventListener('click', playOnClick, { once: true });
        });
        
        // Also play when track becomes active
        event.track.onunmute = () => video.play().catch(() => {});
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('[RTC] Viewer sending ICE candidate');
          sendMessageRef.current({
            type: 'ice-candidate',
            payload: event.candidate,
          });
        }
      };

      pc.onconnectionstatechange = () => {
        console.log('[RTC] Viewer connection state:', pc.connectionState);
        setConnectionState(pc.connectionState);
        
        if (pc.connectionState === 'connected') {
          console.log('[RTC] ✅ Viewer connected successfully');
          connectionRetries.current = 0;
          clearRetryTimer();
        }
        
        if (pc.connectionState === 'failed') {
          console.log('[RTC] ❌ Viewer connection failed');
          handleConnectionFailure();
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log('[RTC] Viewer ICE state:', pc.iceConnectionState);
        
        if (pc.iceConnectionState === 'failed') {
          console.log('[RTC] Viewer ICE failed, attempting restart...');
          pc.restartIce();
        }
      };

      try {
        // Set remote description and create answer in parallel-ready sequence
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        
        // Create answer immediately - don't wait for ICE candidates
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        // Send answer immediately (ICE trickle will send candidates separately)
        sendMessageRef.current({
          type: 'answer',
          payload: answer,
        });
        
        // Process pending ICE candidates after answer is sent
        processPendingIceCandidates();
      } catch (err) {
        console.error('[RTC] Error handling offer:', err);
        handleConnectionFailure();
      }
    };

    const handleConnectionFailure = () => {
      if (connectionRetries.current < MAX_CONNECTION_RETRIES) {
        connectionRetries.current++;
        console.log(`[RTC] Scheduling retry ${connectionRetries.current}/${MAX_CONNECTION_RETRIES} in ${RETRY_DELAY}ms`);
        clearRetryTimer();
        retryTimer.current = window.setTimeout(() => {
          console.log('[RTC] Retrying stream request...');
          requestStream();
        }, RETRY_DELAY);
      } else {
        console.log('[RTC] Max retries reached');
      }
    };

    onOffer(handleOffer);
  }, [isPresenter, remoteVideoRef, onOffer, processPendingIceCandidates, clearRetryTimer, requestStream, prepareVideoElement]);

  // Handle successful connection notification from server
  useEffect(() => {
    if (isPresenter) return;

    onStreamConnected(() => {
      console.log('[RTC] ✅ Server confirmed stream connected');
      connectionRetries.current = 0;
      clearRetryTimer();
    });
  }, [isPresenter, onStreamConnected, clearRetryTimer]);

  // Handle connection failed notification from server
  useEffect(() => {
    if (isPresenter) return;

    onConnectionFailed(() => {
      console.log('[RTC] ❌ Server reported connection failed');
      
      // Clean up existing connection
      if (peerConnection.current) {
        peerConnection.current.close();
        peerConnection.current = null;
      }
      pendingIceCandidates.current = [];
      
      // Clear remote video
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
      
      // Retry connection
      if (connectionRetries.current < MAX_CONNECTION_RETRIES) {
        connectionRetries.current++;
        console.log(`[RTC] Scheduling retry ${connectionRetries.current}/${MAX_CONNECTION_RETRIES}`);
        clearRetryTimer();
        retryTimer.current = window.setTimeout(() => {
          requestStream();
        }, RETRY_DELAY);
      }
    });
  }, [isPresenter, onConnectionFailed, clearRetryTimer, requestStream, remoteVideoRef]);

  // Handle stream available - When presenter starts streaming (student joined first scenario)
  useEffect(() => {
    if (isPresenter) return;

    onStreamAvailable(() => {
      console.log('[RTC] 🎬 Stream available notification - presenter is now streaming');
      // Server will push an offer to us, but if we're in waiting state and don't receive
      // an offer within a short time, request the stream as a fallback
      const fallbackTimer = setTimeout(() => {
        if (viewerConnectionState === 'waiting' && !peerConnection.current) {
          console.log('[RTC] Fallback: requesting stream since no offer received');
          requestStream();
        }
      }, 500); // Wait 500ms for server push before requesting

      return () => clearTimeout(fallbackTimer);
    });
  }, [isPresenter, onStreamAvailable, viewerConnectionState, requestStream]);

  // Handle stream ended (presenter left)
  useEffect(() => {
    if (isPresenter) return;

    onStreamEnded(() => {
      console.log('[RTC] Stream ended (presenter left), cleaning up and waiting for reconnect');
      if (peerConnection.current) {
        peerConnection.current.close();
        peerConnection.current = null;
      }
      pendingIceCandidates.current = [];
      connectionRetries.current = 0;
      clearRetryTimer();
      setConnectionState('new');
      
      // Clear remote video
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
      
      // Note: We don't request stream here - the server will push when presenter reconnects
      // The UI should show "waiting for presenter" state
    });
  }, [isPresenter, onStreamEnded, clearRetryTimer, remoteVideoRef]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStream.current) {
      const videoTrack = localStream.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  }, []);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (localStream.current) {
      const audioTrack = localStream.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  }, []);

  // Start screen sharing
  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStream.current = stream;
      
      const screenTrack = stream.getVideoTracks()[0];
      const sender = peerConnection.current?.getSenders().find(s => s.track?.kind === 'video');
      
      if (sender) {
        await sender.replaceTrack(screenTrack);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setIsScreenSharing(true);

        screenTrack.onended = () => {
          stopScreenShare();
        };
      }
    } catch (err) {
      console.error('[RTC] Screen share error:', err);
    }
  }, [localVideoRef]);

  // Stop screen sharing
  const stopScreenShare = useCallback(async () => {
    if (!localStream.current) return;

    const videoTrack = localStream.current.getVideoTracks()[0];
    const sender = peerConnection.current?.getSenders().find(s => s.track?.kind === 'video');
    
    if (sender && videoTrack) {
      await sender.replaceTrack(videoTrack);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream.current;
      }
    }

    screenStream.current?.getTracks().forEach(track => track.stop());
    screenStream.current = null;
    setIsScreenSharing(false);
  }, [localVideoRef]);

  // Cleanup
  const cleanup = useCallback(() => {
    console.log('[RTC] Cleaning up...');
    clearRetryTimer();
    
    localStream.current?.getTracks().forEach(track => {
      console.log('[RTC] Stopping track:', track.kind);
      track.stop();
    });
    screenStream.current?.getTracks().forEach(track => track.stop());
    
    if (peerConnection.current) {
      peerConnection.current.close();
    }
    
    localStream.current = null;
    screenStream.current = null;
    peerConnection.current = null;
    pendingIceCandidates.current = [];
    connectionRetries.current = 0;
    
    // Reset states
    setConnectionState('new');
    setIsVideoEnabled(true);
    setIsAudioEnabled(true);
    setIsScreenSharing(false);
  }, [clearRetryTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    startPresenterStream,
    toggleVideo,
    toggleAudio,
    startScreenShare,
    stopScreenShare,
    cleanup,
    isVideoEnabled,
    isAudioEnabled,
    isScreenSharing,
    connectionState,
    viewerConnectionState,
    localStream: localStream.current,
  };
};
