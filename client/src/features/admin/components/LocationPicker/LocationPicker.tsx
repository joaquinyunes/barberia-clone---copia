import { useEffect } from "react";
import { useLocations } from "@/features/catalog/useCatalog";
import { useAdminStore } from "../../adminStore";
import styles from "./LocationPicker.module.css";

export function LocationPicker({ allowAll = false }: { allowAll?: boolean }) {
  const { data } = useLocations();
  const { location, setLocation } = useAdminStore();
  useEffect(() => {
    if (!allowAll && data?.length && !data.some((l) => l._id === location)) setLocation(data[0]._id);
  }, [data, location, allowAll, setLocation]);
  return (
    <select className={styles.select} value={location} onChange={(e) => setLocation(e.target.value)} aria-label="Sede">
      {allowAll && <option value="">Todas las sedes</option>}
      {data?.map((l) => <option key={l._id} value={l._id}>{l.name}</option>)}
    </select>
  );
}
