import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useReducer } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ErrorView, LoadingView } from '@/components/query-status';
import { SetRow, SetRowHeader } from '@/components/set-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import {
  createWorkoutState,
  getProgress,
  workoutReducer,
  type ActiveExercise,
} from '@/features/workout/workout-reducer';
import { formatDuration, useElapsedTime } from '@/hooks/use-elapsed-time';
import { useRoutineQuery } from '@/hooks/use-routines';
import { useTheme } from '@/hooks/use-theme';
import type { Routine } from '@/types';

/**
 * Pantalla del entrenamiento en curso: /workout/<id de la rutina>.
 * Busca la rutina y, si existe, muestra <ActiveWorkout>.
 * (Se separa en dos componentes porque los hooks como useReducer
 * no pueden ir después de un "return" condicional.)
 */
export default function WorkoutScreen() {
  const { routineId } = useLocalSearchParams<{ routineId: string }>();
  const { data: routine, isPending, error, refetch } = useRoutineQuery(routineId);

  if (isPending) return <LoadingView />;
  if (error) return <ErrorView error={error} onRetry={refetch} />;

  return <ActiveWorkout routine={routine} />;
}

function ActiveWorkout({ routine }: { routine: Routine }) {
  const theme = useTheme();
  // useReducer(reducer, argumento, función que crea el estado inicial)
  const [state, dispatch] = useReducer(workoutReducer, routine, createWorkoutState);
  const elapsed = useElapsedTime(state.startedAt);
  const { completed, total } = getProgress(state);
  const progress = total > 0 ? completed / total : 0;

  function confirmCancel() {
    Alert.alert('Cancelar entrenamiento', 'Se perderá lo que registraste. ¿Salir?', [
      { text: 'Seguir entrenando', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: () => router.back() },
    ]);
  }

  function finishWorkout() {
    const duration = formatDuration(Date.now() - state.startedAt);
    Alert.alert('¡Buen trabajo! 💪', `Hiciste ${completed} de ${total} series en ${duration}.`, [
      { text: 'Listo', onPress: () => router.back() },
    ]);
  }

  function confirmFinish() {
    if (completed === 0) {
      Alert.alert('Sin series marcadas', 'Marca al menos una serie antes de terminar.');
      return;
    }
    const pending = total - completed;
    const message =
      pending > 0
        ? `Te faltan ${pending} ${pending === 1 ? 'serie' : 'series'}. ¿Terminar igual?`
        : '¿Terminar el entrenamiento?';
    Alert.alert('Terminar entrenamiento', message, [
      { text: 'Seguir', style: 'cancel' },
      { text: 'Terminar', onPress: finishWorkout },
    ]);
  }

  function confirmRemoveSet(exercise: ActiveExercise, setId: string, number: number) {
    Alert.alert('Quitar serie', `¿Quitar la serie ${number} de ${exercise.name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar',
        style: 'destructive',
        onPress: () => dispatch({ type: 'REMOVE_SET', exerciseId: exercise.id, setId }),
      },
    ]);
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: state.routineName,
          headerLeft: () => (
            <Pressable accessibilityRole="button" hitSlop={12} onPress={confirmCancel}>
              <ThemedText themeColor="textSecondary">Cancelar</ThemedText>
            </Pressable>
          ),
          headerRight: () => (
            <Pressable accessibilityRole="button" hitSlop={12} onPress={confirmFinish}>
              <ThemedText type="smallBold" themeColor="primary" style={styles.headerAction}>
                Terminar
              </ThemedText>
            </Pressable>
          ),
        }}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled">
        {/* Resumen: tiempo y progreso */}
        <ThemedView type="backgroundElement" style={styles.card}>
          <View style={styles.summaryRow}>
            <View>
              <ThemedText type="small" themeColor="textSecondary">
                Tiempo
              </ThemedText>
              <ThemedText type="subtitle">{elapsed}</ThemedText>
            </View>
            <View style={styles.summaryRight}>
              <ThemedText type="small" themeColor="textSecondary">
                Series
              </ThemedText>
              <ThemedText type="subtitle">
                {completed}/{total}
              </ThemedText>
            </View>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: theme.backgroundSelected }]}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress * 100}%`, backgroundColor: theme.primary },
              ]}
            />
          </View>
        </ThemedView>

        {/* Un bloque por ejercicio */}
        {state.exercises.map((exercise) => {
          const done = exercise.sets.length > 0 && exercise.sets.every((set) => set.completed);
          return (
            <ThemedView key={exercise.id} type="backgroundElement" style={styles.card}>
              <ThemedText type="smallBold" themeColor={done ? 'primary' : 'text'} style={styles.exerciseName}>
                {done ? '✓ ' : ''}
                {exercise.name}
              </ThemedText>

              <SetRowHeader />
              {exercise.sets.map((set, index) => (
                <SetRow
                  key={set.id}
                  number={index + 1}
                  set={set}
                  onChangeWeight={(value) =>
                    dispatch({ type: 'UPDATE_SET', exerciseId: exercise.id, setId: set.id, field: 'weight', value })
                  }
                  onChangeReps={(value) =>
                    dispatch({ type: 'UPDATE_SET', exerciseId: exercise.id, setId: set.id, field: 'reps', value })
                  }
                  onToggle={() => dispatch({ type: 'TOGGLE_SET', exerciseId: exercise.id, setId: set.id })}
                  onLongPressNumber={() => confirmRemoveSet(exercise, set.id, index + 1)}
                />
              ))}

              <Button
                title="+ Agregar serie"
                variant="secondary"
                compact
                onPress={() => dispatch({ type: 'ADD_SET', exerciseId: exercise.id })}
              />
            </ThemedView>
          );
        })}

        <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
          Mantén presionado el número de una serie para quitarla.
        </ThemedText>

        <Button title="Terminar entrenamiento" onPress={confirmFinish} />
      </ScrollView>
    </ThemedView>
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
  headerAction: {
    fontSize: 16,
  },
  card: {
    padding: Spacing.three,
    borderRadius: 16,
    gap: Spacing.two,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryRight: {
    alignItems: 'flex-end',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  exerciseName: {
    fontSize: 18,
    lineHeight: 24,
  },
  hint: {
    textAlign: 'center',
  },
});
