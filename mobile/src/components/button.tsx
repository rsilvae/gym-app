import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Variant = 'primary' | 'secondary' | 'danger';

type Props = Omit<PressableProps, 'children' | 'style'> & {
  title: string;
  variant?: Variant;
  /** Botón más chico, para acciones dentro de una tarjeta. */
  compact?: boolean;
};

/** Botón reutilizable con 3 estilos: primary (naranja), secondary (gris) y danger (rojo). */
export function Button({ title, variant = 'primary', compact = false, disabled, ...rest }: Props) {
  const theme = useTheme();

  const backgroundColor = {
    primary: theme.primary,
    secondary: theme.backgroundSelected,
    danger: 'transparent',
  }[variant];

  const textColor = {
    primary: '#ffffff',
    secondary: theme.text,
    danger: '#E5484D',
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        { backgroundColor },
        (pressed || disabled) && styles.dimmed,
      ]}
      {...rest}>
      <ThemedText type="smallBold" style={{ color: textColor }}>
        {title}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: 12,
  },
  compact: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 8,
  },
  dimmed: {
    opacity: 0.5,
  },
});
