export type ClientAccountIconName = "bookings" | "settings";

export const CLIENT_ACCOUNT_NAVIGATION = [
  {
    label: "Mis reservas",
    path: "/account/bookings",
    icon: "bookings",
  },
  {
    label: "Configuración",
    path: "/account/settings",
    icon: "settings",
  },
] as const satisfies ReadonlyArray<{
  label: string;
  path: string;
  icon: ClientAccountIconName;
}>;
