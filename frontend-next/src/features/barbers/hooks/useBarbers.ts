"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { getBarbers } from "../api/barbers.api";

import type {
  Barber,
} from "../types/barber.types";

type UseBarbersResult = {
  barbers: Barber[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useBarbers(): UseBarbersResult {
  const [barbers, setBarbers] =
    useState<Barber[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const loadBarbers =
    useCallback(async () => {
      setLoading(true);
      setError(null);

      try {
        const data =
          await getBarbers();

        setBarbers(data);
      } catch (error) {
        console.error(
          "Error loading barbers:",
          error,
        );

        setError(
          "No fue posible cargar el equipo.",
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadBarbers();
  }, [loadBarbers]);

  return {
    barbers,
    loading,
    error,
    refresh: loadBarbers,
  };
}