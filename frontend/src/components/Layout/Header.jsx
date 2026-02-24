import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Building2, UserCircle } from 'lucide-react';

export const Header = () => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <header className="h-16 border-b border-border bg-surface/50 backdrop-blur-sm flex items-center justify-between px-8 sticky top-0 z-10 w-full">
      <div className="flex items-center gap-2 text-textMuted">
        <Building2 className="w-4 h-4" />
        <span className="text-sm font-medium">DocuMind Team (Org ID: 1)</span>
      </div>

      <div className="flex items-center gap-3 bg-surfaceHover py-1.5 px-3 rounded-full border border-border">
        <UserCircle className="w-5 h-5 text-primary" />
        <div className="flex flex-col">
          <span className="text-xs font-semibold leading-none text-text">{user.name}</span>
          <span className="text-[10px] text-textMuted mt-0.5">{user.email}</span>
        </div>
        <span className="ml-2 px-2 py-0.5 bg-background rounded text-[10px] font-bold text-text uppercase tracking-wide border border-border">
          {user.role}
        </span>
      </div>
    </header>
  );
};
