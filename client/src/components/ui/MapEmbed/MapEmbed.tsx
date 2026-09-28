import styles from "./MapEmbed.module.css";

/** Mapa embebido de Google sin API key (búsqueda por dirección o coordenadas). */
export const MapEmbed = ({ query, title, height = 360 }: { query: string; title: string; height?: number }) => (
  <div className={styles.wrap} style={{ height }}>
    <iframe title={title} src={`https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
  </div>
);
