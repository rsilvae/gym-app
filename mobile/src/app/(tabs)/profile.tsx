import { Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';

/** Pestaña "Perfil": datos de la cuenta y cerrar sesión. */
export default function ProfileScreen() {
  const { user, signOut } = useAuth();

  const memberSince = user
    ? new Date(user.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  function confirmSignOut() {
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: () => void signOut() },
    ]);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.content} edges={['top']}>
        <ThemedText type="subtitle">Perfil</ThemedText>

        <ThemedView type="backgroundElement" style={styles.card}>
          {/* Puede faltar en una sesión guardada antes de existir los usuarios (se completa al validar la sesión) */}
          {user?.username && (
            <>
              <ThemedText type="small" themeColor="textSecondary">
                Usuario
              </ThemedText>
              <ThemedText type="smallBold">@{user.username}</ThemedText>
            </>
          )}

          <ThemedText type="small" themeColor="textSecondary" style={user?.username ? styles.label : undefined}>
            Email
          </ThemedText>
          <ThemedText type="smallBold">{user?.email}</ThemedText>

          <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
            Miembro desde
          </ThemedText>
          <ThemedText type="smallBold">{memberSince}</ThemedText>
        </ThemedView>

        <Button title="Cerrar sesión" variant="danger" onPress={confirmSignOut} />
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
    gap: Spacing.three,
  },
  card: {
    padding: Spacing.three,
    borderRadius: 16,
    gap: Spacing.one,
  },
  label: {
    marginTop: Spacing.two,
  },
});
