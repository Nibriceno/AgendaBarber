import { BusinessStatus, Prisma } from '@prisma/client';

export const ACTIVE_BUSINESS_WHERE = {
  status: BusinessStatus.ACTIVE,
  deletedAt: null,
} satisfies Prisma.BusinessWhereInput;

export function isBusinessOperational(business: {
  status: BusinessStatus;
  deletedAt: Date | null;
}): boolean {
  return business.status === BusinessStatus.ACTIVE && !business.deletedAt;
}
