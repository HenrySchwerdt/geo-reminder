/** Native file plumbing: write to the cache directory + share sheet, and the system document picker. */
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
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

/** A4 in CSS points, as `expo-print` expects. */
const A4 = { width: 595, height: 842 };

/** Render HTML to a PDF named `name` and hand it to the share sheet. Returns the name of the file shared. */
export async function sharePdf(html: string, name: string): Promise<string> {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  const printed = await Print.printToFileAsync({ html, ...A4 });
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  new File(printed.uri).move(file);
  await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: name });
  return name;
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
