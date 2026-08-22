export type BarberUser = {
  id: number;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string;
  role: string;
  isActive: boolean;
};

export type Barber = {
  id: number;
  businessId: number;
  userId: number | null;

  displayName: string;
  specialty: string | null;
  biography: string | null;
  photoUrl: string | null;

  calendarColor: string | null;

  commissionPercentage:
    | string
    | number
    | null;

  displayOrder: number;
  isActive: boolean;

  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;

  user: BarberUser | null;
};

export type CreateBarberInput = {
  userId?: number;
  displayName: string;
  specialty?: string;
  biography?: string;
  photoUrl?: string;
  calendarColor?: string;
  commissionPercentage?: number;
  displayOrder?: number;
  isActive?: boolean;
};

export type UpdateBarberInput =
  Partial<CreateBarberInput>;