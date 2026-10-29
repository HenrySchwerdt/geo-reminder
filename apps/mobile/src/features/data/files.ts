/** Native file plumbing: write to the cache directory + share sheet, and the system document picker. */
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export interface ShareableFile {
  name: string;
  text: string;
  mimeType: string;
  /** iOS Uniform Type Identifier. */
  uti: string;
}

export async function shareTextFile({ name, text, mimeType, uti }: ShareableFile): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(text);
  await Sharing.shareAsync(file.uri, { mimeType, UTI: uti, dialogTitle: name });
}

/** Let the user pick a JSON file and return its text, or null when they cancel. */
export async function pickTextFile(): Promise<string | null> {
  const res = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', 'application/octet-stream'],
    copyToCacheDirectory: true,
  });
  const asset = res.canceled ? undefined : res.assets[0];
  if (!asset) return null;
  return new File(asset.uri).text();
}
