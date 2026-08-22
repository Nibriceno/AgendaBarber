"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import {
  useAuth,
} from "@/features/auth/context/AuthContext";

import {
  getDefaultRouteForRole,
} from "@/features/auth/lib/auth-routing";

import {
  getApiErrorMessage,
} from "@/lib/api/errors";

export default function LoginForm() {
  const router =
    useRouter();

  const params =
    useParams<{
      businessSlug:
        string;
    }>();

  const {
    user,
    loading:
      authLoading,
    isAuthenticated,
    login,
  } =
    useAuth();

  const businessSlug =
    params.businessSlug;

  const [
    email,
    setEmail,
  ] =
    useState("");

  const [
    password,
    setPassword,
  ] =
    useState("");

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    submitting,
    setSubmitting,
  ] =
    useState(false);

  /*
   * Si un usuario ya autenticado intenta
   * abrir /login manualmente, lo mandamos
   * directamente a su zona.
   */
  useEffect(() => {
    if (
      authLoading ||
      !isAuthenticated ||
      !user ||
      !businessSlug
    ) {
      return;
    }

    router.replace(
      getDefaultRouteForRole(
        user.role,
        businessSlug,
      ),
    );
  }, [
    authLoading,
    isAuthenticated,
    user,
    businessSlug,
    router,
  ]);

  const handleSubmit =
    async (
      event:
        FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault();

      if (submitting) {
        return;
      }

      setError("");

      if (!businessSlug) {
        setError(
          "No se pudo identificar la barbería.",
        );

        return;
      }

      const cleanEmail =
        email
          .trim()
          .toLowerCase();

      if (!cleanEmail) {
        setError(
          "Ingresa tu correo electrónico.",
        );

        return;
      }

      if (!password) {
        setError(
          "Ingresa tu contraseña.",
        );

        return;
      }

      setSubmitting(
        true,
      );

      try {
        const authenticatedUser =
          await login({
            businessSlug,

            email:
              cleanEmail,

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
            businessSlug,
          ),
        );
      } catch (error) {
        setError(
          getApiErrorMessage(
            error,
            "No fue posible iniciar sesión.",
          ),
        );
      } finally {
        setSubmitting(
          false,
        );
      }
    };

  return (
    <form
      onSubmit={
        handleSubmit
      }
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
          value={
            email
          }
          onChange={(
            event,
          ) =>
            setEmail(
              event.target.value,
            )
          }
          required
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-100"
          placeholder="correo@ejemplo.com"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-1 block text-sm font-medium text-zinc-700"
        >
          Contraseña
        </label>

        <input
          id="password"
          type="password"
          value={
            password
          }
          onChange={(
            event,
          ) =>
            setPassword(
              event.target.value,
            )
          }
          required
          autoComplete="current-password"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-100"
        />
      </div>

      {error && (
        <p
          role="alert"
          className="text-sm text-red-600"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={
          submitting ||
          authLoading
        }
        className="min-h-11 w-full rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting
          ? "Ingresando..."
          : "Iniciar sesión"}
      </button>
    </form>
  );
}