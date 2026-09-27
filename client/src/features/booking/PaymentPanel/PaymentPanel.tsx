import { useState } from "react";
import { IoCheckmarkCircle, IoTimeOutline } from "react-icons/io5";
import { Button, toast } from "@/components/ui";
import { BankTransferInfo } from "@/features/payments/BankTransferInfo/BankTransferInfo";
import { ReceiptUploader } from "@/features/payments/ReceiptUploader/ReceiptUploader";
import { WhatsAppSend } from "@/features/payments/WhatsAppSend/WhatsAppSend";
import { paymentsApi, type PaymentKind } from "@/features/payments/payments.api";
import { useSite } from "@/features/catalog/useCatalog";
import { errorMessage } from "@/services/http";
import { time } from "@/utils/format";
import styles from "./PaymentPanel.module.css";

interface Props {
  kind: PaymentKind;
  code: string;
  token: string;
  amount: number;
  bank: { alias?: string; cbu?: string; holder?: string };
  holdExpiresAt?: string;
  initialStatus?: string;
  onDone?: () => void;
}

/**
 * Paso de pago: 1) transferir, 2) subir comprobante, 3) enviar todo por WhatsApp.
 * Con Mercado Pago activo en el servidor, aparece además el botón de pago online.
 */
export function PaymentPanel({ kind, code, token, amount, bank, holdExpiresAt, initialStatus, onDone }: Props) {
  const { data: site } = useSite();
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(initialStatus === "payment_review");
  const [sent, setSent] = useState(false);

  const upload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      await paymentsApi.uploadReceipt(kind, code, token, file, setProgress);
      setUploaded(true);
      toast.success("Comprobante recibido. Ahora envianos todo por WhatsApp.");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const payOnline = async () => {
    try {
      const { initPoint } = await paymentsApi.mercadoPago(kind === "bookings" ? "appointment" : "order", code, token);
      window.location.href = initPoint;
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className={styles.panel}>
      {holdExpiresAt && !uploaded && (
        <p className={styles.hold}><IoTimeOutline /> Te guardamos el horario hasta las <strong>{time(holdExpiresAt)} h</strong>. Si no llega la seña, se libera solo.</p>
      )}

      <ol className={styles.steps}>
        <li className={uploaded ? styles.done : undefined}>
          <h4>1. Transferí {kind === "bookings" ? "la seña" : "el total"}</h4>
          <BankTransferInfo amount={amount} alias={bank.alias} cbu={bank.cbu} holder={bank.holder} concept={code} />
          {site?.mercadoPago && (
            <Button variant="outline" block onClick={payOnline}>O pagar online con Mercado Pago</Button>
          )}
        </li>
        <li className={uploaded ? styles.done : undefined}>
          <h4>2. Subí el comprobante {uploaded && <IoCheckmarkCircle />}</h4>
          {!uploaded ? (
            <>
              <ReceiptUploader file={file} onFile={setFile} progress={progress} />
              <Button block onClick={upload} disabled={!file} loading={uploading}>Subir comprobante</Button>
            </>
          ) : (
            <p className={styles.ok}>¡Listo! Lo revisamos y te confirmamos.</p>
          )}
        </li>
        <li className={sent ? styles.done : undefined}>
          <h4>3. Envianos todo por WhatsApp {sent && <IoCheckmarkCircle />}</h4>
          <p className={styles.help}>Se abre el WhatsApp de la sede con todos los datos {kind === "bookings" ? "del turno" : "del pedido"} y el comprobante. Solo tenés que tocar enviar.</p>
          <WhatsAppSend
            kind={kind}
            code={code}
            token={token}
            file={file}
            onSent={() => {
              setSent(true);
              onDone?.();
            }}
          />
        </li>
      </ol>
    </div>
  );
}
