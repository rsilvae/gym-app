import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/context/auth-context';
import type { WorkoutState } from '@/features/workout/workout-reducer';
import { workoutDraftStorage, type WorkoutDraft } from '@/lib/workout-draft-storage';

/**
 * El borrador del entrenamiento en curso, compartido por todas las pantallas.
 *
 * Usamos TanStack Query aunque los datos están en el celular (no en la API):
 * así la pestaña Rutinas, el detalle de la rutina y el entrenamiento ven
 * siempre el mismo borrador y se actualizan solos cuando cambia.
 */
const draftKey = (userId: string) => ['workout-draft', userId] as const;

export function useWorkoutDraft() {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: draftKey(userId),
    queryFn: () => workoutDraftStorage.load(userId),
    enabled: userId !== '',
    staleTime: Infinity, // solo cambia cuando lo guardamos nosotros
  });

  /** Guarda el estado actual del entrenamiento (en memoria y en el celular). */
  function saveDraft(state: WorkoutState, restSeconds: number, rest: WorkoutDraft['rest']) {
    if (!userId) return;
    const draft: WorkoutDraft = { version: 1, state, restSeconds, rest, savedAt: Date.now() };
    queryClient.setQueryData(draftKey(userId), draft);
    void workoutDraftStorage.save(userId, draft);
  }

  /** Borra el borrador: al terminar, cancelar o descartar el entrenamiento. */
  async function clearDraft() {
    if (!userId) return;
    queryClient.setQueryData(draftKey(userId), null);
    await workoutDraftStorage.clear(userId);
  }

  return {
    draft: query.data ?? null,
    isLoading: query.isPending && userId !== '',
    saveDraft,
    clearDraft,
  };
}
