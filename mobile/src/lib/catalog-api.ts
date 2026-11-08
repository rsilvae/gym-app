import { apiFetch } from '@/lib/api-client';
import type { CatalogExercise, NewExerciseInput } from '@/types';

/** Funciones que llaman a los endpoints de /catalog de la API. */
export const catalogApi = {
  exercises: () => apiFetch<CatalogExercise[]>('/catalog/exercises'),

  createExercise: (input: NewExerciseInput) =>
    apiFetch<CatalogExercise>('/catalog/exercises', { method: 'POST', body: JSON.stringify(input) }),
};
