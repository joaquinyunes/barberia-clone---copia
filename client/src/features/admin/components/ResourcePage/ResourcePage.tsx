import { useEffect, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { IoAdd, IoSearch } from "react-icons/io5";
import { Button, DataTable, Modal, type Column } from "@/components/ui";
import { adminApi } from "../../admin.api";
import { useAdminAction } from "../../hooks/useAdmin";
import { FormFields, type FieldDef } from "../FormFields/FormFields";
import { toFormValues, toPayload } from "../FormFields/formValues";
import { PageHeader } from "../PageHeader/PageHeader";
import styles from "./ResourcePage.module.css";

export interface ResourceConfig<T extends { _id: string }> {
  title: string;
  subtitle?: ReactNode;
  resource: string; // ej. "suppliers"
  singular: string; // ej. "proveedor"
  columns: Column<T>[];
  fields: FieldDef[];
  defaults?: Record<string, unknown>;
  searchPlaceholder?: string;
  filters?: ReactNode;
  params?: Record<string, unknown>;
  transform?: (payload: Record<string, unknown>, row?: T) => Record<string, unknown>;
  toForm?: (row: T) => Record<string, unknown>;
  rowActions?: (row: T) => ReactNode;
  headerActions?: ReactNode;
  onRowClick?: (row: T) => void;
  canDelete?: boolean;
  children?: ReactNode;
}

/** ABM genérico: listado con búsqueda + alta/edición en modal + baja con confirmación. */
export function ResourcePage<T extends { _id: string }>(cfg: ResourceConfig<T>) {
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<T | "new" | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setQ(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const params = { ...cfg.params, search: q || undefined, limit: 200 };
  const { data, isLoading } = useQuery({ queryKey: ["admin", cfg.resource, params], queryFn: () => adminApi.list<T>(cfg.resource, params) });
  const form = useForm<Record<string, unknown>>();

  useEffect(() => {
    if (editing) form.reset(editing === "new" ? { ...toFormValues(cfg.fields), ...cfg.defaults } : toFormValues(cfg.fields, (cfg.toForm ? cfg.toForm(editing as T) : editing) as unknown as Record<string, unknown>));
  }, [editing]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useAdminAction(
    (values: Record<string, unknown>) => {
      const row = editing === "new" ? undefined : (editing as T);
      let payload = toPayload(cfg.fields, values);
      if (cfg.transform) payload = cfg.transform(payload, row);
      return row ? adminApi.update(cfg.resource, row._id, payload) : adminApi.create(cfg.resource, payload);
    },
    { success: editing === "new" ? `Se creó el ${cfg.singular}` : "Cambios guardados", onSuccess: () => setEditing(null) },
  );
  const remove = useAdminAction((id: string) => adminApi.remove(cfg.resource, id), { success: `Se dio de baja el ${cfg.singular}`, onSuccess: () => setEditing(null) });

  const columns: Column<T>[] = [
    ...cfg.columns,
    {
      key: "_actions",
      header: "",
      align: "right",
      render: (row) => (
        <div className={styles.rowActions} onClick={(e) => e.stopPropagation()}>
          {cfg.rowActions?.(row)}
          <Button size="sm" variant="light" onClick={() => setEditing(row)}>Editar</Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={cfg.title}
        subtitle={cfg.subtitle}
        actions={
          <>
            {cfg.headerActions}
            <Button icon={<IoAdd />} onClick={() => setEditing("new")}>Nuevo {cfg.singular}</Button>
          </>
        }
      />
      <div className={styles.toolbar}>
        <label className={styles.search}>
          <IoSearch />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={cfg.searchPlaceholder ?? "Buscar…"} aria-label="Buscar" />
        </label>
        {cfg.filters}
        <span className={styles.count}>{data?.total ?? 0} registros</span>
      </div>
      {cfg.children}
      <DataTable columns={columns} rows={data?.items} loading={isLoading} rowKey={(r) => r._id} onRowClick={cfg.onRowClick ?? ((r) => setEditing(r))} />

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === "new" ? `Nuevo ${cfg.singular}` : `Editar ${cfg.singular}`}
        size="lg"
        footer={
          <>
            {editing && editing !== "new" && cfg.canDelete !== false && (
              <Button variant="ghost" className={styles.delete} onClick={() => window.confirm(`¿Dar de baja este ${cfg.singular}?`) && remove.mutate((editing as T)._id)}>Dar de baja</Button>
            )}
            <Button variant="light" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button loading={save.isPending} onClick={form.handleSubmit((v) => save.mutate(v))}>Guardar</Button>
          </>
        }
      >
        <form onSubmit={form.handleSubmit((v) => save.mutate(v))}>
          <FormFields fields={cfg.fields} form={form} />
        </form>
      </Modal>
    </>
  );
}
