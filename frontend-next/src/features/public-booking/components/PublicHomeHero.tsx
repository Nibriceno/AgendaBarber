import Image from "next/image";

type PublicHomeHeroProps = {
  businessName: string;
};

export default function PublicHomeHero({
  businessName,
}: PublicHomeHeroProps) {
  return (
    <div className="relative min-h-[350px] overflow-hidden bg-zinc-950 sm:min-h-[430px] lg:min-h-[500px]">
      <Image
        src="/images/barbershop-hero.png"
        alt="Barbero realizando un corte de cabello en una barbería moderna"
        fill
        preload
        sizes="(max-width: 1023px) 100vw, 50vw"
        className="object-cover object-[64%_center]"
      />

      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/55 to-black/10" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10" />

      <div className="relative z-10 flex min-h-[350px] items-end px-6 py-7 sm:min-h-[430px] sm:items-center sm:px-9 sm:py-10 lg:min-h-[500px] lg:px-10 xl:px-12">
        <div className="max-w-lg">
          <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-white/85 backdrop-blur">
            {businessName}
          </span>

          <h1 className="mt-4 max-w-md text-4xl font-semibold leading-[1.02] tracking-[-0.045em] text-white sm:text-5xl lg:text-[3.25rem]">
            Tu estilo. Tu momento.
          </h1>

          <div className="mt-7 flex">
            <a
              href="#reservar"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-white px-5 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-white/70 sm:w-auto"
            >
              Reservar ahora
            </a>
          </div>
        </div>
      </div>

    </div>
  );
}
