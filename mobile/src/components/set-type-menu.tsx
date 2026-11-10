import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SET_TYPE_COLOR, SET_TYPES } from '@/constants/set-types';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { SetType } from '@/types';

type Props = {
  /** null = cerrado. */
  visible: boolean;
  /** Título, ej: "Serie 2 · Press de banca". */
  title: string;
  current: SetType;
  /** Número que tendría como serie normal (para mostrarlo en la opción "Normal"). */
  normalLabel: string;
  onSelect: (type: SetType) => void;
  onRemove: () => void;
  onClose: () => void;
};

/**
 * Menú que aparece al tocar el número de una serie: elegir si es normal, de calentamiento (W),
 * al fallo (F) o dropset (D), o quitarla. Es un Modal propio (y no un Alert) porque en Android
 * los Alert admiten como máximo 3 botones.
 */
export function SetTypeMenu({ visible, title, current, normalLabel, onSelect, onRemove, onClose }: Props) {
  const theme = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* Tocar fuera de la tarjeta cierra el menú */}
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Cerrar">
        <Pressable onPress={() => {}} style={styles.cardWrapper}>
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold" style={styles.title}>
              {title}
            </ThemedText>

            {SET_TYPES.map((item) => {
              const colorKey = SET_TYPE_COLOR[item.type];
              const color = colorKey ? theme[colorKey] : theme.textSecondary;
              const selected = item.type === current;
              return (
                <Pressable
                  key={item.type}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    onSelect(item.type);
                    onClose();
                  }}
                  style={({ pressed }) => [
                    styles.option,
                    (selected || pressed) && { backgroundColor: theme.backgroundSelected },
                  ]}>
                  <View style={[styles.badge, { backgroundColor: color + '26' }]}>
                    <ThemedText type="smallBold" style={{ color }}>
                      {item.type === 'NORMAL' ? normalLabel : item.letter}
                    </ThemedText>
                  </View>
                  <View style={styles.optionText}>
                    <ThemedText type="smallBold">{item.label}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {item.description}
                    </ThemedText>
                  </View>
                  {selected && (
                    <ThemedText type="smallBold" themeColor="primary">
                      ✓
                    </ThemedText>
                  )}
                </Pressable>
              );
            })}

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                onClose();
                onRemove();
              }}
              style={({ pressed }) => [styles.option, pressed && { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText type="smallBold" style={[styles.remove, { color: theme.failure }]}>
                Quitar serie
              </ThemedText>
            </Pressable>
          </ThemedView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  cardWrapper: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  card: {
    borderRadius: 16,
    padding: Spacing.two,
    gap: Spacing.half,
  },
  title: {
    textAlign: 'center',
    paddingVertical: Spacing.two,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.two,
    borderRadius: 10,
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
  },
  remove: {
    flex: 1,
    textAlign: 'center',
  },
});
