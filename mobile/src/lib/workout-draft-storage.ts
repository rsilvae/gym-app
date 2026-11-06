import AsyncStorage from '@react-native-async-storage/async-storage';

import type { WorkoutState } from '@/features/workout/workout-reducer';

/**
 * Borrador del entrenamiento en curso, guardado EN EL CELULAR (AsyncStorage).
 * Si la app se cierra a mitad del entrenamiento, al volver se puede retomar.
 *
 * AsyncStorage es un "diccionario" clave → texto que persiste aunque cierres la app.
 * No es seguro como SecureStore, pero aquí no hay nada secreto y permite guardar más datos.
 */
export type WorkoutDraft = {
  version: 1;
  state: WorkoutState;
  restSeconds: number;
  /** Descanso que estaba corriendo: hora de término y duración total (null si no había). */
  rest?: { endsAt: number; totalMs: number } | null;
  savedAt: number;
};

/** Una clave por usuario: si otra persona inicia sesión en el celular, no ve tu borrador. */
const draftKey = (userId: string) => `workout-draft:${userId}`;

function isWorkoutDraft(value: unknown): value is WorkoutDraft {
  if (typeof value !== 'object' || value === null) return false;
  const draft = value as Partial<WorkoutDraft>;
  return (
    draft.version === 1 &&
    typeof draft.restSeconds === 'number' &&
    typeof draft.state?.routineId === 'string' &&
    typeof draft.state.startedAt === 'number' &&
    Array.isArray(draft.state.exercises)
  );
}

export const workoutDraftStorage = {
  async load(userId: string): Promise<WorkoutDraft | null> {
    try {
      const raw = await AsyncStorage.getItem(draftKey(userId));
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      // Si el formato no es el esperado (por ejemplo, de una versión vieja), lo ignoramos
      return isWorkoutDraft(parsed) ? parsed : null;
    } catch {
      return null;
    }
  },

  async save(userId: string, draft: WorkoutDraft): Promise<void> {
    await AsyncStorage.setItem(draftKey(userId), JSON.stringify(draft));
  },

  async clear(userId: string): Promise<void> {
    await AsyncStorage.removeItem(draftKey(userId));
  },
};
