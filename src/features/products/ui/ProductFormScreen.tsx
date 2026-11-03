import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatArs } from '@/core/money/formatArs';
import { centsToInput, parseArs } from '@/core/money/parseArs';
import { pickImage, type ImageSource } from '@/core/media/pickImage';
import { confirmDestructive } from '@/core/ui/confirm';
import {
  AppButton,
  AppCard,
  AppText,
  AppTextField,
  AppTopBar,
  spacing,
  useTheme,
} from '@/design-system';

import { useProduct, useProductActions, useProductImageUrls } from '../application/useProducts';
import {
  gananciaCentavos,
  margenSobreCostoPct,
  type ImageChange,
  type Product,
  type ProductForm,
} from '../domain/product';
import { ProductImageField } from './ProductImageField';

type Props = { productId?: string };

/** Alta (sin `productId`) o edición de un producto. */
export function ProductFormScreen({ productId }: Props) {
  const { colors } = useTheme();
  const router = useRouter();
  const { state, retry } = useProduct(productId);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <AppTopBar title={productId ? 'Editar producto' : 'Nuevo producto'} />

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

      {state.status === 'ready' && productId && state.data === null ? (
        <View style={styles.center}>
          <AppText variant="title">No encontramos este producto</AppText>
          <AppButton label="Volver" variant="tonal" onPress={() => router.back()} />
        </View>
      ) : null}

      {state.status === 'ready' && (!productId || state.data !== null) ? (
        <FormBody key={productId ?? 'nuevo'} product={state.data} />
      ) : null}
    </SafeAreaView>
  );
}

function toForm(product: Product | null): ProductForm {
  return {
    nombre: product?.nombre ?? '',
    codigo: product?.codigo ?? '',
    costoCentavos: product ? centsToInput(product.costoCentavos) : '',
    precioCentavos: product ? centsToInput(product.precioCentavos) : '',
    stock: product ? String(product.stock) : '',
    stockMinimo: product ? String(product.stockMinimo) : '',
  };
}

/** Ganancia por unidad con lo que se está escribiendo; null si algún importe aún no es válido. */
function previewProfit(form: ProductForm): { ganancia: number; margen: number | null } | null {
  const costo = form.costoCentavos.trim() === '' ? 0 : parseArs(form.costoCentavos);
  const precio = form.precioCentavos.trim() === '' ? 0 : parseArs(form.precioCentavos);
  if (costo === null || precio === null || (costo === 0 && precio === 0)) return null;
  const parts = { costoCentavos: costo, precioCentavos: precio };
  return { ganancia: gananciaCentavos(parts), margen: margenSobreCostoPct(parts) };
}

function FormBody({ product }: { product: Product | null }) {
  const router = useRouter();
  const { save, remove } = useProductActions();
  const [form, setForm] = useState<ProductForm>(() => toForm(product));
  const [error, setError] = useState<{ field?: keyof ProductForm; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [imageChange, setImageChange] = useState<ImageChange>({ type: 'keep' });
  const [imageError, setImageError] = useState<string | null>(null);
  const currentPath = product?.imagenPath ?? null;
  const imageUrls = useProductImageUrls(currentPath ? [currentPath] : []);

  async function onPickImage(source: ImageSource) {
    setImageError(null);
    const picked = await pickImage(source);
    if (picked.ok) setImageChange({ type: 'replace', localUri: picked.uri });
    else if (picked.reason !== 'cancelled') setImageError(picked.message);
  }

  const set = (field: keyof ProductForm) => (value: string) =>
    setForm((current) => ({ ...current, [field]: value }));
  const errorFor = (field: keyof ProductForm) => (error?.field === field ? error.message : null);
  const profit = previewProfit(form);

  async function onSave() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await save(product?.id ?? null, form, {
      previousPath: currentPath,
      change: imageChange,
    });
    if (result.ok) {
      router.back();
      return;
    }
    setError({ field: result.field, message: result.message });
    setBusy(false);
  }

  async function onDelete() {
    if (!product || busy) return;
    const confirmed = await confirmDestructive(
      'Eliminar producto',
      `Se va a eliminar «${product.nombre}». Esta acción no se puede deshacer.`,
      'Eliminar',
    );
    if (!confirmed) return;
    setBusy(true);
    const result = await remove(product);
    if (result.ok) {
      router.back();
      return;
    }
    setError({ message: result.message });
    setBusy(false);
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ProductImageField
          currentUrl={currentPath ? (imageUrls[currentPath] ?? null) : null}
          change={imageChange}
          error={imageError}
          disabled={busy}
          onPickGallery={() => void onPickImage('gallery')}
          onPickCamera={() => void onPickImage('camera')}
          onRemove={() => setImageChange({ type: 'remove' })}
        />
        <AppTextField
          label="Nombre"
          value={form.nombre}
          onChangeText={set('nombre')}
          maxLength={120}
          error={errorFor('nombre')}
        />
        <AppTextField
          label="Código (opcional)"
          value={form.codigo}
          onChangeText={set('codigo')}
          autoCapitalize="characters"
          maxLength={40}
          error={errorFor('codigo')}
        />
        <AppTextField
          label="Costo ($)"
          value={form.costoCentavos}
          onChangeText={set('costoCentavos')}
          keyboardType="decimal-pad"
          placeholder="3.500"
          error={errorFor('costoCentavos')}
        />
        <AppTextField
          label="Precio de venta ($)"
          value={form.precioCentavos}
          onChangeText={set('precioCentavos')}
          keyboardType="decimal-pad"
          placeholder="6.000"
          error={errorFor('precioCentavos')}
        />

        {profit ? (
          <AppCard tone="tonal" style={styles.profit}>
            <AppText variant="label" color="onSurfaceVariant">
              Ganancia por unidad
            </AppText>
            <AppText variant="title" color={profit.ganancia < 0 ? 'error' : 'onSurface'}>
              {formatArs(profit.ganancia)}
              {profit.margen !== null ? ` · ${profit.margen} % sobre el costo` : ''}
            </AppText>
          </AppCard>
        ) : null}

        <AppTextField
          label="Stock (unidades)"
          value={form.stock}
          onChangeText={set('stock')}
          keyboardType="number-pad"
          maxLength={7}
          error={errorFor('stock')}
        />
        <AppTextField
          label="Avisarme cuando queden (unidades)"
          value={form.stockMinimo}
          onChangeText={set('stockMinimo')}
          keyboardType="number-pad"
          maxLength={7}
          error={errorFor('stockMinimo')}
        />

        {error && !error.field ? (
          <AppText variant="body" color="error" accessibilityLiveRegion="polite">
            {error.message}
          </AppText>
        ) : null}

        <AppButton label={busy ? 'Guardando…' : 'Guardar'} onPress={onSave} disabled={busy} />
        {product ? (
          <AppButton
            label="Eliminar producto"
            variant="outlined"
            onPress={onDelete}
            disabled={busy}
          />
        ) : null}
        <AppButton label="Cancelar" variant="text" onPress={() => router.back()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  profit: { gap: spacing.xs },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
});
