import { useState, type ImgHTMLAttributes } from "react";
import { GiRazor } from "react-icons/gi";
import { cx } from "@/utils/format";
import styles from "./Img.module.css";

/**
 * Imagen con carga diferida y un placeholder de marca si el archivo todavía no existe
 * (las fotos se generan con los prompts de docs/08-PROMPTS-IMAGENES.md).
 */
export function Img({ src, alt, className, ratio, ...rest }: ImgHTMLAttributes<HTMLImageElement> & { ratio?: string }) {
  const [failed, setFailed] = useState(!src);
  if (failed) {
    return (
      <div className={cx(styles.fallback, className)} style={{ aspectRatio: ratio }} role="img" aria-label={alt}>
        <GiRazor size={34} />
        <span>{alt}</span>
      </div>
    );
  }
  return <img src={src} alt={alt} loading="lazy" decoding="async" className={cx(styles.img, className)} style={{ aspectRatio: ratio }} onError={() => setFailed(true)} {...rest} />;
}
