import { PlatformRole } from '@prisma/client';

export interface PlatformAuthUser {
  sessionId: string;
  id: number;
  role: PlatformRole;
  firstName: string;
  lastName: string;
  email: string;
}
