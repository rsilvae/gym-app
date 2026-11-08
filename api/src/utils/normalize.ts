/**
 * Normaliza un nombre para compararlo: minúsculas, sin tildes y sin espacios de más.
 *   "  Jalón al  Pecho (Cable) " → "jalon al pecho (cable)"
 * Así "Jalón al pecho" y "jalon al pecho" cuentan como el mismo ejercicio.
 */
export function normalizeName(name: string): string {
  return name
    .normalize('NFD') // separa la letra de su tilde: "ó" → "o" + "´"
    .replace(/\p{Diacritic}/gu, '') // y borra la tilde
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
