import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { formatDuration } from '@/hooks/use-elapsed-time';
import type { WorkoutSummary } from '@/types';
import { formatDate, formatNumber, formatTime } from '@/utils/format';

/** Tarjeta de un entrenamiento en el historial. Al tocarla abre el detalle. */
export function WorkoutCard({ workout }: { workout: WorkoutSummary }) {
  const duration = formatDuration(
    new Date(workout.finishedAt).getTime() - new Date(workout.startedAt).getTime(),
  );

  return (
    <Link href={{ pathname: '/workout-detail/[id]', params: { id: workout.id } }} asChild>
      <Pressable style={({ pressed }) => pressed && styles.pressed}>
        <ThemedView type="backgroundElement" style={styles.card}>
          <View style={styles.header}>
            <ThemedText type="smallBold" style={styles.name}>
              {workout.routineName}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {formatDate(workout.finishedAt)} · {formatTime(workout.startedAt)}
            </ThemedText>
          </View>

          <View style={styles.stats}>
            <Stat label="Duración" value={duration} />
            <Stat label="Series" value={String(workout.setCount)} />
            <Stat label="Volumen" value={`${formatNumber(workout.totalVolume)} kg`} />
          </View>
        </ThemedView>
      </Pressable>
    </Link>
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
  card: {
    padding: Spacing.three,
    borderRadius: 16,
    gap: Spacing.three,
  },
  header: {
    gap: Spacing.half,
  },
  name: {
    fontSize: 18,
    lineHeight: 24,
  },
  stats: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  stat: {
    flex: 1,
  },
  pressed: {
    opacity: 0.6,
  },
});
