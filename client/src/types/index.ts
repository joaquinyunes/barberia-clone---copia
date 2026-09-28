export interface OpeningHours {
  day: number;
  open?: string;
  close?: string;
  closed?: boolean;
}
export interface Location {
  _id: string;
  slug: string;
  name: string;
  tagline?: string;
  address: string;
  neighborhood?: string;
  city?: string;
  geo?: { lat: number; lng: number };
  phone?: string;
  whatsapp: string;
  email?: string;
  description?: string;
  features?: string[];
  images?: string[];
  heroImage?: string;
  openingHours: OpeningHours[];
  bankAlias?: string;
  bankHolder?: string;
  depositAmount?: number;
  isVip?: boolean;
  active?: boolean;
  barbers?: Barber[];
}
export interface Service {
  _id: string;
  slug: string;
  name: string;
  category: string;
  description?: string;
  includes?: string[];
  durationMin: number;
  price: number;
  supplyCost?: number;
  commission?: { type: "percent" | "fixed"; value: number } | null;
  priceHistory?: { price: number; from: string; changedBy?: string }[];
  locations?: string[];
  image?: string;
  featured?: boolean;
  active?: boolean;
}
export interface Barber {
  _id: string;
  name: string;
  slug: string;
  photo?: string;
  bio?: string;
  specialties?: string[];
  instagram?: string;
  status?: string;
  location?: string | Location;
}
export interface Product {
  _id: string;
  name: string;
  slug?: string;
  sku?: string;
  kind: "sale" | "operational" | "giftcard";
  category?: string;
  description?: string;
  images?: string[];
  cost?: number;
  price: number;
  stock: number;
  minStock?: number;
  unit?: string;
  giftValue?: number;
  shop?: boolean;
  featured?: boolean;
  active?: boolean;
  supplier?: { _id: string; name: string } | string;
  related?: Product[];
}
export interface PackPlan {
  _id: string;
  name: string;
  description?: string;
  price: number;
  validityDays?: number;
  items: { service?: string; category?: string; label?: string; quantity: number }[];
}
export interface MembershipPlan extends PackPlan {
  productDiscountPct?: number;
  priorityBooking?: boolean;
  priceLock?: boolean;
}
export interface Paged<T> {
  items: T[];
  total?: number;
  page?: number;
  pages?: number;
}
export interface Movement {
  _id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  concept: string;
  date: string;
  method?: string;
  createdByName?: string;
  reversed?: boolean;
  ownerType?: string;
  owner?: { _id: string; name: string } | string;
}
export interface Appointment {
  _id: string;
  code: string;
  status: string;
  startsAt: string;
  endsAt: string;
  price: number;
  discount: number;
  discountReason?: string;
  total: number;
  paidAmount: number;
  pendingAmount?: number;
  commission?: number;
  tip?: number;
  notes?: string;
  source?: string;
  deposit: { required: number; paid: number; method?: string; receiptPath?: string; uploadedAt?: string; rejectedReason?: string };
  cancellation?: { by: string; reason?: string; at?: string; noticeHours?: number; depositRetained?: boolean };
  client: { _id: string; name: string; phone: string; tier?: string };
  barber: { _id: string; name: string };
  service: { _id: string; name: string; category?: string; durationMin?: number };
  location: { _id: string; name: string; address?: string; whatsapp?: string };
  whatsappSentAt?: string;
}
