import { router } from 'expo-router';

import { RoutineForm } from '@/components/routine-form';
import { ThemedView } from '@/components/themed-view';
import { useRoutines } from '@/context/routines-context';

/** Pantalla para crear una rutina nueva. */
export default function NewRoutineScreen() {
  const { addRoutine } = useRoutines();

  return (
    <ThemedView style={{ flex: 1 }}>
      <RoutineForm
        submitLabel="Crear rutina"
        onSubmit={(input) => {
          const routine = addRoutine(input);
          // replace (en vez de push) para que "atrás" no vuelva al formulario.
          router.replace({ pathname: '/routine/[id]', params: { id: routine.id } });
        }}
      />
    </ThemedView>
  );
}
