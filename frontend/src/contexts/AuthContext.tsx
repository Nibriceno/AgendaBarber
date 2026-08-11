import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import { api } from '../api/axios';

type UserRole =
  | 'ADMIN'
  | 'RECEPTIONIST'
  | 'BARBER'
  | 'CLIENT';

type AuthUser = {
  id: number;
  businessId: number;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  role: UserRole;
};

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext =
  createContext<AuthContextType | undefined>(
    undefined,
  );

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] =
    useState<AuthUser | null>(null);

  const [loading, setLoading] =
    useState(true);

  const refreshUser = async () => {
    const token =
      localStorage.getItem('accessToken');

    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response =
        await api.get<AuthUser>('/auth/me');

      setUser(response.data);

      localStorage.setItem(
        'user',
        JSON.stringify(response.data),
      );
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');

      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');

    setUser(null);
  };

  useEffect(() => {
    refreshUser();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth debe usarse dentro de AuthProvider',
    );
  }

  return context;
}