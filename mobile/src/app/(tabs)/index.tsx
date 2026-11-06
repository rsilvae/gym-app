import { router } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { RoutineCard } from '@/components/routine-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useRoutines } from '@/context/routines-context';

/** Pestaña "Rutinas": lista de todas tus rutinas. */
export default function RoutinesScreen() {
  const { routines } = useRoutines();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <FlatList
          data={routines}
          keyExtractor={(routine) => routine.id}
          renderItem={({ item }) => <RoutineCard routine={item} />}
          ListHeaderComponent={
            <View style={styles.header}>
              <ThemedText type="subtitle">Mis rutinas</ThemedText>
              <Button title="+ Nueva" compact onPress={() => router.push('/routine/new')} />
            </View>
          }
          ListEmptyComponent={
            <ThemedText themeColor="textSecondary">
              No tienes rutinas. Toca &quot;+ Nueva&quot; para crear la primera.
            </ThemedText>
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
