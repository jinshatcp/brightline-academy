import React, { useState } from 'react';
import type { UserRole } from '../types';

interface JoinFormProps {
  onJoin: (name: string, isPresenter: boolean, roomId?: string) => void;
  isLoading: boolean;
  userRole?: UserRole;
}

/**
 * JoinForm - Entry form for users to create or join a LiveClass session.
 * Shows role-specific options: Presenters create classes, Students join classes.
 */
export const JoinForm: React.FC<JoinFormProps> = ({ onJoin, isLoading, userRole }) => {
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');

  // Role determines what the user can do
  const isPresenterRole = userRole === 'presenter';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    if (isPresenterRole) {
      // Presenters always create classes
      onJoin(name.trim(), true, undefined);
    } else {
      // Students always join classes
      onJoin(name.trim(), false, roomId.trim());
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-elegant">
      <div className="fixed inset-0 pattern-overlay" />
      
      <div className="w-full max-w-md relative z-10">
        {/* Logo & Title */}
        <div className="text-center mb-10 animate-fade-up">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-2xl bg-[var(--color-surface-200)] border border-[var(--color-border)] animate-float">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-accent)]">
              <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-4xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-family-display)' }}>
            <span className="text-gradient">LiveClass</span>
          </h1>
          <p className="text-[var(--color-text-muted)] mt-3 text-sm tracking-wide">
            {isPresenterRole ? 'Create a virtual classroom' : 'Join a virtual classroom'}
          </p>
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit} className="glass-panel rounded-2xl p-8 animate-fade-up stagger-1">
          {/* Role Badge */}
          <div className="flex justify-center mb-6">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${
              isPresenterRole 
                ? 'bg-[rgba(34,211,238,0.12)] border-[rgba(34,211,238,0.3)] text-[var(--color-accent)]'
                : 'bg-[var(--color-surface-300)] border-[var(--color-border)] text-[var(--color-text-muted)]'
            }`}>
              {isPresenterRole ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2m-16 0H3m9-14v4m0 0l-2-2m2 2l2-2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
              <span className="text-sm font-medium capitalize">{userRole}</span>
            </div>
          </div>

          {/* Name Input */}
          <div className="mb-6">
            <label className="block text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name for the class"
              className="input-elegant"
              maxLength={30}
              required
            />
          </div>

          {/* Room Code Input - Only for Students */}
          {!isPresenterRole && (
            <div className="mb-6 animate-fade-in">
              <label className="block text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
                Room Code
              </label>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                placeholder="Enter room code from presenter"
                className="input-elegant font-mono tracking-widest text-center uppercase"
                maxLength={8}
                required
              />
              <p className="text-xs text-[var(--color-text-subtle)] mt-2 text-center">
                Get this code from your presenter
              </p>
            </div>
          )}

          {/* Info for Presenters */}
          {isPresenterRole && (
            <div className="mb-6 p-4 rounded-xl bg-[rgba(34,211,238,0.08)] border border-[rgba(34,211,238,0.2)]">
              <div className="flex items-start gap-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-accent)] mt-0.5 flex-shrink-0">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 16v-4m0-4h.01"/>
                </svg>
                <div className="text-sm text-[var(--color-text-muted)]">
                  <p className="font-medium text-[var(--color-text)] mb-1">You'll create a new classroom</p>
                  <p>Share the room code with your students so they can join.</p>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !name.trim() || (!isPresenterRole && !roomId.trim())}
            className="btn-primary w-full mt-2"
          >
            {isLoading ? (
              <>
                <span className="spinner" />
                Connecting...
              </>
            ) : (
              <>
                {isPresenterRole ? 'Create Class' : 'Join Class'}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14m-7-7l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-[var(--color-text-subtle)] text-xs mt-8 animate-fade-up stagger-2">
          Secure • Real-time • High Quality
        </p>
      </div>
    </div>
  );
};
