import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useWebSocket } from '../context/WebSocketContext';
import { useWebRTC } from '../hooks/useWebRTC';
import { useRecording } from '../hooks/useRecording';
import { useAuth } from '../context/AuthContext';
import { VideoControls } from './VideoControls';
import { Sidebar } from './Sidebar';

interface ClassroomProps {
  isPresenter: boolean;
  userName: string;
  scheduleId?: string;
  scheduleTitle?: string;
  onLeave: () => void;
}

/**
 * Classroom - Main video classroom interface with premium design.
 * Uses a server-push model for connecting viewers to the presenter's stream.
 */
export const Classroom: React.FC<ClassroomProps> = ({ isPresenter, userName, scheduleId, scheduleTitle, onLeave }) => {
  const { roomId, participants, viewerConnectionState, hasPresenter } = useWebSocket();
  const { token } = useAuth();
  const [copied, setCopied] = useState(false);
  const [uploadingRecording, setUploadingRecording] = useState(false);
  const hasInitialized = useRef(false);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const {
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
    localStream,
  } = useWebRTC({ 
    isPresenter, 
    localVideoRef, 
    remoteVideoRef 
  });

  const uploadRecording = useCallback(async (blob: Blob, duration: number) => {
    if (!scheduleId || !token) {
      console.warn('Cannot upload recording: missing scheduleId or token');
      return;
    }

    setUploadingRecording(true);
    try {
      const formData = new FormData();
      formData.append('recording', blob, `class_${scheduleId}.webm`);
      formData.append('scheduleId', scheduleId);
      formData.append('title', scheduleTitle || `Class Recording`);
      formData.append('duration', duration.toString());

      const response = await fetch('/api/recordings', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload recording');
      }

      console.log('Recording uploaded successfully');
    } catch (error) {
      console.error('Error uploading recording:', error);
    } finally {
      setUploadingRecording(false);
    }
  }, [scheduleId, scheduleTitle, token]);

  const {
    isRecording,
    duration,
    startRecording,
    stopRecording,
    formatDuration,
  } = useRecording({
    onRecordingComplete: uploadRecording,
    onError: (error) => console.error('Recording error:', error),
  });

  // Initialize presenter stream immediately
  useEffect(() => {
    if (isPresenter && !hasInitialized.current) {
      hasInitialized.current = true;
      
      console.log('[Classroom] Initializing presenter stream immediately...');
      
      // Start stream with minimal delay (just to ensure DOM is ready)
      const initTimer = setTimeout(async () => {
        console.log('[Classroom] Starting presenter stream...');
        const success = await startPresenterStream();
        console.log('[Classroom] Stream started:', success);
        
        if (!success) {
          hasInitialized.current = false;
        }
      }, 50); // Reduced from 200ms to 50ms
      
      return () => clearTimeout(initTimer);
    }
  }, [isPresenter, startPresenterStream]);

  // Debug logging for viewer connection state changes
  useEffect(() => {
    if (!isPresenter) {
      console.log('[Classroom] Viewer connection state:', viewerConnectionState, 'hasPresenter:', hasPresenter);
    }
  }, [isPresenter, viewerConnectionState, hasPresenter]);

  const handleStartRecording = useCallback(async () => {
    if (!localStream) {
      console.warn('No local stream available for recording');
      return;
    }
    
    recordingStreamRef.current = localStream;
    await startRecording(localStream);
  }, [localStream, startRecording]);

  const handleStopRecording = useCallback(() => {
    stopRecording();
    recordingStreamRef.current = null;
  }, [stopRecording]);

  const handleLeave = useCallback(() => {
    console.log('[Classroom] Leaving room...');
    
    if (isRecording) {
      stopRecording();
    }
    
    hasInitialized.current = false;
    recordingStreamRef.current = null;
    
    cleanup();
    onLeave();
  }, [cleanup, onLeave, isRecording, stopRecording]);

  const copyRoomId = useCallback(() => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [roomId]);

  const presenterName = participants.find(p => p.isPresenter)?.name || userName;

  // Determine if we should show the waiting/loading state for viewers
  // Show waiting state only if RTC connection is NOT connected (for fastest video display)
  const showWaitingState = !isPresenter && connectionState !== 'connected';

  // Get status message based on connection state
  const getStatusMessage = () => {
    if (isPresenter) return null;
    
    // Use RTC connection state for more accurate status
    if (connectionState === 'connecting') {
      return {
        title: 'Connecting...',
        subtitle: 'Establishing connection to the live stream...',
        icon: 'connecting',
      };
    }
    
    if (connectionState === 'failed') {
      return {
        title: 'Connection Issue',
        subtitle: 'Reconnecting to the stream automatically...',
        icon: 'failed',
      };
    }
    
    // Not connected yet - show waiting message
    return {
      title: hasPresenter ? 'Connecting to Stream' : 'Waiting for Presenter',
      subtitle: hasPresenter 
        ? 'Setting up your connection...' 
        : 'The class will begin when the presenter joins...',
      icon: hasPresenter ? 'connecting' : 'waiting',
    };
  };

  const statusMessage = getStatusMessage();

  return (
    <div className="h-screen flex flex-col p-5 bg-elegant overflow-hidden">
      <div className="fixed inset-0 pattern-overlay" />
      
      {/* Ambient lighting effects */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[rgba(96,165,250,0.08)] rounded-full blur-[150px] pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[600px] h-[300px] bg-[rgba(167,139,250,0.06)] rounded-full blur-[120px] pointer-events-none" />
      
      {/* Header */}
      <header className="glass-panel rounded-2xl p-4 mb-5 flex justify-between items-center relative z-10 animate-fade-up">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(96,165,250,0.4)] to-transparent" />
        
        <div className="flex items-center gap-5">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[rgba(96,165,250,0.2)] to-[rgba(167,139,250,0.1)] border border-[var(--color-border)] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-accent)]">
                <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-gradient font-bold text-lg hidden sm:block font-display">
              LiveClass
            </span>
          </div>

          {/* Room Code */}
          <div className="flex items-center gap-3 px-4 py-2.5 bg-[rgba(255,255,255,0.03)] rounded-xl border border-[var(--color-border)]">
            <span className="text-xs text-[var(--color-text-subtle)] uppercase tracking-wider">Room</span>
            <span className="font-mono text-sm font-semibold tracking-widest bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-secondary)] bg-clip-text text-transparent">
              {roomId}
            </span>
            <button
              onClick={copyRoomId}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                copied 
                  ? 'bg-[rgba(52,211,153,0.2)] text-[var(--color-success)]' 
                  : 'hover:bg-[rgba(255,255,255,0.08)] text-[var(--color-text-muted)]'
              }`}
              title={copied ? 'Copied!' : 'Copy room code'}
            >
              {copied ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2"/>
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                </svg>
              )}
            </button>
          </div>

          {/* Participant Count */}
          <div className="flex items-center gap-2 px-3 py-2 bg-[rgba(255,255,255,0.03)] rounded-lg border border-[var(--color-border)]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-text-muted)]">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87"/>
              <path d="M16 3.13a4 4 0 010 7.75"/>
            </svg>
            <span className="font-semibold text-sm">{participants.length}</span>
          </div>
        </div>
        
        {/* Status Indicators */}
        <div className="flex items-center gap-3">
          {/* Live indicator for presenter or connected viewer */}
          {(isPresenter || viewerConnectionState === 'connected') && connectionState === 'connected' && (
            <div className="flex items-center gap-2 px-4 py-2 bg-[rgba(248,113,113,0.1)] border border-[rgba(248,113,113,0.25)] rounded-full animate-fade-in">
              <span className="w-2.5 h-2.5 bg-[var(--color-danger)] rounded-full animate-pulse-soft shadow-lg shadow-[rgba(248,113,113,0.5)]" />
              <span className="text-[var(--color-danger)] font-bold text-xs tracking-wider">LIVE</span>
            </div>
          )}

          {/* Connecting indicator for viewers */}
          {!isPresenter && viewerConnectionState === 'connecting' && (
            <div className="flex items-center gap-2 px-4 py-2 bg-[rgba(251,191,36,0.12)] border border-[rgba(251,191,36,0.3)] rounded-full">
              <span className="w-2.5 h-2.5 bg-[var(--color-warning)] rounded-full animate-pulse-soft" />
              <span className="text-[var(--color-warning)] font-semibold text-xs tracking-wider">CONNECTING</span>
            </div>
          )}

          {/* Waiting indicator for viewers */}
          {!isPresenter && viewerConnectionState === 'waiting' && (
            <div className="flex items-center gap-2 px-4 py-2 bg-[rgba(96,165,250,0.12)] border border-[rgba(96,165,250,0.3)] rounded-full">
              <span className="w-2.5 h-2.5 bg-[var(--color-accent)] rounded-full animate-pulse-soft" />
              <span className="text-[var(--color-accent)] font-semibold text-xs tracking-wider">WAITING</span>
            </div>
          )}

          {isRecording && (
            <div className="flex items-center gap-2 px-4 py-2 bg-[rgba(248,113,113,0.15)] border border-[rgba(248,113,113,0.3)] rounded-full">
              <span className="w-2.5 h-2.5 bg-[var(--color-danger)] rounded-full animate-pulse-soft" />
              <span className="font-mono text-xs text-[var(--color-danger)]">{formatDuration(duration)}</span>
              <span className="font-semibold text-xs text-[var(--color-danger)]">REC</span>
            </div>
          )}

          {connectionState === 'connecting' && isPresenter && (
            <div className="flex items-center gap-2 px-4 py-2 bg-[rgba(251,191,36,0.12)] border border-[rgba(251,191,36,0.3)] rounded-full">
              <span className="w-2.5 h-2.5 bg-[var(--color-warning)] rounded-full animate-pulse-soft" />
              <span className="text-[var(--color-warning)] font-semibold text-xs tracking-wider">CONNECTING</span>
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex gap-5 min-h-0 relative z-10">
        {/* Video section */}
        <section className="flex-1 flex flex-col gap-5 animate-fade-up stagger-1">
          <div className="video-container flex-1 relative">
            {/* Gradient border effect */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[rgba(96,165,250,0.2)] via-transparent to-[rgba(167,139,250,0.15)] p-px">
              <div className="w-full h-full rounded-3xl bg-[var(--color-surface-100)]" />
            </div>
            
            {/* Video content */}
            <div className="absolute inset-0 rounded-3xl overflow-hidden">
              {/* Presenter video (local) */}
              {isPresenter && (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              )}
              
              {/* Viewer video (remote) - Show immediately when RTC connected */}
              {!isPresenter && (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  preload="auto"
                  className={`w-full h-full object-cover transition-opacity duration-100 ${
                    connectionState === 'connected' ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              )}
              
              {/* Waiting/Loading state for viewers */}
              {showWaitingState && statusMessage && (
                <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-surface-100)]">
                  <div className="text-center max-w-md px-6">
                    <div className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-[rgba(96,165,250,0.1)] to-[rgba(167,139,250,0.1)] border border-[var(--color-border)] flex items-center justify-center animate-float">
                      {statusMessage.icon === 'connecting' ? (
                        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-accent)] animate-spin">
                          <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
                          <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
                        </svg>
                      ) : statusMessage.icon === 'failed' ? (
                        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-warning)]">
                          <circle cx="12" cy="12" r="10"/>
                          <path d="M12 8v4"/>
                          <path d="M12 16h.01"/>
                        </svg>
                      ) : (
                        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-text-subtle)]">
                          <rect x="2" y="6" width="20" height="12" rx="2"/>
                          <path d="M6 12h.01M10 12h.01"/>
                          <path d="M14 10l4-2v8l-4-2v-4z"/>
                        </svg>
                      )}
                    </div>
                    <p className="text-[var(--color-text)] font-semibold text-xl mb-3">{statusMessage.title}</p>
                    <p className="text-[var(--color-text-muted)] text-sm leading-relaxed">{statusMessage.subtitle}</p>
                    <div className="flex items-center justify-center gap-1.5 mt-8">
                      <span className="w-2 h-2 bg-[var(--color-accent)] rounded-full animate-pulse-soft" style={{ animationDelay: '0s' }} />
                      <span className="w-2 h-2 bg-[var(--color-accent)] rounded-full animate-pulse-soft" style={{ animationDelay: '0.2s' }} />
                      <span className="w-2 h-2 bg-[var(--color-accent)] rounded-full animate-pulse-soft" style={{ animationDelay: '0.4s' }} />
                    </div>
                    
                    {/* Show participant info if presenter hasn't joined */}
                    {!hasPresenter && participants.length > 0 && (
                      <div className="mt-8 pt-6 border-t border-[var(--color-border)]">
                        <p className="text-xs text-[var(--color-text-subtle)] mb-2">
                          {participants.length} {participants.length === 1 ? 'participant' : 'participants'} waiting
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Presenter name badge */}
              {(!showWaitingState || isPresenter) && (
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                  <div className="inline-flex items-center gap-3 px-4 py-2.5 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-secondary)] flex items-center justify-center text-xs font-bold text-white shadow-lg">
                      {presenterName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-white">{presenterName}</div>
                      <div className="text-xs text-white/60 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-[var(--color-success)] rounded-full" />
                        Presenter
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <VideoControls
            isPresenter={isPresenter}
            isVideoEnabled={isVideoEnabled}
            isAudioEnabled={isAudioEnabled}
            isScreenSharing={isScreenSharing}
            isRecording={isRecording}
            recordingDuration={formatDuration(duration)}
            onToggleVideo={toggleVideo}
            onToggleAudio={toggleAudio}
            onStartScreenShare={startScreenShare}
            onStopScreenShare={stopScreenShare}
            onStartRecording={isPresenter && scheduleId ? handleStartRecording : undefined}
            onStopRecording={isPresenter && scheduleId ? handleStopRecording : undefined}
            onLeave={handleLeave}
          />

          {/* Recording upload indicator */}
          {uploadingRecording && (
            <div className="fixed bottom-28 left-1/2 -translate-x-1/2 glass-panel rounded-xl px-6 py-4 flex items-center gap-4 z-50 animate-fade-up">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[rgba(96,165,250,0.2)] to-[rgba(167,139,250,0.1)] flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-accent)] animate-pulse-soft">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <path d="M17 8l-5-5-5 5"/>
                  <path d="M12 3v12"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium">Uploading recording...</p>
                <p className="text-xs text-[var(--color-text-muted)]">Please wait</p>
              </div>
            </div>
          )}
        </section>

        {/* Sidebar */}
        <Sidebar />
      </main>
    </div>
  );
};
