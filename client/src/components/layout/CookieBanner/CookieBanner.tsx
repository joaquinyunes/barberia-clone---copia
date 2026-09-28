import { Link } from "react-router-dom";
import { paths } from "@/app/router/paths";
import { Button } from "@/components/ui";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import styles from "./CookieBanner.module.css";

export function CookieBanner() {
  const [accepted, setAccepted] = useLocalStorage("jeb-cookies", false);
  if (accepted) return null;
  return (
    <div className={styles.banner} role="region" aria-label="Aviso de cookies">
      <p>
        Usamos cookies propias para recordar tu carrito y tu sesión. Nada de publicidad invasiva.{" "}
        <Link to={paths.legal("privacidad")}>Más info</Link>
      </p>
      <Button size="sm" onClick={() => setAccepted(true)}>Entendido</Button>
    </div>
  );
}
