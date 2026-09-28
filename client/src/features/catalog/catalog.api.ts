import { http } from "@/services/http";
import type { Barber, Location, MembershipPlan, PackPlan, Product, Service } from "@/types";

export interface SiteInfo {
  businessName: string;
  whatsapp: string;
  cancellationHours: number;
  holdMinutes: number;
  mercadoPago: boolean;
  referredDiscountPct: number;
}

export const catalogApi = {
  site: () => http.get<SiteInfo>("/public/site").then((r) => r.data),
  locations: () => http.get<Location[]>("/public/locations").then((r) => r.data),
  location: (slug: string) => http.get<Location>(`/public/locations/${slug}`).then((r) => r.data),
  services: (params?: { category?: string; location?: string }) => http.get<Service[]>("/public/services", { params }).then((r) => r.data),
  barbers: (params?: { location?: string; service?: string }) => http.get<Barber[]>("/public/barbers", { params }).then((r) => r.data),
  shop: () => http.get<{ products: Product[]; packs: PackPlan[]; memberships: MembershipPlan[] }>("/public/shop").then((r) => r.data),
  product: (slug: string) => http.get<Product>(`/public/shop/products/${slug}`).then((r) => r.data),
  contact: (data: Record<string, unknown>) => http.post("/public/contact", data).then((r) => r.data),
};
