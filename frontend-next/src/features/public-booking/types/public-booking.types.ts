export type PublicBusiness = {
  slug: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  logoUrl: string | null;
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

  barber: BookingConfirmationBarber;

  services: BookingConfirmationService[];
};
