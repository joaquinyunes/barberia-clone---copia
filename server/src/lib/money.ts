const ars = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

export const formatARS = (n: number) => ars.format(Math.round(n));

/** Redondea al múltiplo indicado (ej. 500 → $14.320 pasa a $14.500). */
export const roundTo = (n: number, step: number) =>
  step > 0 ? Math.round(n / step) * step : Math.round(n);

export const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
