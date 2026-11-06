import { router, useLocalSearchParams } from 'expo-router';

import { EmptyState } from '@/components/empty-state';
import { RoutineForm } from '@/components/routine-form';
import { ThemedView } from '@/components/themed-view';
import { useRoutines } from '@/context/routines-context';

/** Pantalla para editar una rutina existente. Reutiliza el mismo formulario que "nueva". */
export default function EditRoutineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getRoutine, updateRoutine } = useRoutines();
  const routine = getRoutine(id);

  if (!routine) {
    return <EmptyState title="No encontrada" message="Esta rutina no existe." />;
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <RoutineForm
        initialRoutine={routine}
        submitLabel="Guardar cambios"
        onSubmit={(input) => {
          updateRoutine(routine.id, input);
          router.back();
        }}
      />
    </ThemedView>
  );
}
