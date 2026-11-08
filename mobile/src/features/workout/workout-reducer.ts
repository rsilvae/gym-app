import type { Routine, WorkoutInput } from '@/types';
import { createId } from '@/utils/id';

/**
 * Estado del entrenamiento en curso, manejado con useReducer.
 *
 * ¿Qué es un reducer? Una función pura: recibe (estado actual, acción) y devuelve
 * el estado nuevo. Toda la lógica de "qué pasa cuando..." queda en un solo lugar,
 * separada de la pantalla, y es fácil de probar.
 */

/**
 * Una serie mientras entrenas. Peso y reps son texto para poder editarlos libremente.
 * Empiezan vacíos: la pantalla muestra de sugerencia (placeholder) lo que hiciste la última vez,
 * o el objetivo de la rutina, y al marcar la serie se usa esa sugerencia si no escribiste nada.
 */
export type ActiveSet = {
  id: string;
  weight: string;
  reps: string;
  completed: boolean;
  /** Objetivo de la rutina: la sugerencia cuando nunca hiciste el ejercicio. */
  targetWeight?: string;
  targetReps?: string;
};

export type ActiveExercise = {
  id: string;
  /** El ejercicio del catálogo (para "Similares" al reemplazar). Puede faltar en borradores viejos. */
  catalogId?: string | null;
  name: string;
  sets: ActiveSet[];
};

/** Lo que se muestra de sugerencia en una serie (y se usa al marcarla vacía). */
export type SetSuggestion = { weight: string; reps: string };

/** Un ejercicio elegido del catálogo para agregar o reemplazar. */
type PickedExercise = { catalogId: string; name: string };

const NEW_EXERCISE_SETS = 3;

function emptySets(count: number, from?: ActiveSet[]): ActiveSet[] {
  return Array.from({ length: count }, (_, index) => ({
    id: createId(),
    weight: '',
    reps: '',
    completed: false,
    targetWeight: from?.[index]?.targetWeight,
    targetReps: from?.[index]?.targetReps,
  }));
}

export type WorkoutState = {
  routineId: string;
  routineName: string;
  startedAt: number; // fecha/hora de inicio en milisegundos
  exercises: ActiveExercise[];
};

export type WorkoutAction =
  | { type: 'UPDATE_SET'; exerciseId: string; setId: string; field: 'weight' | 'reps'; value: string }
  /** `fill`: la sugerencia, para completar peso o reps vacíos al marcar la serie. */
  | { type: 'TOGGLE_SET'; exerciseId: string; setId: string; fill?: SetSuggestion }
  /** Copia peso y reps (ej: tocar "lo de la última vez"). */
  | { type: 'FILL_SET'; exerciseId: string; setId: string; values: SetSuggestion }
  | { type: 'ADD_SET'; exerciseId: string }
  | { type: 'REMOVE_SET'; exerciseId: string; setId: string }
  | { type: 'ADD_EXERCISES'; exercises: PickedExercise[] }
  | { type: 'REMOVE_EXERCISE'; exerciseId: string }
  /** Cambia el ejercicio por otro: mantiene la cantidad de series, pero vacías. */
  | { type: 'REPLACE_EXERCISE'; exerciseId: string; exercise: PickedExercise };

/** Crea el estado inicial a partir de una rutina: una serie por cada serie objetivo. */
export function createWorkoutState(routine: Routine): WorkoutState {
  return {
    routineId: routine.id,
    routineName: routine.name,
    startedAt: Date.now(),
    exercises: routine.exercises.map((exercise) => ({
      id: exercise.id,
      catalogId: exercise.exerciseId ?? null,
      name: exercise.name,
      sets: Array.from({ length: exercise.targetSets }, () => ({
        id: createId(),
        weight: '',
        reps: '',
        completed: false,
        targetWeight: exercise.targetWeight > 0 ? String(exercise.targetWeight) : '',
        targetReps: String(exercise.targetReps),
      })),
    })),
  };
}

/** Aplica `change` solo al ejercicio con ese id; los demás quedan igual. */
function updateExercise(
  state: WorkoutState,
  exerciseId: string,
  change: (exercise: ActiveExercise) => ActiveExercise,
): WorkoutState {
  return {
    ...state,
    exercises: state.exercises.map((exercise) =>
      exercise.id === exerciseId ? change(exercise) : exercise,
    ),
  };
}

export function workoutReducer(state: WorkoutState, action: WorkoutAction): WorkoutState {
  switch (action.type) {
    case 'UPDATE_SET':
      return updateExercise(state, action.exerciseId, (exercise) => ({
        ...exercise,
        sets: exercise.sets.map((set) =>
          set.id === action.setId ? { ...set, [action.field]: action.value } : set,
        ),
      }));

    case 'TOGGLE_SET':
      return updateExercise(state, action.exerciseId, (exercise) => ({
        ...exercise,
        sets: exercise.sets.map((set) => {
          if (set.id !== action.setId) return set;
          if (set.completed) return { ...set, completed: false };
          // Al marcarla, lo que dejaste vacío toma el valor sugerido
          return {
            ...set,
            completed: true,
            weight: set.weight.trim() === '' ? (action.fill?.weight ?? '') : set.weight,
            reps: set.reps.trim() === '' ? (action.fill?.reps ?? '') : set.reps,
          };
        }),
      }));

    case 'FILL_SET':
      return updateExercise(state, action.exerciseId, (exercise) => ({
        ...exercise,
        sets: exercise.sets.map((set) =>
          set.id === action.setId ? { ...set, weight: action.values.weight, reps: action.values.reps } : set,
        ),
      }));

    case 'ADD_SET':
      // La serie nueva copia peso y reps de la última, que suele ser lo que vas a repetir.
      return updateExercise(state, action.exerciseId, (exercise) => {
        const last = exercise.sets.at(-1);
        const newSet: ActiveSet = {
          id: createId(),
          weight: last?.weight ?? '',
          reps: last?.reps ?? '',
          completed: false,
          targetWeight: last?.targetWeight,
          targetReps: last?.targetReps,
        };
        return { ...exercise, sets: [...exercise.sets, newSet] };
      });

    case 'REMOVE_SET':
      return updateExercise(state, action.exerciseId, (exercise) => ({
        ...exercise,
        sets: exercise.sets.filter((set) => set.id !== action.setId),
      }));

    case 'ADD_EXERCISES':
      return {
        ...state,
        exercises: [
          ...state.exercises,
          ...action.exercises.map((picked) => ({
            id: createId(),
            catalogId: picked.catalogId,
            name: picked.name,
            sets: emptySets(NEW_EXERCISE_SETS),
          })),
        ],
      };

    case 'REMOVE_EXERCISE':
      return { ...state, exercises: state.exercises.filter((exercise) => exercise.id !== action.exerciseId) };

    case 'REPLACE_EXERCISE':
      return updateExercise(state, action.exerciseId, (exercise) => ({
        ...exercise,
        catalogId: action.exercise.catalogId,
        name: action.exercise.name,
        // El objetivo de reps de la rutina sigue sirviendo; el peso no (es otro ejercicio)
        sets: emptySets(Math.max(exercise.sets.length, 1), exercise.sets).map((set) => ({
          ...set,
          targetWeight: '',
        })),
      }));
  }
}

/**
 * La sugerencia para la serie número `index` (desde 0):
 *   1. Lo que hiciste en esa serie la última vez (si hiciste menos series, la última que hiciste).
 *   2. Si nunca hiciste el ejercicio, el objetivo de la rutina.
 */
export function suggestionFor(
  set: ActiveSet,
  index: number,
  lastSets: { weight: number; reps: number }[] | undefined,
): SetSuggestion {
  const previous = lastSets?.[index] ?? lastSets?.at(-1);
  if (previous) return { weight: String(previous.weight), reps: String(previous.reps) };
  return { weight: set.targetWeight ?? '', reps: set.targetReps ?? '' };
}

/** Convierte texto a número (acepta "62,5"). Si no es un número válido ≥ 0, devuelve 0. */
function toNumber(text: string): number {
  const value = Number(text.trim().replace(',', '.'));
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

/**
 * Arma lo que se envía a la API al terminar: solo las series MARCADAS
 * (lo que realmente hiciste). Los ejercicios sin series marcadas no se envían.
 */
export function toWorkoutInput(state: WorkoutState, finishedAt: number): WorkoutInput {
  return {
    routineId: state.routineId,
    routineName: state.routineName,
    startedAt: new Date(state.startedAt).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    exercises: state.exercises
      .map((exercise) => ({
        name: exercise.name,
        sets: exercise.sets
          .filter((set) => set.completed)
          .map((set) => ({ weight: toNumber(set.weight), reps: Math.round(toNumber(set.reps)) })),
      }))
      .filter((exercise) => exercise.sets.length > 0),
  };
}

/** Cuenta series hechas y totales, para la barra de progreso. */
export function getProgress(state: WorkoutState) {
  const allSets = state.exercises.flatMap((exercise) => exercise.sets);
  const completed = allSets.filter((set) => set.completed).length;
  return { completed, total: allSets.length };
}
