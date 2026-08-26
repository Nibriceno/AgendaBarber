export type ClientAppointmentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export type ClientAppointment = {
  id: number;
  startAt: string;
  endAt: string;
  status: ClientAppointmentStatus;
  totalDurationMinutes: number;
  totalPrice: string | number;
  customerNotes: string | null;
  confirmationCode: string;
  cancelledAt: string | null;
  cancellationReason: string | null;
  business: {
    name: string;
    timezone: string;
    currency: string;
    cancellationMinimumMinutes: number;
    rescheduleMinimumMinutes: number;
    allowClientCancellation: boolean;
    allowClientRescheduling: boolean;
    cancellationPolicy: string | null;
  };
  barber: {
    id: number;
    displayName: string;
    specialty: string | null;
    photoUrl: string | null;
  };
  services: Array<{
    id: number;
    serviceId: number;
    serviceName: string;
    durationMinutes: number;
    finalPrice: string | number;
    displayOrder: number;
  }>;
};

export type ClientProfile = {
  id: number;
  businessId: number;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  role: "CLIENT";
  emailVerified: boolean;
  createdAt: string;
  business: {
    id: number;
    name: string;
    slug: string;
  };
};

export type UpdateClientProfileInput = {
  firstName: string;
  lastName: string;
  phone: string;
};

export type ChangeClientPasswordInput = {
  currentPassword: string;
  newPassword: string;
};

export type MessageResponse = {
  message: string;
};
