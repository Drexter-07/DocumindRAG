import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building2, ArrowRight } from 'lucide-react';
import clsx from 'clsx';

export const Login = () => {
  const { login, mockUsers } = useAuth();
  const navigate = useNavigate();
  const [selectedEmail, setSelectedEmail] = useState('admin@documind.com');
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    const success = login(selectedEmail);
    if (success) {
      navigate('/chat');
    } else {
      setError('Invalid mock user selected.');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Decorative background elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="glass-panel w-full max-w-md rounded-2xl p-8 relative z-10 animate-fade-in shadow-2xl">
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-16 h-16 bg-surfaceHover rounded-2xl flex items-center justify-center mb-6 border border-border">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
            DocuMind RAG
          </h1>
          <p className="text-textMuted mt-3 text-sm">
            Mock Authentication Portal
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-medium text-textMuted">Select Test Role</label>
            <div className="grid gap-3">
              {Object.values(mockUsers).map((u) => (
                <button
                  key={u.email}
                  type="button"
                  onClick={() => setSelectedEmail(u.email)}
                  className={clsx(
                    'flex items-center justify-between p-4 rounded-xl border text-left transition-all duration-200',
                    selectedEmail === u.email
                      ? 'bg-primary/10 border-primary ring-1 ring-primary shadow-sm shadow-primary/20'
                      : 'bg-surface border-border hover:border-gray-600 hover:bg-surfaceHover'
                  )}
                >
                  <div className="flex flex-col">
                    <span className="font-semibold text-text">{u.name}</span>
                    <span className="text-xs text-textMuted mt-1">{u.email}</span>
                  </div>
                  <span className={clsx(
                    "text-[10px] uppercase font-bold px-2.5 py-1 rounded-md tracking-wider border",
                    selectedEmail === u.email 
                      ? "bg-primary text-white border-primary" 
                      : "bg-primary/10 text-primary border-primary/20"
                  )}>
                    {u.role}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button
            type="submit"
            className="w-full bg-primary hover:bg-primaryHover text-white font-medium py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 group mt-8"
          >
            Enter Workspace
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>
      </div>

      <p className="text-textMuted text-xs mt-8">
        Designed for internal testing. Bypasses real SSO.
      </p>
    </div>
  );
};
