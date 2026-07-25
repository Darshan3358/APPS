import { Platform } from 'react-native';

/**
 * Get the base URL for API calls
 * - Web development (localhost): uses local server port 5001
 * - Native Mobile APK / Production: ALWAYS uses Render live server
 */
const getBaseURL = (): string => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')) {
      return `http://${hostname}:5001`;
    }
  }
  // Native Mobile App (Android APK / iOS)
  return 'https://apps-pnsk.onrender.com';
};

export const API_URL = `${getBaseURL()}/api`;
export const SOCKET_URL = getBaseURL();
export const WEBSITE_URL = 'https://www.gigdial.com';
export const WORKER_LOGIN_URL = `${WEBSITE_URL}/login?role=worker&tab=worker&type=worker&redirect=/worker-dashboard/packages`;
export const PACKAGES_URL = WORKER_LOGIN_URL;
