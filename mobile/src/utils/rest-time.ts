/** Límites del descanso entre series: de 1 segundo a 59:59. */
export const MIN_REST_SECONDS = 1;
export const MAX_REST_SECONDS = 59 * 60 + 59;

export function clampRestSeconds(seconds: number): number {
  return Math.min(MAX_REST_SECONDS, Math.max(MIN_REST_SECONDS, Math.round(seconds)));
}

/**
 * Convierte lo que escribes en el teclado numérico a segundos.
 * Los 2 últimos dígitos son los segundos y lo de antes, los minutos
 * (como un microondas):
 *   "1"    → 0:01 → 1
 *   "45"   → 0:45 → 45
 *   "123"  → 1:23 → 83
 *   "90"   → 0:90 → 90 (1:30)
 *   "1000" → 10:00 → 600
 * Devuelve null si no escribiste nada (o puros ceros), para dejar el valor anterior.
 */
export function parseRestDigits(text: string): number | null {
  const digits = text.replace(/\D/g, '');
  if (!digits) return null;

  const value = Number(digits);
  const minutes = Math.floor(value / 100);
  const seconds = value % 100;
  const total = minutes * 60 + seconds;

  return total > 0 ? clampRestSeconds(total) : null;
}
