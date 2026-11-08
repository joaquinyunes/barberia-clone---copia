import { env } from "../../config/env.js";

/**
 * B8 — Factura electrónica (AFIP/ARCA): SOLO la interfaz. Este sistema no emite facturas fiscales por sí mismo;
 * se conecta a un proveedor certificado (Facturante, TusFacturas, Afip SDK, Contabilium…) que firma con el CUIT del cliente.
 * Para conectar uno: implementar `FacturacionProvider`, registrarlo en `PROVIDERS` y poner FACTURACION_PROVIDER=<nombre>.
 */
export interface VentaFacturable {
  /** Código interno del turno o pedido (idempotencia: el proveedor no debe emitir dos veces la misma). */
  referencia: string;
  fecha: Date;
  /** Importe total con IVA incluido, en pesos. */
  total: number;
  concepto: string;
  comprador: { nombre: string; documento?: string; email?: string; condicionIva?: "consumidor_final" | "responsable_inscripto" | "monotributo" | "exento" };
}

export interface Comprobante {
  estado: "emitido" | "no_fiscal";
  tipo: string;
  numero: string;
  /** Código de autorización fiscal (CAE) cuando lo emite un proveedor certificado. */
  cae?: string;
  pdfUrl?: string;
}

export interface FacturacionProvider {
  readonly nombre: string;
  emitir(venta: VentaFacturable): Promise<Comprobante>;
}

/** Sin proveedor: deja un comprobante interno NO fiscal, para que el flujo de cobro no dependa de AFIP. */
export const sinProveedor: FacturacionProvider = {
  nombre: "none",
  async emitir(venta) {
    return { estado: "no_fiscal", tipo: "Comprobante interno", numero: `INT-${venta.referencia}` };
  },
};

const PROVIDERS: Record<string, FacturacionProvider> = { none: sinProveedor };

export function facturacion(): FacturacionProvider {
  const p = PROVIDERS[env.FACTURACION_PROVIDER];
  if (!p) throw new Error(`FACTURACION_PROVIDER="${env.FACTURACION_PROVIDER}" no está registrado (opciones: ${Object.keys(PROVIDERS).join(", ")})`);
  return p;
}

/** Útil para probar un proveedor nuevo y para que los tests verifiquen el contrato. */
export const registrarProveedor = (p: FacturacionProvider) => void (PROVIDERS[p.nombre] = p);
