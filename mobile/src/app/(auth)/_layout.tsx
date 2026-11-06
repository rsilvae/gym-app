import { Stack } from 'expo-router';

/** Pantallas para quien no inició sesión. El primer Stack.Screen es el que se abre primero. */
export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="verify-email" />
    </Stack>
  );
}
