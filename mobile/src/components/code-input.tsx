import { StyleSheet, TextInput } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export const CODE_LENGTH = 6;

type Props = {
  value: string;
  /** Recibe solo dígitos (máximo 6). */
  onChange: (digits: string) => void;
  editable?: boolean;
  autoFocus?: boolean;
};

/**
 * Campo para el código de 6 dígitos que llega por email.
 * En iPhone, el teclado puede sugerir el código del Mail (textContentType="oneTimeCode").
 */
export function CodeInput({ value, onChange, editable = true, autoFocus = false }: Props) {
  const theme = useTheme();

  return (
    <TextInput
      value={value}
      onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, CODE_LENGTH))}
      placeholder="000000"
      placeholderTextColor={theme.backgroundSelected}
      keyboardType="number-pad"
      textContentType="oneTimeCode"
      autoComplete="one-time-code"
      maxLength={CODE_LENGTH}
      autoFocus={autoFocus}
      editable={editable}
      accessibilityLabel="Código de 6 dígitos"
      style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 12,
    textAlign: 'center',
    paddingVertical: Spacing.three,
    borderRadius: 16,
    fontVariant: ['tabular-nums'],
  },
});
