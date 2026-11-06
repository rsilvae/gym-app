import { router, useLocalSearchParams } from 'expo-router';

import { ErrorView, LoadingView } from '@/components/query-status';
import { RoutineForm } from '@/components/routine-form';
import { ThemedView } from '@/components/themed-view';
import { useRoutineQuery, useUpdateRoutine } from '@/hooks/use-routines';

/** Pantalla para editar una rutina existente. Reutiliza el mismo formulario que "nueva". */
export default function EditRoutineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: routine, isPending, error, refetch } = useRoutineQuery(id);
  const updateRoutine = useUpdateRoutine(id);

  if (isPending) return <LoadingView />;
  if (error) return <ErrorView error={error} onRetry={refetch} />;

  return (
    <ThemedView style={{ flex: 1 }}>
      <RoutineForm
        initialRoutine={routine}
        submitLabel="Guardar cambios"
        isSubmitting={updateRoutine.isPending}
        submitError={updateRoutine.error?.message}
        onSubmit={(input) => updateRoutine.mutate(input, { onSuccess: () => router.back() })}
      />
    </ThemedView>
  );
}
