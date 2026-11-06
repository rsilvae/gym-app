import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { routinesApi } from '@/lib/routines-api';
import type { RoutineInput } from '@/types';

/**
 * Hooks de TanStack Query para las rutinas.
 *
 * - useQuery: PIDE datos. Maneja solo "cargando", "error" y guarda una copia (caché),
 *   así volver a una pantalla es instantáneo.
 * - useMutation: CAMBIA datos (crear, editar, borrar). Al terminar, "invalidamos"
 *   la caché para que las listas se vuelvan a pedir y muestren lo nuevo.
 *
 * Las "query keys" identifican cada dato en la caché:
 *   ['routines']        → la lista
 *   ['routines', id]    → una rutina
 */
export const routineKeys = {
  all: ['routines'] as const,
  detail: (id: string) => ['routines', id] as const,
};

export function useRoutinesQuery() {
  return useQuery({ queryKey: routineKeys.all, queryFn: routinesApi.list });
}

export function useRoutineQuery(id: string) {
  return useQuery({ queryKey: routineKeys.detail(id), queryFn: () => routinesApi.get(id) });
}

export function useCreateRoutine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RoutineInput) => routinesApi.create(input),
    onSuccess: (routine) => {
      // Guardamos la rutina nueva en caché para que el detalle se abra sin esperar
      queryClient.setQueryData(routineKeys.detail(routine.id), routine);
      queryClient.invalidateQueries({ queryKey: routineKeys.all, exact: true });
    },
  });
}

export function useUpdateRoutine(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RoutineInput) => routinesApi.update(id, input),
    onSuccess: (routine) => {
      queryClient.setQueryData(routineKeys.detail(id), routine);
      queryClient.invalidateQueries({ queryKey: routineKeys.all, exact: true });
    },
  });
}

export function useDeleteRoutine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => routinesApi.remove(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: routineKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: routineKeys.all, exact: true });
    },
  });
}
