import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

type Props = {
  title: string;
  message: string;
};

/** Pantalla simple con un título y un mensaje, para secciones que aún no tienen contenido. */
export function EmptyState({ title, message }: Props) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.content} edges={['top']}>
        <ThemedText type="subtitle">{title}</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.message}>
          {message}
        </ThemedText>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  message: {
    marginTop: Spacing.two,
  },
});
