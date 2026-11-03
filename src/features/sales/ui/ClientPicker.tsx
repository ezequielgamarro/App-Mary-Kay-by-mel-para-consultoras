import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton, AppCard, AppListItem, AppText, AppTextField, spacing } from '@/design-system';
import { useClientList } from '@/features/clients/application/useClients';
import { filterClients } from '@/features/clients/domain/client';

const MAX_RESULTS = 5;

type Props = {
  selectedId: string | null;
  error?: string | null;
  disabled?: boolean;
  onSelect: (clientId: string | null) => void;
};

/** Clienta de la venta (opcional): se busca por nombre; sin elegir queda como venta de mostrador. */
export function ClientPicker({ selectedId, error, disabled, onSelect }: Props) {
  const { state, retry } = useClientList();
  const [query, setQuery] = useState('');

  if (state.status === 'loading') {
    return (
      <AppText variant="body" color="onSurfaceVariant">
        Cargando clientas…
      </AppText>
    );
  }
  if (state.status === 'error') {
    return (
      <View style={styles.block}>
        <AppText variant="body" color="error">
          {state.message}
        </AppText>
        <AppButton label="Reintentar" variant="tonal" onPress={retry} />
      </View>
    );
  }

  const selected = selectedId ? state.data.find((client) => client.id === selectedId) : undefined;
  if (selected) {
    return (
      <View style={styles.block}>
        <AppText variant="label" color="onSurfaceVariant">
          Clienta
        </AppText>
        <AppCard tone="tonal" style={styles.selected}>
          <AppText variant="bodyStrong" style={styles.selectedName} numberOfLines={1}>
            {selected.nombre}
          </AppText>
          <AppButton
            label="Cambiar"
            variant="text"
            onPress={() => onSelect(null)}
            disabled={disabled}
          />
        </AppCard>
      </View>
    );
  }

  const matches = filterClients(state.data, query).slice(0, MAX_RESULTS);

  return (
    <View style={styles.block}>
      <AppTextField
        label="Clienta (opcional)"
        value={query}
        onChangeText={setQuery}
        placeholder="Buscar por nombre. Sin elegir: venta de mostrador"
        autoCapitalize="none"
        editable={!disabled}
        error={error}
      />
      {state.data.length === 0 ? (
        <AppText variant="label" color="onSurfaceVariant">
          Todavía no cargaste clientas. Podés registrar la venta de mostrador, o cargar la clienta
          primero para dejar saldo pendiente.
        </AppText>
      ) : null}
      {matches.map((client) => (
        <AppListItem
          key={client.id}
          title={client.nombre}
          supporting={client.telefono ?? 'Sin teléfono'}
          onPress={() => {
            if (disabled) return;
            setQuery('');
            onSelect(client.id);
          }}
        />
      ))}
      {state.data.length > 0 && matches.length === 0 ? (
        <AppText variant="label" color="onSurfaceVariant">
          No hay clientas que coincidan con la búsqueda.
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.sm },
  selected: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectedName: { flex: 1 },
});
