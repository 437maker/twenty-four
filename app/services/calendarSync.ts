// calendarSync.ts — Bidirectional sync between local tasks and Google Calendar.
//
// HOW IT WORKS (high level):
//
//   1. PUSH phase
//      - For every tombstone: DELETE the Google event, then drop the tombstone.
//      - For every task with sync_status='pending_push':
//          • no google_event_id → CREATE event, store returned id/etag
//          • has google_event_id → UPDATE event with PUT
//
//   2. PULL phase
//      - List events from Google with stored syncToken (or full window on first run).
//      - For each event:
//          • status='cancelled' → if we have a matching local task, delete it
//          • recurrence present → skip (v1 does not sync repeats)
//          • match by google_event_id:
//              - new event       → insert local task (pillar='work')
//              - existing task   → conflict resolution (last-write-wins by timestamp)
//      - Save nextSyncToken for the next run.
//
// CONFLICT RESOLUTION:
//   When the same event was edited on both sides, we compare:
//      local.updated_at   vs  google.updated
//   Whichever is *newer* wins. If local is newer, we re-push it in the next
//   push phase (the local update will have set sync_status='pending_push').
//
// THINGS DELIBERATELY NOT DONE IN v1:
//   - Repeating tasks (skipped on both push and pull, per user choice)
//   - Pushing completion state (Calendar has no "done" concept)
//   - Background sync (Expo Go can't; we run on app open + manual button)

import { Task } from '../types';
import {
  getSettings, saveSettings,
  getTasksPendingPush, getTombstones, deleteTombstone,
  markTaskSynced, getTaskByGoogleId,
  insertTaskFromGoogle, applyGooglePull, deleteTaskFromGooglePull,
} from '../db/queries';
import {
  findOrCreateTwentyFourCalendar,
  createEvent, updateEvent, deleteEvent, listEvents,
  GCalEvent,
} from './googleCalendar';
import { getValidAccessToken } from './googleAuth';

// ─── Time helpers ─────────────────────────────────────────────────────────────
// Build a *naive* (no offset) ISO datetime from "YYYY-MM-DD" + "HH:MM".
// We send this to Google paired with a `timeZone` field, so Google interprets
// it in the user's local TZ.
function buildNaiveIso(date: string, time: string): string {
  // e.g. "2026-05-23T14:30:00"
  return `${date}T${time}:00`;
}

// Format a Date as naive-ISO using the device's local clock fields.
// (toISOString() converts to UTC — we do NOT want that for timeZone-tagged
// events because it would double-apply the offset.)
function formatLocalNaive(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` +
    `T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
  );
}

// Local time zone identifier (e.g. "America/New_York"). Used so Google
// schedules the event in the user's TZ rather than UTC.
function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

// Convert task → Google event payload.
function taskToGoogle(task: Task): Partial<GCalEvent> {
  const startIso = buildNaiveIso(task.date, task.start_time);
  // new Date(naiveIso) parses as local — that's what we want here so we can
  // add the duration in real ms and reformat back to naive local.
  const startDate = new Date(startIso);
  const endDate   = new Date(startDate.getTime() + task.duration_hours * 3600 * 1000);
  const endIso    = formatLocalNaive(endDate);

  const tz = deviceTimeZone();
  return {
    summary:     task.name,
    start:       { dateTime: startIso, timeZone: tz },
    end:         { dateTime: endIso,   timeZone: tz },
    extendedProperties: {
      private: {
        twentyFour_pillar:    task.pillar,
        twentyFour_completed: task.completed ? '1' : '0',
        twentyFour_localId:   String(task.id),
      },
    },
  };
}

// Convert Google event → local task fields.
// Returns null if the event has no usable start time (e.g. all-day with no date).
function googleToTaskFields(ev: GCalEvent): {
  date: string;
  start_time: string;
  duration_hours: number;
  name: string;
} | null {
  if (!ev.start) return null;

  // Pick the datetime; fall back to all-day date.
  const startStr = ev.start.dateTime ?? ev.start.date;
  const endStr   = ev.end?.dateTime  ?? ev.end?.date;
  if (!startStr) return null;

  const start = new Date(startStr);
  if (isNaN(start.getTime())) return null;

  // For all-day events, default to 9am with 1h duration so they appear on the schedule.
  const isAllDay = !ev.start.dateTime;
  let duration  = 1;
  if (endStr) {
    const end = new Date(endStr);
    if (!isNaN(end.getTime())) {
      duration = Math.max(0.25, (end.getTime() - start.getTime()) / 3600 / 1000);
      // Cap at 12h to match the app's slider range, snap to 0.25 step.
      duration = Math.min(12, Math.round(duration * 4) / 4);
    }
  }

  // Format date as YYYY-MM-DD and time as HH:MM in *local* tz.
  const pad = (n: number) => String(n).padStart(2, '0');
  const date = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
  const time = isAllDay
    ? '09:00'
    : `${pad(start.getHours())}:${pad(start.getMinutes())}`;

  return {
    date,
    start_time: time,
    duration_hours: duration,
    name: (ev.summary ?? '(no title)').slice(0, 200),
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────
export interface SyncResult {
  ok:              boolean;
  pushedCreated:   number;
  pushedUpdated:   number;
  pushedDeleted:   number;
  pulledCreated:   number;
  pulledUpdated:   number;
  pulledDeleted:   number;
  error?:          string;
  signedOut?:      boolean;       // true when the auth tokens are gone
}

// Quick gate — is the user signed in AND has sync enabled?
export async function isSyncReady(): Promise<boolean> {
  const settings = await getSettings();
  if (!settings?.google_sync_enabled) return false;
  const token = await getValidAccessToken();
  return token !== null;
}

// Main entry point. Safe to call repeatedly — bail out fast if not signed in.
export async function runSync(): Promise<SyncResult> {
  const result: SyncResult = {
    ok: false,
    pushedCreated: 0, pushedUpdated: 0, pushedDeleted: 0,
    pulledCreated: 0, pulledUpdated: 0, pulledDeleted: 0,
  };

  const settings = await getSettings();
  if (!settings?.google_sync_enabled) {
    result.ok = true;
    return result;
  }

  const token = await getValidAccessToken();
  if (!token) {
    result.signedOut = true;
    result.error = 'Not signed in to Google.';
    return result;
  }

  try {
    // Make sure we have a target calendar id stored.
    let calendarId = settings.google_calendar_id;
    if (!calendarId) {
      calendarId = await findOrCreateTwentyFourCalendar();
      await saveSettings({ google_calendar_id: calendarId });
    }

    // 1) PUSH ──────────────────────────────────────────────────────────────
    // 1a) Tombstones first (avoid pushing an update for a now-deleted task).
    const tombstones = await getTombstones();
    for (const t of tombstones) {
      try {
        await deleteEvent(calendarId, t.google_event_id);
        result.pushedDeleted++;
      } catch (err) {
        // Logged but doesn't abort — we'll retry next sync.
        console.warn('[sync] failed to delete event', t.google_event_id, err);
        continue;
      }
      await deleteTombstone(t.id);
    }

    // 1b) Pending tasks
    const pending = await getTasksPendingPush();
    for (const task of pending) {
      try {
        if (task.google_event_id) {
          // Update existing
          const ev = await updateEvent(calendarId, task.google_event_id, taskToGoogle(task));
          await markTaskSynced(task.id, ev.id ?? task.google_event_id, ev.etag ?? null, ev.updated ?? null);
          result.pushedUpdated++;
        } else {
          // Create new
          const ev = await createEvent(calendarId, taskToGoogle(task));
          if (ev.id) {
            await markTaskSynced(task.id, ev.id, ev.etag ?? null, ev.updated ?? null);
            result.pushedCreated++;
          }
        }
      } catch (err) {
        console.warn('[sync] failed to push task', task.id, err);
        // Continue with other tasks — this one stays pending for next try.
      }
    }

    // 2) PULL ──────────────────────────────────────────────────────────────
    let syncToken: string | undefined = settings.google_sync_token ?? undefined;
    let pageToken: string | undefined;
    let nextSyncToken: string | undefined;

    // Loop through all pages of the (incremental or full) list.
    while (true) {
      let page;
      try {
        page = await listEvents(calendarId, { syncToken, pageToken });
      } catch (err: any) {
        if (String(err?.message) === 'SYNC_TOKEN_INVALID') {
          // Token expired; fall back to a full re-sync.
          await saveSettings({ google_sync_token: null });
          syncToken = undefined;
          pageToken = undefined;
          continue;
        }
        throw err;
      }

      for (const ev of page.items ?? []) {
        await applyIncomingEvent(ev, result);
      }

      if (page.nextPageToken) {
        pageToken = page.nextPageToken;
        continue;
      }
      // End of pagination — Google returns nextSyncToken on the *last* page.
      nextSyncToken = page.nextSyncToken;
      break;
    }

    await saveSettings({
      google_sync_token:   nextSyncToken ?? null,
      google_last_sync_at: new Date().toISOString(),
    });

    result.ok = true;
    return result;
  } catch (err: any) {
    result.error = String(err?.message ?? err);
    return result;
  }
}

// Apply one incoming event to the local DB. Mutates `result` counters.
async function applyIncomingEvent(ev: GCalEvent, result: SyncResult): Promise<void> {
  if (!ev.id) return;

  // Skip recurring events and their instances (v1 design choice).
  if (ev.recurrence && ev.recurrence.length > 0) return;
  if (ev.recurringEventId) return;

  // Deletion
  if (ev.status === 'cancelled') {
    const existing = await getTaskByGoogleId(ev.id);
    if (existing) {
      await deleteTaskFromGooglePull(existing.id);
      result.pulledDeleted++;
    }
    return;
  }

  const fields = googleToTaskFields(ev);
  if (!fields) return;

  const existing = await getTaskByGoogleId(ev.id);
  if (!existing) {
    // Brand new event from Google → insert with pillar='work'.
    await insertTaskFromGoogle({
      googleEventId:  ev.id,
      googleEtag:     ev.etag ?? null,
      googleUpdated:  ev.updated ?? null,
      ...fields,
    });
    result.pulledCreated++;
    return;
  }

  // Conflict resolution: compare timestamps.
  // local.updated_at is ISO, ev.updated is ISO — string compare is safe.
  const localTs  = existing.updated_at;
  const googleTs = ev.updated ?? '';
  if (googleTs && googleTs > localTs) {
    await applyGooglePull({
      id:             existing.id,
      googleEtag:     ev.etag ?? null,
      googleUpdated:  ev.updated ?? null,
      ...fields,
    });
    result.pulledUpdated++;
  }
  // Else: local is newer. Leave it alone — the next push phase will overwrite Google.
}
