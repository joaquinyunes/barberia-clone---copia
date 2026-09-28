import { useQuery } from "@tanstack/react-query";
import { catalogApi } from "./catalog.api";

const STALE = 5 * 60_000;

export const useSite = () => useQuery({ queryKey: ["site"], queryFn: catalogApi.site, staleTime: STALE });
export const useLocations = () => useQuery({ queryKey: ["locations"], queryFn: catalogApi.locations, staleTime: STALE });
export const useLocation = (slug?: string) => useQuery({ queryKey: ["location", slug], queryFn: () => catalogApi.location(slug!), enabled: !!slug, staleTime: STALE });
export const useServices = (params?: { category?: string; location?: string }) =>
  useQuery({ queryKey: ["services", params], queryFn: () => catalogApi.services(params), staleTime: STALE });
export const useBarbers = (params?: { location?: string; service?: string }) =>
  useQuery({ queryKey: ["barbers", params], queryFn: () => catalogApi.barbers(params), staleTime: STALE, enabled: !params || !!params.location });
export const useShop = () => useQuery({ queryKey: ["shop"], queryFn: catalogApi.shop, staleTime: STALE });
export const useProduct = (slug?: string) => useQuery({ queryKey: ["product", slug], queryFn: () => catalogApi.product(slug!), enabled: !!slug });
