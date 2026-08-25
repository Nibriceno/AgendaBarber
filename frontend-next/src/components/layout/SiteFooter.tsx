import Link from "next/link";

import {
  SITE_SOCIAL_LINKS,
} from "@/config/site";

type SocialIconName =
  (typeof SITE_SOCIAL_LINKS)[number]["icon"];

type SocialIconProps = {
  name: SocialIconName;
};

function SocialIcon({
  name,
}: SocialIconProps) {
  if (name === "instagram") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <rect
          x="3"
          y="3"
          width="18"
          height="18"
          rx="5"
        />
        <circle
          cx="12"
          cy="12"
          r="4"
        />
        <circle
          cx="17.5"
          cy="6.5"
          r="1"
          fill="currentColor"
          stroke="none"
        />
      </svg>
    );
  }

  if (name === "x") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      >
        <path d="M5 4l14 16" />
        <path d="M19 4L5 20" />
      </svg>
    );
  }

  if (name === "facebook") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="currentColor"
      >
        <path d="M13.7 21v-8h2.8l.4-3.1h-3.2v-2c0-.9.3-1.5 1.6-1.5H17V3.6c-.7-.1-1.5-.2-2.3-.2-2.3 0-3.9 1.4-3.9 4.1v2.3H8.2V13h2.6v8h2.9Z" />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
    >
      <path d="M20 11.6a8 8 0 0 1-11.9 7L4 20l1.4-4A8 8 0 1 1 20 11.6Z" />
      <path d="M9 8.2c.3 3 2 4.8 5 5.7" />
      <path d="m9 8.2 1.5-.6 1.1 2-1 .9" />
      <path d="m14 13.9.8-1 2 .9-.4 1.5" />
    </svg>
  );
}

export default function SiteFooter() {
  const currentYear =
    new Date().getFullYear();

  return (
    <footer className="relative z-50 overflow-hidden bg-zinc-950 text-white">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/[0.04] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 left-1/4 h-64 w-64 rounded-full bg-amber-500/[0.06] blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[11px] font-bold text-zinc-950">
                AB
              </span>

              <span>
                <span className="block font-semibold tracking-tight text-white">
                  AgendaBarber
                </span>

                <span className="block text-xs text-zinc-400">
                  Reservas simples y seguras
                </span>
              </span>
            </Link>

            <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-400">
              Una experiencia de reservas clara para clientes y una operación más ordenada para cada barbería.
            </p>
          </div>

          <nav
            aria-label="Redes sociales"
          >
            <ul className="flex flex-wrap gap-1 sm:justify-end">
              {SITE_SOCIAL_LINKS.map(
                (social) => (
                  <li
                    key={social.icon}
                  >
                    <a
                      href={social.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      aria-label={`${social.label} de AgendaBarber (abre en una pestaña nueva)`}
                      title={social.label}
                      className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/[0.08] hover:text-white focus:outline-none focus:ring-2 focus:ring-white/40"
                    >
                      <SocialIcon
                        name={social.icon}
                      />
                    </a>
                  </li>
                ),
              )}
            </ul>
          </nav>
        </div>

        <div className="mt-7 flex flex-col gap-3 border-t border-white/10 pt-5 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {currentYear} AgendaBarber. Todos los derechos reservados.
          </span>

          <Link
            href="/terms"
            className="w-fit rounded underline-offset-4 transition hover:text-white hover:underline focus:outline-none focus:ring-2 focus:ring-white/40"
          >
            Términos y condiciones
          </Link>
        </div>
      </div>
    </footer>
  );
}
