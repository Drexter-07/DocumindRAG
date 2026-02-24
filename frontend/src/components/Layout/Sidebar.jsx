import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { MessageSquare, FileText, LayoutDashboard, LogOut } from 'lucide-react';
import clsx from 'clsx';

export const Sidebar = () => {
  const { user, logout } = useAuth();

  const navLinks = [
    { label: 'Chat', to: '/chat', icon: MessageSquare, roles: ['admin', 'senior', 'viewer'] },
    { label: 'Documents', to: '/documents', icon: FileText, roles: ['admin', 'senior'] },
    { label: 'Admin & Patches', to: '/admin', icon: LayoutDashboard, roles: ['admin', 'senior'] },
  ];

  return (
    <div className="w-64 h-full bg-surface border-r border-border flex flex-col pt-8 pb-4">
      <div className="px-6 mb-8">
        <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent tracking-tight">
          DocuMind RAG
        </h1>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navLinks.map((link) => {
          if (!link.roles.includes(user?.role)) return null;

          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-textMuted hover:bg-surfaceHover hover:text-text'
                )
              }
            >
              <Icon className="w-5 h-5" />
              {link.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="px-3 mt-auto">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-textMuted hover:bg-surfaceHover hover:text-text transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </div>
  );
};
