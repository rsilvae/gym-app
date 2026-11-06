import { router } from 'expo-router';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ErrorView, LoadingView } from '@/components/query-status';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WorkoutCard } from '@/components/workout-card';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useWorkoutsQuery } from '@/hooks/use-workouts';

/** Pestaña "Historial": tus entrenamientos terminados, del más reciente al más antiguo. */
export default function HistoryScreen() {
  const theme = useTheme();
  const { data: workouts, isPending, error, refetch, isRefetching } = useWorkoutsQuery();

  if (isPending) return <LoadingView />;
  if (error) return <ErrorView error={error} onRetry={refetch} />;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <FlatList
          data={workouts}
          keyExtractor={(workout) => workout.id}
          renderItem={({ item }) => <WorkoutCard workout={item} />}
          ListHeaderComponent={
            <View style={styles.header}>
              <ThemedText type="subtitle">Historial</ThemedText>
              <Button title="📈 Progreso" compact onPress={() => router.push('/exercises')} />
            </View>
          }
          ListEmptyComponent={
            <ThemedText themeColor="textSecondary">
              Todavía no tienes entrenamientos. Cuando termines uno, aparecerá aquí.
            </ThemedText>
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
              tintColor={theme.primary}
            />
          }
          contentContainerStyle={styles.list}
        />
      </SafeAreaView>
    </ThemedView>
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
  },
  list: {
    padding: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.three,
  },
});
