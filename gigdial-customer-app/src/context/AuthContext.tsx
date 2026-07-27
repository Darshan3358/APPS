import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { API_URL as LOCAL_API_URL } from '../config/api';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  city: string;
  address?: string;
  profilePhoto?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (emailOrPhone: string, passcode: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  register: (name: string, phone: string, email: string, passcode: string, city: string) => Promise<{ success: boolean; error?: string; otpRequired?: boolean; email?: string }>;
  verifyOtp: (email: string, otp: string) => Promise<{ success: boolean; error?: string }>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  setToken: React.Dispatch<React.SetStateAction<string | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const safeFetch = async (endpoint: string, options: RequestInit = {}) => {
  const primaryUrl = `${LOCAL_API_URL}${endpoint}`;
  try {
    const res = await fetch(primaryUrl, options);
    return res;
  } catch (err: any) {
    const fallbackBase = LOCAL_API_URL.includes('localhost') || LOCAL_API_URL.includes('127.0.0.1')
      ? 'https://apps-pnsk.onrender.com/api'
      : 'http://localhost:5001/api';
    
    try {
      const fallbackUrl = `${fallbackBase}${endpoint}`;
      const resFallback = await fetch(fallbackUrl, options);
      return resFallback;
    } catch (fallbackErr) {
      throw new Error('Unable to connect to server. Please check your internet connection and try again.');
    }
  }
};

const formatErrorMessage = (errMessage?: string): string => {
  if (!errMessage) return 'An unexpected error occurred. Please try again.';
  const lower = errMessage.toLowerCase();
  if (lower.includes('failed to fetch') || lower.includes('network request failed') || lower.includes('networkerror') || lower.includes('typeerror')) {
    return 'Unable to connect to server. Please check your internet connection and try again.';
  }
  return errMessage;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load session from storage on startup and verify token
  useEffect(() => {
    const loadSession = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token');
        const storedUser = await AsyncStorage.getItem('user');

        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch (e) {}
        }

        if (storedToken) {
          setToken(storedToken);
          const res = await safeFetch('/auth/me', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${storedToken}`
            }
          });

          if (res.ok) {
            const freshUser = await res.json();
            const mappedUser = {
              ...freshUser,
              id: freshUser._id ? freshUser._id.toString() : freshUser.id
            };
            setUser(mappedUser);
          } else {
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('user');
            setToken(null);
            setUser(null);
          }
        }
      } catch (err) {
        console.error('Failed to load session:', err);
      } finally {
        setIsLoading(false);
        setIsLoaded(true);
      }
    };
    loadSession();
  }, []);

  // Save session when token/user changes after initial load
  useEffect(() => {
    if (!isLoaded) return;
    const saveSession = async () => {
      try {
        if (token) {
          await AsyncStorage.setItem('token', token);
        } else {
          await AsyncStorage.removeItem('token');
        }
        if (user) {
          await AsyncStorage.setItem('user', JSON.stringify(user));
        } else {
          await AsyncStorage.removeItem('user');
        }
      } catch (err) {
        console.error('Failed to save session:', err);
      }
    };
    saveSession();
  }, [user, token, isLoaded]);

  const login = async (emailOrPhone: string, passcode: string) => {
    setIsLoading(true);
    try {
      const isEmail = emailOrPhone.includes('@');
      const body = {
        role: 'customer',
        passcode: passcode,
        [isEmail ? 'email' : 'phone']: emailOrPhone
      };

      const res = await safeFetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: formatErrorMessage(data.error || 'Login failed') };
      }

      setUser(data.user);
      setToken(data.token || 'mock-token');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: formatErrorMessage(err.message) };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
  };

  const register = async (name: string, phone: string, email: string, passcode: string, city: string) => {
    setIsLoading(true);
    try {
      const body = {
        name,
        phone,
        email,
        passcode,
        role: 'customer',
        city
      };

      const res = await safeFetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: formatErrorMessage(data.error || 'Registration failed') };
      }

      if (data.otpRequired) {
        return { success: true, otpRequired: true, email: data.email };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: formatErrorMessage(err.message) };
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async (email: string, otp: string) => {
    setIsLoading(true);
    try {
      const res = await safeFetch('/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: formatErrorMessage(data.error || 'Verification failed') };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: formatErrorMessage(err.message) };
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isLoading,
      login,
      logout,
      register,
      verifyOtp,
      setUser,
      setToken
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
