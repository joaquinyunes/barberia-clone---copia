import { logger } from "../logger.js";

export interface OutgoingMessage {
  /** Celular en formato internacional, solo dígitos. */
  to: string;
  text: string;
  kind: "waitlist_offer" | "reminder";
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
export const notify = (m: OutgoingMessage) => current.send(m);
