export type Service = {
  id: number;
  name: string;
  description: string | null;

  categoryId: number;
  durationMinutes: number;

  price: string | number;

  createdAt?: string;
  updatedAt?: string;
};

export type CreateServiceInput = {
  name: string;
  description?: string;

  categoryId: number;
  durationMinutes: number;

  price: number;
};

export type UpdateServiceInput =
  Partial<CreateServiceInput>;