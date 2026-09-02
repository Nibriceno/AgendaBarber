"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { PLATFORM_BRAND_INITIALS, PLATFORM_BRAND_NAME } from "@/config/site";
import { getApiErrorMessage } from "@/lib/api/errors";
import { usePlatformAuth } from "../context/PlatformAuthContext";

export default function PlatformLoginForm() {
  const router = useRouter();
  const { user, loading, isAuthenticated, login } = usePlatformAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && isAuthenticated && user?.role === "SUPER_ADMIN") {
      router.replace("/super-admin");
    }
  }, [isAuthenticated, loading, router, user]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError("");

    try {
      await login({ email: email.trim().toLowerCase(), password });
      router.replace("/super-admin");
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "No fue posible iniciar sesión en la plataforma.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-[#f5f5f4] px-4 py-8 sm:px-6 lg:py-14">
      <div className="mx-auto grid max-w-6xl overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-[0_30px_90px_-45px_rgba(0,0,0,0.35)] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden min-h-[650px] overflow-hidden bg-zinc-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-amber-300/10 blur-3xl" />
          <div className="absolute -bottom-28 -left-20 h-80 w-80 rounded-full bg-sky-400/10 blur-3xl" />

          <div className="relative flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-sm font-black text-zinc-950">
              {PLATFORM_BRAND_INITIALS}
            </div>
            <div>
              <p className="font-semibold tracking-tight">{PLATFORM_BRAND_NAME}</p>
              <p className="text-xs text-zinc-500">Control de plataforma</p>
            </div>
          </div>

          <div className="relative max-w-lg">
            <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold tracking-wide text-zinc-300">
              Acceso interno
            </span>
            <h1 className="mt-6 text-5xl font-semibold leading-[1.05] tracking-[-0.055em]">
              Toda la plataforma, una visión clara.
            </h1>
            <p className="mt-6 max-w-md text-base leading-7 text-zinc-400">
              Administra barberías, revisa su actividad y controla el acceso sin
              mezclar datos entre negocios.
            </p>
          </div>

          <p className="relative text-xs text-zinc-600">
            Área restringida exclusivamente a SUPER_ADMIN
          </p>
        </section>

        <section className="flex min-h-[620px] items-center px-6 py-12 sm:px-12 lg:px-16">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-9 lg:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-950 text-sm font-black text-white">
                {PLATFORM_BRAND_INITIALS}
              </div>
            </div>

            <p className="text-sm font-semibold text-amber-700">
              Administración global
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-zinc-950">
              Inicia sesión
            </h2>
            <p className="mt-3 text-sm leading-6 text-zinc-500">
              Usa las credenciales independientes de tu cuenta de plataforma.
            </p>

            <form onSubmit={handleSubmit} className="mt-9 space-y-5">
              <div>
                <label
                  htmlFor="platform-email"
                  className="mb-2 block text-sm font-semibold text-zinc-700"
                >
                  Correo electrónico
                </label>
                <input
                  id="platform-email"
                  type="email"
                  required
                  autoComplete="email"
                  autoCapitalize="none"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="admin@tu-dominio.cl"
                  className="h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:ring-4 focus:ring-zinc-100"
                />
              </div>

              <div>
                <label
                  htmlFor="platform-password"
                  className="mb-2 block text-sm font-semibold text-zinc-700"
                >
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="platform-password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 pr-20 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 focus:bg-white focus:ring-4 focus:ring-zinc-100"
                  />
                  <button
                    type="button"
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
                  >
                    {showPassword ? "Ocultar" : "Ver"}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || loading}
                className="flex h-12 w-full items-center justify-center rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-wait disabled:opacity-60"
              >
                {submitting ? "Verificando..." : "Entrar al panel"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
