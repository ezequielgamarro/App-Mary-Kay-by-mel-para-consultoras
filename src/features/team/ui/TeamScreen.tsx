import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, Share, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatArs } from '@/core/money/formatArs';
import { confirmDestructive } from '@/core/ui/confirm';
import {
  AppButton,
  AppCard,
  AppProgress,
  AppText,
  AppTextField,
  AppTopBar,
  spacing,
  useTheme,
} from '@/design-system';

import { useMyTeam, useTeamActions, useTeamMembers } from '../application/useTeam';
import {
  inviteMessage,
  memberProgressPct,
  teamSalesTotal,
  type MyTeam,
  type TeamMember,
} from '../domain/team';

/** Equipo: mi código para invitar, mi directora (con el permiso de compartir) y mis integrantes. */
export function TeamScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { state, retry, refresh } = useMyTeam();

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <AppTopBar title="Equipo" />

      {state.status === 'loading' ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} accessibilityLabel="Cargando" />
        </View>
      ) : null}

      {state.status === 'error' ? (
        <View style={styles.center}>
          <AppText variant="body" color="error" accessibilityLiveRegion="polite">
            {state.message}
          </AppText>
          <AppButton label="Reintentar" variant="tonal" onPress={retry} />
          <AppButton label="Volver" variant="text" onPress={() => router.back()} />
        </View>
      ) : null}

      {state.status === 'ready' ? (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <InviteSection team={state.data} />
          <DirectorSection team={state.data} onChanged={refresh} />
          {state.data.integrantes > 0 ? (
            <MembersSection key={state.data.integrantes} onChanged={refresh} />
          ) : null}
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

function InviteSection({ team }: { team: MyTeam }) {
  return (
    <AppCard tone="tonal" style={styles.block}>
      <AppText variant="label" color="onSurfaceVariant">
        Tu código de invitación
      </AppText>
      <AppText variant="numeric" selectable>
        {team.codigo}
      </AppText>
      <AppText variant="label" color="onSurfaceVariant">
        Pasáselo a quien quieras sumar a tu equipo. Solo podrás ver sus ventas del mes y su meta, y
        únicamente si ella acepta compartirlas.
      </AppText>
      <AppButton
        label="Compartir código"
        variant="tonal"
        onPress={() => void Share.share({ message: inviteMessage(team.codigo) })}
      />
    </AppCard>
  );
}

function DirectorSection({ team, onChanged }: { team: MyTeam; onChanged: () => void }) {
  const { join, leave, setSharing } = useTeamActions();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inTeam = team.patrocinadoraNombre !== null;

  async function run(action: () => Promise<{ ok: true } | { ok: false; message: string }>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await action();
    setBusy(false);
    if (result.ok) {
      setCode('');
      onChanged();
    } else {
      setError(result.message);
    }
  }

  async function onLeave() {
    const confirmed = await confirmDestructive(
      'Salir del equipo',
      'Tu directora deja de ver tus números. Podés volver a unirte con su código.',
      'Salir',
    );
    if (confirmed) await run(leave);
  }

  return (
    <View style={styles.block}>
      <AppText variant="title">Mi directora</AppText>

      {inTeam ? (
        <>
          <AppText variant="body">
            Estás en el equipo de{' '}
            <AppText variant="bodyStrong">{team.patrocinadoraNombre || 'tu directora'}</AppText>.
          </AppText>
          <View style={styles.switchRow}>
            <AppText variant="body" style={styles.switchLabel}>
              Compartir con mi directora mis ventas del mes y mi meta
            </AppText>
            <Switch
              value={team.comparte}
              disabled={busy}
              onValueChange={(value) => void run(() => setSharing(value))}
              accessibilityLabel="Compartir mis ventas del mes y mi meta con mi directora"
            />
          </View>
          <AppText variant="label" color="onSurfaceVariant">
            Tu directora nunca ve tus clientas, tus deudas, tus productos ni tus cobros.
          </AppText>
          <AppButton
            label="Salir del equipo"
            variant="outlined"
            onPress={onLeave}
            disabled={busy}
          />
        </>
      ) : (
        <>
          <AppText variant="body" color="onSurfaceVariant">
            Si tu directora te pasó un código, ingresalo para sumarte a su equipo. Al unirte aceptás
            compartir con ella tus ventas del mes y tu meta; podés dejar de compartir o salir cuando
            quieras.
          </AppText>
          <AppTextField
            label="Código de tu directora"
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={14}
            editable={!busy}
          />
          <AppButton
            label={busy ? 'Uniéndome…' : 'Unirme al equipo'}
            onPress={() => void run(() => join(code))}
            disabled={busy}
          />
        </>
      )}

      {error ? (
        <AppText variant="body" color="error" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

function MembersSection({ onChanged }: { onChanged: () => void }) {
  const { colors } = useTheme();
  const { state, retry, refresh } = useTeamMembers(true);
  const { removeMember } = useTeamActions();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onRemove(member: TeamMember) {
    if (busy) return;
    const confirmed = await confirmDestructive(
      'Sacar del equipo',
      `${member.nombre} deja de ser parte de tu equipo y dejás de ver sus números.`,
      'Sacar',
    );
    if (!confirmed) return;
    setBusy(true);
    setError(null);
    const result = await removeMember(member.id);
    setBusy(false);
    if (result.ok) {
      refresh();
      onChanged();
    } else {
      setError(result.message);
    }
  }

  return (
    <View style={styles.block}>
      <AppText variant="title">Mi equipo</AppText>

      {state.status === 'loading' ? (
        <ActivityIndicator color={colors.primary} accessibilityLabel="Cargando equipo" />
      ) : null}
      {state.status === 'error' ? (
        <>
          <AppText variant="body" color="error">
            {state.message}
          </AppText>
          <AppButton label="Reintentar" variant="tonal" onPress={retry} />
        </>
      ) : null}

      {state.status === 'ready' ? (
        <>
          <AppCard tone="primary" style={styles.block}>
            <AppText variant="label" color="onPrimary">
              Vendido este mes por quienes comparten
            </AppText>
            <AppText variant="numeric" color="onPrimary" numberOfLines={1} adjustsFontSizeToFit>
              {formatArs(teamSalesTotal(state.data))}
            </AppText>
          </AppCard>

          {state.data.map((member) => {
            const pct = memberProgressPct(member);
            return (
              <AppCard key={member.id} tone="surface" style={styles.block}>
                <AppText variant="bodyStrong">{member.nombre}</AppText>
                {member.comparte && member.ventasMesCentavos !== null ? (
                  <>
                    <AppText variant="body">
                      {formatArs(member.ventasMesCentavos)} ·{' '}
                      {member.cantidadVentas === 1
                        ? '1 venta'
                        : `${member.cantidadVentas ?? 0} ventas`}
                    </AppText>
                    {pct !== null && member.metaVentasCentavos !== null ? (
                      <>
                        <AppProgress value={pct} />
                        <AppText variant="label" color="onSurfaceVariant">
                          {pct} % de su meta de {formatArs(member.metaVentasCentavos)}
                        </AppText>
                      </>
                    ) : (
                      <AppText variant="label" color="onSurfaceVariant">
                        Todavía no definió su meta del mes.
                      </AppText>
                    )}
                  </>
                ) : (
                  <AppText variant="label" color="onSurfaceVariant">
                    No comparte sus números.
                  </AppText>
                )}
                <AppButton
                  label="Sacar del equipo"
                  variant="text"
                  onPress={() => void onRemove(member)}
                  disabled={busy}
                />
              </AppCard>
            );
          })}
        </>
      ) : null}

      {error ? (
        <AppText variant="body" color="error" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.lg, paddingBottom: spacing.xl },
  block: { gap: spacing.sm },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  switchLabel: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
});
