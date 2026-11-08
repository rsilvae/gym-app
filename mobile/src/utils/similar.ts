import type { CatalogExercise } from '@/types';
import { normalizeText } from '@/utils/search';

/** Palabras que no dicen nada del movimiento. */
const STOP_WORDS = new Set(['de', 'del', 'con', 'a', 'al', 'la', 'el', 'los', 'las', 'en', 'y', 'un', 'una', 'para', 'por']);

/** Palabras distintas que nombran el mismo movimiento: "press de pecho" = "press de banca". */
const SYNONYMS: Record<string, string> = { pecho: 'banca', hombro: 'militar', hombros: 'militar' };

/** "piernas" → "pierna": así el plural no cuenta como otra palabra. */
function stem(word: string) {
  return word.length > 4 && word.endsWith('s') ? word.slice(0, -1) : word;
}

/** "Press de banca (Barra)" → ["pres", "banca"]: el movimiento, sin el equipo ni palabras de relleno. */
function movementWords(name: string): string[] {
  return normalizeText(name.replace(/\([^)]*\)/g, ' '))
    .split(/[\s-]+/)
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word))
    .map((word) => stem(SYNONYMS[word] ?? word));
}

/**
 * Ejercicios parecidos a `target`, del más al menos parecido. Sirve para reemplazar
 * un ejercicio (máquina ocupada, molestia...): "Press de banca (Barra)" →
 * "Press de banca (Mancuerna)", "Press de pecho (Máquina)", "Press de banca (Máquina Smith)"...
 *
 * Puntaje: el mismo movimiento con otro equipo (+6), cada palabra en común (+2), cada
 * palabra de más (−1, así "inclinado" queda después) y cada músculo secundario en común (+1).
 * Solo ejercicios del mismo músculo principal (salvo los propios con músculo "Otro":
 * ahí se buscan por las palabras del nombre).
 */
export function findSimilarExercises(target: CatalogExercise, catalog: CatalogExercise[], limit = 25) {
  const targetWords = movementWords(target.name);
  const targetBase = [...targetWords].sort().join(' ');
  const muscleUnknown = target.primaryMuscle === 'OTHER';

  return catalog
    .filter((exercise) => exercise.id !== target.id)
    .filter((exercise) => muscleUnknown || exercise.primaryMuscle === target.primaryMuscle)
    .map((exercise) => {
      const words = movementWords(exercise.name);
      const sharedWords = words.filter((word) => targetWords.includes(word)).length;
      const extraWords = words.length - sharedWords;
      const sharedMuscles = exercise.secondaryMuscles.filter((m) => target.secondaryMuscles.includes(m)).length;
      const sameMovement = [...words].sort().join(' ') === targetBase ? 6 : 0;
      return { exercise, sharedWords, score: sameMovement + sharedWords * 2 - extraWords + sharedMuscles };
    })
    .filter(({ sharedWords }) => !muscleUnknown || sharedWords > 0)
    .sort((a, b) => b.score - a.score || a.exercise.name.localeCompare(b.exercise.name, 'es'))
    .slice(0, limit)
    .map(({ exercise }) => exercise);
}
