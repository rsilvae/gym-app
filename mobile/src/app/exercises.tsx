import { router } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet } from 'react-native';

import { ErrorView, LoadingView } from '@/components/query-status';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useExercisesQuery } from '@/hooks/use-workouts';
import { formatRelativeDay } from '@/utils/format';

/** Progreso: lista de los ejercicios que has hecho. Al tocar uno se abre su gráfico. */
export default function ProgressScreen() {
  const theme = useTheme();
  const { data: exercises, isPending, error, refetch, isRefetching } = useExercisesQuery();

  if (isPending) return <LoadingView />;
  if (error) return <ErrorView error={error} onRetry={refetch} />;

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={exercises}
        keyExtractor={(exercise) => exercise.name}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <ThemedText type="small" themeColor="textSecondary">
            Elige un ejercicio para ver cómo has progresado.
          </ThemedText>
        }
        ListEmptyComponent={
          <ThemedText themeColor="textSecondary">
            Todavía no hay datos. Termina un entrenamiento y aquí verás tu progreso.
          </ThemedText>
        }
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={theme.primary} />
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/progress/[name]', params: { name: item.name } })}
            style={({ pressed }) => pressed && styles.pressed}>
            <ThemedView type="backgroundElement" style={styles.row}>
              <ThemedView type="backgroundElement" style={styles.rowText}>
                <ThemedText type="smallBold">{item.name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {item.sessionCount} {item.sessionCount === 1 ? 'entrenamiento' : 'entrenamientos'} · última vez{' '}
                  {formatRelativeDay(item.lastPerformedAt)}
                </ThemedText>
              </ThemedView>
              <ThemedText themeColor="textSecondary">›</ThemedText>
            </ThemedView>
          </Pressable>
        )}
      />
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
  rowText: {
    flex: 1,
    gap: Spacing.half,
  },
  pressed: {
    opacity: 0.6,
  },
});
