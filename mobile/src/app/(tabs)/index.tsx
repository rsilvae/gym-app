import { router } from 'expo-router';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActiveWorkoutBanner } from '@/components/active-workout-banner';
import { Button } from '@/components/button';
import { ErrorView, LoadingView } from '@/components/query-status';
import { RoutineCard } from '@/components/routine-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useRoutinesQuery } from '@/hooks/use-routines';
import { useTheme } from '@/hooks/use-theme';

/** Pestaña "Rutinas": lista de todas tus rutinas, pedidas a la API. */
export default function RoutinesScreen() {
  const theme = useTheme();
  // data = las rutinas; isPending = cargando por primera vez; refetch = volver a pedir
  const { data: routines, isPending, error, refetch, isRefetching } = useRoutinesQuery();

  const header = (
    <View style={styles.headerContainer}>
      <View style={styles.header}>
        <ThemedText type="subtitle">Mis rutinas</ThemedText>
        <Button title="+ Nueva" compact onPress={() => router.push('/routine/new')} />
      </View>
      {/* Si la app se cerró a mitad de un entrenamiento, aquí aparece para retomarlo */}
      <ActiveWorkoutBanner />
    </View>
  );

  if (isPending) return <LoadingView />;
  if (error) return <ErrorView error={error} onRetry={refetch} />;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <FlatList
          data={routines}
          keyExtractor={(routine) => routine.id}
          renderItem={({ item }) => <RoutineCard routine={item} />}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <ThemedText themeColor="textSecondary">
              No tienes rutinas. Toca &quot;+ Nueva&quot; para crear la primera.
            </ThemedText>
          }
          // Desliza hacia abajo para recargar
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
  headerContainer: {
    gap: Spacing.three,
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
