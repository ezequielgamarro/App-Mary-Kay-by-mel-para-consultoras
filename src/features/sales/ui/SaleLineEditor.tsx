import { StyleSheet, View } from 'react-native';

import { formatArs } from '@/core/money/formatArs';
import { AppButton, AppCard, AppText, AppTextField, spacing } from '@/design-system';

import { lineSubtotal, type DraftLine } from '../domain/sale';

type Props = {
  line: DraftLine;
  disabled?: boolean;
  onChange: (line: DraftLine) => void;
  onRemove: () => void;
};

/** Un producto de la venta: cantidad (con stock disponible), precio editable y subtotal. */
export function SaleLineEditor({ line, disabled, onChange, onRemove }: Props) {
  const subtotal = lineSubtotal(line);

  return (
    <AppCard tone="tonal" style={styles.card}>
      <View style={styles.header}>
        <AppText variant="bodyStrong" style={styles.name} numberOfLines={2}>
          {line.nombre}
        </AppText>
        <AppButton label="Quitar" variant="text" onPress={onRemove} disabled={disabled} />
      </View>
      <View style={styles.fields}>
        <View style={styles.field}>
          <AppTextField
            label={`Cantidad (hay ${line.stock})`}
            value={line.cantidad}
            onChangeText={(cantidad) => onChange({ ...line, cantidad })}
            keyboardType="number-pad"
            maxLength={6}
            editable={!disabled}
          />
        </View>
        <View style={styles.field}>
          <AppTextField
            label="Precio c/u ($)"
            value={line.precio}
            onChangeText={(precio) => onChange({ ...line, precio })}
            keyboardType="decimal-pad"
            editable={!disabled}
          />
        </View>
      </View>
      <AppText variant="label" color="onSurfaceVariant">
        Subtotal: {subtotal === null ? '—' : formatArs(subtotal)}
      </AppText>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { flex: 1 },
  fields: { flexDirection: 'row', gap: spacing.md },
  field: { flex: 1 },
});
