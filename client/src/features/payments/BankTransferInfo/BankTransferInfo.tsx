import { useState } from "react";
import { IoCheckmark, IoCopyOutline } from "react-icons/io5";
import { money } from "@/utils/format";
import styles from "./BankTransferInfo.module.css";

interface Props {
  amount: number;
  alias?: string;
  cbu?: string;
  holder?: string;
  concept: string;
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* portapapeles no disponible */
    }
  };
  return (
    <div className={styles.row}>
      <span>{label}</span>
      <strong>{value}</strong>
      <button type="button" onClick={copy} aria-label={`Copiar ${label}`}>{copied ? <IoCheckmark /> : <IoCopyOutline />}</button>
    </div>
  );
}

export function BankTransferInfo({ amount, alias, cbu, holder, concept }: Props) {
  return (
    <div className={styles.box}>
      <p className={styles.amount}>Transferí <strong>{money(amount)}</strong></p>
      {alias && <CopyRow label="Alias" value={alias} />}
      {cbu && <CopyRow label="CBU / CVU" value={cbu} />}
      {holder && <div className={styles.row}><span>Titular</span><strong>{holder}</strong></div>}
      <CopyRow label="Concepto" value={concept} />
      <p className={styles.help}>Podés pagar desde Mercado Pago, Ualá o cualquier banco. Después subí la captura del comprobante.</p>
    </div>
  );
}
