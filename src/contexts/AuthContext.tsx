'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AppUser {
  id: string;
  fullName: string;
  appRole: string;
  email?: string;
}

interface AuthContextType {
  appUser: AppUser | null;
  loading: boolean;
  signIn: (userId: string, pin: string) => Promise<{ error?: string }>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType>({
  appUser: null,
  loading: true,
  signIn: async () => ({}),
  signOut: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Backend integration point: restore session from localStorage or Supabase
    const stored = localStorage.getItem('aldente_user');
    if (stored) {
      try {
        setAppUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem('aldente_user');
      }
    }
    setLoading(false);
  }, []);

  const signIn = async (userId: string, pin: string): Promise<{ error?: string }> => {
    // Backend integration point: validate against Supabase app_users table
    // Mock validation: any user with PIN "12345" succeeds
    if (pin !== '12345') {
      return { error: 'PIN incorrecto. Verifica e intenta de nuevo.' };
    }
    const mockUser: AppUser = {
      id: userId,
      fullName: 'Carlos Mendoza',
      appRole: 'gerente',
    };
    setAppUser(mockUser);
    localStorage.setItem('aldente_user', JSON.stringify(mockUser));
    return {};
  };

  const signOut = () => {
    setAppUser(null);
    localStorage.removeItem('aldente_user');
  };

  return (
    <AuthContext.Provider value={{ appUser, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}