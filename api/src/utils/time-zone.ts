/** true si es una zona horaria IANA válida, ej: "America/Santiago". */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** Cuántos ms está adelantada la hora local de `timeZone` respecto a UTC en ese instante. */
function offsetAt(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).formatToParts(new Date(utcMs));
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

/**
 * Convierte una hora "de reloj" (la que ve el usuario en su país) al instante real en UTC.
 *   localToUtc({ 2026, 11, 4, 13, 56 }, 'America/Santiago') → 2026-11-04T16:56:00.000Z
 * Se calcula el desfase dos veces para acertar cerca de los cambios de horario de verano.
 */
export function localToUtc(
  local: { year: number; month: number; day: number; hour: number; minute: number },
  timeZone: string,
): Date {
  const wallClock = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute);
  let utc = wallClock - offsetAt(wallClock, timeZone);
  utc = wallClock - offsetAt(utc, timeZone);
  return new Date(utc);
}
