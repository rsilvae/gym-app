import { router } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getProgress } from '@/features/workout/workout-reducer';
import { useElapsedTime } from '@/hooks/use-elapsed-time';
import { useTheme } from '@/hooks/use-theme';
import { useWorkoutDraft } from '@/hooks/use-workout-draft';
import type { WorkoutDraft } from '@/lib/workout-draft-storage';

/**
 * Aviso en la pestaña Rutinas cuando hay un entrenamiento sin terminar
 * (por ejemplo, porque la app se cerró): permite continuarlo o descartarlo.
 */
export function ActiveWorkoutBanner() {
  const { draft } = useWorkoutDraft();
  if (!draft) return null;
  return <Banner draft={draft} />;
}

function Banner({ draft }: { draft: WorkoutDraft }) {
  const theme = useTheme();
  const { clearDraft } = useWorkoutDraft();
  const elapsed = useElapsedTime(draft.state.startedAt);
  const { completed, total } = getProgress(draft.state);

  function confirmDiscard() {
    Alert.alert('Descartar entrenamiento', `Se perderá lo que registraste en "${draft.state.routineName}".`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Descartar', style: 'destructive', onPress: () => void clearDraft() },
    ]);
  }

  return (
    <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.primary }]}>
      <View>
        <ThemedText type="small" themeColor="primary">
          Entrenamiento en curso
        </ThemedText>
        <ThemedText type="smallBold" style={styles.title}>
          {draft.state.routineName}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {completed}/{total} series · {elapsed}
        </ThemedText>
      </View>
      <View style={styles.actions}>
        <Button title="Descartar" variant="danger" compact onPress={confirmDiscard} />
        <Button
          title="Continuar"
          compact
          onPress={() =>
            router.push({ pathname: '/workout/[routineId]', params: { routineId: draft.state.routineId } })
          }
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    borderRadius: 16,
    borderWidth: 1,
    gap: Spacing.two,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
  },
});
