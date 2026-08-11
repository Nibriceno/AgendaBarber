import { api } from '../api/axios';

export type Category = {
  id: number;
  businessId: number;
  name: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
};

export async function getCategories() {
  const response =
    await api.get<Category[]>(
      '/categories',
    );

  return response.data;
}