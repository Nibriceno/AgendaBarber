import {
  useState,
  type FormEvent,
} from 'react';

import {
  Link,
  useNavigate,
} from 'react-router-dom';

import { api } from '../api/axios';
import { useAuth } from '../contexts/AuthContext';

import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

type LoginResponse = {
  accessToken: string;

  user: {
    id: number;
    businessId: number;
    firstName: string;
    lastName: string;
    phone: string;
    email: string | null;

    role:
      | 'ADMIN'
      | 'RECEPTIONIST'
      | 'BARBER'
      | 'CLIENT';
  };
};

export function LoginPage() {
  const navigate = useNavigate();

  const { refreshUser } = useAuth();

  const [email, setEmail] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [error, setError] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError('');
    setLoading(true);

    try {
      const response =
        await api.post<LoginResponse>(
          '/auth/login',
          {
            email,
            password,
          },
        );

      localStorage.setItem(
        'accessToken',
        response.data.accessToken,
      );

      localStorage.setItem(
        'user',
        JSON.stringify(
          response.data.user,
        ),
      );

      await refreshUser();

      switch (response.data.user.role) {
        case 'ADMIN':
        case 'RECEPTIONIST':
          navigate('/admin');
          break;

        case 'BARBER':
          navigate('/barber');
          break;

        case 'CLIENT':
          navigate('/my-appointments');
          break;

        default:
          navigate('/');
      }
    } catch {
      setError(
        'Correo o contraseña incorrectos',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="grid min-h-screen lg:grid-cols-2">

        {/* Panel visual */}
        <section className="hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <Link
            to="/"
            className="text-xl font-semibold tracking-tight"
          >
            AgendaBarber
          </Link>

          <div className="max-w-lg">
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-slate-400">
              Gestión simple
            </p>

            <h1 className="text-5xl font-semibold leading-tight tracking-tight">
              Tu barbería,
              organizada en un solo lugar.
            </h1>

            <p className="mt-6 max-w-md text-base leading-7 text-slate-400">
              Administra reservas,
              horarios, servicios y clientes
              desde una plataforma rápida
              y simple.
            </p>
          </div>

          <p className="text-sm text-slate-500">
            © 2026 AgendaBarber
          </p>
        </section>

        {/* Formulario */}
        <section className="flex items-center justify-center px-6 py-12 sm:px-10">
          <div className="w-full max-w-md">

            <Link
              to="/"
              className="mb-12 block text-xl font-semibold tracking-tight text-slate-950 lg:hidden"
            >
              AgendaBarber
            </Link>

            <div className="mb-8">
              <p className="mb-2 text-sm font-medium text-slate-500">
                Bienvenido
              </p>

              <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                Inicia sesión
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                Ingresa tus datos para acceder
                a tu cuenta.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              <Input
                id="email"
                type="email"
                label="Correo electrónico"
                placeholder="nombre@correo.cl"
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value,
                  )
                }
                autoComplete="email"
                required
              />

              <Input
                id="password"
                type="password"
                label="Contraseña"
                placeholder="••••••••"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value,
                  )
                }
                autoComplete="current-password"
                required
              />

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                fullWidth
                disabled={loading}
              >
                {loading
                  ? 'Ingresando...'
                  : 'Iniciar sesión'}
              </Button>
            </form>

            <div className="mt-8 border-t border-slate-200 pt-6">
              <p className="text-center text-sm text-slate-500">
                ¿Quieres reservar una hora?{' '}
                <Link
                  to="/booking"
                  className="font-medium text-slate-950 hover:underline"
                >
                  Reservar ahora
                </Link>
              </p>
            </div>

          </div>
        </section>
      </div>
    </main>
  );
}