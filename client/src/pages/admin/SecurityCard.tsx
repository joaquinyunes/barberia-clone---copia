import { useState } from "react";
import { Button, Card, Input } from "@/components/ui";
import { http } from "@/services/http";
import { useAuth } from "@/features/auth/useAuth";
import { useAdminAction } from "@/features/admin/hooks/useAdmin";
import styles from "./admin.module.css";

/** Verificación en dos pasos (TOTP) de la cuenta que está usando el panel. */
export function SecurityCard() {
  const { user } = useAuth();
  const [setup, setSetup] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const enabled = (user as { totpEnabled?: boolean } | null)?.totpEnabled;
  const start = useAdminAction(() => http.post<{ secret: string; otpauthUrl: string }>("/auth/2fa/setup", { password }).then((r) => r.data), { onSuccess: setSetup });
  const enable = useAdminAction(() => http.post("/auth/2fa/enable", { code }), { success: "Verificación en dos pasos activada. Volvé a ingresar.", onSuccess: () => window.location.assign("/ingresar") });
  const disable = useAdminAction(() => http.post("/auth/2fa/disable", { code, password }), { success: "Verificación en dos pasos desactivada", onSuccess: () => window.location.reload() });
  return (
    <Card tone="light" title="Seguridad de tu cuenta">
      <p className={styles.small}>
        {enabled ? "La verificación en dos pasos está activa: al ingresar te pedimos un código de tu app (Google Authenticator, Authy, 1Password…)." : "Recomendado para el dueño y el encargado: además de la contraseña, el ingreso pide un código de 6 dígitos de tu celular."}
      </p>
      {!enabled && !setup && (
        <div className={styles.formGrid}>
          <Input tone="light" type="password" label="Tu contraseña (para confirmar que sos vos)" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button loading={start.isPending} disabled={!password} onClick={() => start.mutate(undefined)}>Activar verificación en dos pasos</Button>
        </div>
      )}
      {!enabled && setup && (
        <div className={styles.formGrid}>
          <p className={styles.full}>
            1. En tu app de autenticación agregá una cuenta <strong>con clave manual</strong> y pegá esta clave: <code>{setup.secret}</code>
          </p>
          <Input tone="light" label="2. Código de 6 dígitos que muestra la app" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} />
          <Button loading={enable.isPending} onClick={() => enable.mutate(undefined)}>Confirmar y activar</Button>
        </div>
      )}
      {enabled && (
        <div className={styles.formGrid}>
          <Input tone="light" type="password" label="Tu contraseña" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Input tone="light" label="Código actual" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} />
          <Button variant="outline" loading={disable.isPending} onClick={() => disable.mutate(undefined)}>Desactivar</Button>
        </div>
      )}
    </Card>
  );
}
