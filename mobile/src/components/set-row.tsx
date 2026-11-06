import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Checkbox } from '@/components/checkbox';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { ActiveSet } from '@/features/workout/workout-reducer';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  number: number;
  set: ActiveSet;
  onChangeWeight: (value: string) => void;
  onChangeReps: (value: string) => void;
  onToggle: () => void;
  /** Se llama al mantener presionado el número de la serie. */
  onLongPressNumber: () => void;
};

/** Una fila: número de serie | kg | reps | ✓. Se pinta de color cuando está hecha. */
export function SetRow({ number, set, onChangeWeight, onChangeReps, onToggle, onLongPressNumber }: Props) {
  const theme = useTheme();
  const inputStyle = [styles.input, { color: theme.text, backgroundColor: theme.background }];

  return (
    <View style={[styles.row, set.completed && { backgroundColor: theme.backgroundSelected }]}>
      <Pressable
        onLongPress={onLongPressNumber}
        accessibilityLabel={`Serie ${number}. Mantén presionado para quitarla.`}
        style={styles.numberCell}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          {number}
        </ThemedText>
      </Pressable>

      <TextInput
        value={set.weight}
        onChangeText={onChangeWeight}
        keyboardType="decimal-pad"
        placeholder="0"
        placeholderTextColor={theme.textSecondary}
        selectTextOnFocus
        accessibilityLabel={`Peso de la serie ${number}`}
        style={inputStyle}
      />

      <TextInput
        value={set.reps}
        onChangeText={onChangeReps}
        keyboardType="number-pad"
        placeholder="0"
        placeholderTextColor={theme.textSecondary}
        selectTextOnFocus
        accessibilityLabel={`Repeticiones de la serie ${number}`}
        style={inputStyle}
      />

      <View style={styles.checkCell}>
        <Checkbox
          checked={set.completed}
          onToggle={onToggle}
          accessibilityLabel={`Marcar serie ${number} como hecha`}
        />
      </View>
    </View>
  );
}

/** Títulos de las columnas, alineados con las filas. */
export function SetRowHeader() {
  return (
    <View style={styles.row}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.numberCell}>
        Serie
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.headerCell}>
        kg
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.headerCell}>
        Reps
      </ThemedText>
      <View style={styles.checkCell}>
        <ThemedText type="small" themeColor="textSecondary">
          ✓
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.one,
    borderRadius: 8,
  },
  numberCell: {
    width: 44,
    alignItems: 'center',
    textAlign: 'center',
  },
  headerCell: {
    flex: 1,
    textAlign: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    textAlign: 'center',
    paddingVertical: Spacing.two,
    borderRadius: 8,
  },
  checkCell: {
    width: 44,
    alignItems: 'center',
  },
});
