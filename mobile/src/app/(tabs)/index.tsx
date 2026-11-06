import { FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RoutineCard } from '@/components/routine-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { MOCK_ROUTINES } from '@/data/mock-routines';

/** Pestaña "Rutinas": lista de todas tus rutinas. */
export default function RoutinesScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <FlatList
          data={MOCK_ROUTINES}
          keyExtractor={(routine) => routine.id}
          renderItem={({ item }) => <RoutineCard routine={item} />}
          ListHeaderComponent={<ThemedText type="subtitle">Mis rutinas</ThemedText>}
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
  list: {
    padding: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.three,
  },
});
