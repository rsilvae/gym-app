import type { SetType } from '@/types';

/**
 * Los tipos de serie, con su letra y su color (los colores están en theme.ts).
 *   - Normal:         se muestra su número (1, 2, 3...)
 *   - Calentamiento:  W (de "warm-up"), amarillo
 *   - Al fallo:       F, rojo
 *   - Dropset:        D, morado
 */
export const SET_TYPES: { type: SetType; letter: string; label: string; description: string }[] = [
  { type: 'NORMAL', letter: '1', label: 'Serie normal', description: 'Se muestra con su número' },
  { type: 'WARMUP', letter: 'W', label: 'Calentamiento', description: 'Peso liviano para preparar el músculo' },
  { type: 'FAILURE', letter: 'F', label: 'Al fallo', description: 'Hasta no poder hacer otra repetición' },
  { type: 'DROPSET', letter: 'D', label: 'Dropset', description: 'Bajas el peso y sigues sin descansar' },
];

/** Color del tema para cada tipo (null = el gris de siempre). */
export const SET_TYPE_COLOR = {
  NORMAL: null,
  WARMUP: 'warmup',
  FAILURE: 'failure',
  DROPSET: 'dropset',
} as const satisfies Record<SetType, string | null>;

/**
 * Qué se muestra en la columna "Serie" para cada serie: "W", "F", "D" o el número.
 * Solo las series normales llevan número (contando solo las normales):
 *   [W, normal, normal, F] → ["W", "1", "2", "F"]
 */
export function setLabels(types: (SetType | undefined)[]): string[] {
  let normal = 0;
  return types.map((type = 'NORMAL') => {
    if (type === 'NORMAL') {
      normal++;
      return String(normal);
    }
    return SET_TYPES.find((item) => item.type === type)?.letter ?? '?';
  });
}

/** Nombre del tipo para lectores de pantalla y menús. */
export function setTypeLabel(type: SetType = 'NORMAL'): string {
  return SET_TYPES.find((item) => item.type === type)?.label ?? 'Serie normal';
}
