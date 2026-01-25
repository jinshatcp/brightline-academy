import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface RegisterPageProps {
  onSwitchToLogin: () => void;
}

/**
 * RegisterPage - Handles new user registration with premium design.
 */
export const RegisterPage: React.FC<RegisterPageProps> = ({ onSwitchToLogin }) => {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'presenter' | 'student'>('student');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await register(email, password, name, role);
    
    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.error || 'Registration failed');
    }
    
    setIsLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-elegant overflow-hidden">
        <div className="fixed inset-0 pattern-overlay" />
        
        {/* Success orbs */}
        <div className="fixed top-1/3 left-1/3 w-80 h-80 bg-[rgba(52,211,153,0.15)] rounded-full blur-[100px] animate-pulse-soft" />
        <div className="fixed bottom-1/3 right-1/3 w-64 h-64 bg-[rgba(96,165,250,0.12)] rounded-full blur-[80px] animate-pulse-soft" style={{ animationDelay: '1s' }} />
        
        <div className="w-full max-w-md relative z-10">
          <div className="glass-panel rounded-3xl p-10 text-center animate-fade-up relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(52,211,153,0.5)] to-transparent" />
            
            <div className="w-20 h-20 mx-auto mb-8 rounded-3xl bg-[rgba(52,211,153,0.15)] border border-[rgba(52,211,153,0.3)] flex items-center justify-center animate-float">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-success)]">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="text-3xl font-bold mb-4 font-display">
              <span className="text-gradient">Welcome Aboard!</span>
            </h2>
            <p className="text-[var(--color-text-muted)] mb-8 leading-relaxed">
              Your account has been created successfully. It's pending approval from an administrator. You'll be notified once approved.
            </p>
            <button
              onClick={onSwitchToLogin}
              className="btn-primary py-4 px-8"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5m7-7l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-elegant overflow-hidden">
      <div className="fixed inset-0 pattern-overlay" />
      
      {/* Floating orbs */}
      <div className="fixed top-1/4 right-1/4 w-96 h-96 bg-[rgba(167,139,250,0.15)] rounded-full blur-[120px] animate-pulse-soft" />
      <div className="fixed bottom-1/4 left-1/4 w-80 h-80 bg-[rgba(96,165,250,0.12)] rounded-full blur-[100px] animate-pulse-soft" style={{ animationDelay: '1s' }} />
      <div className="fixed top-1/2 left-1/3 w-64 h-64 bg-[rgba(244,114,182,0.08)] rounded-full blur-[80px] animate-pulse-soft" style={{ animationDelay: '2s' }} />
      
      <div className="w-full max-w-lg relative z-10">
        {/* Logo & Title */}
        <div className="text-center mb-10 animate-fade-up">
          <div className="inline-flex items-center justify-center w-20 h-20 mb-8 rounded-3xl glass-panel animate-float relative">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[rgba(167,139,250,0.3)] to-[rgba(96,165,250,0.2)]" />
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-secondary)] relative z-10">
              <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="8.5" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M20 8v6m3-3h-6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-5xl font-bold tracking-tight font-display mb-4">
            <span className="text-gradient">Join LiveClass</span>
          </h1>
          <p className="text-[var(--color-text-muted)] text-base tracking-wide">
            Create your account to get started
          </p>
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit} className="glass-panel rounded-3xl p-10 animate-fade-up stagger-1 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(167,139,250,0.5)] to-transparent" />
          
          {error && (
            <div className="mb-8 p-5 rounded-2xl bg-[rgba(248,113,113,0.1)] border border-[rgba(248,113,113,0.25)] text-[var(--color-danger)] text-sm flex items-center gap-3 animate-fade-in">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 8v4m0 4h.01"/>
              </svg>
              {error}
            </div>
          )}

          {/* Name Input */}
          <div className="mb-6">
            <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-3">
              Full Name
            </label>
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="input-elegant"
                style={{ paddingLeft: '52px' }}
                required
              />
            </div>
          </div>

          {/* Email Input */}
          <div className="mb-6">
            <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-3">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <path d="M22 6l-10 7L2 6"/>
                </svg>
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="input-elegant"
                style={{ paddingLeft: '52px' }}
                required
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="mb-8">
            <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-3">
              Password
            </label>
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="input-elegant"
                style={{ paddingLeft: '52px' }}
                minLength={6}
                required
              />
            </div>
          </div>

          {/* Role Selection */}
          <div className="mb-8">
            <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-4">
              I want to join as
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setRole('presenter')}
                className={`selection-card py-6 ${role === 'presenter' ? 'selected' : ''}`}
              >
                <div className={`w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                  role === 'presenter' 
                    ? 'bg-gradient-to-br from-[rgba(96,165,250,0.3)] to-[rgba(167,139,250,0.2)]' 
                    : 'bg-[var(--color-surface-300)]'
                }`}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={role === 'presenter' ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'}>
                    <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className={`font-semibold text-base ${role === 'presenter' ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'}`}>
                  Presenter
                </div>
                <div className="text-xs text-[var(--color-text-subtle)] mt-1">Host live classes</div>
              </button>
              
              <button
                type="button"
                onClick={() => setRole('student')}
                className={`selection-card py-6 ${role === 'student' ? 'selected' : ''}`}
              >
                <div className={`w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                  role === 'student' 
                    ? 'bg-gradient-to-br from-[rgba(96,165,250,0.3)] to-[rgba(167,139,250,0.2)]' 
                    : 'bg-[var(--color-surface-300)]'
                }`}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={role === 'student' ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'}>
                    <path d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className={`font-semibold text-base ${role === 'student' ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'}`}>
                  Student
                </div>
                <div className="text-xs text-[var(--color-text-subtle)] mt-1">Join & learn</div>
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full text-base py-4"
          >
            {isLoading ? (
              <>
                <span className="spinner" />
                Creating account...
              </>
            ) : (
              <>
                Create Account
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14m-7-7l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 my-8">
            <div className="flex-1 h-px bg-[var(--color-border)]" />
            <span className="text-xs text-[var(--color-text-subtle)] uppercase tracking-wider">Already a member?</span>
            <div className="flex-1 h-px bg-[var(--color-border)]" />
          </div>

          {/* Login Link */}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="w-full py-4 rounded-xl border border-[var(--color-border)] text-[var(--color-text)] font-medium hover:bg-[rgba(255,255,255,0.05)] hover:border-[var(--color-border-hover)] transition-all duration-300 flex items-center justify-center gap-3"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/>
              <path d="M10 17l5-5-5-5"/>
              <path d="M15 12H3"/>
            </svg>
            Sign In Instead
          </button>
        </form>
      </div>
    </div>
  );
};
