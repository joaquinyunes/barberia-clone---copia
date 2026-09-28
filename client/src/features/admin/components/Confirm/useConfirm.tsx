import { useState, type ReactNode } from "react";
import { Button, Input, Modal } from "@/components/ui";

/**
 * Confirmación con motivo opcional (anular movimientos, cancelar turnos, etc.).
 * const { confirm, dialog } = useConfirm(); ... await confirm({...}) → string | null
 */
export function useConfirm() {
  const [state, setState] = useState<{ title: string; body?: ReactNode; reason?: boolean; danger?: boolean; resolve: (v: string | null) => void } | null>(null);
  const [reason, setReason] = useState("");
  const confirm = (opts: { title: string; body?: ReactNode; reason?: boolean; danger?: boolean }) =>
    new Promise<string | null>((resolve) => {
      setReason("");
      setState({ ...opts, resolve });
    });
  const close = (v: string | null) => {
    state?.resolve(v);
    setState(null);
  };
  const dialog = (
    <Modal
      open={!!state}
      onClose={() => close(null)}
      title={state?.title ?? ""}
      size="sm"
      footer={
        <>
          <Button variant="light" onClick={() => close(null)}>Volver</Button>
          <Button variant={state?.danger ? "danger" : "gold"} disabled={state?.reason && reason.trim().length < 3} onClick={() => close(reason || "ok")}>Confirmar</Button>
        </>
      }
    >
      {state?.body}
      {state?.reason && <Input tone="light" label="Motivo" value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />}
    </Modal>
  );
  return { confirm, dialog };
}
