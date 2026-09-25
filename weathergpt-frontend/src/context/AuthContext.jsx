import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  getAuthToken,
  getStoredUser,
  loginUser,
  registerUser,
  clearAuthSession,
  getCurrentUserProfile,
  updateUserPreferences,
} from '../services/authApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser());
  const [token, setToken] = useState(getAuthToken());
  const [isLoading, setIsLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalTab, setAuthModalTab] = useState('login'); // 'login' or 'signup'

  // Verify / refresh session on mount
  useEffect(() => {
    if (token) {
      getCurrentUserProfile().then((res) => {
        if (res.success) {
          setUser(res.user);
        } else {
          // Token invalid or expired
          setToken(null);
          setUser(null);
        }
      });
    }
  }, [token]);

  const openAuthModal = (tab = 'login') => {
    setAuthModalTab(tab);
    setShowAuthModal(true);
  };

  const closeAuthModal = () => {
    setShowAuthModal(false);
  };

  const login = async (emailOrUsername, password) => {
    setIsLoading(true);
    const res = await loginUser(emailOrUsername, password);
    setIsLoading(false);
    if (res.success) {
      setUser(res.data.user);
      setToken(res.data.access_token);
      setShowAuthModal(false);
    }
    return res;
  };

  const register = async (payload) => {
    setIsLoading(true);
    const res = await registerUser(payload);
    setIsLoading(false);
    if (res.success) {
      setUser(res.data.user);
      setToken(res.data.access_token);
      setShowAuthModal(false);
    }
    return res;
  };

  const logout = () => {
    clearAuthSession();
    setUser(null);
    setToken(null);
  };

  const updatePreferences = async (preferences) => {
    if (!user) return { success: false };
    const res = await updateUserPreferences(preferences);
    if (res.success) {
      setUser(res.user);
    }
    return res;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        showAuthModal,
        authModalTab,
        setAuthModalTab,
        openAuthModal,
        closeAuthModal,
        login,
        register,
        logout,
        updatePreferences,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
