/** Web preview: exports download through a Blob link, import uses the browser's file dialog. */
import * as DocumentPicker from 'expo-document-picker';

import type { ShareableFile } from './files';

export type { ShareableFile };

export async function shareTextFile({ name, text, mimeType }: ShareableFile): Promise<void> {
  const url = URL.createObjectURL(new Blob([text], { type: `${mimeType};charset=utf-8` }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Web preview: there is no PDF engine, so the report opens as a page that can be printed or saved as PDF. */
export async function sharePdf(html: string, name: string): Promise<string> {
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
  const opened = window.open(url, '_blank');
  if (!opened) {
    const htmlName = name.replace(/\.pdf$/, '.html');
    await shareTextFile({ name: htmlName, text: html, mimeType: 'text/html', uti: 'public.html' });
    return htmlName;
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return name.replace(/\.pdf$/, '.html');
}

export async function pickTextFile(): Promise<string | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain'], base64: false });
  const file = res.canceled ? undefined : res.assets[0]?.file;
  return file ? file.text() : null;
}
