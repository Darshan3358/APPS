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
  registerStep3: (serviceType: string, skills: string[], aadhaarUri: string, panUri: string, aadhaarFileWeb?: any, panFileWeb?: any, experienceCertUri?: string, experienceCertFileWeb?: any, aadhaarNumber?: string, panNumber?: string, aadhaarBase64?: string, panBase64?: string, experienceCertBase64?: string) => Promise<{ success: boolean; error?: string; otpRequired?: boolean; email?: string }>;
  verifyOtp: (email: string, otp: string) => Promise<{ success: boolean; error?: string }>;
  tempRegData: any;
  setTempRegData: React.Dispatch<React.SetStateAction<any>>;
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
  if (errMessage.includes('<!DOCTYPE') || errMessage.includes('<html') || errMessage.includes('Internal Server Error')) {
    return 'Server error processing request. Please ensure all details and documents are uploaded and try again.';
  }
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
  const [tempRegData, setTempRegData] = useState<any>({});

  // Load session from storage on startup and verify token
  useEffect(() => {
    const loadSession = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token');
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
        role: 'worker',
        passcode: passcode,
        [isEmail ? 'email' : 'phone']: emailOrPhone
      };

      const res = await safeFetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok && res.status !== 202) {
        return { success: false, error: formatErrorMessage(data.error || 'Login failed') };
      }

      if (res.status === 202 && data.incomplete) {
        setTempRegData({ userId: data.userId });
        return {
          success: false,
          incomplete: true,
          registrationStep: data.registrationStep,
          userId: data.userId,
          error: formatErrorMessage(data.error)
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
      return { success: false, error: formatErrorMessage(err.message) };
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
      const res = await safeFetch('/auth/register/step1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const resData = await res.json();
      if (!res.ok) return { success: false, error: formatErrorMessage(resData.error || 'Step 1 failed') };
      
      setTempRegData((prev: any) => ({ ...prev, ...data }));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: formatErrorMessage(err.message) };
    }
  };

  const registerStep2 = async (data: any) => {
    try {
      const res = await safeFetch('/auth/register/step2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const resData = await res.json();
      if (!res.ok) return { success: false, error: formatErrorMessage(resData.error || 'Step 2 failed') };

      setTempRegData((prev: any) => ({ ...prev, ...data }));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: formatErrorMessage(err.message) };
    }
  };

  const registerStep3 = async (
    serviceType: string,
    skills: string[],
    aadhaarUri: string,
    panUri: string,
    aadhaarFileWeb?: any,
    panFileWeb?: any,
    experienceCertUri?: string,
    experienceCertFileWeb?: any,
    aadhaarNumber?: string,
    panNumber?: string,
    aadhaarBase64?: string,
    panBase64?: string,
    experienceCertBase64?: string
  ) => {
    try {
      if (!tempRegData.name || !tempRegData.email || !tempRegData.phone || !tempRegData.city) {
        return { success: false, error: 'Registration details missing. Please complete Step 1 first.' };
      }

      const aNum = aadhaarNumber || tempRegData.aadhaarNumber || '';
      const pNum = panNumber || tempRegData.panNumber || '';

      // Helper to convert any local file:// or content:// URI to Base64 string if missing
      const convertUriToBase64 = async (uri: string): Promise<string> => {
        if (!uri) return '';
        if (uri.startsWith('data:image')) {
          return uri.split(',')[1] || uri;
        }
        try {
          const res = await fetch(uri);
          const blob = await res.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const dataUrl = reader.result as string;
              resolve(dataUrl ? dataUrl.split(',')[1] || dataUrl : '');
            };
            reader.onerror = () => resolve('');
            reader.readAsDataURL(blob);
          });
        } catch (e) {
          return '';
        }
      };

      let finalAadhaarB64 = aadhaarBase64 || '';
      let finalPanB64 = panBase64 || '';
      let finalExpB64 = experienceCertBase64 || '';

      if (!finalAadhaarB64 && aadhaarUri) {
        finalAadhaarB64 = await convertUriToBase64(aadhaarUri);
      }
      if (!finalPanB64 && panUri) {
        finalPanB64 = await convertUriToBase64(panUri);
      }
      if (!finalExpB64 && experienceCertUri) {
        finalExpB64 = await convertUriToBase64(experienceCertUri);
      }

      // Send clean JSON payload (avoids Multer / multipart issues 100%)
      const payload = {
        name: tempRegData.name,
        email: tempRegData.email,
        password: tempRegData.password,
        phone: tempRegData.phone,
        city: tempRegData.city,
        address: tempRegData.address || '',
        profilePhoto: tempRegData.profilePhoto || '',
        mainCategory: tempRegData.mainCategory || '',
        dob: tempRegData.dob || '',
        experience: tempRegData.experience || 0,
        serviceDescription: tempRegData.serviceDescription || '',
        languages: tempRegData.languages || [],
        serviceType,
        additionalSkills: skills,
        aadhaarNumber: aNum,
        panNumber: pNum,
        aadhaarBase64: finalAadhaarB64,
        panBase64: finalPanB64,
        experienceCertificateBase64: finalExpB64
      };

      const res = await fetch(`${LOCAL_API_URL}/auth/register/step3`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const contentType = res.headers.get('content-type') || '';
      let resData: any = {};
      if (contentType.includes('application/json')) {
        resData = await res.json();
      } else {
        const text = await res.text();
        console.error('❌ Non-JSON response:', text);
        return { success: false, error: 'Registration server error. Please check backend connection and try again.' };
      }

      if (!res.ok) return { success: false, error: resData.error || 'Step 3 failed' };

      if (resData.otpRequired) {
        return { success: true, otpRequired: true, email: resData.email };
      }

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
