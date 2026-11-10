import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ErrorView, LoadingView } from '@/components/query-status';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SET_TYPE_COLOR, setLabels } from '@/constants/set-types';
import { Spacing } from '@/constants/theme';
import { formatDuration } from '@/hooks/use-elapsed-time';
import { useTheme } from '@/hooks/use-theme';
import { useDeleteWorkout, useWorkoutQuery } from '@/hooks/use-workouts';
import { formatDate, formatNumber, formatTime } from '@/utils/format';

/** Detalle de un entrenamiento terminado: cada ejercicio con sus series. */
export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: workout, isPending, error, refetch } = useWorkoutQuery(id);
  const deleteWorkout = useDeleteWorkout();
  const theme = useTheme();

  if (isPending) return <LoadingView />;
  if (error) return <ErrorView error={error} onRetry={refetch} />;

  const duration = formatDuration(
    new Date(workout.finishedAt).getTime() - new Date(workout.startedAt).getTime(),
  );
  const allSets = workout.exercises.flatMap((exercise) => exercise.sets);
  const totalVolume = allSets.reduce((total, set) => total + set.weight * set.reps, 0);

  function confirmDelete() {
    Alert.alert('Eliminar entrenamiento', 'Se borrará del historial. ¿Continuar?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () =>
          deleteWorkout.mutate(id, {
            onSuccess: () => router.back(),
            onError: (err) => Alert.alert('No se pudo eliminar', err.message),
          }),
      },
    ]);
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: workout.routineName }} />

      <ScrollView contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
        {/* Resumen */}
        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="small" themeColor="textSecondary">
            {formatDate(workout.finishedAt)} · {formatTime(workout.startedAt)} – {formatTime(workout.finishedAt)}
          </ThemedText>
          <View style={styles.stats}>
            <Stat label="Duración" value={duration} />
            <Stat label="Series" value={String(allSets.length)} />
            <Stat label="Volumen" value={`${formatNumber(totalVolume)} kg`} />
          </View>
        </ThemedView>

        {/* Ejercicios */}
        {workout.exercises.map((exercise, index) => (
          <ThemedView key={`${exercise.name}-${index}`} type="backgroundElement" style={styles.card}>
            {/* Al tocar el nombre se abre el gráfico de progreso de ese ejercicio */}
            <Pressable
              accessibilityRole="button"
              accessibilityHint="Abre el gráfico de progreso"
              onPress={() => router.push({ pathname: '/progress/[name]', params: { name: exercise.name } })}
              style={({ pressed }) => [styles.exerciseHeader, pressed && styles.pressed]}>
              <ThemedText type="smallBold" style={styles.exerciseName}>
                {exercise.name}
              </ThemedText>
              <ThemedText type="small" themeColor="primary">
                Ver progreso ›
              </ThemedText>
            </Pressable>
            {exercise.sets.map((set, setIndex) => {
              // W / F / D con su color; las normales, su número
              const colorKey = SET_TYPE_COLOR[set.type ?? 'NORMAL'];
              const color = colorKey ? theme[colorKey] : undefined;
              return (
                <View key={set.setNumber} style={styles.setRow}>
                  <ThemedText
                    type={color ? 'smallBold' : 'small'}
                    themeColor="textSecondary"
                    style={[styles.setNumber, color && { color }]}>
                    {setLabels(exercise.sets.map((item) => item.type))[setIndex]}
                  </ThemedText>
                  <ThemedText type="small" style={styles.setValue}>
                    {set.weight > 0 ? `${formatNumber(set.weight)} kg` : 'Peso corporal'}
                  </ThemedText>
                  <ThemedText type="small" style={styles.setValue}>
                    {set.reps} reps
                  </ThemedText>
                </View>
              );
            })}
          </ThemedView>
        ))}

        <Button
          title={deleteWorkout.isPending ? 'Eliminando...' : 'Eliminar entrenamiento'}
          variant="danger"
          disabled={deleteWorkout.isPending}
          onPress={confirmDelete}
        />
      </ScrollView>
    </ThemedView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold">{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  card: {
    padding: Spacing.three,
    borderRadius: 16,
    gap: Spacing.two,
  },
  stats: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  stat: {
    flex: 1,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.6,
  },
  exerciseName: {
    fontSize: 18,
    lineHeight: 24,
    flexShrink: 1,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  setNumber: {
    width: 20,
    textAlign: 'center',
  },
  setValue: {
    flex: 1,
  },
});
