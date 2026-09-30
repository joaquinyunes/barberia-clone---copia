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
  const [state, setState] = useState({ src, url: src, failed: !src });
  if (state.src !== src) setState({ src, url: src, failed: !src }); // cambió la imagen: se reintenta desde cero

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
  return <img src={state.url} alt={alt} loading="lazy" decoding="async" className={cx(styles.img, className)} style={{ aspectRatio: ratio }} onError={onError} {...rest} />;
}
