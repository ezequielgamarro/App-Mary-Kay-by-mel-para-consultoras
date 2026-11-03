import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { SessionProvider, useSession } from '@/core/auth/session';

function RootStack() {
  const { session, loading } = useSession();
  if (loading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="index" />
        <Stack.Screen name="clientas" />
        <Stack.Screen name="productos" />
        <Stack.Screen name="ventas" />
        <Stack.Screen name="agenda" />
        <Stack.Screen name="metas" />
        <Stack.Screen name="equipo" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="login" />
        <Stack.Screen name="registro" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SessionProvider>
      <StatusBar style="auto" />
      <RootStack />
    </SessionProvider>
  );
}
