import React, { createContext, useState, useContext, useEffect } from 'react';
import { User, UserRole, AuthContextType } from '../types';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../config';
import { normalizeUser } from '../data/users';

// Create Auth Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Local storage keys
const USER_STORAGE_KEY = 'business_nexus_user';
const TOKEN_STORAGE_KEY = 'business_nexus_token';
const RESET_TOKEN_KEY = 'business_nexus_reset_token';

// Auth Provider Component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for stored token and load profile on initial load
  useEffect(() => {
    const initialize = async () => {
      const token = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL || ''}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          localStorage.removeItem(USER_STORAGE_KEY);
          setIsLoading(false);
          return;
        }

        const data = await res.json();
        const normalized = data.user ? normalizeUser(data.user) : null;
        setUser(normalized);
        if (normalized) localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(normalized));
      } catch (err) {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(USER_STORAGE_KEY);
        console.error('Failed to fetch profile', err);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  const login = async (email: string, password: string, role: UserRole): Promise<void> => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL || ''}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || 'Login failed');
      }

      const data = await res.json();
      const token = data.token;
      const userData = data.user ? normalizeUser(data.user) : null;

      if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
      if (userData) localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
      setUser(userData);
      toast.success('Successfully logged in!');
    } catch (error) {
      toast.error((error as Error).message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    role: UserRole,
    profile?: Record<string, unknown>
  ): Promise<void> => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL || ''}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role, ...profile })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || 'Registration failed');
      }

      const data = await res.json();
      const token = data.token;
      const userData = data.user ? normalizeUser(data.user) : null;

      if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
      if (userData) localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
      setUser(userData);
      toast.success('Account created successfully!');
    } catch (error) {
      toast.error((error as Error).message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const forgotPassword = async (email: string): Promise<void> => {
    try {
      const res = await fetch(`${API_BASE_URL || ''}/api/auth/request-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (!res.ok) throw new Error('Unable to request password reset');
      toast.success('Password reset instructions sent to your email');
    } catch (error) {
      toast.error((error as Error).message);
      throw error;
    }
  };

  const resetPassword = async (token: string, newPassword: string): Promise<void> => {
    try {
      const res = await fetch(`${API_BASE_URL || ''}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: newPassword })
      });

      if (!res.ok) throw new Error('Unable to reset password');
      toast.success('Password reset successfully');
    } catch (error) {
      toast.error((error as Error).message);
      throw error;
    }
  };

  const logout = (): void => {
    (async () => {
      try {
        const token = localStorage.getItem(TOKEN_STORAGE_KEY);
        await fetch(`${API_BASE_URL || ''}/api/auth/logout`, {
          method: 'POST',
          headers: { Authorization: token ? `Bearer ${token}` : '' }
        }).catch(() => {});
      } finally {
        setUser(null);
        localStorage.removeItem(USER_STORAGE_KEY);
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        toast.success('Logged out successfully');
      }
    })();
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    try {
      const token = localStorage.getItem(TOKEN_STORAGE_KEY);
      const res = await fetch(`${API_BASE_URL || ''}/api/users/me/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update password');
      }
      toast.success('Password updated successfully');
    } catch (error) {
      toast.error((error as Error).message);
      throw error;
    }
  };

  const updateProfile = async (userId: string, updates: Partial<User>): Promise<void> => {
    try {
      const token = localStorage.getItem(TOKEN_STORAGE_KEY);
      const res = await fetch(`${API_BASE_URL || ''}/api/users/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
        body: JSON.stringify(updates)
      });

      if (!res.ok) throw new Error('Failed to update profile');
      const data = await res.json();
      const normalized = data.user ? normalizeUser(data.user) : null;
      setUser(normalized);
      if (normalized) localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(normalized));
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error((error as Error).message);
      throw error;
    }
  };

  const value = {
    user,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    updateProfile,
    changePassword,
    isAuthenticated: !!user,
    isLoading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook for using auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};