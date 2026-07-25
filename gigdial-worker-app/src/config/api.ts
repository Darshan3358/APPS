
import { Platform } from 'react-native';

/**
 * Get the base URL for API calls
 * - Web development (localhost): uses local server port 5001
 * - Mobile/Production: uses Render live server
 */
const getBaseURL = (): string => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')) {
      return `http://${hostname}:5001`;
    }
  }
  if (__DEV__) {
    return 'http://localhost:5001';
  }
  return 'https://apps-pnsk.onrender.com';
};

export const API_URL = `${getBaseURL()}/api`;
export const SOCKET_URL = getBaseURL();
export const WEBSITE_URL = 'https://www.gigdial.com';
export const WORKER_LOGIN_URL = `${WEBSITE_URL}/login?role=worker&tab=worker&type=worker&redirect=/worker-dashboard/packages`;
export const PACKAGES_URL = `${WEBSITE_URL}/worker-dashboard/packages?role=worker&tab=worker`;

console.log(`🔗 API URL: ${API_URL}`);
console.log(`🔗 Socket URL: ${SOCKET_URL}`);
console.log(`🔗 Worker Login URL: ${WORKER_LOGIN_URL}`);
console.log(`🔗 Website Packages URL: ${PACKAGES_URL}`);
