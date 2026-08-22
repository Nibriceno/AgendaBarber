export type StaffRole =
  | "BARBER"
  | "RECEPTIONIST";

export type StaffBarberProfile = {
  id: number;
  displayName: string;
  specialty: string | null;
  photoUrl: string | null;
  commissionPercentage:
    | string
    | number
    | null;
  isActive: boolean;
};

export type StaffMember = {
  id: number;
  businessId: number;

  firstName: string;
  lastName: string;

  phone: string;
  email: string | null;

  role: StaffRole;

  isRegistered: boolean;
  isActive: boolean;

  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;

  barber: StaffBarberProfile | null;
};

export type CreateStaffInput = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
};

export type UpdateStaffInput = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
};

export type UpdateStaffStatusInput = {
  isActive: boolean;
};

export type ChangeStaffPasswordInput = {
  password: string;
};