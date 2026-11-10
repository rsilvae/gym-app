import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ExercisePicker, exerciseSubtitle } from '@/components/exercise-picker';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useCatalogById } from '@/hooks/use-catalog';
import type { CatalogExercise, Routine, RoutineInput, SetType } from '@/types';
import { createId } from '@/utils/id';

/**
 * Mientras escribes, los números se guardan como texto (así puedes borrar
 * el campo o escribir "22,5"). Al guardar se convierten a número.
 */
type ExerciseDraft = {
  id: string;
  /** El ejercicio del catálogo. */
  exerciseId: string | null;
  name: string;
  sets: string;
  reps: string;
  weight: string;
  /** Tipos de serie que vienen de la rutina (se editan durante el entrenamiento); se conservan al guardar. */
  setTypes: SetType[];
};

type Props = {
  /** Si viene una rutina, el formulario arranca con sus datos (modo editar). */
  initialRoutine?: Routine;
  submitLabel: string;
  onSubmit: (input: RoutineInput) => void;
  /** true mientras se envía a la API: desactiva el botón para no guardar dos veces. */
  isSubmitting?: boolean;
  /** Mensaje de error que devolvió la API, si lo hubo. */
  submitError?: string | null;
};

/** Un ejercicio recién elegido del catálogo, con valores iniciales que luego ajustas. */
function fromCatalog(exercise: CatalogExercise): ExerciseDraft {
  return { id: createId(), exerciseId: exercise.id, name: exercise.name, sets: '3', reps: '10', weight: '', setTypes: [] };
}

function toDraft(routine?: Routine): ExerciseDraft[] {
  if (!routine) return [];
  return routine.exercises.map((exercise) => ({
    id: exercise.id,
    exerciseId: exercise.exerciseId ?? null,
    name: exercise.name,
    sets: String(exercise.targetSets),
    reps: String(exercise.targetReps),
    weight: exercise.targetWeight > 0 ? String(exercise.targetWeight) : '',
    setTypes: exercise.setTypes ?? [],
  }));
}

/** Convierte texto a número. Acepta coma decimal ("22,5"). Devuelve NaN si no es válido. */
function parseNumber(text: string): number {
  return Number(text.trim().replace(',', '.'));
}

/** Revisa el formulario. Devuelve un mensaje de error, o null si todo está bien. */
function validate(name: string, exercises: ExerciseDraft[]): string | null {
  if (!name.trim()) return 'Ponle un nombre a la rutina.';
  if (exercises.length === 0) return 'Agrega al menos un ejercicio.';

  for (const [index, exercise] of exercises.entries()) {
    const label = `Ejercicio ${index + 1}`;
    const sets = parseNumber(exercise.sets);
    const reps = parseNumber(exercise.reps);
    const weight = exercise.weight.trim() === '' ? 0 : parseNumber(exercise.weight);

    if (!exercise.name.trim()) return `${label}: falta el nombre.`;
    if (!Number.isInteger(sets) || sets < 1) return `${label}: las series deben ser un número entero mayor a 0.`;
    if (!Number.isInteger(reps) || reps < 1) return `${label}: las reps deben ser un número entero mayor a 0.`;
    if (Number.isNaN(weight) || weight < 0) return `${label}: el peso no es válido.`;
  }
  return null;
}

export function RoutineForm({
  initialRoutine,
  submitLabel,
  onSubmit,
  isSubmitting = false,
  submitError = null,
}: Props) {
  const [name, setName] = useState(initialRoutine?.name ?? '');
  const [exercises, setExercises] = useState<ExerciseDraft[]>(() => toDraft(initialRoutine));
  const [error, setError] = useState<string | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const catalogById = useCatalogById();

  /** Cambia un solo campo numérico de un ejercicio, sin tocar los demás. */
  function updateExercise(id: string, field: 'sets' | 'reps' | 'weight', value: string) {
    setExercises((current) =>
      current.map((exercise) => (exercise.id === id ? { ...exercise, [field]: value } : exercise)),
    );
  }

  function addExercises(picked: CatalogExercise[]) {
    setExercises((current) => [...current, ...picked.map(fromCatalog)]);
    setError(null);
  }

  function removeExercise(id: string) {
    setExercises((current) => current.filter((exercise) => exercise.id !== id));
  }

  /** Mueve un ejercicio una posición arriba (-1) o abajo (+1). */
  function moveExercise(index: number, direction: -1 | 1) {
    const target = index + direction;
    setExercises((current) => {
      if (target < 0 || target >= current.length) return current;
      const copy = [...current];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  }

  function handleSubmit() {
    const validationError = validate(name, exercises);
    setError(validationError);
    if (validationError) return;

    onSubmit({
      name: name.trim(),
      exercises: exercises.map((exercise) => ({
        id: exercise.id,
        exerciseId: exercise.exerciseId,
        name: exercise.name.trim(),
        targetSets: parseNumber(exercise.sets),
        targetReps: parseNumber(exercise.reps),
        targetWeight: exercise.weight.trim() === '' ? 0 : parseNumber(exercise.weight),
        // Si bajaste la cantidad de series, se recortan los tipos que sobran
        setTypes: exercise.setTypes.slice(0, parseNumber(exercise.sets)),
      })),
    });
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled">
      <ThemedView type="backgroundElement" style={styles.card}>
        <TextField
          label="Nombre de la rutina"
          placeholder="Ej: Pecho y tríceps"
          value={name}
          onChangeText={setName}
        />
      </ThemedView>

      <ThemedText type="smallBold" style={styles.sectionTitle}>
        Ejercicios
      </ThemedText>

      {exercises.map((exercise, index) => (
        <ThemedView key={exercise.id} type="backgroundElement" style={styles.card}>
          <View style={styles.cardHeader}>
            <ThemedText type="smallBold" themeColor="primary">
              Ejercicio {index + 1}
            </ThemedText>
            <View style={styles.cardActions}>
              <Button
                title="↑"
                variant="secondary"
                compact
                disabled={index === 0}
                accessibilityLabel="Subir ejercicio"
                onPress={() => moveExercise(index, -1)}
              />
              <Button
                title="↓"
                variant="secondary"
                compact
                disabled={index === exercises.length - 1}
                accessibilityLabel="Bajar ejercicio"
                onPress={() => moveExercise(index, 1)}
              />
              <Button
                title="✕"
                variant="danger"
                compact
                accessibilityLabel="Quitar ejercicio"
                onPress={() => removeExercise(exercise.id)}
              />
            </View>
          </View>

          <View>
            <ThemedText>{exercise.name}</ThemedText>
            {exercise.exerciseId && catalogById.get(exercise.exerciseId) && (
              <ThemedText type="small" themeColor="textSecondary">
                {exerciseSubtitle(catalogById.get(exercise.exerciseId)!)}
              </ThemedText>
            )}
          </View>

          <View style={styles.numbersRow}>
            <TextField
              label="Series"
              keyboardType="number-pad"
              value={exercise.sets}
              onChangeText={(text) => updateExercise(exercise.id, 'sets', text)}
              style={styles.numberField}
            />
            <TextField
              label="Reps"
              keyboardType="number-pad"
              value={exercise.reps}
              onChangeText={(text) => updateExercise(exercise.id, 'reps', text)}
              style={styles.numberField}
            />
            <TextField
              label="Peso (kg)"
              placeholder="0"
              keyboardType="decimal-pad"
              value={exercise.weight}
              onChangeText={(text) => updateExercise(exercise.id, 'weight', text)}
              style={styles.numberField}
            />
          </View>
        </ThemedView>
      ))}

      {exercises.length === 0 && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
          Todavía no hay ejercicios. Agrégalos desde el catálogo.
        </ThemedText>
      )}

      <Button title="+ Agregar ejercicios" variant="secondary" onPress={() => setIsPickerOpen(true)} />

      <ExercisePicker
        visible={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onAdd={addExercises}
        alreadyAdded={new Set(exercises.flatMap((exercise) => exercise.exerciseId ?? []))}
      />

      {(error ?? submitError) && (
        <ThemedText type="small" style={styles.error}>
          {error ?? submitError}
        </ThemedText>
      )}

      <Button
        title={isSubmitting ? 'Guardando...' : submitLabel}
        disabled={isSubmitting}
        onPress={handleSubmit}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  sectionTitle: {
    marginTop: Spacing.two,
  },
  card: {
    padding: Spacing.three,
    borderRadius: 16,
    gap: Spacing.three,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  numbersRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  numberField: {
    flex: 1,
  },
  error: {
    color: '#E5484D',
    textAlign: 'center',
  },
  empty: {
    textAlign: 'center',
  },
});
