import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { signIn } from '@/core/auth/actions';
import { AppButton, AppText, AppTextField, spacing, useTheme } from '@/design-system';

export default function Login() {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await signIn({ email, password });
    // Si salió bien, el guard de rutas cambia de pantalla solo.
    if (!result.ok) setError(result.message);
    setBusy(false);
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AppText variant="display" color="primary">
            Bella Gestión
          </AppText>
          <AppText variant="body" color="onSurfaceVariant">
            Ingresá para ver cómo va tu negocio.
          </AppText>

          <AppTextField
            label="Correo"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
          />
          <AppTextField
            label="Contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            onSubmitEditing={onSubmit}
            error={error}
          />

          <AppButton label={busy ? 'Ingresando…' : 'Ingresar'} onPress={onSubmit} disabled={busy} />
          <Link href="/registro" asChild>
            <AppButton label="Crear cuenta" variant="text" />
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md, flexGrow: 1, justifyContent: 'center' },
});
