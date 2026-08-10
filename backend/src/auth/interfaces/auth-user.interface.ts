import { UserRole } from '@prisma/client';

export interface AuthUser {
  id: number;
  businessId: number;
  role: UserRole;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
}