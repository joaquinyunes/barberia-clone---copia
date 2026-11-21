import { env } from "../../config/env.js";
import { logger } from "../logger.js";

export interface OutgoingMessage {
  /** Celular en formato internacional, solo dígitos. */
  to: string;
  text: string;
  kind: "waitlist_offer" | "reminder" | "claim_code";
}

export interface Notifier {
  send(message: OutgoingMessage): Promise<void>;
}

/**
 * Canal por defecto: no envía nada, solo deja constancia (sin el texto ni el número completo).
 * shortcut: para mandar WhatsApp de verdad hay que implementar `Notifier` con la API oficial
 * y registrarla con `setNotifier` al arrancar; las credenciales irían en variables nuevas de DEPLOY.md.
 */
const logNotifier: Notifier = {
  async send(m) {
    logger.info({ kind: m.kind, to: `…${m.to.slice(-4)}` }, "aviso sin canal configurado (no enviado)");
  },
};

let current: Notifier = logNotifier;
export const setNotifier = (n: Notifier) => {
  current = n;
};
/** En DEMO nada sale de verdad: se registra en el log y listo. */
export const notify = (m: OutgoingMessage) => (env.DEMO_MODE ? logNotifier.send(m) : current.send(m));
