// dataExport.ts — "Export my data": write every table to a JSON file and open
// the iOS / Android share sheet.
//
// Split in two on purpose:
//   • buildExportPayload()  — pure. Takes rows, returns the object that gets
//                             written. No phone APIs, so jest can test it.
//   • exportDataToFile()    — the side effects: read DB, write file, share.
//
// Both expo-file-system and expo-sharing ship inside Expo Go.

import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { ALL_TABLES, TableName, getAllTablesForExport } from '../db/queries';
import { getTodayString } from '../utils/dateHelpers';

// Bump this when the shape of the file changes, so a future "import" feature
// can tell old backups from new ones.
export const EXPORT_FORMAT_VERSION = 1;

// Settings columns that should not leave the phone in a file the user may
// AirDrop or email. The Google OAuth tokens themselves are NOT in the database
// (they live in the Keychain via expo-secure-store), so they are never exported.
// The sync token is only a bookmark for incremental sync and is useless on
// another device, but there is no reason to ship it either.
const REDACTED_SETTINGS_FIELDS = ['google_sync_token'] as const;
export const REDACTED_PLACEHOLDER = '[removed]';

export interface ExportPayload {
  app: 'twenty-four';
  format_version: number;
  exported_at: string;                  // ISO timestamp (UTC), when the file was made
  export_date: string;                  // local calendar day, "YYYY-MM-DD"
  row_counts: Record<TableName, number>;
  tables: Record<TableName, any[]>;
}

export function buildExportPayload(
  tables: Record<TableName, any[]>,
  now: Date = new Date(),
): ExportPayload {
  const cleaned = {} as Record<TableName, any[]>;
  const counts = {} as Record<TableName, number>;

  for (const name of ALL_TABLES) {
    const rows = tables[name] ?? [];
    cleaned[name] =
      name === 'settings'
        ? rows.map((row) => {
            const copy = { ...row };
            for (const field of REDACTED_SETTINGS_FIELDS) {
              if (copy[field] != null) copy[field] = REDACTED_PLACEHOLDER;
            }
            return copy;
          })
        : rows;
    counts[name] = rows.length;
  }

  return {
    app: 'twenty-four',
    format_version: EXPORT_FORMAT_VERSION,
    exported_at: now.toISOString(),
    export_date: getTodayString(),
    row_counts: counts,
    tables: cleaned,
  };
}

export function exportFileName(): string {
  return `twenty-four-backup-${getTodayString()}.json`;
}

// Reads the database, writes the JSON file to the cache folder, and opens the
// share sheet. Returns the file URI. Throws if sharing is unavailable.
export async function exportDataToFile(): Promise<string> {
  const tables = await getAllTablesForExport();
  const payload = buildExportPayload(tables);

  // Cache directory: the OS may clear it later, which is what we want for a
  // file whose only job is to be handed to the share sheet.
  const file = new File(Paths.cache, exportFileName());
  file.create({ overwrite: true });
  // SDK 58: File.write() returns a promise. Wait for it, or the share sheet
  // could open before the file has its contents.
  await file.write(JSON.stringify(payload, null, 2));

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    UTI: 'public.json',
    dialogTitle: 'Export your 24 data',
  });
  return file.uri;
}
