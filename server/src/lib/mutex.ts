/**
 * Candado en memoria por clave (ej. un barbero): las tareas con la misma clave corren una a la vez.
 * shortcut: vale para UNA instancia de la API; con varias, el índice único + el chequeo posterior
 * de solapamiento siguen protegiendo, y habría que pasar a un candado en Mongo/Redis.
 */
const tails = new Map<string, Promise<unknown>>();

export function withLock<T>(key: string, task: () => Promise<T>): Promise<T> {
  const prev = tails.get(key) ?? Promise.resolve();
  const run = prev.then(task, task);
  const tail = run.catch(() => undefined);
  tails.set(key, tail);
  void tail.then(() => {
    if (tails.get(key) === tail) tails.delete(key);
  });
  return run;
}
