import { Stack, useLocalSearchParams } from 'expo-router';
import { FlatList, StyleSheet } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getRoutineById } from '@/data/mock-routines';
import type { RoutineExercise } from '@/types';

/**
 * Detalle de una rutina. El [id] del nombre del archivo es un parámetro:
 * al abrir /routine/2, `id` vale "2".
 */
export default function RoutineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const routine = getRoutineById(id);

  if (!routine) {
    return <EmptyState title="No encontrada" message="Esta rutina no existe." />;
  }

  return (
    <ThemedView style={styles.container}>
      {/* Cambia el título de la barra de arriba por el nombre de la rutina */}
      <Stack.Screen options={{ title: routine.name }} />

      <FlatList
        data={routine.exercises}
        keyExtractor={(exercise) => exercise.id}
        renderItem={({ item, index }) => <ExerciseRow exercise={item} position={index + 1} />}
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
