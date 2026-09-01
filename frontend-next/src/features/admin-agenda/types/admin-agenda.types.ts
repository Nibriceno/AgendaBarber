import type { AppointmentDisplayStatus } from "@/features/appointment-management/lib/appointment-display";

export type AdminAgendaQuery = {
  page: number;
  pageSize?: number;
  date: string;
  status?: AppointmentDisplayStatus;
  barberId?: number;
  search?: string;
};

export type AdminAgendaAppointment = {
  id: number;
  startAt: string;
  endAt: string;
  status: AppointmentDisplayStatus;
  source: AppointmentSource;
  totalPrice: string;
  totalDurationMinutes: number;
  confirmationCode: string;
  customer: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string | null;
    isRegistered: boolean;
  };
  barber: {
    id: number;
    displayName: string;
    calendarColor: string | null;
  };
  services: string[];
};

export type AppointmentSource = "ONLINE" | "PHONE" | "IN_PERSON";

export type AdminAppointmentDetail = {
  id: number;
  businessId: number;
  customerId: number;
  barberId: number;
  startAt: string;
  endAt: string;
  status: AppointmentDisplayStatus;
  source: AppointmentSource;
  totalDurationMinutes: number;
  subtotal: string | number;
  discountAmount: string | number;
  totalPrice: string | number;
  customerNotes: string | null;
  internalNotes: string | null;
  confirmationCode: string;
  confirmedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  noShowAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: number;
    firstName: string;
    lastName: string;
    phone: string;
    email: string | null;
    isRegistered: boolean;
  };
  barber: {
    id: number;
    displayName: string;
    calendarColor: string | null;
  };
  business: {
    name: string;
    timezone: string;
    currency: string;
  };
  services: Array<{
    id: number;
    serviceId: number;
    serviceName: string;
    durationMinutes: number;
    finalPrice: string | number;
    displayOrder: number;
  }>;
  history: Array<{
    id: number;
    previousStatus: AppointmentDisplayStatus | null;
    newStatus: AppointmentDisplayStatus;
    comment: string | null;
    createdAt: string;
  }>;
};

export type CreateManualAppointmentInput = {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  source: Exclude<AppointmentSource, "ONLINE">;
  barberId: number;
  serviceIds: number[];
  startAt: string;
  customerNotes?: string;
  internalNotes?: string;
};

export type AdminAgendaResponse = {
  generatedAt: string;
  date: string;
  timezone: string;
  currency: string;
  items: AdminAgendaAppointment[];
  barbers: Array<{
    id: number;
    displayName: string;
    calendarColor: string | null;
  }>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};
