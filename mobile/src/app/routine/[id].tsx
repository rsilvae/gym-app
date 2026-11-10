import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, FlatList, Pressable, StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { ErrorView, LoadingView } from '@/components/query-status';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useDeleteRoutine, useRoutineQuery } from '@/hooks/use-routines';
import { useWorkoutDraft } from '@/hooks/use-workout-draft';
import type { RoutineExercise } from '@/types';

/**
 * Detalle de una rutina. El [id] del nombre del archivo es un parámetro:
 * al abrir /routine/abc123, `id` vale "abc123".
 */
export default function RoutineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: routine, isPending, error, refetch } = useRoutineQuery(id);
  const deleteRoutine = useDeleteRoutine();
  const { draft, clearDraft } = useWorkoutDraft();
  const hasDraftForThisRoutine = draft?.state.routineId === id;

  if (isPending) return <LoadingView />;
  if (error) return <ErrorView error={error} onRetry={refetch} />;

  function openWorkout(routineId: string) {
    router.push({ pathname: '/workout/[routineId]', params: { routineId } });
  }

  /** Solo puede haber un entrenamiento en curso: si hay otro sin terminar, preguntamos. */
  function startWorkout() {
    if (!draft || hasDraftForThisRoutine) {
      openWorkout(id);
      return;
    }
    const otherRoutineId = draft.state.routineId;
    Alert.alert(
      'Tienes un entrenamiento sin terminar',
      `"${draft.state.routineName}" sigue en curso. ¿Qué quieres hacer?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: `Continuar "${draft.state.routineName}"`, onPress: () => openWorkout(otherRoutineId) },
        {
          text: 'Descartarlo y empezar este',
          style: 'destructive',
          onPress: async () => {
            await clearDraft();
            openWorkout(id);
          },
        },
      ],
    );
  }

  function confirmDelete() {
    Alert.alert('Eliminar rutina', `¿Seguro que quieres eliminar "${routine?.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () =>
          deleteRoutine.mutate(id, {
            onSuccess: () => router.back(),
            onError: (err) => Alert.alert('No se pudo eliminar', err.message),
          }),
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
        ListHeaderComponent={
          <Button
            title={hasDraftForThisRoutine ? 'Continuar entrenamiento' : 'Empezar entrenamiento'}
            disabled={routine.exercises.length === 0}
            onPress={startWorkout}
          />
        }
        ListFooterComponent={
          <Button
            title={deleteRoutine.isPending ? 'Eliminando...' : 'Eliminar rutina'}
            variant="danger"
            disabled={deleteRoutine.isPending}
            onPress={confirmDelete}
          />
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
  // Ej: "1 calentamiento · 1 al fallo" (solo si la rutina tiene series especiales)
  const types = exercise.setTypes?.slice(0, exercise.targetSets) ?? [];
  const special = (
    [
      ['WARMUP', 'calentamiento', 'calentamiento'],
      ['FAILURE', 'al fallo', 'al fallo'],
      ['DROPSET', 'dropset', 'dropsets'],
    ] as const
  )
    .map(([type, one, many]) => {
      const count = types.filter((item) => item === type).length;
      return count > 0 ? `${count} ${count === 1 ? one : many}` : null;
    })
    .filter(Boolean)
    .join(' · ');

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
        {special !== '' && (
          <ThemedText type="small" themeColor="textSecondary">
            {special}
          </ThemedText>
        )}
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
