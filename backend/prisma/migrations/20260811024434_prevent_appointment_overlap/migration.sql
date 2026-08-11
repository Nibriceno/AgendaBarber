CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "appointments"
ADD CONSTRAINT "appointments_no_active_overlap"
EXCLUDE USING GIST (
    "barberId" WITH =,
    tsrange(
        "startAt",
        "endAt",
        '[)'
    ) WITH &&
)
WHERE (
    "deletedAt" IS NULL
    AND "status" IN (
        'PENDING',
        'CONFIRMED',
        'IN_PROGRESS'
    )
);