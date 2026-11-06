import type { Routine, WorkoutInput } from '@/types';
import { createId } from '@/utils/id';

/**
 * Estado del entrenamiento en curso, manejado con useReducer.
 *
 * ¿Qué es un reducer? Una función pura: recibe (estado actual, acción) y devuelve
 * el estado nuevo. Toda la lógica de "qué pasa cuando..." queda en un solo lugar,
 * separada de la pantalla, y es fácil de probar.
 */

/** Una serie mientras entrenas. Peso y reps son texto para poder editarlos libremente. */
export type ActiveSet = {
  id: string;
  weight: string;
  reps: string;
  completed: boolean;
};

export type ActiveExercise = {
  id: string;
  name: string;
  sets: ActiveSet[];
};

export type WorkoutState = {
  routineId: string;
  routineName: string;
  startedAt: number; // fecha/hora de inicio en milisegundos
  exercises: ActiveExercise[];
};

export type WorkoutAction =
  | { type: 'UPDATE_SET'; exerciseId: string; setId: string; field: 'weight' | 'reps'; value: string }
  | { type: 'TOGGLE_SET'; exerciseId: string; setId: string }
  | { type: 'ADD_SET'; exerciseId: string }
  | { type: 'REMOVE_SET'; exerciseId: string; setId: string };

/** Crea el estado inicial a partir de una rutina: una serie por cada serie objetivo. */
export function createWorkoutState(routine: Routine): WorkoutState {
  return {
    routineId: routine.id,
    routineName: routine.name,
    startedAt: Date.now(),
    exercises: routine.exercises.map((exercise) => ({
      id: exercise.id,
      name: exercise.name,
      sets: Array.from({ length: exercise.targetSets }, () => ({
        id: createId(),
        weight: exercise.targetWeight > 0 ? String(exercise.targetWeight) : '',
        reps: String(exercise.targetReps),
        completed: false,
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
        sets: exercise.sets.map((set) =>
          set.id === action.setId ? { ...set, completed: !set.completed } : set,
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
        };
        return { ...exercise, sets: [...exercise.sets, newSet] };
      });

    case 'REMOVE_SET':
      return updateExercise(state, action.exerciseId, (exercise) => ({
        ...exercise,
        sets: exercise.sets.filter((set) => set.id !== action.setId),
      }));
  }
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
