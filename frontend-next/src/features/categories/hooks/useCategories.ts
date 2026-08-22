"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { getCategories } from "../api/categories.api";

import type {
  Category,
} from "../types/category.types";

type UseCategoriesResult = {
  categories: Category[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useCategories(): UseCategoriesResult {
  const [categories, setCategories] =
    useState<Category[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const loadCategories =
    useCallback(async () => {
      setLoading(true);
      setError(null);

      try {
        const data =
          await getCategories();

        setCategories(data);
      } catch (error) {
        console.error(
          "Error loading categories:",
          error,
        );

        setError(
          "No fue posible cargar las categorías.",
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  return {
    categories,
    loading,
    error,
    refresh: loadCategories,
  };
}