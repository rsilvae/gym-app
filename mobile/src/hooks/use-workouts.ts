import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { workoutsApi } from '@/lib/workouts-api';
import type { WorkoutInput } from '@/types';

/**
 * Hooks de TanStack Query para entrenamientos (igual que use-routines.ts).
 * Query keys:
 *   ['workouts']                 → historial
 *   ['workouts', id]             → un entrenamiento
 *   ['last-performance', names]  → "la última vez" de unos ejercicios
 *   ['exercises']                → ejercicios que hiciste alguna vez
 *   ['exercises', name]          → progreso de un ejercicio
 */
export const workoutKeys = {
  all: ['workouts'] as const,
  detail: (id: string) => ['workouts', id] as const,
  lastPerformance: (names: string[]) => ['last-performance', ...names] as const,
  exercises: ['exercises'] as const,
  progress: (name: string) => ['exercises', name.toLowerCase()] as const,
};

export function useExercisesQuery() {
  return useQuery({ queryKey: workoutKeys.exercises, queryFn: workoutsApi.exercises });
}

export function useExerciseProgressQuery(name: string) {
  return useQuery({ queryKey: workoutKeys.progress(name), queryFn: () => workoutsApi.progress(name) });
}

export function useWorkoutsQuery() {
  return useQuery({ queryKey: workoutKeys.all, queryFn: workoutsApi.list });
}

export function useWorkoutQuery(id: string) {
  return useQuery({ queryKey: workoutKeys.detail(id), queryFn: () => workoutsApi.get(id) });
}

export function useLastPerformanceQuery(names: string[]) {
  return useQuery({
    queryKey: workoutKeys.lastPerformance(names),
    queryFn: () => workoutsApi.lastPerformance(names),
    enabled: names.length > 0, // si no hay ejercicios, no pedimos nada
  });
}

/** Al guardar o borrar un entrenamiento, el historial y "la última vez" cambian. */
function invalidateWorkoutData(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: workoutKeys.all, exact: true });
  queryClient.invalidateQueries({ queryKey: ['last-performance'] });
  queryClient.invalidateQueries({ queryKey: workoutKeys.exercises }); // también los gráficos
}

export function useSaveWorkout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: WorkoutInput) => workoutsApi.create(input),
    onSuccess: () => invalidateWorkoutData(queryClient),
  });
}

export function useDeleteWorkout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => workoutsApi.remove(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: workoutKeys.detail(id) });
      invalidateWorkoutData(queryClient);
    },
  });
}
