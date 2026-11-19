import { Container, Section } from "@/components/ui";
import { SecurityCard } from "./SecurityCard";

/** Pantalla previa al panel: administradores y encargados deben activar la verificación en dos pasos antes de usarlo. */
export default function Enroll2faPage() {
  return (
    <Section>
      <title>Activá la verificación en dos pasos · Jack el Barbero</title>
      <Container narrow>
        <h1>Activá la verificación en dos pasos</h1>
        <p>Por seguridad, las cuentas de administración necesitan un código de tu celular además de la contraseña. Activalo y volvé a ingresar.</p>
        <SecurityCard />
      </Container>
    </Section>
  );
}
