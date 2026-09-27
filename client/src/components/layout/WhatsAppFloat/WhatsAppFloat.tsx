import { IoLogoWhatsapp } from "react-icons/io5";
import { useSite } from "@/features/catalog/useCatalog";
import { waHref } from "@/utils/format";
import styles from "./WhatsAppFloat.module.css";

export function WhatsAppFloat() {
  const { data } = useSite();
  if (!data) return null;
  return (
    <a className={styles.fab} href={waHref(data.whatsapp, "¡Hola Jack el Barbero! Quería hacer una consulta.")} target="_blank" rel="noopener noreferrer" aria-label="Escribinos por WhatsApp">
      <IoLogoWhatsapp size={30} />
    </a>
  );
}
