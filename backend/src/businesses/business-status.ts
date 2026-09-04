import { BusinessStatus, Prisma } from '@prisma/client';

export const BILLING_SUSPENSION_REASON_PREFIX = 'Suscripción de Mercado Pago';

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

export function isBusinessBillingRestricted(business: {
  status: BusinessStatus;
  statusReason: string | null;
  deletedAt: Date | null;
}): boolean {
  return (
    business.status === BusinessStatus.SUSPENDED &&
    !business.deletedAt &&
    Boolean(business.statusReason?.startsWith(BILLING_SUSPENSION_REASON_PREFIX))
  );
}
