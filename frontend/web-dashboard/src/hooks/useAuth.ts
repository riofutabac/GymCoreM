// src/hooks/useAuth.ts
"use client";

import { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/api/auth';
import { getUserInfoFromJWT, isValidJWT } from '@/lib/utils/jwt';

interface User {
  id: string;
  email: string;
  role: string;
  name: string;
  firstName?: string;
  lastName?: string;
  gymId?: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // First, try to get user data from the server (this validates the JWT server-side)
        const userData = await getCurrentUser();
        
        // If we got user data from server, use it
        if (userData) {
          setUser({
            id: userData.id,
            email: userData.email,
            role: userData.role,
            name: userData.name,
            firstName: userData.firstName,
            lastName: userData.lastName,
            gymId: userData.gymId,
          });
        } else {
          setUser(null);
        }
      } catch (error) {
        // If server call fails, user is not authenticated
        console.log('User not authenticated or JWT expired');
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  // Function to refresh user data
  const refreshUser = async () => {
    setIsLoading(true);
    try {
      const userData = await getCurrentUser();
      if (userData) {
        setUser({
          id: userData.id,
          email: userData.email,
          role: userData.role,
          name: userData.name,
          firstName: userData.firstName,
          lastName: userData.lastName,
          gymId: userData.gymId,
        });
      } else {
        setUser(null);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to manually set user (for login)
  const setUserData = (userData: User | null) => {
    setUser(userData);
  };

  // Function to logout
  const logout = () => {
    setUser(null);
  };

  return { 
    user, 
    isLoading,
    isAuthenticated: !!user,
    refreshUser,
    setUserData,
    logout,
  };
}
