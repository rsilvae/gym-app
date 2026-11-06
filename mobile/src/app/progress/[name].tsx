import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { LineChart } from '@/components/line-chart';
import { ErrorView, LoadingView } from '@/components/query-status';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useExerciseProgressQuery } from '@/hooks/use-workouts';
import type { ProgressPoint } from '@/types';
import { formatDate, formatNumber } from '@/utils/format';

/** Lo que se puede graficar. Se muestra una sola medida a la vez (un solo eje Y). */
type Metric = 'maxWeight' | 'estimatedOneRepMax' | 'volume' | 'maxReps';

const METRICS: { key: Metric; label: string; unit: string; help: string }[] = [
  { key: 'maxWeight', label: 'Peso máx.', unit: 'kg', help: 'El peso más alto que levantaste ese día.' },
  {
    key: 'estimatedOneRepMax',
    label: '1RM est.',
    unit: 'kg',
    help: 'Lo que podrías levantar 1 vez, estimado con tus series (fórmula de Epley). Sirve para comparar días con distintas reps.',
  },
  { key: 'volume', label: 'Volumen', unit: 'kg', help: 'Suma de peso × reps de todas las series.' },
  { key: 'maxReps', label: 'Reps máx.', unit: 'reps', help: 'Más repeticiones en una sola serie.' },
];

/** "6 nov" (sin día de la semana) para el eje X. */
function formatShortDate(ms: number) {
  return new Date(ms).toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

/** Pantalla de progreso de un ejercicio: /progress/<nombre>. */
export default function ExerciseProgressScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const { data: points, isPending, error, refetch } = useExerciseProgressQuery(name);

  return (
    <>
      <Stack.Screen options={{ title: name }} />
      {isPending ? (
        <LoadingView />
      ) : error ? (
        <ErrorView error={error} onRetry={refetch} />
      ) : (
        <ProgressView points={points} />
      )}
    </>
  );
}

function ProgressView({ points }: { points: ProgressPoint[] }) {
  const theme = useTheme();
  // Ejercicios sin peso (dominadas, fondos...): lo útil son las reps
  const isBodyweight = points.every((point) => point.maxWeight === 0);
  const [metric, setMetric] = useState<Metric>(isBodyweight ? 'maxReps' : 'maxWeight');
  // null = el último punto (el más reciente)
  const [selected, setSelected] = useState<number | null>(null);

  if (points.length === 0) {
    return (
      <ThemedView style={styles.empty}>
        <ThemedText themeColor="textSecondary">Todavía no hay entrenamientos con este ejercicio.</ThemedText>
      </ThemedView>
    );
  }

  const config = METRICS.find((item) => item.key === metric) ?? METRICS[0];
  const selectedIndex = Math.min(selected ?? points.length - 1, points.length - 1);
  const current = points[selectedIndex];
  const values = points.map((point) => point[metric]);
  const best = Math.max(...values);
  const change = values[values.length - 1] - values[0];
  const format = (value: number) => `${formatNumber(value)} ${config.unit}`;

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
        {/* Elegir qué graficar */}
        <View style={styles.chips}>
          {METRICS.filter((item) => !(isBodyweight && item.unit === 'kg')).map((item) => {
            const active = item.key === metric;
            return (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setMetric(item.key)}
                style={[styles.chip, { backgroundColor: active ? theme.text : theme.backgroundElement }]}>
                <ThemedText type="smallBold" style={{ color: active ? theme.background : theme.text }}>
                  {item.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        <ThemedView type="backgroundElement" style={styles.card}>
          {/* El punto elegido (al tocar el gráfico), o el último */}
          <ThemedText type="small" themeColor="textSecondary">
            {config.label} · {formatDate(current.finishedAt)}
          </ThemedText>
          <ThemedText type="subtitle">{format(current[metric])}</ThemedText>

          <LineChart
            data={points.map((point) => ({ x: new Date(point.finishedAt).getTime(), y: point[metric] }))}
            selectedIndex={selectedIndex}
            onSelect={setSelected}
            formatY={formatNumber}
            formatX={formatShortDate}
            accessibilityLabel={`Gráfico de ${config.label}: de ${format(values[0])} a ${format(values[values.length - 1])} en ${points.length} entrenamientos. Mejor: ${format(best)}.`}
          />
          <ThemedText type="small" themeColor="textSecondary">
            {config.help} Toca el gráfico para ver cada día.
          </ThemedText>
        </ThemedView>

        {/* Resumen en números */}
        <View style={styles.stats}>
          <Stat label="Mejor" value={format(best)} />
          <Stat
            label="Desde el inicio"
            value={points.length > 1 ? `${change >= 0 ? '+' : '−'}${format(Math.abs(change))}` : '—'}
          />
          <Stat label="Entrenamientos" value={String(points.length)} />
        </View>

        {/* La misma información en forma de lista (más reciente primero) */}
        <ThemedText type="smallBold">Entrenamientos</ThemedText>
        {[...points].reverse().map((point) => (
          <Pressable
            key={point.workoutId}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/workout-detail/[id]', params: { id: point.workoutId } })}
            style={({ pressed }) => pressed && styles.pressed}>
            <ThemedView type="backgroundElement" style={styles.row}>
              <ThemedText type="small">{formatDate(point.finishedAt)}</ThemedText>
              <ThemedText type="smallBold">{format(point[metric])}</ThemedText>
            </ThemedView>
          </Pressable>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <ThemedView type="backgroundElement" style={styles.stat}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold">{value}</ThemedText>
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
  empty: {
    flex: 1,
    padding: Spacing.four,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 999,
  },
  card: {
    padding: Spacing.three,
    borderRadius: 16,
    gap: Spacing.one,
  },
  stats: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  stat: {
    flex: 1,
    padding: Spacing.three,
    borderRadius: 12,
    gap: Spacing.half,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Spacing.three,
    borderRadius: 12,
  },
  pressed: {
    opacity: 0.6,
  },
});
