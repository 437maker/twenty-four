// dataExport.ts — "Export my data": write every table to a JSON file and open
// the iOS / Android share sheet.  Also handles Import.
//
// Pure functions: buildExportPayload(), validateImportPayload() — testable in Jest.
// Side-effect functions: exportDataToFile(), importDataFromFile() — touch DB + FS.
//
// Both expo-file-system and expo-sharing ship inside Expo Go.

import { File, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';

import { ALL_TABLES, TableName, getAllTablesForExport } from '../db/queries';
import { getDatabase } from '../db/database';
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

// ─── Validation ───────────────────────────────────────────────────────────────

export interface ImportValidationResult {
  valid: boolean;
  error?: string;
  payload?: ExportPayload;
  rowSummary?: string; // human-readable "X tasks, Y journal entries, …"
}

export function validateImportPayload(raw: unknown): ImportValidationResult {
  if (!raw || typeof raw !== 'object') {
    return { valid: false, error: 'File is not a valid JSON object.' };
  }
  const obj = raw as Record<string, unknown>;
  if (obj['app'] !== 'twenty-four') {
    return { valid: false, error: 'This file was not exported from twenty-four.' };
  }
  if (typeof obj['format_version'] !== 'number') {
    return { valid: false, error: 'File is missing format_version.' };
  }
  if (obj['format_version'] > EXPORT_FORMAT_VERSION) {
    return { valid: false, error: `Backup was made by a newer app version (format ${obj['format_version']}).` };
  }
  if (!obj['tables'] || typeof obj['tables'] !== 'object') {
    return { valid: false, error: 'File is missing table data.' };
  }
  const tables = obj['tables'] as Record<string, unknown>;
  for (const name of ALL_TABLES) {
    if (!Array.isArray(tables[name])) {
      return { valid: false, error: `Missing table "${name}" in backup.` };
    }
  }
  const payload = obj as unknown as ExportPayload;
  const tasks    = (tables['tasks'] as any[]).length;
  const journal  = (tables['journal_entries'] as any[]).length;
  const rowSummary = `${tasks} task${tasks !== 1 ? 's' : ''}, ${journal} journal entr${journal !== 1 ? 'ies' : 'y'}`;
  return { valid: true, payload, rowSummary };
}

// ─── Import ───────────────────────────────────────────────────────────────────
// Lets the user pick a backup file, validates it, and restores it in one
// transaction.  Throws on file-system or parse errors; returns a summary string
// on success so the caller can show a toast.
export async function importDataFromFile(): Promise<string> {
  // 1. Let the user pick a file
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    throw new Error('No file selected.');
  }

  const asset = result.assets[0];
  const file  = new File(asset.uri);
  const raw   = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('The selected file is not valid JSON.');
  }

  // 2. Validate
  const check = validateImportPayload(parsed);
  if (!check.valid || !check.payload) {
    throw new Error(check.error ?? 'Invalid backup file.');
  }
  const { payload } = check;

  // 3. Restore in one transaction — either everything is restored or nothing
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    // Clear existing data
    for (const name of ALL_TABLES) {
      await db.runAsync(`DELETE FROM ${name}`);
    }
    await db.runAsync('DELETE FROM sqlite_sequence');

    // Insert rows from the backup for each table
    for (const name of ALL_TABLES) {
      const rows: any[] = payload.tables[name] ?? [];
      if (rows.length === 0) continue;

      for (const row of rows) {
        const cols   = Object.keys(row);
        const phs    = cols.map(() => '?').join(', ');
        const vals   = cols.map((c) => row[c]);
        await db.runAsync(`INSERT OR REPLACE INTO ${name} (${cols.join(', ')}) VALUES (${phs})`, vals);
      }
    }
  });

  return `Restored: ${check.rowSummary}`;
}
