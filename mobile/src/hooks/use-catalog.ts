import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { catalogApi } from '@/lib/catalog-api';
import type { CatalogExercise, NewExerciseInput } from '@/types';

export const catalogKey = ['catalog', 'exercises'] as const;

/**
 * El catálogo de ejercicios. Casi nunca cambia, así que se pide una vez y
 * se considera fresco por 1 hora (abrir el buscador es instantáneo).
 */
export function useCatalogQuery() {
  return useQuery({ queryKey: catalogKey, queryFn: catalogApi.exercises, staleTime: 60 * 60 * 1000 });
}

/** Diccionario id → ejercicio, para mostrar músculo y equipo en las rutinas. */
export function useCatalogById() {
  const { data } = useCatalogQuery();
  return useMemo(() => new Map((data ?? []).map((exercise) => [exercise.id, exercise])), [data]);
}

export function useCreateExercise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewExerciseInput) => catalogApi.createExercise(input),
    onSuccess: (exercise) => {
      // Lo agregamos a la lista en caché al tiro, en orden alfabético
      queryClient.setQueryData<CatalogExercise[]>(catalogKey, (current) =>
        [...(current ?? []), exercise].sort((a, b) => a.name.localeCompare(b.name, 'es')),
      );
    },
  });
}
