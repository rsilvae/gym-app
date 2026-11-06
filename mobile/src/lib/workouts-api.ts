import { apiFetch } from '@/lib/api-client';
import type {
  ExerciseSummary,
  LastPerformance,
  ProgressPoint,
  WorkoutDetail,
  WorkoutInput,
  WorkoutSummary,
} from '@/types';

/** Funciones que llaman a los endpoints de /workouts y /exercises de la API. */
export const workoutsApi = {
  list: () => apiFetch<WorkoutSummary[]>('/workouts'),

  get: (id: string) => apiFetch<WorkoutDetail>(`/workouts/${id}`),

  create: (input: WorkoutInput) =>
    apiFetch<{ id: string }>('/workouts', { method: 'POST', body: JSON.stringify(input) }),

  remove: (id: string) => apiFetch<void>(`/workouts/${id}`, { method: 'DELETE' }),

  /** ?names=A&names=B — encodeURIComponent convierte espacios y acentos para la URL. */
  lastPerformance: (names: string[]) => {
    const query = names.map((name) => `names=${encodeURIComponent(name)}`).join('&');
    return apiFetch<LastPerformance>(`/exercises/last?${query}`);
  },

  /** Los ejercicios que hiciste alguna vez. */
  exercises: () => apiFetch<ExerciseSummary[]>('/exercises'),

  /** Un punto por entrenamiento para el gráfico de un ejercicio. */
  progress: (name: string) =>
    apiFetch<ProgressPoint[]>(`/exercises/progress?name=${encodeURIComponent(name)}`),
};
