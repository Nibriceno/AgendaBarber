"use client";

import type {
  PublicAvailabilitySlot,
} from "../types/public-booking.types";

type BookingTimeSelectorProps = {
  slots: PublicAvailabilitySlot[];

  selectedStartAt:
    | string
    | null;

  loading: boolean;

  onSelect: (
    slot: PublicAvailabilitySlot,
  ) => void;
};

export default function BookingTimeSelector({
  slots,
  selectedStartAt,
  loading,
  onSelect,
}: BookingTimeSelectorProps) {
  return (
    <section>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-zinc-950">
          Horarios disponibles
        </h2>

        <p className="mt-1 text-sm text-zinc-500">
          Las horas ocupadas no se
          muestran.
        </p>
      </div>

      {loading ? (
        <div className="flex min-h-36 items-center justify-center rounded-2xl border border-zinc-200 bg-white">
          <div className="text-center">
            <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-950" />

            <p className="mt-3 text-sm text-zinc-500">
              Buscando horas...
            </p>
          </div>
        </div>
      ) : slots.length ===
        0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-8 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-zinc-100 text-lg">
            ×
          </div>

          <p className="mt-4 font-medium text-zinc-900">
            No hay horas disponibles
          </p>

          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Prueba seleccionando otro
            día.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {slots.map(
            (slot) => {
              const selected =
                selectedStartAt ===
                slot.startAt;

              return (
                <button
                  key={
                    slot.startAt
                  }
                  type="button"
                  aria-pressed={
                    selected
                  }
                  onClick={() =>
                    onSelect(
                      slot,
                    )
                  }
                  className={[
                    "flex h-12 items-center justify-center rounded-xl border text-sm font-semibold transition",
                    "focus:outline-none focus:ring-2 focus:ring-zinc-300",
                    selected
                      ? "border-zinc-950 bg-zinc-950 text-white"
                      : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-400",
                  ].join(
                    " ",
                  )}
                >
                  {
                    slot.time
                  }
                </button>
              );
            },
          )}
        </div>
      )}
    </section>
  );
}