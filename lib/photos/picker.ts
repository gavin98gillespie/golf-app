import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { File } from 'expo-file-system';
import { photoResize } from './model';
export async function pickRoundPhoto(camera: boolean): Promise<ArrayBuffer | null> {
  if (camera) {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted)
      throw new Error('Allow camera access in Settings, or choose a photo from your library.');
  }
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 1,
    exif: false,
  };
  const result = camera
    ? await ImagePicker.launchCameraAsync(options)
    : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) throw new Error('No photo selected.');
  const resized = await manipulateAsync(
    asset.uri,
    [{ resize: photoResize(asset.width, asset.height) }],
    { compress: 0.78, format: SaveFormat.JPEG },
  );
  const file = new File(resized.uri);
  try {
    return await file.arrayBuffer();
  } finally {
    file.delete();
  }
}
