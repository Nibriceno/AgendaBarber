"use client";

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import Link from "next/link";

import {
  resendVerificationRequest,
  verifyEmailRequest,
} from "../api/auth.api";

import {
  getApiErrorMessage,
} from "@/lib/api/errors";

type EmailVerificationViewProps = {
  businessSlug: string;
  token?: string;
};

type VerificationStatus =
  | "idle"
  | "verifying"
  | "success"
  | "error";

export default function EmailVerificationView({
  businessSlug,
  token,
}: EmailVerificationViewProps) {
  const started = useRef(false);

  const [status, setStatus] =
    useState<VerificationStatus>(
      token ? "verifying" : "idle",
    );

  const [message, setMessage] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [resending, setResending] =
    useState(false);

  useEffect(() => {
    if (!token || started.current) {
      return;
    }

    started.current = true;

    const verify = async () => {
      try {
        const response =
          await verifyEmailRequest({
            businessSlug,
            token,
          });

        setMessage(response.message);
        setStatus("success");
      } catch (requestError) {
        setMessage(
          getApiErrorMessage(
            requestError,
            "No pudimos confirmar tu correo.",
          ),
        );
        setStatus("error");
      }
    };

    void verify();
  }, [
    businessSlug,
    token,
  ]);

  const handleResend = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (resending) {
      return;
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    if (!normalizedEmail) {
      return;
    }

    setResending(true);
    setMessage("");

    try {
      const response =
        await resendVerificationRequest({
          businessSlug,
          email:
            normalizedEmail,
        });

      setMessage(response.message);
    } catch (requestError) {
      setMessage(
        getApiErrorMessage(
          requestError,
          "No fue posible solicitar un nuevo correo.",
        ),
      );
    } finally {
      setResending(false);
    }
  };

  const icon =
    status === "success"
      ? "✓"
      : status === "error"
        ? "!"
        : "✉";

  return (
    <div className="w-full max-w-lg rounded-[1.75rem] border border-zinc-200 bg-white p-6 text-center shadow-[0_24px_70px_-45px_rgba(0,0,0,0.5)] sm:p-9">
      <span
        className={[
          "mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-bold",
          status === "success"
            ? "bg-emerald-100 text-emerald-700"
            : status === "error"
              ? "bg-red-100 text-red-700"
              : "bg-zinc-950 text-white",
        ].join(" ")}
      >
        {status === "verifying" ? (
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        ) : (
          icon
        )}
      </span>

      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
        {status === "verifying"
          ? "Confirmando tu correo"
          : status === "success"
            ? "Correo confirmado"
            : "Verifica tu cuenta"}
      </h1>

      <p
        aria-live="polite"
        className="mt-3 text-sm leading-6 text-zinc-600"
      >
        {status === "verifying"
          ? "Espera un momento mientras validamos tu enlace."
          : message ||
            "Ingresa tu correo y te enviaremos un nuevo enlace de activación."}
      </p>

      {status === "success" ? (
        <Link
          href={`/${businessSlug}/login`}
          className="mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800"
        >
          Iniciar sesión
        </Link>
      ) : status !== "verifying" ? (
        <form
          onSubmit={handleResend}
          className="mt-7 text-left"
        >
          <label className="text-sm font-medium text-zinc-700">
            Correo electrónico
            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              required
              maxLength={150}
              autoComplete="email"
              autoCapitalize="none"
              className="mt-1.5 h-12 w-full rounded-xl border border-zinc-300 px-3.5 text-sm outline-none transition focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/5"
              placeholder="correo@ejemplo.com"
            />
          </label>

          <button
            type="submit"
            disabled={resending}
            className="mt-4 min-h-12 w-full rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {resending
              ? "Solicitando..."
              : "Enviar nuevo enlace"}
          </button>
        </form>
      ) : null}

      {status !== "verifying" && (
        <Link
          href={`/${businessSlug}`}
          className="mt-5 inline-flex text-sm font-semibold text-zinc-500 underline-offset-4 hover:text-zinc-950 hover:underline"
        >
          Volver al inicio
        </Link>
      )}
    </div>
  );
}
