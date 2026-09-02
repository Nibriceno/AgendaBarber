import { UserRole } from '@prisma/client';

export interface AuthUser {
  sessionId?: string;
  id: number;
  businessId: number;
  businessSlug: string;
  customerIdentityId?: string | null;
  role: UserRole;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
}
