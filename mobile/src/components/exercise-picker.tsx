import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { EQUIPMENT_LABELS, EQUIPMENTS, MUSCLE_LABELS, MUSCLES } from '@/constants/exercises';
import { Spacing } from '@/constants/theme';
import { useCatalogQuery, useCreateExercise } from '@/hooks/use-catalog';
import { useTheme } from '@/hooks/use-theme';
import { useExercisesQuery } from '@/hooks/use-workouts';
import { ApiError } from '@/lib/api-client';
import type { CatalogExercise, Equipment, MuscleGroup } from '@/types';
import { matchesSearch, normalizeText } from '@/utils/search';
import { findSimilarExercises } from '@/utils/similar';

const MAX_RECENT = 8;

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Los ejercicios elegidos, en el orden en que se marcaron. */
  onAdd: (exercises: CatalogExercise[]) => void;
  /** Ids que ya están en la rutina (se marcan con `addedLabel`). */
  alreadyAdded: Set<string>;
  /** Texto para los que ya están. Por defecto "Ya en la rutina". */
  addedLabel?: string;
  /**
   * Modo reemplazar: se elige UN ejercicio (tocarlo basta) y aparece el filtro
   * "Similares" con los parecidos a este, ya seleccionado.
   */
  replacing?: CatalogExercise | null;
};

/** El filtro de músculo, más "Similares" (solo al reemplazar). */
type MuscleFilter = MuscleGroup | 'SIMILAR';
const MUSCLE_FILTER_LABELS: Record<MuscleFilter, string> = { ...MUSCLE_LABELS, SIMILAR: '≈ Similares' };

/** "Pecho · Barra" */
export function exerciseSubtitle(exercise: Pick<CatalogExercise, 'primaryMuscle' | 'equipment'>) {
  return `${MUSCLE_LABELS[exercise.primaryMuscle]} · ${EQUIPMENT_LABELS[exercise.equipment]}`;
}

/**
 * Pantalla para elegir ejercicios del catálogo (se abre desde el formulario de rutina):
 * buscador, filtros por músculo y equipo, recientes, selección múltiple y
 * "Crear ejercicio" si no está.
 */
export function ExercisePicker({
  visible,
  onClose,
  onAdd,
  alreadyAdded,
  addedLabel = 'Ya en la rutina',
  replacing = null,
}: Props) {
  const theme = useTheme();
  const catalog = useCatalogQuery();
  const history = useExercisesQuery();
  const initialMuscle: MuscleFilter | null = replacing ? 'SIMILAR' : null;

  const [query, setQuery] = useState('');
  // (Quien lo usa le pone un `key` distinto al reemplazar otro ejercicio, así este estado arranca de nuevo)
  const [muscle, setMuscle] = useState<MuscleFilter | null>(initialMuscle);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  /** Al reemplazar se elige uno solo: tocarlo ya lo elige. */
  function pickOne(exercise: CatalogExercise) {
    onAdd([exercise]);
    close();
  }

  function reset() {
    setQuery('');
    setMuscle(initialMuscle);
    setEquipment(null);
    setSelectedIds([]);
    setIsCreating(false);
  }

  function close() {
    reset();
    onClose();
  }

  function toggle(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  }

  // El texto de búsqueda de cada ejercicio se calcula una sola vez (nombre + músculos + equipo)
  const searchable = useMemo(
    () =>
      (catalog.data ?? []).map((exercise) => ({
        exercise,
        haystack: normalizeText(
          [
            exercise.name,
            MUSCLE_LABELS[exercise.primaryMuscle],
            ...exercise.secondaryMuscles.map((m) => MUSCLE_LABELS[m]),
            EQUIPMENT_LABELS[exercise.equipment],
          ].join(' '),
        ),
      })),
    [catalog.data],
  );

  // Los parecidos al que se reemplaza, ordenados del más parecido al menos
  const similar = useMemo(() => {
    if (!replacing) return [];
    const ids = findSimilarExercises(replacing, catalog.data ?? []).map((exercise) => exercise.id);
    const byId = new Map(searchable.map((item) => [item.exercise.id, item]));
    return ids.flatMap((id) => byId.get(id) ?? []);
  }, [replacing, catalog.data, searchable]);

  const filtered = useMemo(
    () =>
      (muscle === 'SIMILAR' ? similar : searchable)
        .filter(({ exercise }) => !muscle || muscle === 'SIMILAR' || exercise.primaryMuscle === muscle)
        .filter(({ exercise }) => !equipment || exercise.equipment === equipment)
        .filter(({ exercise }) => exercise.id !== replacing?.id)
        .filter(({ haystack }) => matchesSearch(haystack, query))
        .map(({ exercise }) => exercise),
    [searchable, similar, muscle, equipment, query, replacing],
  );

  // Recientes: los que hiciste en tus entrenamientos (el historial guarda el nombre)
  const recent = useMemo(() => {
    const byName = new Map((catalog.data ?? []).map((exercise) => [normalizeText(exercise.name), exercise]));
    const visibleIds = new Set(filtered.map((exercise) => exercise.id));
    return (history.data ?? [])
      .map((item) => byName.get(normalizeText(item.name)))
      .filter((exercise): exercise is CatalogExercise => !!exercise && visibleIds.has(exercise.id))
      .slice(0, MAX_RECENT);
  }, [catalog.data, history.data, filtered]);

  const sections =
    muscle === 'SIMILAR' && replacing
      ? [{ title: `Parecidos a «${replacing.name}» (${filtered.length})`, data: filtered }]
      : [
          ...(recent.length > 0 && !query ? [{ title: 'Recientes', data: recent }] : []),
          { title: query || muscle || equipment ? `Resultados (${filtered.length})` : 'Todos', data: filtered },
        ];

  const exactMatch = filtered.some((exercise) => normalizeText(exercise.name) === normalizeText(query));
  const selectedExercises = selectedIds
    .map((id) => catalog.data?.find((exercise) => exercise.id === id))
    .filter((exercise): exercise is CatalogExercise => !!exercise);

  function renderRow(exercise: CatalogExercise) {
    const selected = selectedIds.includes(exercise.id);
    const inRoutine = alreadyAdded.has(exercise.id);
    return (
      <Pressable
        accessibilityRole={replacing ? 'button' : 'checkbox'}
        accessibilityState={replacing ? undefined : { checked: selected }}
        onPress={() => (replacing ? pickOne(exercise) : toggle(exercise.id))}
        style={[styles.row, { borderBottomColor: theme.backgroundSelected }]}>
        <View style={styles.rowText}>
          <ThemedText>{exercise.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {exerciseSubtitle(exercise)}
            {exercise.isCustom ? ' · Tuyo' : ''}
            {inRoutine ? ` · ${addedLabel}` : ''}
          </ThemedText>
        </View>
        {replacing ? (
          <ThemedText themeColor="textSecondary">›</ThemedText>
        ) : (
        <View
          style={[
            styles.check,
            selected
              ? { backgroundColor: theme.primary, borderColor: theme.primary }
              : { borderColor: theme.textSecondary },
          ]}>
          {selected && <ThemedText style={styles.checkMark}>✓</ThemedText>}
        </View>
        )}
      </Pressable>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.container} edges={['bottom']}>
          <View style={styles.header}>
            <Pressable accessibilityRole="button" onPress={isCreating ? () => setIsCreating(false) : close} hitSlop={8}>
              <ThemedText themeColor="primary">{isCreating ? '‹ Volver' : 'Cancelar'}</ThemedText>
            </Pressable>
            <ThemedText type="smallBold">
              {isCreating ? 'Nuevo ejercicio' : replacing ? 'Reemplazar ejercicio' : 'Añadir ejercicios'}
            </ThemedText>
            <View style={styles.headerSpacer} />
          </View>
          {replacing && !isCreating && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.replacingNote}>
              Elige el ejercicio que harás en vez de «{replacing.name}».
            </ThemedText>
          )}

          {isCreating ? (
            <CreateExerciseForm
              initialName={query}
              onCreated={(exercise) => {
                if (replacing) return pickOne(exercise);
                setSelectedIds((current) => (current.includes(exercise.id) ? current : [...current, exercise.id]));
                setQuery('');
                setIsCreating(false);
              }}
            />
          ) : (
            <>
              <View style={styles.filters}>
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Buscar: press, jalón, cable..."
                  placeholderTextColor={theme.textSecondary}
                  autoCorrect={false}
                  clearButtonMode="while-editing"
                  returnKeyType="search"
                  style={[styles.search, { color: theme.text, backgroundColor: theme.backgroundElement }]}
                />
                <ChipRow<MuscleFilter>
                  options={[...(replacing ? (['SIMILAR'] as const) : []), ...MUSCLES.filter((m) => m !== 'OTHER')]}
                  labels={MUSCLE_FILTER_LABELS}
                  value={muscle}
                  onChange={setMuscle}
                />
                <ChipRow options={EQUIPMENTS} labels={EQUIPMENT_LABELS} value={equipment} onChange={setEquipment} />
              </View>

              {catalog.isPending ? (
                <ActivityIndicator style={styles.loading} color={theme.primary} />
              ) : catalog.error ? (
                <View style={styles.message}>
                  <ThemedText themeColor="textSecondary">No se pudo cargar el catálogo.</ThemedText>
                  <Button title="Reintentar" variant="secondary" onPress={() => void catalog.refetch()} />
                </View>
              ) : (
                <SectionList
                  sections={sections}
                  keyExtractor={(exercise, index) => `${exercise.id}-${index}`}
                  renderItem={({ item }) => renderRow(item)}
                  renderSectionHeader={({ section }) => (
                    <ThemedView style={styles.sectionHeader}>
                      <ThemedText type="small" themeColor="textSecondary">
                        {section.title}
                      </ThemedText>
                    </ThemedView>
                  )}
                  stickySectionHeadersEnabled
                  style={styles.listView}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  contentContainerStyle={styles.list}
                  ListFooterComponent={
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setIsCreating(true)}
                      style={styles.createRow}>
                      <ThemedText themeColor="primary">
                        {query.trim() && !exactMatch ? `+ Crear «${query.trim()}»` : '+ Crear ejercicio propio'}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {filtered.length === 0 ? 'No encontramos ese ejercicio.' : '¿No está el que buscas?'}
                      </ThemedText>
                    </Pressable>
                  }
                />
              )}

              {!replacing && selectedExercises.length > 0 && (
                <View style={styles.footer}>
                  <Button
                    title={`Añadir ${selectedExercises.length} ${selectedExercises.length === 1 ? 'ejercicio' : 'ejercicios'}`}
                    onPress={() => {
                      onAdd(selectedExercises);
                      close();
                    }}
                  />
                </View>
              )}
            </>
          )}
        </SafeAreaView>
      </ThemedView>
    </Modal>
  );
}

/** Fila de filtros que se desliza de lado. Tocar el elegido otra vez lo quita. */
function ChipRow<T extends string>({
  options,
  labels,
  value,
  onChange,
}: {
  options: T[];
  labels: Record<T, string>;
  value: T | null;
  onChange: (value: T | null) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {options.map((option) => (
        <Chip
          key={option}
          label={labels[option]}
          selected={value === option}
          onPress={() => onChange(value === option ? null : option)}
        />
      ))}
    </ScrollView>
  );
}

/** Formulario para crear un ejercicio personalizado: nombre, músculo y equipo. */
function CreateExerciseForm({
  initialName,
  onCreated,
}: {
  initialName: string;
  onCreated: (exercise: CatalogExercise) => void;
}) {
  const createExercise = useCreateExercise();
  const catalog = useCatalogQuery();
  const [name, setName] = useState(initialName.trim());
  const [muscle, setMuscle] = useState<MuscleGroup | null>(null);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [error, setError] = useState<string | null>(null);

  function save() {
    if (name.trim().length < 2) return setError('Escribe el nombre del ejercicio.');
    if (!muscle) return setError('Elige el músculo principal.');
    if (!equipment) return setError('Elige el equipo.');
    setError(null);

    createExercise.mutate(
      { name: name.trim(), primaryMuscle: muscle, equipment },
      {
        onSuccess: onCreated,
        onError: (err) => {
          // Ya existía: usamos ese en vez de crear uno repetido
          const existingId = (err instanceof ApiError && err.status === 409
            ? (err.details as { exerciseId?: string } | undefined)?.exerciseId
            : undefined);
          const existing = existingId && catalog.data?.find((exercise) => exercise.id === existingId);
          if (existing) return onCreated(existing);
          setError(err.message);
        },
      },
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.createForm} keyboardShouldPersistTaps="handled">
      <TextField label="Nombre" placeholder="Remo en base rotativa (Máquina)" value={name} onChangeText={setName} autoFocus />
      <ThemedText type="small" themeColor="textSecondary">
        Músculo principal
      </ThemedText>
      <View style={styles.wrap}>
        {MUSCLES.map((option) => (
          <Chip key={option} label={MUSCLE_LABELS[option]} selected={muscle === option} onPress={() => setMuscle(option)} />
        ))}
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        Equipo
      </ThemedText>
      <View style={styles.wrap}>
        {EQUIPMENTS.map((option) => (
          <Chip
            key={option}
            label={EQUIPMENT_LABELS[option]}
            selected={equipment === option}
            onPress={() => setEquipment(option)}
          />
        ))}
      </View>
      {error && (
        <ThemedText type="small" style={styles.error}>
          {error}
        </ThemedText>
      )}
      <Button
        title={createExercise.isPending ? 'Guardando...' : 'Crear y seleccionar'}
        disabled={createExercise.isPending}
        onPress={save}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
  },
  headerSpacer: {
    width: 60,
  },
  replacingNote: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  filters: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
  search: {
    fontSize: 16,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    borderRadius: 12,
  },
  chips: {
    gap: Spacing.two,
  },
  list: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
  },
  sectionHeader: {
    paddingTop: Spacing.three,
    paddingBottom: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: {
    flex: 1,
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: 700,
  },
  createRow: {
    paddingVertical: Spacing.three,
    gap: Spacing.half,
  },
  footer: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  listView: {
    flex: 1,
  },
  loading: {
    marginTop: Spacing.five,
  },
  message: {
    padding: Spacing.three,
    gap: Spacing.three,
    alignItems: 'center',
  },
  createForm: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  error: {
    color: '#E5484D',
    textAlign: 'center',
  },
});
