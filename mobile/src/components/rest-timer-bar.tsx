import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { formatDuration } from '@/hooks/use-elapsed-time';
import type { RestTimer } from '@/hooks/use-rest-timer';
import { useTheme } from '@/hooks/use-theme';

/** Barra flotante abajo de la pantalla que muestra el descanso en curso. */
export function RestTimerBar({ timer }: { timer: RestTimer }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  if (!timer.isRunning) return null;

  const progress = timer.remainingFraction;
  // Redondeamos hacia arriba: con 0,4 s restantes se ve "00:01", no "00:00"
  const remaining = formatDuration(Math.ceil(timer.remainingMs / 1000) * 1000);

  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.container, { bottom: insets.bottom + Spacing.three, borderColor: theme.primary }]}>
      <View style={styles.row}>
        <View>
          <ThemedText type="small" themeColor="textSecondary">
            Descanso
          </ThemedText>
          <ThemedText
            type="subtitle"
            style={styles.time}
            accessibilityRole="timer"
            accessibilityLabel={`Descanso: quedan ${remaining}`}>
            {remaining}
          </ThemedText>
        </View>
        <View style={styles.actions}>
          <Button title="−15" variant="secondary" compact onPress={() => timer.adjustCurrent(-15)} />
          <Button title="+15" variant="secondary" compact onPress={() => timer.adjustCurrent(15)} />
          <Button title="Saltar" compact onPress={timer.skip} />
        </View>
      </View>
      <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
        <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: theme.primary }]} />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    padding: Spacing.three,
    borderRadius: 16,
    borderWidth: 1,
    gap: Spacing.two,
    // Sombra para que se note que flota sobre la lista
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  time: {
    fontVariant: ['tabular-nums'],
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
});
