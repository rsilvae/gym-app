import { useRef, useState, type ComponentRef } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Spacing } from '@/constants/theme';
import { formatDuration } from '@/hooks/use-elapsed-time';
import { useTheme } from '@/hooks/use-theme';
import { MAX_REST_SECONDS, MIN_REST_SECONDS, parseRestDigits } from '@/utils/rest-time';

type Props = {
  seconds: number;
  onChange: (seconds: number) => void;
};

/**
 * Duración del descanso: [−] 01:30 [+]
 * Al tocar el tiempo se abre el teclado numérico para escribirlo exacto:
 * "123" = 1:23, "1" = 0:01. Mientras escribes, los botones − y + se cambian por "OK".
 */
export function RestDurationField({ seconds, onChange }: Props) {
  const theme = useTheme();
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);
  /** Lo que estás escribiendo, o null si no estás editando. */
  const [draft, setDraft] = useState<string | null>(null);
  const isEditing = draft !== null;
  const formatted = formatDuration(seconds * 1000);

  function commit() {
    if (draft !== null) {
      const parsed = parseRestDigits(draft);
      if (parsed !== null) onChange(parsed);
    }
    setDraft(null);
  }

  return (
    <View style={styles.container}>
      {!isEditing && (
        <Button
          title="−"
          variant="secondary"
          compact
          accessibilityLabel="Bajar 15 segundos de descanso"
          disabled={seconds <= MIN_REST_SECONDS}
          onPress={() => onChange(seconds - 15)}
        />
      )}

      <TextInput
        ref={inputRef}
        // Sin editar se ve "01:30"; al editar empieza vacío y lo de fondo es una guía
        value={isEditing ? draft : formatted}
        placeholder={formatted}
        placeholderTextColor={theme.textSecondary}
        onFocus={() => setDraft('')}
        onChangeText={(text) => setDraft(text.replace(/\D/g, ''))}
        onBlur={commit}
        onSubmitEditing={commit}
        keyboardType="number-pad"
        returnKeyType="done"
        maxLength={4}
        accessibilityLabel={`Descanso entre series: ${formatted}. Toca para escribir el tiempo.`}
        style={[
          styles.input,
          { color: theme.text },
          isEditing && { backgroundColor: theme.background, borderColor: theme.primary },
        ]}
      />

      {isEditing ? (
        <Button title="OK" compact onPress={() => inputRef.current?.blur()} />
      ) : (
        <Button
          title="+"
          variant="secondary"
          compact
          accessibilityLabel="Subir 15 segundos de descanso"
          disabled={seconds >= MAX_REST_SECONDS}
          onPress={() => onChange(seconds + 15)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  input: {
    minWidth: 64,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
});
