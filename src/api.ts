import { Platform } from 'react-native';

/**
 * Get the base URL for API calls
 * - Web development (localhost): uses local server port 5001
 * - Mobile/Production: uses Render live server
 */
const getBaseURL = (): string => {
  return 'https://apps-pnsk.onrender.com';
};

export const API_URL = `${getBaseURL()}/api`;
export const SOCKET_URL = getBaseURL();

console.log(`🔗 API URL: ${API_URL}`);
console.log(`🔗 Socket URL: ${SOCKET_URL}`);
