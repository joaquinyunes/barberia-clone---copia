import { useSite } from "@/features/catalog/useCatalog";

/** Cartel fijo en el entorno de demo: deja claro que los datos son de ejemplo y que no se cobra ni se envía nada. */
export function DemoBanner() {
  const { data } = useSite();
  if (!data?.demo) return null;
  return (
    <div role="status" style={{ position: "fixed", insetInline: 0, bottom: 0, zIndex: 9999, background: "#b42318", color: "#fff", textAlign: "center", padding: "6px 12px", fontWeight: 700, fontSize: 14 }}>
      DEMO · datos de ejemplo · no se cobra ni se envía ningún mensaje
    </div>
  );
}
