/** Link "click to chat" de WhatsApp con el texto ya escrito. */
export const waLink = (phone: string, text: string) =>
  `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
