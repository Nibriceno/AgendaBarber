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
