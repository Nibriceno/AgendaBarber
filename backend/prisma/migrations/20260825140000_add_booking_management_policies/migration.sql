ALTER TABLE "businesses"
ADD COLUMN "allowClientCancellation" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "allowClientRescheduling" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "cancellationPolicy" VARCHAR(1000);
