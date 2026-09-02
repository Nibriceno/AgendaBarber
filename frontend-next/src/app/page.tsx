import Link from "next/link";

import { PLATFORM_BRAND_INITIALS, PLATFORM_BRAND_NAME } from "@/config/site";

export default function Home() {
  return (
    <main className="flex min-h-[calc(100vh-120px)] items-center bg-zinc-950 px-4 py-16 text-white sm:px-6">
      <section className="mx-auto w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.06] p-7 shadow-2xl backdrop-blur sm:p-12 lg:p-16">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-sm font-black text-zinc-950">
          {PLATFORM_BRAND_INITIALS}
        </div>
        <p className="mt-10 text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">
          Reservas simples, en un solo lugar
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">
          Tu próxima visita comienza en {PLATFORM_BRAND_NAME}.
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-300 sm:text-lg">
          Ingresa desde el enlace de tu barbería. Cuando tengas una cuenta, podrás consultar aquí tus reservas de todos los negocios que utilizan la plataforma.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link
            href="/mi-cuenta/reservas"
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-6 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200"
          >
            Ver mis reservas
          </Link>
          <Link
            href="/terms"
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/15 px-6 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Términos y condiciones
          </Link>
        </div>
      </section>
    </main>
  );
}
