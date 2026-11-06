import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, FlatList, Pressable, StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useRoutines } from '@/context/routines-context';
import type { RoutineExercise } from '@/types';

/**
 * Detalle de una rutina. El [id] del nombre del archivo es un parámetro:
 * al abrir /routine/2, `id` vale "2".
 */
export default function RoutineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getRoutine, deleteRoutine } = useRoutines();
  const routine = getRoutine(id);

  if (!routine) {
    return <EmptyState title="No encontrada" message="Esta rutina no existe." />;
  }

  function confirmDelete() {
    Alert.alert('Eliminar rutina', `¿Seguro que quieres eliminar "${routine?.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          // Primero volvemos a la lista y después borramos,
          // para no mostrar un instante la pantalla "No encontrada".
          router.back();
          deleteRoutine(id);
        },
      },
    ]);
  }

  return (
    <ThemedView style={styles.container}>
      {/* Cambia el título de la barra de arriba y agrega el botón "Editar" */}
      <Stack.Screen
        options={{
          title: routine.name,
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              hitSlop={12}
              onPress={() => router.push({ pathname: '/routine/edit/[id]', params: { id } })}>
              <ThemedText themeColor="primary">Editar</ThemedText>
            </Pressable>
          ),
        }}
      />

      <FlatList
        data={routine.exercises}
        keyExtractor={(exercise) => exercise.id}
        renderItem={({ item, index }) => <ExerciseRow exercise={item} position={index + 1} />}
        ListFooterComponent={
          <Button title="Eliminar rutina" variant="danger" onPress={confirmDelete} />
        }
        contentContainerStyle={styles.list}
        contentInsetAdjustmentBehavior="automatic"
      />
    </ThemedView>
  );
}

/** Una fila con el ejercicio y su objetivo: series × reps y peso. */
function ExerciseRow({ exercise, position }: { exercise: RoutineExercise; position: number }) {
  const weight = exercise.targetWeight > 0 ? `${exercise.targetWeight} kg` : 'Peso corporal';

  return (
    <ThemedView type="backgroundElement" style={styles.row}>
      <ThemedText type="smallBold" themeColor="primary" style={styles.position}>
        {position}
      </ThemedText>
      <ThemedView type="backgroundElement" style={styles.rowText}>
        <ThemedText type="smallBold">{exercise.name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {exercise.targetSets} series × {exercise.targetReps} reps · {weight}
        </ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: 12,
    gap: Spacing.three,
  },
  position: {
    fontSize: 18,
    width: 20,
    textAlign: 'center',
  },
  rowText: {
    flex: 1,
    gap: Spacing.half,
  },
});
