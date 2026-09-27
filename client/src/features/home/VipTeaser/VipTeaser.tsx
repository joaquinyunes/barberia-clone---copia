import { paths } from "@/app/router/paths";
import { Button, Img, Reveal } from "@/components/ui";
import styles from "./VipTeaser.module.css";

export function VipTeaser() {
  return (
    <section className={styles.vip}>
      <div className={styles.bg}><Img src="/images/vip/cava-ambiente.webp" alt="" /></div>
      <div className={styles.overlay} />
      <Reveal className={styles.content}>
        <span className={styles.eyebrow}>Recoleta · Subsuelo · Solo con turno</span>
        <h2>La Cava</h2>
        <p>
          Bajás una escalera de hierro y el ruido de la ciudad queda arriba. Sillones Chesterfield, luz baja, un whisky de
          cortesía y dos horas dedicadas a vos. Los rituales más completos de la casa se hacen acá.
        </p>
        <div className={styles.ctas}>
          <Button to={paths.vip} size="lg">Descubrir La Cava</Button>
          <Button to={paths.shop} size="lg" variant="outline">Regalar una experiencia</Button>
        </div>
      </Reveal>
    </section>
  );
}
