import { HttpError } from '../utils/http-error.ts';
import { localToUtc } from '../utils/time-zone.ts';
import { parseCsv } from './csv.ts';

/**
 * Lee el CSV que exporta Hevy (y apps con el mismo formato): una fila por serie.
 *   title, start_time, end_time, exercise_title, set_index, set_type, weight_kg, reps, ...
 * Las filas de un mismo entrenamiento comparten título, inicio y fin.
 */

export type ParsedWorkout = {
  title: string;
  startedAt: Date;
  finishedAt: Date;
  exercises: { name: string; sets: { weight: number; reps: number }[] }[];
};

export type ParsedCsv = {
  workouts: ParsedWorkout[];
  /** Series de calentamiento: no se importan (no son series de trabajo). */
  skippedWarmups: number;
  /** Series sin repeticiones (ej: cardio por tiempo o distancia). */
  skippedWithoutReps: number;
};

/** Límites para que un archivo gigante no tumbe el servidor. */
export const IMPORT_LIMITS = { workouts: 3000, exercisesPerWorkout: 50, setsPerExercise: 100 } as const;

const LBS_TO_KG = 0.45359237;

const MONTHS: Record<string, number> = {
  ene: 1, jan: 1, feb: 2, mar: 3, abr: 4, apr: 4, may: 5, jun: 6, jul: 7,
  ago: 8, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dic: 12, dec: 12,
};

/** "4 nov 2026, 13:56" (o "4 Nov 2026, 1:56 PM") → sus partes. null si no se entiende. */
export function parseCsvDate(text: string) {
  const match = text
    .trim()
    .toLowerCase()
    .match(/^(\d{1,2}) ([a-z]+)\.? (\d{4}),? (\d{1,2}):(\d{2})(?::\d{2})?\s*([ap]\.? ?m\.?)?$/);
  if (!match) return null;
  const [, day, monthName, year, hourText, minute, meridiem] = match;
  const month = MONTHS[monthName];
  if (!month) return null;
  let hour = Number(hourText);
  if (meridiem) {
    const pm = meridiem.startsWith('p');
    if (hour === 12) hour = pm ? 12 : 0;
    else if (pm) hour += 12;
  }
  if (Number(day) > 31 || hour > 23 || Number(minute) > 59) return null;
  return { year: Number(year), month, day: Number(day), hour, minute: Number(minute) };
}

export function parseWorkoutCsv(text: string, timeZone: string): ParsedCsv {
  const [header, ...rows] = parseCsv(text);
  if (!header) throw new HttpError(400, 'El archivo está vacío.');

  const columns = header.map((name) => name.trim().toLowerCase());
  const indexOf = (name: string) => columns.indexOf(name);
  const required = ['title', 'start_time', 'end_time', 'exercise_title', 'set_type', 'reps'];
  for (const name of required) {
    if (indexOf(name) === -1) {
      throw new HttpError(400, `El archivo no tiene el formato esperado (falta la columna "${name}").`);
    }
  }
  // El peso puede venir en kilos o en libras, según cómo tenía configurada la otra app
  const weightKgColumn = indexOf('weight_kg');
  const weightLbsColumn = indexOf('weight_lbs');
  if (weightKgColumn === -1 && weightLbsColumn === -1) {
    throw new HttpError(400, 'El archivo no tiene el formato esperado (falta la columna "weight_kg").');
  }

  const byKey = new Map<string, ParsedWorkout>();
  let skippedWarmups = 0;
  let skippedWithoutReps = 0;

  rows.forEach((cells, index) => {
    const line = index + 2; // +1 por el encabezado, +1 porque las filas se cuentan desde 1
    const cell = (column: number) => (column === -1 ? '' : (cells[column] ?? '').trim());
    const fail = (message: string): never => {
      throw new HttpError(400, `Fila ${line}: ${message}`);
    };

    if (cell(indexOf('set_type')).toLowerCase() === 'warmup') {
      skippedWarmups++;
      return;
    }
    const repsText = cell(indexOf('reps'));
    if (repsText === '') {
      skippedWithoutReps++;
      return;
    }
    const reps = Number(repsText);
    if (!Number.isInteger(reps) || reps < 0 || reps > 1000) fail(`las repeticiones "${repsText}" no son válidas.`);

    const weightText = weightKgColumn !== -1 ? cell(weightKgColumn) : cell(weightLbsColumn);
    let weight = weightText === '' ? 0 : Number(weightText);
    if (!Number.isFinite(weight) || weight < 0) fail(`el peso "${weightText}" no es válido.`);
    if (weightKgColumn === -1) weight = Math.round(weight * LBS_TO_KG * 100) / 100;
    if (weight > 2000) fail(`el peso "${weightText}" es demasiado alto.`);

    const exerciseName = cell(indexOf('exercise_title')).replace(/\s+/g, ' ').slice(0, 100);
    if (!exerciseName) fail('falta el nombre del ejercicio.');

    const startText = cell(indexOf('start_time'));
    const endText = cell(indexOf('end_time'));
    const key = `${cell(indexOf('title'))}\u0000${startText}\u0000${endText}`;

    let workout = byKey.get(key);
    if (!workout) {
      const start = parseCsvDate(startText);
      if (!start) fail(`no se entiende la fecha "${startText}".`);
      const end = endText ? parseCsvDate(endText) : null;
      const startedAt = localToUtc(start!, timeZone);
      const finishedAt = end ? localToUtc(end, timeZone) : startedAt;
      workout = {
        title: (cell(indexOf('title')) || 'Entrenamiento importado').slice(0, 100),
        startedAt,
        // Si el fin quedó antes del inicio (dato raro), se usa el inicio
        finishedAt: finishedAt >= startedAt ? finishedAt : startedAt,
        exercises: [],
      };
      byKey.set(key, workout);
      if (byKey.size > IMPORT_LIMITS.workouts) {
        throw new HttpError(400, `El archivo tiene más de ${IMPORT_LIMITS.workouts} entrenamientos.`);
      }
    }

    // Las series de un ejercicio vienen seguidas: si cambia el nombre, empieza otro ejercicio
    let exercise = workout.exercises.at(-1);
    if (!exercise || exercise.name !== exerciseName) {
      exercise = { name: exerciseName, sets: [] };
      workout.exercises.push(exercise);
      if (workout.exercises.length > IMPORT_LIMITS.exercisesPerWorkout) {
        fail(`el entrenamiento tiene más de ${IMPORT_LIMITS.exercisesPerWorkout} ejercicios.`);
      }
    }
    exercise.sets.push({ weight, reps });
    if (exercise.sets.length > IMPORT_LIMITS.setsPerExercise) {
      fail(`el ejercicio tiene más de ${IMPORT_LIMITS.setsPerExercise} series.`);
    }
  });

  // Del más antiguo al más nuevo
  const workouts = [...byKey.values()].sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
  return { workouts, skippedWarmups, skippedWithoutReps };
}
