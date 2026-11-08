import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { paths } from "@/app/router/paths";
import { Button, Container, Input, Section } from "@/components/ui";
import { useAuth } from "@/features/auth/useAuth";
import { errorMessage } from "@/services/http";
import axios from "axios";
import styles from "./AuthPage.module.css";

const schema = z.object({ email: z.string().email("Email inválido"), password: z.string().min(1, "Ingresá tu contraseña"), totp: z.string().optional() });
type Form = z.infer<typeof schema>;

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from;
  const form = useForm<Form>({ resolver: zodResolver(schema) });
  // El servidor pide el código de la app de autenticación (2FA) solo a las cuentas que lo activaron.
  const needsCode = axios.isAxiosError(login.error) && login.error.response?.data?.error?.code === "TOTP_REQUIRED";
  if (user) return <Navigate to={from ?? (user.role === "customer" ? paths.account : paths.admin)} replace />;
  return (
    <Section className={styles.page}>
      <title>Ingresar · Jack el Barbero</title>
      <Container className={styles.box}>
        <h1>Ingresar</h1>
        <p>Clientes y equipo de Jack el Barbero.</p>
        <form
          className={styles.form}
          noValidate
          onSubmit={form.handleSubmit((f) =>
            login.mutate(f, { onSuccess: (s) => navigate(from ?? (s.user.role === "customer" ? paths.account : paths.admin), { replace: true }) }),
          )}
        >
          <Input label="Email" type="email" autoComplete="email" {...form.register("email")} error={form.formState.errors.email?.message} />
          <Input label="Contraseña" type="password" autoComplete="current-password" {...form.register("password")} error={form.formState.errors.password?.message} />
          {needsCode && <Input label="Código de verificación (6 dígitos)" inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus {...form.register("totp")} />}
          {login.isError && !needsCode && <p className={styles.error} role="alert">{errorMessage(login.error)}</p>}
          <Button type="submit" size="lg" loading={login.isPending}>Ingresar</Button>
        </form>
        <p className={styles.alt}>¿No tenés cuenta? <Link to={paths.register}>Registrate</Link></p>
      </Container>
    </Section>
  );
}
