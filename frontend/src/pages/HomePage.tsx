import { useEffect, useState } from 'react';
import { api } from '../api/axios';
import { useAuth } from '../contexts/AuthContext';

type Business = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
};

export function HomePage() {
  const {
    user,
    loading,
    logout,
  } = useAuth();

  const [business, setBusiness] =
    useState<Business | null>(null);

  useEffect(() => {
    const loadBusiness = async () => {
      const response =
        await api.get<Business>('/businesses/1');

      setBusiness(response.data);
    };

    loadBusiness();
  }, []);

  return (
    <div>
      <h1>{business?.name}</h1>

      <p>{business?.address}</p>

      {loading ? (
        <p>Comprobando sesión...</p>
      ) : user ? (
        <div>
          <p>
            Bienvenido {user.firstName}
          </p>

          <p>
            Rol: {user.role}
          </p>

          <button onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      ) : (
        <a href="/login">
          Iniciar sesión
        </a>
      )}

      <a href="/booking">
        Reservar hora
      </a>
    </div>
  );
}