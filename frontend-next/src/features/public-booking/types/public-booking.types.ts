export type BookingPolicy = {
  allowCancellation: boolean;
  allowRescheduling: boolean;
  cancellationMinimumMinutes: number;
  rescheduleMinimumMinutes: number;
  policyText: string | null;
};

export type PublicBusiness = {
  slug: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  logoUrl: string | null;
  timezone: string;
  currency: string;
  bookingPolicy: BookingPolicy;
};

export type PublicCategory = {
  id: number;
  name: string;
  description: string | null;
  displayOrder: number;
};

export type PublicService = {
  id: number;
  categoryId: number;

  name: string;
  description: string | null;
  imageUrl: string | null;

  durationMinutes: number;
  bufferBefore: number;
  bufferAfter: number;

  price: string | number;
  displayOrder: number;

  category: PublicCategory;
};

export type PublicBarberService = {
  serviceId: number;

  customDurationMinutes:
    | number
    | null;

  customPrice:
    | string
    | number
    | null;

  service: {
    id: number;
    name: string;
    durationMinutes: number;
    price: string | number;
  };
};

export type PublicBarber = {
  id: number;
  displayName: string;

  specialty: string | null;
  biography: string | null;
  photoUrl: string | null;

  displayOrder: number;

  services: PublicBarberService[];
};

export type PublicAvailabilitySlot = {
  time: string;
  startAt: string;
  endAt: string;
};

export type PublicAvailability = {
  date: string;
  barberId: number;
  durationMinutes: number;
  availableSlots: PublicAvailabilitySlot[];
};

export type CreateGuestBookingInput = {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;

  barberId: number;
  serviceIds: number[];
  startAt: string;

  customerNotes?: string;
};

export type CreateClientBookingInput = {
  barberId: number;
  serviceIds: number[];
  startAt: string;

  customerNotes?: string;
};

export type BookingConfirmationService = {
  id: number;
  name: string;
  durationMinutes: number;
  price: string | number;
};

export type BookingConfirmationBarber = {
  id: number;
  displayName: string;
  photoUrl: string | null;
};

export type BookingConfirmation = {
  id: number;
  status: string;

  startAt: string;
  endAt: string;

  totalDurationMinutes: number;
  totalPrice: string | number;

  confirmationCode: string;

  managementToken?: string;

  business: {
    name: string;
    timezone: string;
    currency: string;
    bookingPolicy: BookingPolicy;
  };

  barber: BookingConfirmationBarber;

  services: BookingConfirmationService[];
};

export type ClientBookingResponse = {
  id: number;
  status: string;
  startAt: string;
  endAt: string;
  totalDurationMinutes: number;
  totalPrice: string | number;
  confirmationCode: string;
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
  barber: BookingConfirmationBarber;
  services: Array<{
    serviceId: number;
    serviceName: string;
    durationMinutes: number;
    finalPrice: string | number;
  }>;
};
