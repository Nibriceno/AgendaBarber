"use client";

import { FormEvent, useEffect, useState } from "react";

import { useParams, useRouter } from "next/navigation";

import { useAuth } from "@/features/auth/context/AuthContext";

import { getDefaultRouteForRole } from "@/features/auth/lib/auth-routing";

import { getApiErrorMessage, getApiErrorStatus } from "@/lib/api/errors";

import Link from "next/link";
import { AUTH_INPUT_CLASS_NAME } from "../config/auth-form.styles";

export default function LoginForm() {
  const router = useRouter();

  const params = useParams<{
    businessSlug: string;
  }>();

  const { user, loading: authLoading, isAuthenticated, login } = useAuth();

  const businessSlug = params.businessSlug;

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");

  const [needsVerification, setNeedsVerification] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  /*
   * Si un usuario ya autenticado intenta
   * abrir /login manualmente, lo mandamos
   * directamente a su zona.
   */
  useEffect(() => {
    if (authLoading || !isAuthenticated || !user || !businessSlug) {
      return;
    }

    router.replace(
      getDefaultRouteForRole(
        user.role,
        user.role === "CLIENT" ? businessSlug : user.businessSlug,
        user.billingRestricted,
      ),
    );
  }, [authLoading, isAuthenticated, user, businessSlug, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (submitting) {
      return;
    }

    setError("");
    setNeedsVerification(false);

    if (!businessSlug) {
      setError("No se pudo identificar la barbería.");

      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError("Ingresa tu correo electrónico.");

      return;
    }

    if (!password) {
      setError("Ingresa tu contraseña.");

      return;
    }

    setSubmitting(true);

    try {
      const authenticatedUser = await login({
        businessSlug,

        email: cleanEmail,

        /*
         * No hacemos trim de la contraseña:
         * los espacios podrían formar parte
         * legítima de ella.
         */
        password,
      });

      router.replace(
        getDefaultRouteForRole(
          authenticatedUser.role,
          authenticatedUser.role === "CLIENT"
            ? businessSlug
            : authenticatedUser.businessSlug,
          authenticatedUser.billingRestricted,
        ),
      );
    } catch (error) {
      setNeedsVerification(getApiErrorStatus(error) === 403);

      setError(getApiErrorMessage(error, "No fue posible iniciar sesión."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md space-y-5 rounded-xl border border-zinc-200 bg-white p-8 shadow-sm"
    >
      <div>
        <label
          htmlFor="email"
          className="mb-1 block text-sm font-medium text-zinc-700"
        >
          Correo electrónico
        </label>

        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          className={AUTH_INPUT_CLASS_NAME}
          placeholder="correo@ejemplo.com"
        />
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between gap-3">
          <label
            htmlFor="password"
            className="text-sm font-medium text-zinc-700"
          >
            Contraseña
          </label>

          {businessSlug && (
            <Link
              href={`/${businessSlug}/forgot-password`}
              className="text-xs font-semibold text-zinc-500 underline-offset-4 hover:text-zinc-950 hover:underline"
            >
              ¿La olvidaste?
            </Link>
          )}
        </div>

        <span className="relative block">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete="current-password"
            className={`${AUTH_INPUT_CLASS_NAME} pr-20`}
          />

          <button
            type="button"
            aria-label={
              showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
            }
            aria-pressed={showPassword}
            onClick={() => setShowPassword((current) => !current)}
            className="absolute right-3 top-1/2 mt-0.5 -translate-y-1/2 rounded px-1 py-0.5 text-xs font-semibold text-zinc-500 transition hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
          >
            {showPassword ? "Ocultar" : "Ver"}
          </button>
        </span>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          <p>{error}</p>

          {needsVerification && businessSlug && (
            <Link
              href={`/${businessSlug}/verify-email`}
              className="mt-2 inline-flex font-semibold underline underline-offset-4"
            >
              Reenviar correo de verificación
            </Link>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || authLoading}
        className="min-h-11 w-full rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Ingresando..." : "Iniciar sesión"}
      </button>

      {businessSlug && (
        <p className="text-center text-sm text-zinc-500">
          ¿Aún no tienes cuenta?{" "}
          <Link
            href={`/${businessSlug}/register`}
            className="font-semibold text-zinc-950 underline-offset-4 hover:underline"
          >
            Regístrate
          </Link>
        </p>
      )}
    </form>
  );
}
