import apiClient from "@/lib/api/client";

import type {
  Category,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "../types/category.types";

export async function getCategories(): Promise<Category[]> {
  const response =
    await apiClient.get<Category[]>("/categories");

  return response.data;
}

export async function createCategory(
  data: CreateCategoryInput,
): Promise<Category> {
  const response =
    await apiClient.post<Category>(
      "/categories",
      data,
    );

  return response.data;
}

export async function updateCategory(
  categoryId: number,
  data: UpdateCategoryInput,
): Promise<Category> {
  const response =
    await apiClient.patch<Category>(
      `/categories/${categoryId}`,
      data,
    );

  return response.data;
}

export async function deleteCategory(
  categoryId: number,
): Promise<void> {
  await apiClient.delete(
    `/categories/${categoryId}`,
  );
}