"use client";

import { useCallback, useEffect, useState } from "react";

import { getServices } from "../api/services.api";
import type { Service } from "../types/service.types";

type UseServicesResult = {
  services: Service[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useServices(): UseServicesResult {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadServices = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getServices();

      setServices(data);
    } catch (error) {
      console.error("Error loading services:", error);

      setError("No fue posible cargar los servicios.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadServices();
  }, [loadServices]);

  return {
    services,
    loading,
    error,
    refresh: loadServices,
  };
}