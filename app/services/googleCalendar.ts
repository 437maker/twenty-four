// googleCalendar.ts — Thin REST client for Google Calendar v3.
//
// Why hand-rolled instead of a package?
//   - Most JS google-api-client libs assume Node (need 'fs', use service-account
//     keys, etc.) and bloat the bundle. The REST endpoints we need are five
//     calls, so we just hit them with fetch().
//
// Endpoints used:
//   GET    /calendar/v3/users/me/calendarList                 — find/discover calendar
//   POST   /calendar/v3/calendars                              — create "Twenty-Four"
//   GET    /calendar/v3/calendars/{id}/events                  — list (with syncToken)
//   POST   /calendar/v3/calendars/{id}/events                  — create event
//   PUT    /calendar/v3/calendars/{id}/events/{eventId}        — update
//   DELETE /calendar/v3/calendars/{id}/events/{eventId}        — delete

import { getValidAccessToken } from './googleAuth';

const BASE = 'https://www.googleapis.com/calendar/v3';

// Calendar name we auto-create on first sync.
export const TWENTY_FOUR_CALENDAR_NAME = 'Twenty-Four';

export interface GCalEvent {
  id?:           string;
  summary?:      string;
  description?:  string;
  start?:        { dateTime?: string; date?: string; timeZone?: string };
  end?:          { dateTime?: string; date?: string; timeZone?: string };
  status?:       string;          // 'confirmed' | 'cancelled' | 'tentative'
  etag?:         string;
  updated?:      string;          // ISO timestamp
  recurrence?:   string[];        // present on recurring events — we skip those
  recurringEventId?: string;      // present on instances of recurring events
  extendedProperties?: {
    private?: { [k: string]: string };
  };
}

export interface GCalListResponse {
  items:            GCalEvent[];
  nextPageToken?:   string;
  nextSyncToken?:   string;
}

interface GCalCalendar {
  id:       string;
  summary:  string;
  primary?: boolean;
}

interface GCalListCalendarsResponse {
  items: GCalCalendar[];
}

// ─── Low-level request helper ─────────────────────────────────────────────────
// Throws Error('NOT_SIGNED_IN') when there's no token (caller can handle).
// Throws Error('SYNC_TOKEN_INVALID') on a 410 from a list call so the caller
// can fall back to a full re-sync.
async function gcalFetch(
  path: string,
  init: RequestInit = {}
): Promise<any> {
  const token = await getValidAccessToken();
  if (!token) throw new Error('NOT_SIGNED_IN');

  const headers: any = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...(init.headers ?? {}),
  };

  const res = await fetch(`${BASE}${path}`, { ...init, headers });

  if (res.status === 410) {
    // Sync token expired — caller must do a full resync.
    throw new Error('SYNC_TOKEN_INVALID');
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Google API ${res.status}: ${text}`);
  }

  // DELETE returns 204 No Content.
  if (res.status === 204) return null;
  return res.json();
}

// ─── Calendar discovery / creation ────────────────────────────────────────────
export async function findOrCreateTwentyFourCalendar(): Promise<string> {
  // 1) Look for an existing calendar named "Twenty-Four"
  const list: GCalListCalendarsResponse = await gcalFetch('/users/me/calendarList');
  const existing = list.items?.find((c) => c.summary === TWENTY_FOUR_CALENDAR_NAME);
  if (existing) return existing.id;

  // 2) Create one
  const created: GCalCalendar = await gcalFetch('/calendars', {
    method: 'POST',
    body:   JSON.stringify({ summary: TWENTY_FOUR_CALENDAR_NAME }),
  });
  return created.id;
}

// ─── Event mutations ──────────────────────────────────────────────────────────
export async function createEvent(
  calendarId: string,
  event: Partial<GCalEvent>
): Promise<GCalEvent> {
  return gcalFetch(
    `/calendars/${encodeURIComponent(calendarId)}/events`,
    { method: 'POST', body: JSON.stringify(event) }
  );
}

export async function updateEvent(
  calendarId: string,
  eventId: string,
  event: Partial<GCalEvent>
): Promise<GCalEvent> {
  return gcalFetch(
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: 'PUT', body: JSON.stringify(event) }
  );
}

export async function deleteEvent(
  calendarId: string,
  eventId: string
): Promise<void> {
  try {
    await gcalFetch(
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      { method: 'DELETE' }
    );
  } catch (err: any) {
    // 404/410 = event already gone — treat as success.
    const msg = String(err?.message ?? '');
    if (msg.includes('404') || msg.includes('410')) return;
    throw err;
  }
}

// ─── Incremental list ─────────────────────────────────────────────────────────
// Pass `syncToken` from a previous successful list to get only what's changed.
// First call (no token) returns a full snapshot — but we cap it to ±90 days
// of "now" to avoid pulling years of history. Subsequent incremental calls
// will receive any change regardless of date.
export async function listEvents(
  calendarId: string,
  opts: { syncToken?: string; pageToken?: string }
): Promise<GCalListResponse> {
  const params = new URLSearchParams();
  params.set('singleEvents', 'true');        // expand recurring instances
  params.set('showDeleted',   'true');        // we need to know about deletions
  params.set('maxResults',    '250');

  if (opts.syncToken) {
    params.set('syncToken', opts.syncToken);
  } else {
    // Initial sync window: 90 days back → 365 days forward
    const now      = new Date();
    const start    = new Date(now); start.setDate(start.getDate() - 90);
    const end      = new Date(now); end.setDate(end.getDate()   + 365);
    params.set('timeMin', start.toISOString());
    params.set('timeMax', end.toISOString());
  }
  if (opts.pageToken) params.set('pageToken', opts.pageToken);

  return gcalFetch(
    `/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`
  );
}
