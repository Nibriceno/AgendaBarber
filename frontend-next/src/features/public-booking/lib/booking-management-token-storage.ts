const STORAGE_KEY_PREFIX = "agenda-barber:booking-management";

function getStorageKey(
  businessSlug: string,
  confirmationCode: string,
): string {
  return `${STORAGE_KEY_PREFIX}:${businessSlug}:${confirmationCode}`;
}

export const bookingManagementTokenStorage = {
  save(
    businessSlug: string,
    confirmationCode: string,
    managementToken: string,
  ): void {
    if (typeof window === "undefined") return;

    try {
      sessionStorage.setItem(
        getStorageKey(businessSlug, confirmationCode),
        managementToken,
      );
    } catch {
      // El token también permanece en memoria durante la visita actual.
    }
  },

  get(businessSlug: string, confirmationCode: string): string {
    if (typeof window === "undefined") return "";

    try {
      return (
        sessionStorage.getItem(
          getStorageKey(businessSlug, confirmationCode),
        ) ?? ""
      );
    } catch {
      return "";
    }
  },

  clear(businessSlug: string, confirmationCode: string): void {
    if (typeof window === "undefined") return;

    try {
      sessionStorage.removeItem(
        getStorageKey(businessSlug, confirmationCode),
      );
    } catch {
      // No hay nada adicional que limpiar si el almacenamiento no está disponible.
    }
  },
};
