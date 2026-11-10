import * as Haptics from 'expo-haptics';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useReducer, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ExercisePicker } from '@/components/exercise-picker';
import { ErrorView, LoadingView } from '@/components/query-status';
import { RestDurationField } from '@/components/rest-duration-field';
import { RestTimerBar } from '@/components/rest-timer-bar';
import { SetRow, SetRowHeader } from '@/components/set-row';
import { SetTypeMenu } from '@/components/set-type-menu';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { setLabels } from '@/constants/set-types';
import { Spacing } from '@/constants/theme';
import {
  createWorkoutState,
  getProgress,
  hasRoutineChanges,
  suggestionFor,
  toRoutineInput,
  toWorkoutInput,
  workoutReducer,
  type ActiveExercise,
  type SetSuggestion,
  type WorkoutState,
} from '@/features/workout/workout-reducer';
import { useCatalogById, useCatalogQuery } from '@/hooks/use-catalog';
import { formatDuration, useElapsedTime } from '@/hooks/use-elapsed-time';
import { useRestTimer, type RunningRest } from '@/hooks/use-rest-timer';
import { useRoutineQuery, useUpdateRoutine } from '@/hooks/use-routines';
import { useTheme } from '@/hooks/use-theme';
import { useWorkoutDraft } from '@/hooks/use-workout-draft';
import { useLastPerformanceQuery, useSaveWorkout } from '@/hooks/use-workouts';
import type { CatalogExercise, SetType } from '@/types';
import { formatRelativeDay, formatSet } from '@/utils/format';
import { normalizeText } from '@/utils/search';

const DEFAULT_REST_SECONDS = 90;

/**
 * Pantalla del entrenamiento en curso: /workout/<id de la rutina>.
 *
 * - Si hay un borrador guardado de ESTA rutina (la app se cerró a mitad), lo retoma.
 * - Si no, busca la rutina y empieza un entrenamiento nuevo.
 *
 * (Se separa en dos componentes porque los hooks como useReducer
 * no pueden ir después de un "return" condicional.)
 */
export default function WorkoutScreen() {
  const { routineId } = useLocalSearchParams<{ routineId: string }>();
  const { draft, isLoading: isDraftLoading } = useWorkoutDraft();
  const resumable = draft?.state.routineId === routineId ? draft : null;
  const { data: routine, isPending, error, refetch } = useRoutineQuery(routineId);

  if (isDraftLoading) return <LoadingView />;
  if (resumable) {
    return (
      <ActiveWorkout
        initialState={resumable.state}
        initialRestSeconds={resumable.restSeconds}
        initialRest={resumable.rest ?? null}
      />
    );
  }

  if (isPending) return <LoadingView />;
  if (error) return <ErrorView error={error} onRetry={refetch} />;

  return (
    <ActiveWorkout
      initialState={createWorkoutState(routine)}
      initialRestSeconds={DEFAULT_REST_SECONDS}
      initialRest={null}
    />
  );
}

type ActiveWorkoutProps = {
  initialState: WorkoutState;
  initialRestSeconds: number;
  /** Descanso que estaba corriendo cuando se cerró la app (si había). */
  initialRest: RunningRest | null;
};

function ActiveWorkout({ initialState, initialRestSeconds, initialRest }: ActiveWorkoutProps) {
  const theme = useTheme();
  // useReducer(reducer, estado inicial). Solo se usa la primera vez que se muestra la pantalla.
  const [state, dispatch] = useReducer(workoutReducer, initialState);
  const elapsed = useElapsedTime(state.startedAt);
  const { completed, total } = getProgress(state);
  const progress = total > 0 ? completed / total : 0;
  const restTimer = useRestTimer({ restSeconds: initialRestSeconds, running: initialRest });

  const { saveDraft, clearDraft } = useWorkoutDraft();
  const restSeconds = restTimer.restSeconds;
  const runningRest = restTimer.running;
  // Cada vez que cambia algo (una serie, un peso, el descanso), se guarda en el celular.
  // Así, si la app se cierra, no pierdes lo que llevabas, ni el descanso que estaba corriendo.
  // (No depende de los segundos restantes: el descanso se guarda por su hora de término,
  // así que solo se guarda al empezarlo, ajustarlo, saltarlo o cuando termina.)
  useEffect(() => {
    saveDraft(state, restSeconds, runningRest);
    // saveDraft cambia en cada render; solo queremos guardar cuando cambian los datos
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, restSeconds, runningRest]);

  const saveWorkout = useSaveWorkout();
  // La rutina tal como está guardada: para ver si hoy le cambiaste algo (series, ejercicios)
  const { data: routine } = useRoutineQuery(state.routineId);
  const updateRoutine = useUpdateRoutine(state.routineId);
  /** El menú de tipo de serie (al tocar el número de una serie). */
  const [typeMenu, setTypeMenu] = useState<{
    exerciseId: string;
    setId: string;
    title: string;
    current: SetType;
    normalLabel: string;
  } | null>(null);
  const catalog = useCatalogQuery();
  const catalogById = useCatalogById();
  /** El selector de ejercicios: para agregar, o para reemplazar uno. */
  const [picker, setPicker] = useState<{ kind: 'add' } | { kind: 'replace'; exerciseId: string } | null>(null);
  const replacingExercise =
    picker?.kind === 'replace' ? state.exercises.find((exercise) => exercise.id === picker.exerciseId) : undefined;
  // "La última vez" de cada ejercicio de la rutina (si ya los hiciste antes)
  const { data: lastPerformance } = useLastPerformanceQuery(state.exercises.map((exercise) => exercise.name));

  function confirmCancel() {
    Alert.alert('Cancelar entrenamiento', 'Se perderá lo que registraste. ¿Salir?', [
      { text: 'Seguir entrenando', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: () => {
          void clearDraft();
          router.back();
        },
      },
    ]);
  }

  /** Guarda en la API y, si sale bien, abre el detalle del entrenamiento guardado. */
  /**
   * `withRoutineUpdate`: además, guarda en la rutina los cambios de hoy (series agregadas o
   * quitadas, su tipo, ejercicios nuevos...) para que la próxima vez arranque así.
   */
  function finishWorkout(withRoutineUpdate = false) {
    const finishedAt = Date.now();
    const duration = formatDuration(finishedAt - state.startedAt);
    const routineInput = withRoutineUpdate && routine ? toRoutineInput(state, routine) : null;

    saveWorkout.mutate(toWorkoutInput(state, finishedAt), {
      onSuccess: ({ id }) => {
        // Ya quedó guardado en la API: el borrador del celular ya no hace falta
        void clearDraft();
        if (routineInput) {
          updateRoutine.mutate(routineInput, {
            onError: (error) =>
              Alert.alert(
                'No se pudo actualizar la rutina',
                `El entrenamiento sí se guardó, pero la rutina quedó como estaba.

${error.message}`,
              ),
          });
        }
        Alert.alert('¡Buen trabajo! 💪', `Hiciste ${completed} de ${total} series en ${duration}.`);
        // replace: "atrás" desde el detalle vuelve a la rutina, no al entrenamiento terminado
        router.replace({ pathname: '/workout-detail/[id]', params: { id } });
      },
      onError: (error) =>
        Alert.alert('No se pudo guardar', `${error.message}\n\nTu entrenamiento sigue aquí.`, [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Reintentar', onPress: () => finishWorkout(withRoutineUpdate) },
        ]),
    });
  }

  function confirmFinish() {
    if (saveWorkout.isPending) return;
    if (completed === 0) {
      Alert.alert('Sin series marcadas', 'Marca al menos una serie antes de terminar.');
      return;
    }
    const pending = total - completed;
    const message =
      pending > 0
        ? `Te faltan ${pending} ${pending === 1 ? 'serie' : 'series'}. ¿Terminar igual?`
        : '¿Terminar el entrenamiento?';
    // Si cambiaste series o ejercicios, ofrecemos guardar esos cambios en la rutina
    if (routine && hasRoutineChanges(state, routine)) {
      Alert.alert(
        'Terminar entrenamiento',
        `${message}

Cambiaste series o ejercicios respecto a la rutina. ¿Guardar esos cambios para la próxima vez?`,
        [
          { text: 'Terminar y actualizar rutina', onPress: () => finishWorkout(true) },
          { text: 'Terminar sin cambiar la rutina', onPress: () => finishWorkout(false) },
          { text: 'Seguir entrenando', style: 'cancel' },
        ],
      );
      return;
    }
    Alert.alert('Terminar entrenamiento', message, [
      { text: 'Seguir', style: 'cancel' },
      { text: 'Terminar', onPress: () => finishWorkout() },
    ]);
  }

  /** El ejercicio del catálogo que corresponde (por id, o por nombre en borradores viejos). */
  function catalogExerciseFor(exercise: ActiveExercise): CatalogExercise {
    const found =
      (exercise.catalogId ? catalogById.get(exercise.catalogId) : undefined) ??
      catalog.data?.find((item) => normalizeText(item.name) === normalizeText(exercise.name));
    // Si no está en el catálogo, uno "provisorio" para que Similares busque por el nombre
    return (
      found ?? {
        id: `name:${exercise.name}`,
        name: exercise.name,
        primaryMuscle: 'OTHER',
        secondaryMuscles: [],
        equipment: 'OTHER',
        isCustom: true,
      }
    );
  }

  function handlePicked(picked: CatalogExercise[]) {
    if (!picker) return;
    if (picker.kind === 'add') {
      dispatch({
        type: 'ADD_EXERCISES',
        exercises: picked.map((exercise) => ({ catalogId: exercise.id, name: exercise.name })),
      });
    } else if (picked[0]) {
      dispatch({
        type: 'REPLACE_EXERCISE',
        exerciseId: picker.exerciseId,
        exercise: { catalogId: picked[0].id, name: picked[0].name },
      });
    }
  }

  function confirmRemoveExercise(exercise: ActiveExercise) {
    Alert.alert('Eliminar ejercicio', `¿Quitar ${exercise.name} de este entrenamiento?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => dispatch({ type: 'REMOVE_EXERCISE', exerciseId: exercise.id }),
      },
    ]);
  }

  function startReplace(exercise: ActiveExercise) {
    const open = () => setPicker({ kind: 'replace', exerciseId: exercise.id });
    if (!exercise.sets.some((set) => set.completed)) return open();
    Alert.alert('Reemplazar ejercicio', 'Ya marcaste series de este ejercicio. Al reemplazarlo se borran.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Reemplazar', style: 'destructive', onPress: open },
    ]);
  }

  /** Menú "•••" de cada ejercicio. */
  function openExerciseMenu(exercise: ActiveExercise) {
    Alert.alert(exercise.name, undefined, [
      { text: 'Reemplazar ejercicio', onPress: () => startReplace(exercise) },
      { text: 'Eliminar ejercicio', style: 'destructive', onPress: () => confirmRemoveExercise(exercise) },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  /** Marca o desmarca una serie. Al marcarla como hecha, empieza el descanso. */
  function toggleSet(exercise: ActiveExercise, setId: string, wasCompleted: boolean, fill: SetSuggestion) {
    dispatch({ type: 'TOGGLE_SET', exerciseId: exercise.id, setId, fill });
    if (!wasCompleted) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      restTimer.start();
    }
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
                {saveWorkout.isPending ? 'Guardando...' : 'Terminar'}
              </ThemedText>
            </Pressable>
          ),
        }}
      />

      <ScrollView
        // Con el descanso en pantalla, dejamos espacio abajo para que la barra no tape el último botón
        contentContainerStyle={[styles.content, restTimer.isRunning && styles.contentWithTimer]}
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

          {/* Duración del descanso que empieza al marcar cada serie */}
          <View style={styles.restRow}>
            <ThemedText type="small" themeColor="textSecondary">
              Descanso entre series
            </ThemedText>
            <RestDurationField seconds={restTimer.restSeconds} onChange={restTimer.setDefaultRest} />
          </View>
        </ThemedView>

        {/* Un bloque por ejercicio */}
        {state.exercises.map((exercise) => {
          const done = exercise.sets.length > 0 && exercise.sets.every((set) => set.completed);
          const last = lastPerformance?.[exercise.name];
          return (
            <ThemedView key={exercise.id} type="backgroundElement" style={styles.card}>
              <View style={styles.exerciseHeader}>
                <ThemedText
                  type="smallBold"
                  themeColor={done ? 'primary' : 'text'}
                  style={[styles.exerciseName, styles.flex]}>
                  {done ? '✓ ' : ''}
                  {exercise.name}
                </ThemedText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Opciones de ${exercise.name}`}
                  hitSlop={12}
                  onPress={() => openExerciseMenu(exercise)}
                  style={styles.menuButton}>
                  <ThemedText type="smallBold" themeColor="primary">
                    •••
                  </ThemedText>
                </Pressable>
              </View>
              {last && (
                <ThemedText type="small" themeColor="textSecondary">
                  Última vez: {formatRelativeDay(last.finishedAt)}
                </ThemedText>
              )}

              <SetRowHeader />
              {exercise.sets.map((set, index, sets) => {
                const label = setLabels(sets.map((item) => item.type))[index];
                const previousSet = last?.sets[index];
                const suggestion = suggestionFor(set, index, last?.sets);
                return (
                  <SetRow
                    key={set.id}
                    number={index + 1}
                    label={label}
                    set={set}
                    previous={previousSet ? formatSet(previousSet) : null}
                    suggestion={suggestion}
                    onChangeWeight={(value) =>
                      dispatch({ type: 'UPDATE_SET', exerciseId: exercise.id, setId: set.id, field: 'weight', value })
                    }
                    onChangeReps={(value) =>
                      dispatch({ type: 'UPDATE_SET', exerciseId: exercise.id, setId: set.id, field: 'reps', value })
                    }
                    onToggle={() => toggleSet(exercise, set.id, set.completed, suggestion)}
                    onPressPrevious={() =>
                      previousSet &&
                      dispatch({
                        type: 'FILL_SET',
                        exerciseId: exercise.id,
                        setId: set.id,
                        values: { weight: String(previousSet.weight), reps: String(previousSet.reps) },
                      })
                    }
                    onPressNumber={() =>
                      setTypeMenu({
                        exerciseId: exercise.id,
                        setId: set.id,
                        title: `Serie ${index + 1} · ${exercise.name}`,
                        current: set.type ?? 'NORMAL',
                        // El número que tendría si fuera normal
                        normalLabel: setLabels(
                          sets.map((item) => (item.id === set.id ? 'NORMAL' : item.type)),
                        )[index],
                      })
                    }
                    onLongPressNumber={() => confirmRemoveSet(exercise, set.id, index + 1)}
                  />
                );
              })}

              <Button
                title="+ Agregar serie"
                variant="secondary"
                compact
                onPress={() => dispatch({ type: 'ADD_SET', exerciseId: exercise.id })}
              />
            </ThemedView>
          );
        })}

        {state.exercises.length === 0 && (
          <ThemedText themeColor="textSecondary" style={styles.hint}>
            No hay ejercicios. Agrega alguno para empezar.
          </ThemedText>
        )}

        <Button title="+ Agregar ejercicios" variant="secondary" onPress={() => setPicker({ kind: 'add' })} />

        <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
          Los números en gris son lo que hiciste la última vez: si no escribes nada, se usan al marcar la serie.
          Toca el número de una serie para marcarla como calentamiento (W), al fallo (F) o dropset (D), o para
          quitarla. Toca «Anterior» para copiarlo y usa ••• para reemplazar o eliminar un ejercicio.
        </ThemedText>

        <Button
          title={saveWorkout.isPending ? 'Guardando...' : 'Terminar entrenamiento'}
          disabled={saveWorkout.isPending}
          onPress={confirmFinish}
        />
      </ScrollView>

      <RestTimerBar timer={restTimer} />

      <SetTypeMenu
        visible={typeMenu !== null}
        title={typeMenu?.title ?? ''}
        current={typeMenu?.current ?? 'NORMAL'}
        normalLabel={typeMenu?.normalLabel ?? '1'}
        onClose={() => setTypeMenu(null)}
        onSelect={(setType) =>
          typeMenu && dispatch({ type: 'SET_TYPE', exerciseId: typeMenu.exerciseId, setId: typeMenu.setId, setType })
        }
        // Ya lo eligió en el menú: se quita sin otra confirmación
        onRemove={() =>
          typeMenu && dispatch({ type: 'REMOVE_SET', exerciseId: typeMenu.exerciseId, setId: typeMenu.setId })
        }
      />

      <ExercisePicker
        // Un key distinto por ejercicio: así el selector arranca limpio (y con "Similares") cada vez
        key={picker?.kind === 'replace' ? `replace-${picker.exerciseId}` : 'add'}
        visible={picker !== null}
        onClose={() => setPicker(null)}
        onAdd={handlePicked}
        alreadyAdded={new Set(state.exercises.flatMap((exercise) => exercise.catalogId ?? []))}
        addedLabel="Ya en el entrenamiento"
        replacing={replacingExercise ? catalogExerciseFor(replacingExercise) : null}
      />
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
  contentWithTimer: {
    paddingBottom: 160,
  },
  restRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.one,
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
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
  menuButton: {
    paddingHorizontal: Spacing.one,
  },
  hint: {
    textAlign: 'center',
  },
});
