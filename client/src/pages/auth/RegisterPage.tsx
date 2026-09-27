import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { paths } from "@/app/router/paths";
import { Button, Container, Input, Section } from "@/components/ui";
import { useAuth } from "@/features/auth/useAuth";
import { errorMessage } from "@/services/http";
import styles from "./AuthPage.module.css";

const schema = z
  .object({
    name: z.string().trim().min(2, "Ingresá tu nombre"),
    email: z.string().email("Email inválido"),
    phone: z.string().regex(/^[\d\s+()-]{8,}$/, "Celular inválido"),
    password: z.string().min(8, "Mínimo 8 caracteres"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Las contraseñas no coinciden" });
type Form = z.infer<typeof schema>;

export default function RegisterPage() {
  const { register: signup } = useAuth();
  const navigate = useNavigate();
  const form = useForm<Form>({ resolver: zodResolver(schema) });
  return (
    <Section className={styles.page}>
      <title>Crear cuenta · Jack el Barbero</title>
      <Container className={styles.box}>
        <h1>Crear cuenta</h1>
        <p>Guardá tus turnos, tu saldo, tus packs y tu historial de cortes.</p>
        <form className={styles.form} noValidate onSubmit={form.handleSubmit(({ confirm, ...f }) => { void confirm; signup.mutate(f, { onSuccess: () => navigate(paths.account) }); })}>
          <Input label="Nombre y apellido" {...form.register("name")} error={form.formState.errors.name?.message} />
          <Input label="Email" type="email" {...form.register("email")} error={form.formState.errors.email?.message} />
          <Input label="Celular" type="tel" {...form.register("phone")} error={form.formState.errors.phone?.message} hint="Si ya reservaste con este número, vinculamos tu historial." />
          <Input label="Contraseña" type="password" autoComplete="new-password" {...form.register("password")} error={form.formState.errors.password?.message} />
          <Input label="Repetí la contraseña" type="password" autoComplete="new-password" {...form.register("confirm")} error={form.formState.errors.confirm?.message} />
          {signup.isError && <p className={styles.error} role="alert">{errorMessage(signup.error)}</p>}
          <Button type="submit" size="lg" loading={signup.isPending}>Crear cuenta</Button>
        </form>
        <p className={styles.alt}>¿Ya tenés cuenta? <Link to={paths.login}>Ingresá</Link></p>
      </Container>
    </Section>
  );
}
