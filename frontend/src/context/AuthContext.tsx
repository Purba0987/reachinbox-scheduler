import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authApi } from '../services/api';

interface AuthContextType {
  user: User | null;
  loginWithEmail: (email: string, password: string) => Promise<User>;
  loginWithGoogle: (credential?: string, directProfile?: any) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('reachinbox_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user?.email) {
      refreshUser();
    }
  }, []);

  const refreshUser = async () => {
    if (!user?.email) return;
    try {
      const data = await authApi.getMe(user.email);
      setUser(data.user);
      localStorage.setItem('reachinbox_user', JSON.stringify(data.user));
    } catch {
      // Keep cached user if offline
    }
  };

  const loginWithEmail = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await authApi.loginWithEmail(email, password);
      setUser(response.user);
      localStorage.setItem('reachinbox_user', JSON.stringify(response.user));
      return response.user;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (credential?: string, directProfile?: any) => {
    setIsLoading(true);
    try {
      const response = await authApi.googleLogin(credential, directProfile);
      setUser(response.user);
      localStorage.setItem('reachinbox_user', JSON.stringify(response.user));
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('reachinbox_user');
  };

  return (
    <AuthContext.Provider value={{ user, loginWithEmail, loginWithGoogle, logout, isLoading, refreshUser }}>
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
