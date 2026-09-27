import { http } from "@/services/http";

export interface OrderPayload {
  items: { kind: "product" | "pack"; id: string; qty: number }[];
  customer: { name: string; phone: string; email?: string };
  location: string;
  recipient?: { name?: string; phone?: string; message?: string };
  notes?: string;
}
export interface OrderResult {
  code: string;
  token: string;
  total: number;
  items: { name: string; qty: number; unitPrice: number }[];
  bank: { alias?: string; cbu?: string; holder?: string };
}

export const shopApi = {
  createOrder: (p: OrderPayload) => http.post<OrderResult>("/public/orders", p).then((r) => r.data),
};
