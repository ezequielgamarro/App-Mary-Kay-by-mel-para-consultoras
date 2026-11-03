import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

/** Lado mayor máximo y calidad JPEG: una foto de referencia liviana (≈100–300 KB) sube bien con mala señal. */
const MAX_SIDE = 1024;
const JPEG_QUALITY = 0.7;

export type ImageSource = 'gallery' | 'camera';

export type PickImageResult =
  | { ok: true; uri: string }
  | { ok: false; reason: 'cancelled' }
  | { ok: false; reason: 'denied' | 'error'; message: string };

/**
 * Deja elegir una foto de la galería o sacarla con la cámara, y la devuelve achicada y
 * comprimida en JPEG lista para subir. La galería no pide permiso en Android; la cámara sí.
 */
export async function pickImage(source: ImageSource): Promise<PickImageResult> {
  try {
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        return {
          ok: false,
          reason: 'denied',
          message: 'Necesitamos permiso de la cámara. Podés darlo en los ajustes del teléfono.',
        };
      }
    }

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    };
    const picked =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    if (picked.canceled) return { ok: false, reason: 'cancelled' };

    const asset = picked.assets[0];
    const context = ImageManipulator.manipulate(asset.uri);
    if (Math.max(asset.width, asset.height) > MAX_SIDE) {
      context.resize(asset.width >= asset.height ? { width: MAX_SIDE } : { height: MAX_SIDE });
    }
    const rendered = await context.renderAsync();
    const result = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: JPEG_QUALITY });
    return { ok: true, uri: result.uri };
  } catch (error) {
    console.warn('[media] error al preparar la imagen', error);
    return { ok: false, reason: 'error', message: 'No pudimos preparar la foto. Probá con otra.' };
  }
}
