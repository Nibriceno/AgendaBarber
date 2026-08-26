export type BusinessBookingSettings = {
  id: number;
  name: string;
  cancellationMinimumMinutes: number;
  rescheduleMinimumMinutes: number;
  allowClientCancellation: boolean;
  allowClientRescheduling: boolean;
  cancellationPolicy: string | null;
  noShowGraceMinutes: number;
};

export type UpdateBusinessBookingSettings = Pick<
  BusinessBookingSettings,
  | "cancellationMinimumMinutes"
  | "rescheduleMinimumMinutes"
  | "allowClientCancellation"
  | "allowClientRescheduling"
  | "cancellationPolicy"
  | "noShowGraceMinutes"
>;
