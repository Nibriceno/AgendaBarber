export type Category = {
  id: number;
  name: string;
  description: string | null;
  displayOrder: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateCategoryInput = {
  name: string;
  description?: string;
  displayOrder?: number;
};

export type UpdateCategoryInput =
  Partial<CreateCategoryInput>;