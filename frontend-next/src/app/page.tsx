import Link from "next/link";

import MarketingHeader from "@/features/marketing/components/MarketingHeader";
import PricingPlansSection from "@/features/marketing/components/PricingPlansSection";

const BUSINESS_TYPES = ["Peluquerías", "Barberías", "Centros de uñas", "Estética", "Masajes", "Bienestar"] as const;

const BENEFITS = [
  { number: "01", title: "Reservas disponibles todo el día", description: "Tus clientes revisan servicios, profesionales y horarios sin llamadas ni mensajes de ida y vuelta." },
  { number: "02", title: "Una agenda que todo el equipo entiende", description: "Centraliza citas, horarios y cambios en una experiencia simple para administración y profesionales." },
  { number: "03", title: "Tu negocio, con identidad propia", description: "Recibe una dirección personalizada y configura servicios, equipo, políticas y redes sociales." },
] as const;

export default function Home() {
  return (
    <main className="bg-[#f7f7f5] text-zinc-950">
      <MarketingHeader />

      <section className="relative overflow-hidden bg-zinc-950 text-white">
        <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_80%_10%,rgba(252,211,77,0.2),transparent_27%),radial-gradient(circle_at_10%_80%,rgba(255,255,255,0.09),transparent_24%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-18 sm:px-6 sm:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8 lg:py-30">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-300" /> Agenda online para negocios de servicios
            </div>
            <h1 className="mt-7 max-w-3xl text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-7xl">Menos mensajes. Más tiempo para tu negocio.</h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-zinc-300 sm:text-lg">AgendaYa reúne tus reservas, profesionales y servicios en un solo lugar. Una experiencia clara para ti y fácil para tus clientes.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/#planes" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-amber-300 px-6 text-sm font-semibold text-zinc-950 transition hover:bg-amber-200">Conocer los planes</Link>
              <Link href="/mi-cuenta/reservas" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/15 px-6 text-sm font-semibold text-white transition hover:bg-white/10">Soy cliente: ver mis reservas</Link>
            </div>
            <p className="mt-5 text-xs text-zinc-500">Precios claros · Cobro mensual seguro mediante Mercado Pago</p>
          </div>

          <div className="relative mx-auto w-full max-w-xl lg:ml-auto">
            <div className="absolute -inset-4 rounded-[2.25rem] border border-white/5 bg-white/[0.03]" />
            <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#171717] p-4 shadow-2xl sm:p-6">
              <div className="flex items-center justify-between border-b border-white/8 pb-5">
                <div><p className="text-xs text-zinc-500">Vista diaria</p><p className="mt-1 font-semibold">Tu agenda</p></div>
                <span className="rounded-lg bg-amber-300 px-3 py-2 text-xs font-semibold text-zinc-950">+ Nueva cita</span>
              </div>
              <div className="mt-5 grid grid-cols-[54px_1fr] gap-3">
                <div className="space-y-11 pt-2 text-[11px] text-zinc-600"><p>09:00</p><p>10:00</p><p>11:00</p><p>12:00</p></div>
                <div className="space-y-3">
                  <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/10 p-4"><p className="text-xs font-semibold text-emerald-200">09:30 · Confirmada</p><p className="mt-1 text-sm text-white">Corte y peinado</p><p className="mt-1 text-xs text-zinc-500">Camila · 45 min</p></div>
                  <div className="ml-7 rounded-xl border border-violet-400/15 bg-violet-400/10 p-4"><p className="text-xs font-semibold text-violet-200">10:45 · Pendiente</p><p className="mt-1 text-sm text-white">Manicure permanente</p><p className="mt-1 text-xs text-zinc-500">Valentina · 60 min</p></div>
                  <div className="mr-10 rounded-xl border border-amber-300/15 bg-amber-300/10 p-4"><p className="text-xs font-semibold text-amber-200">12:00 · Confirmada</p><p className="mt-1 text-sm text-white">Sesión de masaje</p><p className="mt-1 text-xs text-zinc-500">Diego · 45 min</p></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Tipos de negocios" className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Creado para negocios que trabajan con agenda</p>
          <div className="mt-5 flex flex-wrap justify-center gap-x-7 gap-y-3">{BUSINESS_TYPES.map((type) => <span key={type} className="text-sm font-medium text-zinc-600">{type}</span>)}</div>
        </div>
      </section>

      <section id="beneficios" className="scroll-mt-20 px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Una operación más simple</p><h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">Todo lo necesario para recibir reservas con orden.</h2></div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {BENEFITS.map((benefit) => <article key={benefit.number} className="rounded-3xl border border-zinc-200 bg-white p-7 shadow-[0_20px_60px_rgba(0,0,0,0.04)] sm:p-8"><span className="text-xs font-semibold text-amber-700">{benefit.number}</span><h3 className="mt-9 text-xl font-semibold tracking-tight">{benefit.title}</h3><p className="mt-3 text-sm leading-6 text-zinc-600">{benefit.description}</p></article>)}
          </div>
        </div>
      </section>

      <PricingPlansSection />

      <section id="como-funciona" className="scroll-mt-16 px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Comienza acompañado</p><h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">Tu página lista, sin configurarla a ciegas.</h2><p className="mt-5 text-base leading-7 text-zinc-600">Nos cuentas sobre tu negocio y un agente de AgendaYa te ayuda a revisar la URL, cargar la información inicial y coordinar la activación.</p></div>
          <ol className="grid gap-px overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-200 sm:grid-cols-3">
            {[["1", "Elige tu plan", "Selecciona según la cantidad de personas de tu equipo."], ["2", "Activa tu acceso", "Confirmamos la URL y recibes una invitación segura de administrador."], ["3", "Autoriza la suscripción", "Mercado Pago gestiona el cobro mensual y AgendaYa confirma la activación."]].map(([number, title, text]) => <li key={number} className="bg-white p-7 sm:p-8"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-950 text-xs font-semibold text-white">{number}</span><h3 className="mt-8 font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-zinc-600">{text}</p></li>)}
          </ol>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6 sm:pb-28 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 overflow-hidden rounded-[2rem] bg-amber-300 p-8 sm:p-12 lg:flex-row lg:items-center"><div><p className="text-sm font-semibold text-amber-950/70">AgendaYa para tu negocio</p><h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-[-0.04em] text-zinc-950 sm:text-4xl">Empieza a ordenar tus reservas desde hoy.</h2></div><Link href="/#planes" className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-xl bg-zinc-950 px-6 text-sm font-semibold text-white transition hover:bg-zinc-800">Ver planes y comenzar</Link></div>
      </section>
    </main>
  );
}
