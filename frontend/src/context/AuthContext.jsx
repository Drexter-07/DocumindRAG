import React, { createContext, useContext, useState, useEffect } from 'react';
import { setAuthHeader } from '../lib/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Define our mock users based on backend seed
  const mockUsers = {
    'admin@documind.com': { email: 'admin@documind.com', role: 'admin', name: 'Admin User' },
    'senior@documind.com': { email: 'senior@documind.com', role: 'senior', name: 'Senior Staff' },
    'junior@documind.com': { email: 'junior@documind.com', role: 'viewer', name: 'Junior Staff' },
  };

  useEffect(() => {
    // Check local storage on mount
    const storedEmail = localStorage.getItem('documind_test_email');
    if (storedEmail && mockUsers[storedEmail]) {
      setUser(mockUsers[storedEmail]);
      setAuthHeader(storedEmail);
    }
    setIsLoading(false);
  }, []);

  const login = (email) => {
    if (mockUsers[email]) {
      setUser(mockUsers[email]);
      setAuthHeader(email);
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    setAuthHeader(null);
  };

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-textMuted text-sm">Loading session...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, mockUsers }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
