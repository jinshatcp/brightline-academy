import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import type { Batch, User } from '../types';

const API_BASE = '/api';

/**
 * BatchManagement - Admin component for managing batches.
 */
export const BatchManagement: React.FC = () => {
  const { token } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [presenters, setPresenters] = useState<User[]>([]);
  const [availableStudents, setAvailableStudents] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [showAddStudentsModal, setShowAddStudentsModal] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [batchesRes, presentersRes, studentsRes] = await Promise.all([
        fetch(`${API_BASE}/batches`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/admin/users?role=presenter&status=approved`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/batches/students`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (batchesRes.ok) setBatches(await batchesRes.json());
      if (presentersRes.ok) setPresenters(await presentersRes.json());
      if (studentsRes.ok) setAvailableStudents(await studentsRes.json());
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const deleteBatch = async (batchId: string) => {
    if (!confirm('Are you sure you want to delete this batch?')) return;

    try {
      const res = await fetch(`${API_BASE}/batches/${batchId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error('Failed to delete batch:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Batch Management</h2>
          <p className="text-sm text-[var(--color-text-muted)]">Create and manage student batches</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary py-2 px-4">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14m-7-7h14" />
          </svg>
          Create Batch
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
        </div>
      ) : batches.length === 0 ? (
        <div className="glass-panel rounded-xl p-10 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-[var(--color-surface-200)] border border-[var(--color-border)] flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-text-subtle)]">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87m-4-12a4 4 0 010 7.75" />
            </svg>
          </div>
          <p className="text-[var(--color-text-muted)]">No batches created yet</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {batches.map((batch) => (
            <div key={batch.id} className="glass-panel rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-dark)] flex items-center justify-center text-lg font-semibold text-[var(--color-surface)]">
                    {batch.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{batch.name}</h3>
                    <div className="flex items-center gap-3 text-sm text-[var(--color-text-muted)]">
                      <span>Presenter: {batch.presenterName}</span>
                      <span>•</span>
                      <span>{batch.studentCount} students</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedBatch(batch.id);
                      setShowAddStudentsModal(true);
                    }}
                    className="px-3 py-2 text-sm font-medium rounded-lg bg-[rgba(34,211,238,0.12)] text-[var(--color-accent)] border border-[rgba(34,211,238,0.3)] hover:bg-[rgba(34,211,238,0.2)] transition-colors"
                  >
                    Add Students
                  </button>
                  <button
                    onClick={() => deleteBatch(batch.id)}
                    className="px-3 py-2 text-sm font-medium rounded-lg bg-[rgba(244,63,94,0.1)] text-[var(--color-danger)] border border-[rgba(244,63,94,0.2)] hover:bg-[rgba(244,63,94,0.2)] transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {batch.description && (
                <p className="mt-3 text-sm text-[var(--color-text-muted)]">{batch.description}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Batch Modal */}
      {showCreateModal && (
        <CreateBatchModal
          presenters={presenters}
          token={token!}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchData();
          }}
        />
      )}

      {/* Add Students Modal */}
      {showAddStudentsModal && selectedBatch && (
        <AddStudentsModal
          batchId={selectedBatch}
          students={availableStudents}
          token={token!}
          onClose={() => {
            setShowAddStudentsModal(false);
            setSelectedBatch(null);
          }}
          onAdded={() => {
            setShowAddStudentsModal(false);
            setSelectedBatch(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
};

interface CreateBatchModalProps {
  presenters: User[];
  token: string;
  onClose: () => void;
  onCreated: () => void;
}

const CreateBatchModal: React.FC<CreateBatchModalProps> = ({ presenters, token, onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [presenterId, setPresenterId] = useState(presenters[0]?.id || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/batches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, description, presenterId }),
      });

      if (res.ok) {
        onCreated();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to create batch');
      }
    } catch {
      setError('Network error');
    }
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
      <div className="glass-panel rounded-2xl p-8 w-full max-w-md animate-fade-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Create Batch</h2>
          <button onClick={onClose} className="icon-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-[rgba(244,63,94,0.1)] border border-[rgba(244,63,94,0.3)] text-[var(--color-danger)] text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
              Batch Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., React Beginners 2024"
              className="input-elegant"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
              Assign Presenter
            </label>
            <select
              value={presenterId}
              onChange={(e) => setPresenterId(e.target.value)}
              className="input-elegant"
              required
            >
              {presenters.length === 0 ? (
                <option value="">No presenters available</option>
              ) : (
                presenters.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.email})
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this batch..."
              className="input-elegant resize-none"
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 btn-leave justify-center">
              Cancel
            </button>
            <button type="submit" disabled={isLoading || !presenterId} className="flex-1 btn-primary justify-center">
              {isLoading ? 'Creating...' : 'Create Batch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface AddStudentsModalProps {
  batchId: string;
  students: User[];
  token: string;
  onClose: () => void;
  onAdded: () => void;
}

const AddStudentsModal: React.FC<AddStudentsModalProps> = ({ batchId, students, token, onClose, onAdded }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleStudent = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (selectedIds.length === 0) return;
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/batches/${batchId}/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ studentIds: selectedIds }),
      });

      if (res.ok) {
        onAdded();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to add students');
      }
    } catch {
      setError('Network error');
    }
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
      <div className="glass-panel rounded-2xl p-8 w-full max-w-lg animate-fade-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Add Students to Batch</h2>
          <button onClick={onClose} className="icon-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-[rgba(244,63,94,0.1)] border border-[rgba(244,63,94,0.3)] text-[var(--color-danger)] text-sm">
            {error}
          </div>
        )}

        {students.length === 0 ? (
          <p className="text-center text-[var(--color-text-muted)] py-8">
            No approved students available
          </p>
        ) : (
          <div className="max-h-80 overflow-y-auto space-y-2 mb-6">
            {students.map((student) => (
              <label
                key={student.id}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                  selectedIds.includes(student.id)
                    ? 'bg-[rgba(34,211,238,0.1)] border border-[rgba(34,211,238,0.3)]'
                    : 'hover:bg-[var(--color-surface-200)] border border-transparent'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(student.id)}
                  onChange={() => toggleStudent(student.id)}
                  className="w-5 h-5 rounded accent-[var(--color-accent)]"
                />
                <div className="avatar" style={{ width: 36, height: 36, fontSize: 12 }}>
                  {student.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium">{student.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{student.email}</p>
                </div>
              </label>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 btn-leave justify-center">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || selectedIds.length === 0}
            className="flex-1 btn-primary justify-center"
          >
            {isLoading ? 'Adding...' : `Add ${selectedIds.length} Student(s)`}
          </button>
        </div>
      </div>
    </div>
  );
};

