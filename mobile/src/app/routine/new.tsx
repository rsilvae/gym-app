import { router } from 'expo-router';

import { RoutineForm } from '@/components/routine-form';
import { ThemedView } from '@/components/themed-view';
import { useCreateRoutine } from '@/hooks/use-routines';

/** Pantalla para crear una rutina nueva. */
export default function NewRoutineScreen() {
  const createRoutine = useCreateRoutine();

  return (
    <ThemedView style={{ flex: 1 }}>
      <RoutineForm
        submitLabel="Crear rutina"
        isSubmitting={createRoutine.isPending}
        submitError={createRoutine.error?.message}
        onSubmit={(input) =>
          createRoutine.mutate(input, {
            // replace (en vez de push) para que "atrás" no vuelva al formulario.
            onSuccess: (routine) =>
              router.replace({ pathname: '/routine/[id]', params: { id: routine.id } }),
          })
        }
      />
    </ThemedView>
  );
}
