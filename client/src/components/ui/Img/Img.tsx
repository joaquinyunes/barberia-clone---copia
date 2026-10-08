import { useState, type ImgHTMLAttributes } from "react";
import { GiRazor } from "react-icons/gi";
import { cx } from "@/utils/format";
import styles from "./Img.module.css";

/** Si falta el .webp probamos la versión .svg (los productos de la tienda son ilustraciones vectoriales). */
const svgVersion = (src?: string) => (src?.startsWith("/images/") && src.endsWith(".webp") ? src.replace(/\.webp$/, ".svg") : undefined);

/**
 * Imagen con carga diferida y un placeholder de marca si el archivo no existe.
 * Orden de intento: `src` → misma ruta en .svg → placeholder.
 */
export function Img({ src, alt, className, ratio, ...rest }: ImgHTMLAttributes<HTMLImageElement> & { ratio?: string }) {
  const [state, setState] = useState({ src, url: src, failed: !src, loaded: false });
  if (state.src !== src) setState({ src, url: src, failed: !src, loaded: false }); // cambió la imagen: se reintenta desde cero

  if (state.failed) {
    return (
      <div className={cx(styles.fallback, className)} style={{ aspectRatio: ratio }} role="img" aria-label={alt}>
        <GiRazor size={34} />
        <span>{alt}</span>
      </div>
    );
  }
  const onError = () => {
    const svg = svgVersion(src);
    setState((s) => (svg && s.url !== svg ? { ...s, url: svg } : { ...s, failed: true }));
  };
  // Aparece con un fade al terminar de cargar (en vez de "saltar" de golpe).
  return (
    <img
      src={state.url}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={cx(styles.img, state.loaded && styles.loaded, className)}
      style={{ aspectRatio: ratio }}
      onLoad={() => setState((s) => ({ ...s, loaded: true }))}
      onError={onError}
      {...rest}
    />
  );
}
