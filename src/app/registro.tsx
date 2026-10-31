import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { signUp } from '@/core/auth/actions';
import { AppButton, AppText, AppTextField, spacing, useTheme } from '@/design-system';

export default function Registro() {
  const { colors } = useTheme();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const result = await signUp({ nombre, email, password });
    if (!result.ok) {
      setError(result.message);
    } else if (result.needsEmailConfirmation) {
      setNotice('Te enviamos un correo. Confirmalo y después ingresá con tu cuenta.');
    }
    setBusy(false);
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AppText variant="headline">Crear cuenta</AppText>

          <AppTextField
            label="Nombre"
            value={nombre}
            onChangeText={setNombre}
            autoComplete="name"
            textContentType="name"
            maxLength={120}
          />
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
            label="Contraseña (mínimo 8 caracteres)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            onSubmitEditing={onSubmit}
            error={error}
          />
          {notice ? (
            <AppText variant="body" color="success" accessibilityLiveRegion="polite">
              {notice}
            </AppText>
          ) : null}

          <AppButton
            label={busy ? 'Creando…' : 'Crear cuenta'}
            onPress={onSubmit}
            disabled={busy}
          />
          <Link href="/login" asChild>
            <AppButton label="Ya tengo cuenta" variant="text" />
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
