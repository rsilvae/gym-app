import { Link } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { Routine } from '@/types';

type Props = {
  routine: Routine;
};

/** Tarjeta de una rutina en la lista. Al tocarla abre su detalle. */
export function RoutineCard({ routine }: Props) {
  const exerciseCount = routine.exercises.length;
  const preview = routine.exercises.map((exercise) => exercise.name).join(' · ');

  return (
    <Link href={{ pathname: '/routine/[id]', params: { id: routine.id } }} asChild>
      <Pressable style={({ pressed }) => pressed && styles.pressed}>
        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold" style={styles.name}>
            {routine.name}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {exerciseCount} {exerciseCount === 1 ? 'ejercicio' : 'ejercicios'}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {preview}
          </ThemedText>
        </ThemedView>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    borderRadius: 16,
    gap: Spacing.one,
  },
  name: {
    fontSize: 18,
    lineHeight: 24,
  },
  pressed: {
    opacity: 0.6,
  },
});
