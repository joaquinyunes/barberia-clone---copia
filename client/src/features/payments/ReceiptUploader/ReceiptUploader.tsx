import { useRef, useState, type DragEvent } from "react";
import { IoCloudUploadOutline, IoDocumentTextOutline } from "react-icons/io5";
import { cx } from "@/utils/format";
import styles from "./ReceiptUploader.module.css";

const ACCEPT = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX = 5 * 1024 * 1024;

export function ReceiptUploader({ file, onFile, progress, error }: { file: File | null; onFile: (f: File | null) => void; progress?: number; error?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [localError, setLocalError] = useState<string>();

  const pick = (f?: File | null) => {
    setLocalError(undefined);
    if (!f) return;
    if (!ACCEPT.includes(f.type)) return setLocalError("Subí una imagen (JPG, PNG, WEBP) o un PDF.");
    if (f.size > MAX) return setLocalError("El archivo supera los 5 MB.");
    onFile(f);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    pick(e.dataTransfer.files?.[0]);
  };
  const preview = file && file.type.startsWith("image/") ? URL.createObjectURL(file) : null;

  return (
    <div>
      <div
        className={cx(styles.drop, drag && styles.drag, file && styles.has)}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        onClick={() => input.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
      >
        {file ? (
          <div className={styles.file}>
            {preview ? <img src={preview} alt="Vista previa del comprobante" onLoad={() => URL.revokeObjectURL(preview)} /> : <IoDocumentTextOutline size={40} />}
            <div>
              <strong>{file.name}</strong>
              <span>{(file.size / 1024).toFixed(0)} KB · tocá para cambiarlo</span>
            </div>
          </div>
        ) : (
          <>
            <IoCloudUploadOutline size={38} />
            <strong>Subí el comprobante</strong>
            <span>Arrastralo acá o tocá para elegirlo · JPG, PNG o PDF · máx. 5 MB</span>
          </>
        )}
        <input ref={input} type="file" accept={ACCEPT.join(",")} hidden onChange={(e) => pick(e.target.files?.[0])} />
      </div>
      {progress !== undefined && progress > 0 && progress < 100 && <div className={styles.progress}><span style={{ width: `${progress}%` }} /></div>}
      {(localError || error) && <p className={styles.error} role="alert">{localError ?? error}</p>}
    </div>
  );
}
