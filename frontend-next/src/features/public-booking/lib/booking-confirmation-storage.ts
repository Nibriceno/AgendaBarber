import type {
  BookingConfirmation,
} from "../types/public-booking.types";

const STORAGE_KEY =
  "agenda-barber:last-booking";

export const bookingConfirmationStorage = {
  save(
    booking: BookingConfirmation,
  ) {
    if (
      typeof window ===
      "undefined"
    ) {
      return;
    }

    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        booking,
      ),
    );
  },

  get():
    | BookingConfirmation
    | null {
    if (
      typeof window ===
      "undefined"
    ) {
      return null;
    }

    const raw =
      sessionStorage.getItem(
        STORAGE_KEY,
      );

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(
        raw,
      ) as BookingConfirmation;
    } catch {
      sessionStorage.removeItem(
        STORAGE_KEY,
      );

      return null;
    }
  },

  clear() {
    if (
      typeof window ===
      "undefined"
    ) {
      return;
    }

    sessionStorage.removeItem(
      STORAGE_KEY,
    );
  },
};