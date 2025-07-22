/**
 * Dynamic API URL configuration
 * Handles both Docker container communication and local development
 */
export const getApiBaseUrl = () => {
  const isClient = typeof window !== 'undefined';
  const hostname = process.env.HOSTNAME;
  const pwd = process.env.PWD;
  
  // Debug logging (remove in production)
  if (!isClient) {
    console.log(' ', {
      isClient,
      hostname,
      pwd,
      nodeEnv: process.env.NODE_ENV,
      nextPublicApiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL
    });
  }
  
  // If running on client-side (browser), always use localhost for external access
  if (isClient) {
    return 'http://127.0.0.1:3000';
  }
  
  // If running on server-side (Docker container), check for Docker indicators
  // Docker containers often have hostname set to container ID
  if (hostname || (pwd && pwd.startsWith('/app'))) {
    return 'http://api-gateway:3000';
  }
  
  // Local development fallback

  return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:3000';
};

export const API_BASE_URL = () => getApiBaseUrl();
export const API_V1_URL = () => `${getApiBaseUrl()}/api/v1`;
