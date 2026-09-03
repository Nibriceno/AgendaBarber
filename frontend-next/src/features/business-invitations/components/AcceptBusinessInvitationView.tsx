"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

import { PLATFORM_BRAND_INITIALS, PLATFORM_BRAND_NAME } from "@/config/site";
import { getApiErrorMessage } from "@/lib/api/errors";
import { acceptBusinessInvitation } from "../api/business-invitations.api";

export default function AcceptBusinessInvitationView({
  businessSlug,
  token,
}: {
  businessSlug: string;
  token: string;
}) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(token ? "" : "El enlace no contiene una invitación válida.");
  const [accepted, setAccepted] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (password !== confirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setSubmitting(true);
    try {
      await acceptBusinessInvitation({ token, password });
      setAccepted(true);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "La invitación no es válida o ya venció."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-[calc(100vh-5rem)] items-center justify-center bg-[#f5f5f4] px-4 py-12">
      <section className="w-full max-w-lg overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-xl shadow-zinc-950/5">
        <div className="bg-zinc-950 px-7 py-6 text-white">
          <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-xs font-black text-zinc-950">{PLATFORM_BRAND_INITIALS}</div><div><p className="font-semibold">{PLATFORM_BRAND_NAME}</p><p className="text-xs text-zinc-500">Invitación de administrador</p></div></div>
        </div>

        {accepted ? (
          <div className="px-7 py-10 text-center sm:px-10">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">✓</div>
            <h1 className="mt-5 text-2xl font-semibold tracking-tight text-zinc-950">Cuenta activada</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-500">Tu contraseña quedó configurada de forma segura. Ya puedes entrar al panel de tu negocio.</p>
            <Link href={`/${businessSlug}/login`} className="mt-7 inline-flex h-11 items-center justify-center rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white hover:bg-zinc-800">Ir a iniciar sesión</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-7 py-8 sm:px-10 sm:py-10">
            <p className="text-sm font-semibold text-amber-700">Último paso</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-zinc-950">Crea tu contraseña</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-500">Debe tener al menos 8 caracteres, una mayúscula y un número.</p>

            <div className="mt-7 space-y-4">
              <label className="block"><span className="mb-2 block text-sm font-semibold text-zinc-700">Nueva contraseña</span><div className="relative"><input type={showPassword ? "text" : "password"} required minLength={8} maxLength={72} pattern="(?=.*[A-Z])(?=.*\d).+" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" className="h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 pr-20 text-sm text-zinc-950 outline-none focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-100" /><button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-semibold text-zinc-500 hover:bg-zinc-100">{showPassword ? "Ocultar" : "Ver"}</button></div></label>
              <label className="block"><span className="mb-2 block text-sm font-semibold text-zinc-700">Confirmar contraseña</span><input type={showPassword ? "text" : "password"} required minLength={8} maxLength={72} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" className="h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-950 outline-none focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-100" /></label>
            </div>

            {error && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            <button type="submit" disabled={submitting || !token} className="mt-6 h-12 w-full rounded-xl bg-zinc-950 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50">{submitting ? "Activando cuenta..." : "Activar mi cuenta"}</button>
          </form>
        )}
      </section>
    </main>
  );
}
