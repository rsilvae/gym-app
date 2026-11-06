/**
 * Genera un id único simple (por ahora, mientras los datos viven en memoria).
 * Cuando usemos la base de datos, los ids los va a crear PostgreSQL.
 */
export function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
