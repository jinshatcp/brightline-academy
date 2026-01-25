import { useState, useEffect, useCallback } from 'react';
import type { Note, Batch } from '../types';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * Notes component for viewing and managing class documents/PDFs.
 * Admin: Full CRUD access
 * Presenter: Can upload and read (no delete)
 * Student: Can only read notes from their batches
 */
export function Notes() {
  const { user, token } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  // Upload form state
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadBatchId, setUploadBatchId] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const canUpload = user?.role === 'admin' || user?.role === 'presenter';
  const canDelete = user?.role === 'admin';
  const canEdit = user?.role === 'admin';

  const fetchNotes = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE}/api/notes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch notes');
      const data = await response.json();
      setNotes(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notes');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchBatches = useCallback(async () => {
    if (!token || !canUpload) return;
    try {
      const response = await fetch(`${API_BASE}/api/batches`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch batches');
      const data = await response.json();
      setBatches(data || []);
    } catch (err) {
      console.error('Failed to fetch batches:', err);
    }
  }, [token, canUpload]);

  useEffect(() => {
    fetchNotes();
    fetchBatches();
  }, [fetchNotes, fetchBatches]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !uploadTitle || !uploadBatchId) {
      setError('Please fill all required fields');
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('title', uploadTitle);
    formData.append('description', uploadDescription);
    formData.append('batchId', uploadBatchId);

    try {
      const response = await fetch(`${API_BASE}/api/notes`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upload');
      }

      const newNote = await response.json();
      setNotes([newNote, ...notes]);
      setShowUpload(false);
      setUploadTitle('');
      setUploadDescription('');
      setUploadBatchId('');
      setUploadFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      const response = await fetch(`${API_BASE}/api/notes/${noteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to delete');
      setNotes(notes.filter(n => n.id !== noteId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNote) return;

    try {
      const response = await fetch(`${API_BASE}/api/notes/${editingNote.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: editingNote.title,
          description: editingNote.description,
        }),
      });

      if (!response.ok) throw new Error('Failed to update');
      const updated = await response.json();
      setNotes(notes.map(n => n.id === updated.id ? updated : n));
      setEditingNote(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'pdf':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <path d="M10 12h4" />
            <path d="M10 16h4" />
          </svg>
        );
      case 'image':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-400">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        );
      case 'document':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-400">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        );
      default:
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
            <polyline points="13 2 13 9 20 9" />
          </svg>
        );
    }
  };

  if (loading) {
    return (
      <div className="notes-container">
        <div className="notes-loading">
          <div className="spinner"></div>
          <p>Loading notes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="notes-container">
      <div className="notes-header">
        <div className="notes-title-section">
          <h2>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            Class Notes & Documents
          </h2>
          <p className="notes-subtitle">
            {user?.role === 'student' 
              ? 'Access learning materials from your batches'
              : 'Manage and share learning materials with students'
            }
          </p>
        </div>
        {canUpload && (
          <button className="btn-primary" onClick={() => setShowUpload(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Upload Document
          </button>
        )}
      </div>

      {error && (
        <div className="notes-error">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="modal-overlay" onClick={() => setShowUpload(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Upload Document</h3>
            <form onSubmit={handleUpload}>
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={e => setUploadTitle(e.target.value)}
                  placeholder="Enter document title"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={uploadDescription}
                  onChange={e => setUploadDescription(e.target.value)}
                  placeholder="Optional description"
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>Batch *</label>
                <select
                  value={uploadBatchId}
                  onChange={e => setUploadBatchId(e.target.value)}
                  required
                >
                  <option value="">Select a batch</option>
                  {batches.map(batch => (
                    <option key={batch.id} value={batch.id}>{batch.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>File *</label>
                <input
                  type="file"
                  onChange={e => setUploadFile(e.target.files?.[0] || null)}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.webp"
                  required
                />
                <small>Supported: PDF, Word, Excel, PowerPoint, Images, Text</small>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowUpload(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={uploading}>
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingNote && (
        <div className="modal-overlay" onClick={() => setEditingNote(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Edit Document</h3>
            <form onSubmit={handleUpdate}>
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={editingNote.title}
                  onChange={e => setEditingNote({...editingNote, title: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={editingNote.description}
                  onChange={e => setEditingNote({...editingNote, description: e.target.value})}
                  rows={3}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setEditingNote(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notes List */}
      {notes.length === 0 ? (
        <div className="notes-empty">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <h3>No documents yet</h3>
          <p>
            {user?.role === 'student'
              ? 'Documents will appear here when your instructors upload them.'
              : 'Upload documents to share with your students.'}
          </p>
        </div>
      ) : (
        <div className="notes-grid">
          {notes.map(note => (
            <div key={note.id} className="note-card">
              <div className="note-icon">
                {getFileIcon(note.fileType)}
              </div>
              <div className="note-info">
                <h4>{note.title}</h4>
                <p className="note-description">{note.description || 'No description'}</p>
                <div className="note-meta">
                  <span className="note-batch">{note.batchName}</span>
                  <span className="note-size">{formatFileSize(note.fileSize)}</span>
                  <span className="note-date">{formatDate(note.createdAt)}</span>
                </div>
                <div className="note-uploader">
                  Uploaded by {note.uploaderName}
                </div>
              </div>
              <div className="note-actions">
                <a
                  href={`${API_BASE}${note.downloadUrl}?token=${token}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-icon"
                  title="View/Download"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </a>
                {canEdit && (
                  <button
                    className="btn-icon"
                    onClick={() => setEditingNote(note)}
                    title="Edit"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                )}
                {canDelete && (
                  <button
                    className="btn-icon btn-danger"
                    onClick={() => handleDelete(note.id)}
                    title="Delete"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Notes;

