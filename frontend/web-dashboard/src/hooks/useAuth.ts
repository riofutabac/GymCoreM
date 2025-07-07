// src/hooks/useAuth.ts
"use client";

import { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/api/auth';

interface User {
  id: string;
  email: string;
  role: string;
  name: string;
  firstName?: string;
  lastName?: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await getCurrentUser();
        setUser(userData);
      } catch (error) {
        console.log('Usuario no autenticado:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  return { 
    user, 
    isLoading,
    isAuthenticated: !!user 
  };
}
