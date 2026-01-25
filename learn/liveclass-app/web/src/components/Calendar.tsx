import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import type { ScheduledClass, Batch } from '../types';

const API_BASE = '/api';

interface CalendarProps {
  onJoinClass: (roomId: string, isPresenter: boolean, scheduleId?: string, scheduleTitle?: string) => void;
}

/**
 * Calendar - Displays scheduled classes with premium visual design.
 */
export const Calendar: React.FC<CalendarProps> = ({ onJoinClass }) => {
  const { token, user } = useAuth();
  const [schedules, setSchedules] = useState<ScheduledClass[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduledClass | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [schedulesRes, batchesRes] = await Promise.all([
        fetch(`${API_BASE}/schedules`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/batches`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (schedulesRes.ok) {
        setSchedules(await schedulesRes.json());
      }
      if (batchesRes.ok) {
        setBatches(await batchesRes.json());
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const startClass = async (schedule: ScheduledClass) => {
    try {
      const res = await fetch(`${API_BASE}/schedules/${schedule.id}/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        onJoinClass(data.roomId, true, schedule.id, schedule.title);
      }
    } catch (err) {
      console.error('Failed to start class:', err);
    }
  };

  const joinClass = async (schedule: ScheduledClass) => {
    try {
      const res = await fetch(`${API_BASE}/schedules/${schedule.id}/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        onJoinClass(data.roomId, data.isPresenter, schedule.id, schedule.title);
      }
    } catch (err) {
      console.error('Failed to join class:', err);
    }
  };

  const cancelClass = async (schedule: ScheduledClass) => {
    if (!confirm(`Are you sure you want to cancel "${schedule.title}"?`)) return;
    
    try {
      const res = await fetch(`${API_BASE}/schedules/${schedule.id}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to cancel class');
      }
    } catch (err) {
      console.error('Failed to cancel class:', err);
      alert('Failed to cancel class');
    }
  };

  const canEditSchedule = (schedule: ScheduledClass) => {
    if (user?.role === 'admin') return true;
    if (user?.role === 'presenter' && schedule.presenterId === user.id) return true;
    return false;
  };

  const getStatusBadge = (status: string, canJoin: boolean) => {
    switch (status) {
      case 'live':
        return (
          <span className="flex items-center gap-2 px-4 py-1.5 bg-[rgba(248,113,113,0.1)] border border-[rgba(248,113,113,0.25)] rounded-full">
            <span className="w-2 h-2 bg-[var(--color-danger)] rounded-full animate-pulse-soft shadow-lg shadow-[rgba(248,113,113,0.5)]" />
            <span className="text-xs font-bold text-[var(--color-danger)] tracking-wider">LIVE</span>
          </span>
        );
      case 'scheduled':
        if (canJoin) {
          return (
            <span className="px-4 py-1.5 text-xs font-semibold rounded-full bg-[rgba(52,211,153,0.1)] text-[var(--color-success)] border border-[rgba(52,211,153,0.25)]">
              Ready to Join
            </span>
          );
        }
        return (
          <span className="px-4 py-1.5 text-xs font-semibold rounded-full bg-[rgba(96,165,250,0.1)] text-[var(--color-accent)] border border-[rgba(96,165,250,0.25)]">
            Scheduled
          </span>
        );
      case 'completed':
        return (
          <span className="px-4 py-1.5 text-xs font-semibold rounded-full bg-[var(--color-surface-300)] text-[var(--color-text-muted)] border border-[var(--color-border)]">
            Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-4 py-1.5 text-xs font-semibold rounded-full bg-[rgba(251,146,60,0.1)] text-[#fb923c] border border-[rgba(251,146,60,0.25)]">
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  };

  const groupByDate = (classes: ScheduledClass[]) => {
    const groups: { [key: string]: ScheduledClass[] } = {};
    classes.forEach((c) => {
      const date = new Date(c.startTime).toDateString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(c);
    });
    return groups;
  };

  const groupedSchedules = groupByDate(schedules);
  const isPresenter = user?.role === 'presenter';

  return (
    <div className="min-h-screen bg-elegant overflow-hidden">
      <div className="fixed inset-0 pattern-overlay" />
      
      {/* Ambient effects */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[400px] bg-[rgba(96,165,250,0.08)] rounded-full blur-[150px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[300px] bg-[rgba(167,139,250,0.06)] rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 glass-panel border-0 border-b border-[var(--color-border)] rounded-none">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(96,165,250,0.4)] to-transparent" />
        <div className="max-w-6xl mx-auto px-6 py-5 flex justify-between items-center">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[rgba(96,165,250,0.2)] to-[rgba(167,139,250,0.1)] border border-[var(--color-border)] flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-accent)]">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gradient font-display">
                My Classes
              </h1>
              <p className="text-sm text-[var(--color-text-muted)]">
                {isPresenter ? 'Manage and start your classes' : 'View and join your classes'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {isPresenter && batches.length > 0 && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary py-3 px-6"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14m-7-7h14" />
                </svg>
                Schedule Class
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-6 py-10">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 animate-fade-up">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[rgba(96,165,250,0.1)] to-[rgba(167,139,250,0.1)] border border-[var(--color-border)] flex items-center justify-center mb-6 animate-pulse-soft">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-accent)]">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            </div>
            <p className="text-[var(--color-text-muted)]">Loading your classes...</p>
          </div>
        ) : schedules.length === 0 ? (
          <div className="text-center py-32 animate-fade-up">
            <div className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-[rgba(96,165,250,0.1)] to-[rgba(167,139,250,0.1)] border border-[var(--color-border)] flex items-center justify-center animate-float">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-[var(--color-text-subtle)]">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
                <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-3 font-display">No Classes Scheduled</h3>
            <p className="text-[var(--color-text-muted)] max-w-md mx-auto">
              {isPresenter
                ? 'Create a batch first, then schedule your classes to get started.'
                : 'You don\'t have any upcoming classes. Contact your instructor for more information.'}
            </p>
            {isPresenter && batches.length === 0 && (
              <p className="text-sm text-[var(--color-accent)] mt-4">
                Tip: Go to Batch Management to create your first batch
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-10 animate-fade-up">
            {Object.entries(groupedSchedules).map(([date, classes], groupIndex) => (
              <div key={date} style={{ animationDelay: `${groupIndex * 0.1}s` }}>
                <div className="flex items-center gap-4 mb-5">
                  <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                    {formatDate(classes[0].startTime)}
                  </h3>
                  <div className="flex-1 h-px bg-gradient-to-r from-[var(--color-border)] to-transparent" />
                </div>
                <div className="space-y-4">
                  {classes.map((schedule, index) => (
                    <div
                      key={schedule.id}
                      className="glass-panel rounded-2xl p-6 flex items-center justify-between gap-6 hover:border-[var(--color-border-hover)] transition-all duration-300 group"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <div className="flex items-center gap-5">
                        <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 ${
                          schedule.status === 'live' 
                            ? 'bg-gradient-to-br from-[rgba(248,113,113,0.2)] to-[rgba(248,113,113,0.1)] border border-[rgba(248,113,113,0.3)]'
                            : 'bg-gradient-to-br from-[rgba(96,165,250,0.1)] to-[rgba(167,139,250,0.1)] border border-[var(--color-border)] group-hover:border-[var(--color-accent)]'
                        }`}>
                          <span className={`text-xl font-bold ${schedule.status === 'live' ? 'text-[var(--color-danger)]' : 'text-[var(--color-accent)]'}`}>
                            {formatTime(schedule.startTime).split(':')[0]}
                          </span>
                          <span className="text-xs text-[var(--color-text-muted)]">
                            {formatTime(schedule.startTime).split(' ')[1]}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-lg group-hover:text-[var(--color-accent)] transition-colors">{schedule.title}</h4>
                          <div className="flex items-center gap-4 mt-2 text-sm text-[var(--color-text-muted)]">
                            <span className="flex items-center gap-2">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                              </svg>
                              {schedule.batchName}
                            </span>
                            <span className="text-[var(--color-text-subtle)]">•</span>
                            <span className="flex items-center gap-1">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M12 6v6l4 2" />
                              </svg>
                              {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                            </span>
                          </div>
                          {schedule.presenterName && !isPresenter && (
                            <p className="text-xs text-[var(--color-text-subtle)] mt-2 flex items-center gap-1">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                              </svg>
                              Instructor: {schedule.presenterName}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {getStatusBadge(schedule.status, schedule.canJoin)}
                        
                        {/* Edit and Cancel buttons for admin/presenter */}
                        {schedule.status === 'scheduled' && canEditSchedule(schedule) && (
                          <>
                            <button
                              onClick={() => setEditingSchedule(schedule)}
                              className="p-2.5 rounded-xl bg-[rgba(96,165,250,0.1)] hover:bg-[rgba(96,165,250,0.2)] text-[var(--color-accent)] transition-all"
                              title="Edit"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => cancelClass(schedule)}
                              className="p-2.5 rounded-xl bg-[rgba(251,146,60,0.1)] hover:bg-[rgba(251,146,60,0.2)] text-[#fb923c] transition-all"
                              title="Cancel Class"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M15 9l-6 6M9 9l6 6" />
                              </svg>
                            </button>
                          </>
                        )}
                        
                        {schedule.status === 'live' && (
                          <button
                            onClick={() => joinClass(schedule)}
                            className="btn-primary py-3 px-6"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Join Now
                          </button>
                        )}

                        {schedule.status === 'scheduled' && canEditSchedule(schedule) && schedule.canJoin && (
                          <button
                            onClick={() => startClass(schedule)}
                            className="btn-primary py-3 px-6"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polygon points="5 3 19 12 5 21 5 3" />
                            </svg>
                            Start Class
                          </button>
                        )}

                        {schedule.status === 'scheduled' && !canEditSchedule(schedule) && schedule.canJoin && (
                          <button
                            onClick={() => joinClass(schedule)}
                            className="btn-primary py-3 px-6"
                          >
                            Join Class
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Schedule Modal */}
      {showCreateModal && (
        <CreateScheduleModal
          batches={batches}
          token={token!}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchData();
          }}
        />
      )}

      {/* Edit Schedule Modal */}
      {editingSchedule && (
        <EditScheduleModal
          schedule={editingSchedule}
          token={token!}
          onClose={() => setEditingSchedule(null)}
          onUpdated={() => {
            setEditingSchedule(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
};

interface CreateScheduleModalProps {
  batches: Batch[];
  token: string;
  onClose: () => void;
  onCreated: () => void;
}

const CreateScheduleModal: React.FC<CreateScheduleModalProps> = ({
  batches,
  token,
  onClose,
  onCreated,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [batchId, setBatchId] = useState(batches[0]?.id || '');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const startDateTime = new Date(`${date}T${startTime}`);
    const endDateTime = new Date(`${date}T${endTime}`);

    try {
      const res = await fetch(`${API_BASE}/schedules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          description,
          batchId,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
        }),
      });

      if (res.ok) {
        onCreated();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to create schedule');
      }
    } catch {
      setError('Network error');
    }
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-md">
      <div className="glass-panel rounded-3xl p-8 w-full max-w-lg animate-fade-up relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(96,165,250,0.5)] to-transparent" />
        
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold font-display">Schedule a Class</h2>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">Set up your next teaching session</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] flex items-center justify-center transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-[rgba(248,113,113,0.1)] border border-[rgba(248,113,113,0.25)] text-[var(--color-danger)] text-sm flex items-center gap-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4m0 4h.01" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-3">
              Class Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Introduction to React Hooks"
              className="input-elegant"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-3">
              Batch
            </label>
            <select
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              className="input-elegant"
              required
            >
              {batches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.name} ({batch.studentCount} students)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-3">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input-elegant"
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-3">
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="input-elegant"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-3">
                End Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="input-elegant"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-3">
              Description <span className="font-normal text-[var(--color-text-subtle)]">(Optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what will be covered..."
              className="input-elegant resize-none"
              rows={3}
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 py-4 rounded-xl border border-[var(--color-border)] text-[var(--color-text)] font-medium hover:bg-[rgba(255,255,255,0.05)] transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isLoading} 
              className="flex-1 btn-primary py-4"
            >
              {isLoading ? (
                <>
                  <span className="spinner" />
                  Scheduling...
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14m-7-7h14" />
                  </svg>
                  Schedule Class
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface EditScheduleModalProps {
  schedule: ScheduledClass;
  token: string;
  onClose: () => void;
  onUpdated: () => void;
}

/**
 * EditScheduleModal - Modal for editing an existing scheduled class.
 */
const EditScheduleModal: React.FC<EditScheduleModalProps> = ({
  schedule,
  token,
  onClose,
  onUpdated,
}) => {
  const [title, setTitle] = useState(schedule.title);
  const [description, setDescription] = useState(schedule.description || '');
  const [date, setDate] = useState(new Date(schedule.startTime).toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState(
    new Date(schedule.startTime).toTimeString().slice(0, 5)
  );
  const [endTime, setEndTime] = useState(
    new Date(schedule.endTime).toTimeString().slice(0, 5)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const startDateTime = new Date(`${date}T${startTime}`);
    const endDateTime = new Date(`${date}T${endTime}`);

    try {
      const res = await fetch(`${API_BASE}/schedules/${schedule.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          description,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
        }),
      });

      if (res.ok) {
        onUpdated();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update schedule');
      }
    } catch {
      setError('Network error');
    }
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-md">
      <div className="glass-panel rounded-3xl p-8 w-full max-w-lg animate-fade-up relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(96,165,250,0.5)] to-transparent" />
        
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold font-display">Edit Class</h2>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">Update your scheduled class</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] flex items-center justify-center transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-[rgba(248,113,113,0.1)] border border-[rgba(248,113,113,0.25)] text-[var(--color-danger)] text-sm flex items-center gap-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4m0 4h.01" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-3">
              Class Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Introduction to React Hooks"
              className="input-elegant"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-3">
              Batch
            </label>
            <input
              type="text"
              value={schedule.batchName || 'Unknown Batch'}
              className="input-elegant opacity-60"
              disabled
            />
            <p className="text-xs text-[var(--color-text-subtle)] mt-1">Batch cannot be changed</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-3">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input-elegant"
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-3">
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="input-elegant"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-3">
                End Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="input-elegant"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-3">
              Description <span className="font-normal text-[var(--color-text-subtle)]">(Optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what will be covered..."
              className="input-elegant resize-none"
              rows={3}
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 py-4 rounded-xl border border-[var(--color-border)] text-[var(--color-text)] font-medium hover:bg-[rgba(255,255,255,0.05)] transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isLoading} 
              className="flex-1 btn-primary py-4"
            >
              {isLoading ? (
                <>
                  <span className="spinner" />
                  Saving...
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                    <path d="M17 21v-8H7v8M7 3v5h8" />
                  </svg>
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
