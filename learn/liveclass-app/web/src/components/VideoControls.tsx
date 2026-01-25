import React from 'react';
import { useWebSocket } from '../context/WebSocketContext';

interface VideoControlsProps {
  isPresenter: boolean;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isScreenSharing: boolean;
  isRecording?: boolean;
  recordingDuration?: string;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onStartScreenShare: () => void;
  onStopScreenShare: () => void;
  onStartRecording?: () => void;
  onStopRecording?: () => void;
  onLeave: () => void;
}

/**
 * VideoControls - Premium control bar for video/audio settings.
 */
export const VideoControls: React.FC<VideoControlsProps> = ({
  isPresenter,
  isVideoEnabled,
  isAudioEnabled,
  isScreenSharing,
  isRecording = false,
  recordingDuration = '0:00',
  onToggleVideo,
  onToggleAudio,
  onStartScreenShare,
  onStopScreenShare,
  onStartRecording,
  onStopRecording,
  onLeave,
}) => {
  const { raiseHand } = useWebSocket();

  const ControlButton: React.FC<{
    onClick: () => void;
    active?: boolean;
    danger?: boolean;
    recording?: boolean;
    title: string;
    children: React.ReactNode;
  }> = ({ onClick, active, danger, recording, title, children }) => (
    <button
      onClick={onClick}
      className={`
        w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300
        ${recording 
          ? 'bg-[rgba(248,113,113,0.15)] border border-[rgba(248,113,113,0.3)] text-[var(--color-danger)] shadow-lg shadow-[rgba(248,113,113,0.2)]'
          : active 
            ? 'bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-dark)] text-white shadow-lg shadow-[rgba(96,165,250,0.4)]'
            : danger
              ? 'bg-[rgba(248,113,113,0.1)] border border-[rgba(248,113,113,0.2)] text-[var(--color-danger)] hover:bg-[rgba(248,113,113,0.2)]'
              : 'bg-[rgba(255,255,255,0.05)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[rgba(255,255,255,0.1)] hover:border-[var(--color-border-hover)]'
        }
        hover:scale-105 active:scale-95
      `}
      title={title}
    >
      {children}
    </button>
  );

  if (isPresenter) {
    return (
      <div className="glass-panel rounded-2xl p-5 flex justify-center items-center gap-4 relative">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(96,165,250,0.3)] to-transparent" />
        
        {/* Camera Toggle */}
        <ControlButton
          onClick={onToggleVideo}
          danger={!isVideoEnabled}
          title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
        >
          {isVideoEnabled ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M16 16v1a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h2m9 9l4.553 2.276A1 1 0 0021 16.382V7.618a1 1 0 00-1.447-.894L15 9m0 0V8a2 2 0 00-2-2H9m6 3v6m0-6L3 18m6-12l12 12" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </ControlButton>
        
        {/* Microphone Toggle */}
        <ControlButton
          onClick={onToggleAudio}
          danger={!isAudioEnabled}
          title={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
        >
          {isAudioEnabled ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4m-4 0h8M12 1a3 3 0 00-3 3v6a3 3 0 006 0V4a3 3 0 00-3-3z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 1l22 22M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6M17 16.95A7 7 0 015 12v-2m14 0v2c0 .74-.11 1.45-.33 2.12M12 19v4m-4 0h8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </ControlButton>
        
        {/* Screen Share */}
        <ControlButton
          onClick={isScreenSharing ? onStopScreenShare : onStartScreenShare}
          active={isScreenSharing}
          title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
        >
          {isScreenSharing ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="3" width="20" height="14" rx="2"/>
              <path d="M9 10l6 4m0-4l-6 4M8 21h8M12 17v4"/>
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="3" width="20" height="14" rx="2"/>
              <path d="M8 21h8M12 17v4"/>
            </svg>
          )}
        </ControlButton>

        {/* Recording Toggle */}
        {onStartRecording && onStopRecording && (
          <ControlButton
            onClick={isRecording ? onStopRecording : onStartRecording}
            recording={isRecording}
            title={isRecording ? 'Stop recording' : 'Start recording'}
          >
            {isRecording ? (
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-[var(--color-danger)] rounded-full animate-pulse-soft" />
                <span className="text-xs font-mono font-semibold">{recordingDuration}</span>
              </div>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="4" fill="currentColor" />
              </svg>
            )}
          </ControlButton>
        )}

        {/* Divider */}
        <div className="w-px h-10 bg-[var(--color-border)] mx-2" />
        
        {/* Leave Button */}
        <button
          onClick={onLeave}
          className="flex items-center gap-3 px-6 py-3.5 bg-[rgba(248,113,113,0.1)] border border-[rgba(248,113,113,0.2)] rounded-xl text-[var(--color-danger)] font-semibold text-sm transition-all duration-300 hover:bg-[var(--color-danger)] hover:text-white hover:border-[var(--color-danger)] hover:shadow-lg hover:shadow-[rgba(248,113,113,0.3)] hover:scale-105 active:scale-95"
          title="Leave class"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 17l5-5-5-5M21 12H9M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Leave
        </button>
      </div>
    );
  }

  // Student controls
  return (
    <div className="glass-panel rounded-2xl p-5 flex justify-center items-center gap-4 relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(96,165,250,0.3)] to-transparent" />
      
      {/* Raise Hand */}
      <ControlButton
        onClick={raiseHand}
        title="Raise hand"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M18 8V6a2 2 0 00-4 0v2M14 8V4a2 2 0 00-4 0v4M10 8V5a2 2 0 00-4 0v7M10 8a2 2 0 114 0v1a2 2 0 014 0v1a2 2 0 012 2v3c0 3.314-2.686 6-6 6h-1a7 7 0 01-7-7V8a2 2 0 014 0" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </ControlButton>

      {/* Divider */}
      <div className="w-px h-10 bg-[var(--color-border)] mx-2" />
      
      {/* Leave Button */}
      <button
        onClick={onLeave}
        className="flex items-center gap-3 px-6 py-3.5 bg-[rgba(248,113,113,0.1)] border border-[rgba(248,113,113,0.2)] rounded-xl text-[var(--color-danger)] font-semibold text-sm transition-all duration-300 hover:bg-[var(--color-danger)] hover:text-white hover:border-[var(--color-danger)] hover:shadow-lg hover:shadow-[rgba(248,113,113,0.3)] hover:scale-105 active:scale-95"
        title="Leave class"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M16 17l5-5-5-5M21 12H9M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Leave
      </button>
    </div>
  );
};
