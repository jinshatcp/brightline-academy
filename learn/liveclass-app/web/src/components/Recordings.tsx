import { useState, useEffect, useCallback } from 'react';
import type { Recording } from '../types';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * Recordings component displays all available class recordings for the user.
 * Students see recordings from their batches, presenters see their own recordings.
 */
export function Recordings() {
  const { user, token } = useAuth();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);

  const fetchRecordings = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE}/api/recordings`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch recordings');
      }

      const data = await response.json();
      setRecordings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch recordings');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchRecordings();
  }, [fetchRecordings]);

  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins} min`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDelete = async (recordingId: string) => {
    if (!confirm('Are you sure you want to delete this recording?')) return;

    try {
      const response = await fetch(`${API_BASE}/api/recordings/${recordingId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete recording');
      }

      setRecordings(recordings.filter(r => r.id !== recordingId));
      if (selectedRecording?.id === recordingId) {
        setSelectedRecording(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete recording');
    }
  };

  if (loading) {
    return (
      <div className="recordings-container">
        <div className="recordings-loading">
          <div className="spinner"></div>
          <p>Loading recordings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="recordings-container">
      <div className="recordings-header">
        <h2>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="23 7 16 12 23 17 23 7" />
            <rect x="1" y="5" width="15" height="14" rx="2" />
          </svg>
          Class Recordings
        </h2>
        <p className="recordings-subtitle">
          {user?.role === 'student' 
            ? 'Watch recorded classes from your batches'
            : 'View and manage your class recordings'
          }
        </p>
      </div>

      {error && (
        <div className="recordings-error">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {recordings.length === 0 ? (
        <div className="recordings-empty">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5">
            <polygon points="23 7 16 12 23 17 23 7" />
            <rect x="1" y="5" width="15" height="14" rx="2" />
          </svg>
          <h3>No recordings yet</h3>
          <p>
            {user?.role === 'student'
              ? 'Recordings will appear here after classes are completed.'
              : 'Start recording your classes to save them for students.'}
          </p>
        </div>
      ) : (
        <div className="recordings-content">
          <div className="recordings-list">
            {recordings.map((recording) => (
              <div 
                key={recording.id} 
                className={`recording-card ${selectedRecording?.id === recording.id ? 'selected' : ''}`}
                onClick={() => setSelectedRecording(recording)}
              >
                <div className="recording-thumbnail">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  <span className="recording-duration">{formatDuration(recording.duration)}</span>
                </div>
                <div className="recording-info">
                  <h4>{recording.title}</h4>
                  <div className="recording-meta">
                    <span className="meta-item">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      {recording.presenterName}
                    </span>
                    <span className="meta-item">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      {formatDate(recording.recordedAt)}
                    </span>
                  </div>
                  {recording.batchName && (
                    <span className="recording-batch">{recording.batchName}</span>
                  )}
                </div>
                <div className="recording-size">{formatFileSize(recording.fileSize)}</div>
              </div>
            ))}
          </div>

          {selectedRecording && (
            <div className="recording-player">
              <div className="player-header">
                <h3>{selectedRecording.title}</h3>
                <button 
                  className="close-player"
                  onClick={() => setSelectedRecording(null)}
                >
                  ✕
                </button>
              </div>
              {!token ? (
                <div className="p-4 text-center text-red-500">
                  Error: No authentication token available
                </div>
              ) : !selectedRecording.streamUrl ? (
                <div className="p-4 text-center text-red-500">
                  Error: No stream URL available for this recording
                </div>
              ) : (
                <video
                  key={selectedRecording.id}
                  controls
                  autoPlay
                  playsInline
                  preload="auto"
                  className="video-player"
                  src={`${API_BASE}${selectedRecording.streamUrl}?token=${token}`}
                  onError={(e) => {
                    const video = e.target as HTMLVideoElement;
                    console.error('Video playback error:', {
                      code: video.error?.code,
                      message: video.error?.message,
                      src: video.src,
                      networkState: video.networkState,
                      readyState: video.readyState
                    });
                  }}
                >
                  Your browser does not support video playback.
                </video>
              )}
              <div className="player-info">
                <p>{selectedRecording.description || 'No description available.'}</p>
                <div className="player-meta">
                  <span>Presenter: {selectedRecording.presenterName}</span>
                  <span>Duration: {formatDuration(selectedRecording.duration)}</span>
                  <span>Recorded: {formatDate(selectedRecording.recordedAt)}</span>
                  <span>Size: {formatFileSize(selectedRecording.fileSize)}</span>
                </div>
                {(user?.role === 'presenter' || user?.role === 'admin') && (
                  <button 
                    className="delete-recording"
                    onClick={() => handleDelete(selectedRecording.id)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    Delete Recording
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Recordings;

