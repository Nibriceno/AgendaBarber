"use client";

import Link from "next/link";

import {
  FormEvent,
  useState,
} from "react";

import {
  getApiErrorMessage,
} from "@/lib/api/errors";

import {
  forgotPasswordRequest,
} from "../api/auth.api";

import {
  AUTH_INPUT_CLASS_NAME,
} from "../config/auth-form.styles";

type ForgotPasswordFormProps = {
  businessSlug: string;
};

export default function ForgotPasswordForm({
  businessSlug,
}: ForgotPasswordFormProps) {
  const [email, setEmail] =
    useState("");

  const [submittedEmail, setSubmittedEmail] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (submitting) {
      return;
    }

    const normalizedEmail =
      email
        .trim()
        .toLowerCase();

    if (!normalizedEmail) {
      setError(
        "Ingresa tu correo electrónico.",
      );
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response =
        await forgotPasswordRequest({
          businessSlug,
          email:
            normalizedEmail,
        });

      setSubmittedEmail(
        normalizedEmail,
      );
      setMessage(
        response.message,
      );
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "No fue posible solicitar la recuperación.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedEmail) {
    return (
      <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-6 text-center shadow-[0_24px_70px_-45px_rgba(0,0,0,0.5)] sm:p-8">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-950 text-white">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          >
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m4 7 8 6 8-6" />
          </svg>
        </span>

        <h2 className="mt-5 text-2xl font-semibold tracking-tight text-zinc-950">
          Revisa tu correo
        </h2>

        <p className="mt-3 text-sm leading-6 text-zinc-600">
          {message}
        </p>

        <p className="mt-3 text-xs text-zinc-400">
          Por seguridad, el mensaje es el mismo aunque la cuenta no exista.
        </p>

        <button
          type="button"
          onClick={() => {
            setSubmittedEmail("");
            setMessage("");
          }}
          className="mt-6 min-h-11 w-full rounded-xl border border-zinc-300 px-4 text-sm font-semibold text-zinc-700 transition hover:border-zinc-500 hover:bg-zinc-50"
        >
          Usar otro correo
        </button>

        <Link
          href={`/${businessSlug}/login`}
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
        >
          Volver a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[1.5rem] border border-zinc-200 bg-white p-6 shadow-[0_24px_70px_-45px_rgba(0,0,0,0.5)] sm:p-8"
    >
      <label className="text-sm font-medium text-zinc-700">
        Correo electrónico
        <input
          type="email"
          value={email}
          onChange={(event) =>
            setEmail(
              event.target.value,
            )
          }
          required
          maxLength={150}
          autoFocus
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          className={AUTH_INPUT_CLASS_NAME}
          placeholder="correo@ejemplo.com"
        />
      </label>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-6 min-h-12 w-full rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting
          ? "Enviando..."
          : "Enviar enlace seguro"}
      </button>

      <Link
        href={`/${businessSlug}/login`}
        className="mt-5 flex justify-center text-sm font-semibold text-zinc-500 underline-offset-4 hover:text-zinc-950 hover:underline"
      >
        Volver a iniciar sesión
      </Link>
    </form>
  );
}
