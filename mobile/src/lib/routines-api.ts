import { apiFetch } from '@/lib/api-client';
import type { Routine, RoutineInput } from '@/types';

/**
 * Funciones que llaman a los endpoints de /routines de la API.
 * Cada una corresponde a un endpoint (ver api/README.md).
 */

/** Lo que espera la API: los ejercicios van sin id (la base de datos crea uno nuevo). */
function toRequestBody(input: RoutineInput) {
  return JSON.stringify({
    name: input.name,
    exercises: input.exercises.map(({ exerciseId, name, targetSets, targetReps, targetWeight }) => ({
      exerciseId: exerciseId ?? undefined,
      name,
      targetSets,
      targetReps,
      targetWeight,
    })),
  });
}

export const routinesApi = {
  list: () => apiFetch<Routine[]>('/routines'),

  get: (id: string) => apiFetch<Routine>(`/routines/${id}`),

  create: (input: RoutineInput) =>
    apiFetch<Routine>('/routines', { method: 'POST', body: toRequestBody(input) }),

  update: (id: string, input: RoutineInput) =>
    apiFetch<Routine>(`/routines/${id}`, { method: 'PUT', body: toRequestBody(input) }),

  remove: (id: string) => apiFetch<void>(`/routines/${id}`, { method: 'DELETE' }),
};
