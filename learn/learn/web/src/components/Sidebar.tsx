import React, { useState, useRef, useEffect } from 'react';
import { useWebSocket } from '../context/WebSocketContext';

type Tab = 'participants' | 'chat';

/**
 * Sidebar - Displays participant list and chat functionality with premium design.
 */
export const Sidebar: React.FC = () => {
  const { participants, participantId, chatMessages, sendChat } = useWebSocket();
  const [activeTab, setActiveTab] = useState<Tab>('participants');
  const [message, setMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      sendChat(message.trim());
      setMessage('');
    }
  };

  return (
    <aside className="w-80 glass-panel rounded-2xl flex flex-col overflow-hidden animate-fade-up stagger-2 relative">
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(96,165,250,0.5)] to-transparent" />
      
      {/* Tabs */}
      <div className="flex border-b border-[var(--color-border)] relative">
        <button
          onClick={() => setActiveTab('participants')}
          className={`flex-1 py-4 px-4 text-sm font-medium transition-all duration-300 relative ${
            activeTab === 'participants' 
              ? 'text-[var(--color-accent)]' 
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="9" cy="7" r="4"/>
            </svg>
            Participants
            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full transition-all ${
              activeTab === 'participants'
                ? 'bg-[var(--color-accent)] text-[var(--color-surface)]'
                : 'bg-[var(--color-surface-400)] text-[var(--color-text-muted)]'
            }`}>
              {participants.length}
            </span>
          </span>
          {activeTab === 'participants' && (
            <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-secondary)] rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-4 px-4 text-sm font-medium transition-all duration-300 relative ${
            activeTab === 'chat' 
              ? 'text-[var(--color-accent)]' 
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Chat
            {chatMessages.length > 0 && (
              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full transition-all ${
                activeTab === 'chat'
                  ? 'bg-[var(--color-accent)] text-[var(--color-surface)]'
                  : 'bg-[var(--color-surface-400)] text-[var(--color-text-muted)]'
              }`}>
                {chatMessages.length}
              </span>
            )}
          </span>
          {activeTab === 'chat' && (
            <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-secondary)] rounded-full" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'participants' ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {participants.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-10">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[rgba(96,165,250,0.1)] to-[rgba(167,139,250,0.1)] border border-[var(--color-border)] flex items-center justify-center mb-5 animate-float">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-text-subtle)]">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 00-3-3.87"/>
                    <path d="M16 3.13a4 4 0 010 7.75"/>
                  </svg>
                </div>
                <p className="text-[var(--color-text-muted)] font-medium">No participants yet</p>
                <p className="text-[var(--color-text-subtle)] text-xs mt-1">Waiting for others to join</p>
              </div>
            ) : (
              participants.map((participant, index) => (
                <div
                  key={participant.id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-[rgba(255,255,255,0.03)] transition-all duration-200 group"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-semibold text-sm text-white shadow-lg ${
                    participant.isPresenter
                      ? 'bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-dark)]'
                      : 'bg-gradient-to-br from-[var(--color-secondary)] to-[var(--color-secondary-dark)]'
                  }`}>
                    {participant.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate flex items-center gap-2">
                      {participant.name}
                      {participant.id === participantId && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-[var(--color-surface-400)] text-[var(--color-text-subtle)] rounded font-medium">
                          You
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[var(--color-text-subtle)] mt-0.5">
                      {participant.isPresenter ? '🎬 Presenter' : '👤 Student'}
                    </div>
                  </div>
                  {participant.isPresenter && (
                    <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-gradient-to-r from-[rgba(96,165,250,0.15)] to-[rgba(167,139,250,0.1)] text-[var(--color-accent)] border border-[rgba(96,165,250,0.2)]">
                      Host
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-10">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[rgba(96,165,250,0.1)] to-[rgba(167,139,250,0.1)] border border-[var(--color-border)] flex items-center justify-center mb-5 animate-float">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-text-subtle)]">
                      <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>
                    </svg>
                  </div>
                  <p className="text-[var(--color-text-muted)] font-medium">No messages yet</p>
                  <p className="text-[var(--color-text-subtle)] text-xs mt-1">Start the conversation!</p>
                </div>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-2xl transition-all ${
                      msg.senderId === participantId 
                        ? 'bg-gradient-to-br from-[rgba(96,165,250,0.12)] to-[rgba(167,139,250,0.08)] border border-[rgba(96,165,250,0.2)] ml-8 rounded-br-md' 
                        : 'bg-[rgba(255,255,255,0.03)] border border-[var(--color-border)] mr-8 rounded-bl-md'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs font-semibold ${
                        msg.senderId === participantId ? 'text-[var(--color-accent)]' : 'text-[var(--color-secondary)]'
                      }`}>
                        {msg.senderName}
                      </span>
                      {msg.senderId === participantId && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-[var(--color-surface-400)] text-[var(--color-text-subtle)] rounded font-medium">
                          You
                        </span>
                      )}
                    </div>
                    <div className="text-sm break-words text-[var(--color-text)] leading-relaxed">{msg.message}</div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>
            
            <form onSubmit={handleSendChat} className="p-4 border-t border-[var(--color-border)] flex gap-3">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                className="input-elegant flex-1 py-3 text-sm"
                maxLength={500}
              />
              <button
                type="submit"
                disabled={!message.trim()}
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                  message.trim() 
                    ? 'bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-dark)] text-white shadow-lg shadow-[rgba(96,165,250,0.3)] hover:shadow-[rgba(96,165,250,0.5)] hover:scale-105' 
                    : 'bg-[var(--color-surface-300)] text-[var(--color-text-subtle)] cursor-not-allowed'
                }`}
                title="Send message"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </form>
          </>
        )}
      </div>
    </aside>
  );
};
