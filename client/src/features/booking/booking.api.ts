import { http } from "@/services/http";

export interface Availability {
  date: string;
  closed: boolean;
  slots: string[];
  barbers: { barber: { _id: string; name: string; photo?: string }; slots: string[] }[];
}

export interface BookingPayload {
  location: string;
  service: string;
  barber: string;
  date: string;
  time: string;
  customer: { name: string; phone: string; email?: string };
  notes?: string;
  promoCode?: string;
  referralCode?: string;
}

export interface BookingResult {
  code: string;
  token: string;
  status: string;
  startsAt: string;
  holdExpiresAt?: string;
  price: number;
  discount: number;
  discountReason?: string;
  total: number;
  deposit: number;
  service: { name: string; durationMin: number };
  barber: { name: string };
  location: { name: string; address: string; whatsapp: string };
  bank: { alias?: string; cbu?: string; holder?: string };
  referralCode?: string;
}

export const bookingApi = {
  availability: (p: { location: string; service: string; date: string; barber?: string }) =>
    http.get<Availability>("/public/availability", { params: p }).then((r) => r.data),
  validatePromo: (p: { code: string; service: string; date: string; time: string }) =>
    http.post<{ valid: boolean; name?: string; discount: number; total: number }>("/public/promotions/validate", p).then((r) => r.data),
  create: (p: BookingPayload) => http.post<BookingResult>("/public/bookings", p).then((r) => r.data),
  get: (code: string, token: string) => http.get(`/public/bookings/${code}`, { params: { token } }).then((r) => r.data),
  cancel: (code: string, token: string) => http.post<{ status: string; depositRetained?: boolean }>(`/public/bookings/${code}/cancel`, {}, { params: { token } }).then((r) => r.data),
  reschedule: (code: string, token: string, date: string, time: string) =>
    http.post(`/public/bookings/${code}/reschedule`, { date, time }, { params: { token } }).then((r) => r.data),
  calendarUrl: (code: string, token: string) => `${http.defaults.baseURL}/public/bookings/${code}/calendar.ics?token=${encodeURIComponent(token)}`,
};
