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
  registerStep3: (serviceType: string, skills: string[], aadhaarUri: string, panUri: string, aadhaarFileWeb?: any, panFileWeb?: any, experienceCertUri?: string, experienceCertFileWeb?: any) => Promise<{ success: boolean; error?: string; otpRequired?: boolean; email?: string }>;
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
    experienceCertFileWeb?: any
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
      if ((Platform.OS as string) === 'web') {
        if (aadhaarFileWeb) formData.append('aadhaarCard', aadhaarFileWeb);
        if (panFileWeb) formData.append('panCard', panFileWeb);
        if (experienceCertFileWeb) formData.append('experienceCertificate', experienceCertFileWeb);
      } else {
        if (aadhaarUri) {
          let fileUri = aadhaarUri;
          if (aadhaarFileWeb && aadhaarFileWeb.uri && !aadhaarFileWeb.uri.startsWith('data:')) {
            fileUri = aadhaarFileWeb.uri;
          }
          if (Platform.OS === 'android' && !fileUri.startsWith('file://') && !fileUri.startsWith('content://')) {
            fileUri = `file://${fileUri}`;
          }
          const fileName = (aadhaarFileWeb && aadhaarFileWeb.name) || fileUri.split('/').pop() || 'aadhaar.jpg';
          const match = /\.(\w+)$/.exec(fileName);
          const fileType = (aadhaarFileWeb && aadhaarFileWeb.type) || (match ? `image/${match[1]}` : 'image/jpeg');

          formData.append('aadhaarCard', {
            uri: fileUri,
            name: fileName,
            type: fileType
          } as any);
        }
        if (panUri) {
          let fileUri = panUri;
          if (panFileWeb && panFileWeb.uri && !panFileWeb.uri.startsWith('data:')) {
            fileUri = panFileWeb.uri;
          }
          if (Platform.OS === 'android' && !fileUri.startsWith('file://') && !fileUri.startsWith('content://')) {
            fileUri = `file://${fileUri}`;
          }
          const fileName = (panFileWeb && panFileWeb.name) || fileUri.split('/').pop() || 'pan.jpg';
          const match = /\.(\w+)$/.exec(fileName);
          const fileType = (panFileWeb && panFileWeb.type) || (match ? `image/${match[1]}` : 'image/jpeg');

          formData.append('panCard', {
            uri: fileUri,
            name: fileName,
            type: fileType
          } as any);
        }
        if (experienceCertUri) {
          let fileUri = experienceCertUri;
          if (experienceCertFileWeb && experienceCertFileWeb.uri && !experienceCertFileWeb.uri.startsWith('data:')) {
            fileUri = experienceCertFileWeb.uri;
          }
          if (Platform.OS === 'android' && !fileUri.startsWith('file://') && !fileUri.startsWith('content://')) {
            fileUri = `file://${fileUri}`;
          }
          const fileName = (experienceCertFileWeb && experienceCertFileWeb.name) || fileUri.split('/').pop() || 'experience_cert.jpg';
          const match = /\.(\w+)$/.exec(fileName);
          const fileType = (experienceCertFileWeb && experienceCertFileWeb.type) || (match ? `image/${match[1]}` : 'image/jpeg');

          formData.append('experienceCertificate', {
            uri: fileUri,
            name: fileName,
            type: fileType
          } as any);
        }
      }

      let resData: any;
      if ((Platform.OS as string) === 'web') {
        const res = await fetch(`${LOCAL_API_URL}/auth/register/step3`, {
          method: 'POST',
          body: formData,
          headers: {
            'Accept': 'application/json',
          }
        });
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          resData = await res.json();
        } else {
          const text = await res.text();
          console.error('❌ Non-JSON response:', text);
          return { success: false, error: 'Registration server error. Please check backend connection and try again.' };
        }
        if (!res.ok) return { success: false, error: resData.error || 'Step 3 failed' };
      } else {
        resData = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', `${LOCAL_API_URL}/auth/register/step3`);
          xhr.setRequestHeader('Accept', 'application/json');
          xhr.onload = () => {
            const contentType = xhr.getResponseHeader('content-type') || '';
            try {
              if (contentType.includes('application/json')) {
                const parsed = JSON.parse(xhr.responseText);
                if (xhr.status >= 200 && xhr.status < 300) {
                  resolve(parsed);
                } else {
                  reject(new Error(parsed.error || `KYC Submission failed (${xhr.status})`));
                }
              } else {
                console.error("❌ Non-JSON response received:", xhr.responseText);
                reject(new Error('Registration server error. Please check backend connection and try again.'));
              }
            } catch (e) {
              reject(new Error(`Server response error (${xhr.status})`));
            }
          };
          xhr.onerror = () => {
            reject(new Error('Network request failed. Please check backend connection.'));
          };
          xhr.send(formData);
        });
      }

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
