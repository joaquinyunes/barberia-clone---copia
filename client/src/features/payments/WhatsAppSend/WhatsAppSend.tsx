import { useState } from "react";
import { IoLogoWhatsapp } from "react-icons/io5";
import { Button, toast } from "@/components/ui";
import { errorMessage } from "@/services/http";
import { paymentsApi, type PaymentKind, type WhatsAppPayload } from "../payments.api";
import { shareToWhatsApp } from "../shareToWhatsApp";
import styles from "./WhatsAppSend.module.css";

/** Botón verde: arma el mensaje con todos los datos (lo genera el servidor) y lo abre en WhatsApp. */
export function WhatsAppSend({ kind, code, token, file, onSent }: { kind: PaymentKind; code: string; token: string; file?: File | null; onSent?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState<WhatsAppPayload>();
  const send = async () => {
    setLoading(true);
    try {
      const data = payload ?? (await paymentsApi.whatsapp(kind, code, token));
      setPayload(data);
      const result = await shareToWhatsApp({ url: data.url, text: data.text, file });
      if (result !== "cancelled") onSent?.();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className={styles.wrap}>
      <Button variant="whatsapp" size="lg" block onClick={send} loading={loading} icon={<IoLogoWhatsapp size={22} />}>
        Enviar {kind === "bookings" ? "reserva" : "pedido"} por WhatsApp
      </Button>
      {payload && (
        <details className={styles.preview}>
          <summary>Ver el mensaje que se envía</summary>
          <pre>{payload.text}</pre>
          <a href={payload.url} target="_blank" rel="noopener noreferrer">¿No se abrió WhatsApp? Tocá acá</a>
        </details>
      )}
    </div>
  );
}
