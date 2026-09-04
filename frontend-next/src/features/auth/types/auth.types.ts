export type UserRole = "ADMIN" | "RECEPTIONIST" | "BARBER" | "CLIENT";

export type AuthUser = {
  id: number;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  role: UserRole;
  businessId: number;
  businessSlug: string;
  customerIdentityId?: string | null;
  billingRestricted?: boolean;
};

export type LoginCredentials = {
  businessSlug: string;
  email: string;
  password: string;
};

export type LoginResponse = {
  user: AuthUser;
  csrfToken: string;
};

export type RegisterClientInput = {
  businessSlug: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
};

export type RegisterClientResponse = {
  message: string;
  emailSent: boolean;
};

export type VerifyEmailInput = {
  businessSlug: string;
  token: string;
};

export type ResendVerificationInput = {
  businessSlug: string;
  email: string;
};

export type ForgotPasswordInput = {
  businessSlug: string;
  email: string;
};

export type ResetPasswordInput = {
  businessSlug: string;
  token: string;
  password: string;
};

export type AuthMessageResponse = {
  message: string;
};
