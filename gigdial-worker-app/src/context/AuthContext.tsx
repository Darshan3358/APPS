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
  registrationStep?: number;
  mainCategory?: string;
  experience?: number;
  serviceType?: string;
  kycStatus?: 'pending' | 'approved' | 'rejected';
  isApproved?: boolean;
  profilePhoto?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (emailOrPhone: string, passcode: string) => Promise<{ success: boolean; error?: string; incomplete?: boolean; registrationStep?: number; userId?: string }>;
  logout: () => void;
  registerStep1: (data: any) => Promise<{ success: boolean; error?: string }>;
  registerStep2: (data: any) => Promise<{ success: boolean; error?: string }>;
  registerStep3: (serviceType: string, skills: string[], aadhaarUri: string, panUri: string, aadhaarFileWeb?: any, panFileWeb?: any) => Promise<{ success: boolean; error?: string; otpRequired?: boolean; email?: string }>;
  verifyOtp: (email: string, otp: string) => Promise<{ success: boolean; error?: string }>;
  tempRegData: any;
  setTempRegData: React.Dispatch<React.SetStateAction<any>>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  setToken: React.Dispatch<React.SetStateAction<string | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [tempRegData, setTempRegData] = useState<any>({});

  // Load session from storage on startup and verify token
  useEffect(() => {
    const loadSession = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token');
        if (storedToken) {
          setToken(storedToken);
          const res = await fetch(`${LOCAL_API_URL}/auth/me`, {
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
        role: 'worker',
        passcode: passcode,
        [isEmail ? 'email' : 'phone']: emailOrPhone
      };

      const res = await fetch(`${LOCAL_API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok && res.status !== 202) {
        return { success: false, error: data.error || 'Login failed' };
      }

      if (res.status === 202 && data.incomplete) {
        setTempRegData({ userId: data.userId });
        return {
          success: false,
          incomplete: true,
          registrationStep: data.registrationStep,
          userId: data.userId,
          error: data.error
        };
      }

      const mappedUser = data.user ? {
        ...data.user,
        id: data.user.id || (data.user._id ? data.user._id.toString() : data.user._id)
      } : null;
      setUser(mappedUser);
      setToken(data.token || 'mock-token');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setTempRegData({});
  };

  const registerStep1 = async (data: any) => {
    try {
      const res = await fetch(`${LOCAL_API_URL}/auth/register/step1`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const resData = await res.json();
      if (!res.ok) return { success: false, error: resData.error || 'Step 1 failed' };
      
      setTempRegData((prev: any) => ({ ...prev, ...data }));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  };

  const registerStep2 = async (data: any) => {
    try {
      const res = await fetch(`${LOCAL_API_URL}/auth/register/step2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const resData = await res.json();
      if (!res.ok) return { success: false, error: resData.error || 'Step 2 failed' };

      setTempRegData((prev: any) => ({ ...prev, ...data }));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  };

  const registerStep3 = async (
    serviceType: string,
    skills: string[],
    aadhaarUri: string,
    panUri: string,
    aadhaarFileWeb?: any,
    panFileWeb?: any
  ) => {
    try {
      const formData = new FormData();
      
      // Append Step 1 & Step 2 cached fields
      const cachedFields = [
        'name', 'email', 'password', 'phone', 'city', 'address', 'profilePhoto',
        'mainCategory', 'dob', 'experience', 'serviceDescription', 'aadhaarNumber', 'panNumber'
      ];
      
      cachedFields.forEach(field => {
        if (tempRegData[field] !== undefined && tempRegData[field] !== null) {
          formData.append(field, String(tempRegData[field]));
        }
      });

      // Append languages array
      if (tempRegData.languages) {
        formData.append('languages', JSON.stringify(tempRegData.languages));
      }

      // Append Step 3 fields
      formData.append('serviceType', serviceType);
      formData.append('additionalSkills', JSON.stringify(skills));

      // Append files
      if (Platform.OS === 'web') {
        if (aadhaarFileWeb) formData.append('aadhaarCard', aadhaarFileWeb);
        if (panFileWeb) formData.append('panCard', panFileWeb);
      } else {
        if (aadhaarUri) {
          const fileUri = aadhaarUri.startsWith('file://') || aadhaarUri.startsWith('data:') || aadhaarUri.startsWith('content:') 
            ? aadhaarUri 
            : `file://${aadhaarUri}`;
          const aadhaarName = aadhaarUri.split('/').pop() || 'aadhaar.jpg';
          formData.append('aadhaarCard', {
            uri: fileUri,
            name: aadhaarName,
            type: 'image/jpeg'
          } as any);
        }
        if (panUri) {
          const fileUri = panUri.startsWith('file://') || panUri.startsWith('data:') || panUri.startsWith('content:') 
            ? panUri 
            : `file://${panUri}`;
          const panName = panUri.split('/').pop() || 'pan.jpg';
          formData.append('panCard', {
            uri: fileUri,
            name: panName,
            type: 'image/jpeg'
          } as any);
        }
      }

      const res = await fetch(`${LOCAL_API_URL}/auth/register/step3`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        }
      });
      
      const resData = await res.json();
      if (!res.ok) return { success: false, error: resData.error || 'Step 3 failed' };

      if (resData.otpRequired) {
        return { success: true, otpRequired: true, email: resData.email };
      }

      setUser(resData.user);
      setToken(resData.token || 'mock-token');
      setTempRegData({});
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  };

  const verifyOtp = async (email: string, otp: string) => {
    try {
      const res = await fetch(`${LOCAL_API_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      const resData = await res.json();
      if (!res.ok) return { success: false, error: resData.error || 'Verification failed' };

      setUser(resData.user);
      setToken(resData.token || 'mock-token');
      setTempRegData({});
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isLoading,
      login,
      logout,
      registerStep1,
      registerStep2,
      registerStep3,
      verifyOtp,
      tempRegData,
      setTempRegData,
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
