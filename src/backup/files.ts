import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { MAX_BACKUP_BYTES } from './validate';

export async function shareBackupJson(json: string): Promise<void> {
  const file = new File(Paths.cache, `sysdapp-backup-${Date.now()}.json`);
  if (file.exists) file.delete();
  await file.write(json);
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('The system share sheet is not available. The backup file was written in app cache.');
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    UTI: 'public.json',
    dialogTitle: 'Export System Design Academy backup',
  });
}

export async function readBackupText(uri: string, size?: number): Promise<string> {
  if (size !== undefined && size > MAX_BACKUP_BYTES) {
    throw new Error('That file is larger than 8 MB.');
  }
  const file = new File(uri);
  const text = await file.text();
  if (text.length > MAX_BACKUP_BYTES) {
    throw new Error('That file is larger than 8 MB.');
  }
  return text;
}
