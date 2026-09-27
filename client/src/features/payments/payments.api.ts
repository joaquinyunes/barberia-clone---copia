import { http } from "@/services/http";

export type PaymentKind = "bookings" | "orders";

export interface WhatsAppPayload {
  text: string;
  url: string;
  phone: string;
  receiptUrl: string | null;
}

export const paymentsApi = {
  uploadReceipt: (kind: PaymentKind, code: string, token: string, file: File, onProgress?: (pct: number) => void) => {
    const body = new FormData();
    body.append("receipt", file);
    return http
      .post<{ status: string }>(`/public/${kind}/${code}/receipt`, body, {
        params: { token },
        onUploadProgress: (e) => e.total && onProgress?.(Math.round((e.loaded / e.total) * 100)),
      })
      .then((r) => r.data);
  },
  whatsapp: (kind: PaymentKind, code: string, token: string) => http.get<WhatsAppPayload>(`/public/${kind}/${code}/whatsapp`, { params: { token } }).then((r) => r.data),
  mercadoPago: (kind: "appointment" | "order", code: string, token: string) =>
    http.post<{ initPoint: string }>("/public/mercadopago/preference", { kind, code, token }).then((r) => r.data),
};
