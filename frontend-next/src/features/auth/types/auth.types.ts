export type UserRole =
  | "ADMIN"
  | "RECEPTIONIST"
  | "BARBER"
  | "CLIENT";

export type AuthUser = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  businessId: number;
};

export type LoginCredentials = {
  businessSlug: string;
  email: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
  user: AuthUser;
};