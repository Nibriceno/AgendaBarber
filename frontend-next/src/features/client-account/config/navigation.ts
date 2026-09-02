export type ClientAccountIconName = "bookings" | "settings";

export const CLIENT_ACCOUNT_NAVIGATION = [
  {
    label: "Mis reservas",
    path: "/mi-cuenta/reservas",
    icon: "bookings",
  },
  {
    label: "Configuración",
    path: "/mi-cuenta/configuracion",
    icon: "settings",
  },
] as const satisfies ReadonlyArray<{
  label: string;
  path: string;
  icon: ClientAccountIconName;
}>;
