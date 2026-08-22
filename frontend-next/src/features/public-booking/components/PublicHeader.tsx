import Link from "next/link";

type PublicHeaderProps = {
  businessSlug: string;
};

export default function PublicHeader({
  businessSlug,
}: PublicHeaderProps) {
  return (
    <header className="border-b border-zinc-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link
          href={`/${businessSlug}`}
          className="text-lg font-semibold tracking-tight text-zinc-950"
        >
          AgendaBarber
        </Link>

        <Link
          href={`/${businessSlug}/login`}
          className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-300"
        >
          Iniciar sesión
        </Link>
      </div>
    </header>
  );
}