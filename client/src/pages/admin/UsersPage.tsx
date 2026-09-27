import { useState } from "react";
import { Badge, Button, Card, Checkbox, DataTable, Input, Modal, Select } from "@/components/ui";
import { adminApi } from "@/features/admin/admin.api";
import { PageHeader } from "@/features/admin/components/PageHeader/PageHeader";
import { useAdminAction, useAdminQuery } from "@/features/admin/hooks/useAdmin";
import type { Paged } from "@/types";
import { dateTime } from "@/utils/format";
import styles from "./admin.module.css";

interface User { _id: string; name: string; email: string; role: string; extraPermissions: string[]; active: boolean; barber?: { _id: string; name: string }; lastLoginAt?: string }
interface Meta { permissions: Record<string, string>; roles: Record<string, string>; rolePermissions: Record<string, string[]> }

export default function UsersPage() {
  const { data: meta } = useAdminQuery<Meta>("users/meta");
  const { data, isLoading } = useAdminQuery<{ items: User[] }>("users");
  const [editing, setEditing] = useState<User | "new" | null>(null);
  return (
    <>
      <PageHeader title="Usuarios y permisos" subtitle="Cada usuario ve solamente lo que le corresponde. Se pueden sumar permisos puntuales a un rol." actions={<Button onClick={() => setEditing("new")}>Nuevo usuario</Button>} />
      <Card tone="light" padded={false}>
        <DataTable loading={isLoading} rows={data?.items} rowKey={(u) => u._id} onRowClick={setEditing} columns={[
          { key: "n", header: "Usuario", render: (u) => <><strong>{u.name}</strong><div className={styles.small}>{u.email}</div></> },
          { key: "r", header: "Rol", render: (u) => <Badge tone="gold">{meta?.roles[u.role]}</Badge> },
          { key: "b", header: "Barbero vinculado", render: (u) => u.barber?.name ?? "—", hideOnMobile: true },
          { key: "e", header: "Permisos extra", render: (u) => u.extraPermissions.length || "—", hideOnMobile: true },
          { key: "l", header: "Último ingreso", render: (u) => dateTime(u.lastLoginAt), hideOnMobile: true },
          { key: "a", header: "", render: (u) => (!u.active ? <Badge tone="danger">Inactivo</Badge> : null) },
        ]} />
      </Card>
      {meta && (
        <Card tone="light" title="Qué puede hacer cada rol" style={{ marginTop: "1.5rem" }}>
          <DataTable rows={Object.keys(meta.permissions)} rowKey={(p) => p} columns={[
            { key: "p", header: "Permiso", render: (p) => meta.permissions[p] },
            ...Object.keys(meta.roles).filter((r) => r !== "customer").map((r) => ({ key: r, header: meta.roles[r], align: "center" as const, render: (p: string) => (meta.rolePermissions[r].includes(p) ? "✓" : "") })),
          ]} />
        </Card>
      )}
      {editing && meta && <UserModal user={editing === "new" ? undefined : editing} meta={meta} onClose={() => setEditing(null)} />}
    </>
  );
}

function UserModal({ user, meta, onClose }: { user?: User; meta: Meta; onClose: () => void }) {
  const { data: barbers } = useAdminQuery<Paged<{ _id: string; name: string }>>("barbers", { limit: 100 });
  const [f, setF] = useState({ name: user?.name ?? "", email: user?.email ?? "", role: user?.role ?? "reception", barber: user?.barber?._id ?? "", password: "", active: user?.active ?? true, extraPermissions: user?.extraPermissions ?? [] });
  const base = meta.rolePermissions[f.role] ?? [];
  const save = useAdminAction(
    () => {
      const payload = { name: f.name, email: f.email, role: f.role, barber: f.role === "barber" ? f.barber || null : null, active: f.active, extraPermissions: f.extraPermissions, ...(f.password ? { password: f.password } : {}) };
      return user ? adminApi.patch(`users/${user._id}`, payload) : adminApi.post("users", payload);
    },
    { success: "Usuario guardado", onSuccess: onClose },
  );
  return (
    <Modal open onClose={onClose} title={user ? `Editar ${user.name}` : "Nuevo usuario"} size="lg" footer={<Button loading={save.isPending} onClick={() => save.mutate(undefined)}>Guardar</Button>}>
      <div className={styles.stack}>
        <div className={styles.formGrid}>
          <Input tone="light" label="Nombre" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <Input tone="light" label="Email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          <Select tone="light" label="Rol" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} options={Object.entries(meta.roles).filter(([k]) => k !== "customer").map(([value, label]) => ({ value, label }))} />
          {f.role === "barber" && <Select tone="light" label="Barbero" placeholder="Vincular" value={f.barber} onChange={(e) => setF({ ...f, barber: e.target.value })} options={(barbers?.items ?? []).map((b) => ({ value: b._id, label: b.name }))} />}
          <Input tone="light" label={user ? "Nueva contraseña (opcional)" : "Contraseña"} type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} hint="Mínimo 8 caracteres" />
          <Checkbox tone="light" label="Usuario activo" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />
        </div>
        <h4>Permisos</h4>
        <div className={styles.formGrid}>
          {Object.entries(meta.permissions).map(([p, label]) => (
            <Checkbox key={p} tone="light" label={label} disabled={base.includes(p)} checked={base.includes(p) || f.extraPermissions.includes(p)}
              onChange={(e) => setF({ ...f, extraPermissions: e.target.checked ? [...f.extraPermissions, p] : f.extraPermissions.filter((x) => x !== p) })} />
          ))}
        </div>
        <p className={styles.small}>Los permisos grisados vienen con el rol. Los demás se pueden sumar a este usuario puntualmente.</p>
      </div>
    </Modal>
  );
}
