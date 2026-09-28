import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui";
import { toast } from "@/components/ui";
import { catalogApi } from "./catalog.api";
import { errorMessage } from "@/services/http";
import styles from "./NewsletterForm.module.css";

/** Suscripción: se guarda como mensaje de contacto etiquetado para el equipo. */
export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await catalogApi.contact({ name: "Suscripción newsletter", email, message: "Quiero recibir novedades y beneficios de Jack el Barbero." });
      toast.success("¡Listo! Te vamos a escribir con novedades.");
      setEmail("");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };
  return (
    <form className={styles.form} onSubmit={submit}>
      <label htmlFor="newsletter-email" className="visually-hidden">Email</label>
      <input id="newsletter-email" type="email" required placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      <Button type="submit" loading={loading}>Suscribirme</Button>
    </form>
  );
}
