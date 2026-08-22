import type {
  Service,
} from "@/features/services/types/service.types";

export type BarberService = {
  id: number;

  barberId: number;
  serviceId: number;

  customDurationMinutes:
    | number
    | null;

  customPrice:
    | string
    | number
    | null;

  isActive: boolean;

  createdAt?: string;
  updatedAt?: string;

  service: Service;
};

export type CreateBarberServiceInput = {
  barberId: number;
  serviceId: number;

  customPrice?: number;
  customDurationMinutes?: number;

  isActive?: boolean;
};

export type UpdateBarberServiceInput = {
  barberId?: number;
  serviceId?: number;

  customPrice?:
    | number
    | null;

  customDurationMinutes?:
    | number
    | null;

  isActive?: boolean;
};