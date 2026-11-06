import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  checked: boolean;
  onToggle: () => void;
  accessibilityLabel?: string;
};

/** Casilla para marcar una serie como hecha. */
export function Checkbox({ checked, onToggle, accessibilityLabel }: Props) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      onPress={onToggle}
      style={[
        styles.box,
        checked
          ? { backgroundColor: theme.primary, borderColor: theme.primary }
          : { borderColor: theme.textSecondary },
      ]}>
      {checked && <ThemedText style={styles.check}>✓</ThemedText>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    color: '#ffffff',
    fontWeight: 700,
  },
});
