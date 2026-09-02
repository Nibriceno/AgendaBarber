export type BusinessStatus = "ACTIVE" | "SUSPENDED" | "INACTIVE";

export type BusinessCounts = {
  users: number;
  barbers: number;
  services: number;
  appointments: number;
};

export type PlatformBusinessListItem = {
  id: number;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  status: BusinessStatus;
  statusChangedAt: string;
  statusReason: string | null;
  createdAt: string;
  updatedAt: string;
  _count: BusinessCounts;
};

export type PlatformBusinessDetail = {
  id: number;
  name: string;
  slug: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  logoUrl: string | null;
  instagramUrl: string | null;
  twitterUrl: string | null;
  facebookUrl: string | null;
  whatsappUrl: string | null;
  timezone: string;
  currency: string;
  appointmentInterval: number;
  minimumAdvanceTime: number;
  maximumAdvanceDays: number;
  cancellationMinimumMinutes: number;
  rescheduleMinimumMinutes: number;
  allowClientCancellation: boolean;
  allowClientRescheduling: boolean;
  cancellationPolicy: string | null;
  barberStartEarlyMinutes: number;
  noShowGraceMinutes: number;
  status: BusinessStatus;
  statusChangedAt: string;
  statusReason: string | null;
  suspendedAt: string | null;
  inactivatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  counters: BusinessCounts & { clients: number; team: number };
  initialAdmin: {
    id: number;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string;
    isActive: boolean;
    isRegistered: boolean;
    emailVerified: boolean;
    lastLoginAt: string | null;
    businessInvitation: {
      expiresAt: string;
      sentAt: string | null;
      acceptedAt: string | null;
      revokedAt: string | null;
    } | null;
  } | null;
};

export type PlatformBusinessSummary = {
  businesses: {
    total: number;
    active: number;
    suspended: number;
    inactive: number;
  };
  users: number;
  barbers: number;
  services: number;
  appointments: number;
  generatedAt: string;
};

export type PlatformBusinessesResponse = {
  items: PlatformBusinessListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type CreatePlatformBusinessInput = {
  business: {
    name: string;
    slug: string;
    phone?: string;
    email?: string;
    address?: string;
    timezone?: string;
    currency?: string;
  };
  admin: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
  };
};

export type CreatePlatformBusinessResponse = {
  business: Omit<PlatformBusinessDetail, "counters" | "initialAdmin">;
  initialAdmin: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    role: "ADMIN";
    invitationAccepted: boolean;
  };
  invitationEmailSent: boolean;
  invitationExpiresAt: string;
};

export type UpdatePlatformBusinessInput = Partial<
  CreatePlatformBusinessInput["business"]
>;
