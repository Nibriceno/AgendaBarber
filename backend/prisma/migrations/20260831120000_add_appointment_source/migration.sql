CREATE TYPE "AppointmentSource" AS ENUM ('ONLINE', 'PHONE', 'IN_PERSON');

ALTER TABLE "appointments"
ADD COLUMN "source" "AppointmentSource" NOT NULL DEFAULT 'ONLINE';
