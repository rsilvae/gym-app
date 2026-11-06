import type { PerformedSet } from '@/types';

/** Número con coma decimal y sin decimales de más: 62.5 → "62,5", 60 → "60". */
export function formatNumber(value: number): string {
  return value.toLocaleString('es', { maximumFractionDigits: 1 });
}

/** Una serie compacta: "62,5 × 8", o "× 12" si es peso corporal. */
export function formatSet({ weight, reps }: PerformedSet): string {
  return weight > 0 ? `${formatNumber(weight)} × ${reps}` : `× ${reps}`;
}

/** Varias series: "62,5 × 8 · 62,5 × 7 · 60 × 8". */
export function formatSets(sets: PerformedSet[]): string {
  return sets.map(formatSet).join(' · ');
}

/** Fecha legible: "jue, 6 nov". Agrega el año si no es el actual. */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString('es', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

/** Hora: "18:30". */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
}

/** Cuánto pasó desde una fecha: "hoy", "ayer", "hace 3 días". */
export function formatRelativeDay(iso: string): string {
  const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const days = Math.round((startOfDay(new Date()) - startOfDay(new Date(iso))) / 86_400_000);
  if (days <= 0) return 'hoy';
  if (days === 1) return 'ayer';
  return `hace ${days} días`;
}
