/**
 * JWT utility functions for decoding and extracting user information
 * These functions handle JWT tokens safely on the client side
 */

export interface JWTPayload {
  sub: string; // User ID
  email: string;
  role?: string;
  app_metadata?: {
    role?: string;
    gymId?: string;
  };
  user_metadata?: {
    firstName?: string;
    lastName?: string;
  };
  iat?: number; // Issued at
  exp?: number; // Expiration time
}

export interface UserInfo {
  id: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  name: string;
  gymId?: string;
}

/**
 * Safely decode a JWT token payload without verification
 * Note: This is for client-side display purposes only. 
 * Server-side verification is still required for security.
 * 
 * @param token - JWT token string
 * @returns Decoded payload or null if invalid
 */
export const decodeJWT = (token: string): JWTPayload | null => {
  try {
    if (!token || typeof token !== 'string') {
      return null;
    }

    // Split the token into parts
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Decode the payload (second part)
    const payload = parts[1];
    
    // Add padding if needed for base64 decoding
    const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
    
    // Decode base64
    const decodedPayload = atob(paddedPayload);
    
    // Parse JSON
    const parsedPayload = JSON.parse(decodedPayload);
    
    return parsedPayload as JWTPayload;
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
};

/**
 * Check if a JWT token is expired
 * 
 * @param token - JWT token string
 * @returns true if expired, false if valid, null if cannot determine
 */
export const isJWTExpired = (token: string): boolean | null => {
  const payload = decodeJWT(token);
  
  if (!payload || !payload.exp) {
    return null; // Cannot determine expiration
  }
  
  // JWT exp is in seconds, Date.now() is in milliseconds
  const currentTime = Math.floor(Date.now() / 1000);
  return payload.exp < currentTime;
};

/**
 * Extract user information from JWT token
 * 
 * @param token - JWT token string
 * @returns UserInfo object or null if invalid
 */
export const getUserInfoFromJWT = (token: string): UserInfo | null => {
  const payload = decodeJWT(token);
  
  if (!payload) {
    return null;
  }
  
  // Extract role from app_metadata or user_metadata or direct property
  const role = payload.app_metadata?.role || 
               payload.user_metadata?.role || 
               payload.role || 
               'member';
  
  // Extract name information
  const firstName = payload.user_metadata?.firstName || '';
  const lastName = payload.user_metadata?.lastName || '';
  
  // Create display name
  let name = '';
  if (firstName && lastName) {
    name = `${firstName} ${lastName}`.trim();
  } else if (firstName) {
    name = firstName;
  } else if (lastName) {
    name = lastName;
  } else {
    // Fallback to email username
    name = payload.email?.split('@')[0] || 'Usuario';
  }
  
  return {
    id: payload.sub,
    email: payload.email,
    role: role.toLowerCase(),
    firstName,
    lastName,
    name,
    gymId: payload.app_metadata?.gymId,
  };
};

/**
 * Get JWT token from cookies (client-side)
 * Note: This won't work for httpOnly cookies, but we can use it for validation
 * 
 * @returns JWT token string or null
 */
export const getJWTFromCookies = (): string | null => {
  if (typeof document === 'undefined') {
    return null; // Server-side rendering
  }
  
  try {
    const cookies = document.cookie.split(';');
    const jwtCookie = cookies.find(cookie => 
      cookie.trim().startsWith('jwt_token=')
    );
    
    if (!jwtCookie) {
      return null;
    }
    
    return jwtCookie.split('=')[1] || null;
  } catch (error) {
    console.error('Error getting JWT from cookies:', error);
    return null;
  }
};

/**
 * Validate if the current JWT token is valid and not expired
 * 
 * @param token - JWT token string
 * @returns true if valid and not expired
 */
export const isValidJWT = (token: string): boolean => {
  if (!token) {
    return false;
  }
  
  const payload = decodeJWT(token);
  if (!payload) {
    return false;
  }
  
  const expired = isJWTExpired(token);
  if (expired === true) {
    return false;
  }
  
  // Check if required fields are present
  if (!payload.sub || !payload.email) {
    return false;
  }
  
  return true;
};