/**
 * Envía la reserva al WhatsApp de la sede.
 * - En celulares con Web Share API (nivel 2) comparte el comprobante como archivo + el texto.
 * - Si no se puede, abre wa.me con el texto (que ya incluye un link seguro al comprobante).
 */
export async function shareToWhatsApp(opts: { url: string; text: string; file?: File | null }) {
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isMobile && opts.file && nav.share && nav.canShare?.({ files: [opts.file], text: opts.text })) {
    try {
      await nav.share({ files: [opts.file], text: opts.text });
      return "shared" as const;
    } catch (err) {
      if ((err as DOMException).name === "AbortError") return "cancelled" as const;
      // si falla, seguimos con el link
    }
  }
  window.open(opts.url, "_blank", "noopener,noreferrer");
  return "link" as const;
}
