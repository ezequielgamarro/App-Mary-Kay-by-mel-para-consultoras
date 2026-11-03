import { StyleSheet, View } from 'react-native';

import { AppButton, AppText, spacing } from '@/design-system';

import { PAYMENT_MEDIA, type PaymentMedium } from '../domain/sale';

type Props = {
  value: PaymentMedium;
  onChange: (value: PaymentMedium) => void;
  disabled?: boolean;
};

/** Elige cómo se pagó: efectivo, transferencia u otro. */
export function PaymentMediumPicker({ value, onChange, disabled }: Props) {
  return (
    <View style={styles.wrapper}>
      <AppText variant="label" color="onSurfaceVariant">
        Medio de pago
      </AppText>
      <View style={styles.row}>
        {PAYMENT_MEDIA.map((medium) => (
          <AppButton
            key={medium.value}
            label={medium.label}
            variant={medium.value === value ? 'filled' : 'outlined'}
            onPress={() => onChange(medium.value)}
            disabled={disabled}
            accessibilityState={{ selected: medium.value === value }}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
