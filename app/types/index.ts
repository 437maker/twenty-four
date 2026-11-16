// index.ts — TypeScript type definitions for the whole app.
// Sprint 1: Care pillar, repeat tasks, treat count, targets cooldown.
// Sprint 2: JournalEntry, StreakHistoryEntry, TreatHistoryEntry, OwnedItem, ShopItemDef.

// ─── Pillars ──────────────────────────────────────────────────────────────────
export type Pillar = 'work' | 'personal' | 'sleep' | 'care';

// ─── Repeat types ─────────────────────────────────────────────────────────────
export type RepeatType = 'none' | 'daily' | 'weekdays' | 'weekends' | 'weekly' | 'custom';

// ─── Task ─────────────────────────────────────────────────────────────────────
export type SyncStatus = 'synced' | 'pending_push' | 'pending_delete';
export type TaskOrigin = 'app' | 'google';

export interface Task {
  id: number;
  date: string;           // "YYYY-MM-DD"
  name: string;
  start_time: string;     // "HH:MM"
  duration_hours: number;
  pillar: Pillar;
  completed: boolean;
  created_at: string;
  // Repeat fields (Sprint 1)
  repeat_type: RepeatType;
  repeat_days: string;    // comma-separated day numbers "1,3,5" for custom
  is_master: boolean;
  master_id: number | null;
  // Sprint 3 Google Calendar sync
  google_event_id: string | null;
  google_etag:     string | null;
  google_updated:  string | null;   // ISO timestamp from Google
  updated_at:      string;          // ISO timestamp, our last-modified
  sync_status:     SyncStatus;
  origin:          TaskOrigin;
}

// ─── Settings ─────────────────────────────────────────────────────────────────
export interface Settings {
  companion_name: string;
  work_target_hours: number;
  personal_target_hours: number;
  sleep_target_hours: number;
  care_enabled: boolean;
  care_target_hours: number;
  targets_last_changed: string | null;
  treat_count: number;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
  onboarded: boolean;
  notification_time: string;
  reflection_count: number;       // total journal entries saved
  // Sprint 2 Treat Economy
  app_start_date: string | null;  // first time app was opened
  last_box_date: string | null;   // last date a weekly accuracy box was given
  milestones_claimed: string;     // JSON array of streak lengths already claimed, e.g. "[7,30]"
  last_reflection_bonus_count: number; // last reflection_count at which bonus was paid
  // Sprint 2 Shop
  shields_owned: number;          // streak shield items in inventory
  // Sprint 2 Notifications
  notifications_enabled: boolean;
  morning_notification_time: string;   // "HH:MM"
  evening_notification_time: string;   // "HH:MM"
  // Sprint 3 Google Calendar sync
  google_account_email: string | null;  // signed-in Google account
  google_calendar_id:   string | null;  // the calendar (we auto-create "Twenty-Four")
  google_sync_token:    string | null;  // for incremental pulls
  google_last_sync_at:  string | null;  // ISO timestamp
  google_sync_enabled:  boolean;        // master toggle
  // Wardrobe
  equipped_items: string;        // JSON map from slot to item id, e.g. {"head":"acc_party_hat"}
  breed:          string;        // which dog is shown, e.g. "maltese"
  shown_house:    string | null; // the owned house item shown in the yard (null = best owned)
  // Chests
  chests_wooden: number;         // unopened chests of each tier
  chests_silver: number;
  chests_gold:   number;
  chest_pity:    number;         // chests opened in a row with no item (see data/chestLoot.ts)
  // Phase C: Treat deliveries
  last_delivery_week:      string | null; // "YYYY-WXX" of last scheduled delivery pair
  delivery_type_history:   string;        // JSON array of last card types (rotation guard)
  delivery_content_history: string;       // JSON array of last content_ids (8-week repeat guard)
  delivery_tag_weights:    string;        // JSON map of tag → weight delta from 👍/👎
  // Lively run
  last_opened_at:  string | null;  // ISO time the app was last opened (for the "missed you" greeting)
  last_durations:  string;         // JSON map from pillar to the duration (hours) last used for it
  prompt_history:  string;         // JSON array of { id, date } for journal prompts shown in the last 30 days
  // B6 fix: separate "last day with a completed task" from "last app open"
  last_app_open_date: string | null; // set by checkStreakOnOpen; prevents double-run on same day
}

// ─── Input types ──────────────────────────────────────────────────────────────
export interface NewTaskInput {
  date: string;
  name: string;
  start_time: string;
  duration_hours: number;
  pillar: Pillar;
  repeat_type?: RepeatType;
  repeat_days?: string;
}

// ─── Nova states ──────────────────────────────────────────────────────────────
export type NovaState = 'idle' | 'happy' | 'sleeping' | 'celebrating';

// ─── Journal ──────────────────────────────────────────────────────────────────
// Sprint 2: one entry per calendar day.
export interface JournalEntry {
  id: number;
  date: string;             // "YYYY-MM-DD", UNIQUE in the table
  reflection_text: string;
  prompt_used: string;      // the prompt that was shown when writing
  is_exception_day: boolean;
  exception_reason: string; // e.g. "Holiday", "Vacation", or custom
  word_count: number;
  created_at: string;
}

// ─── Streak history ───────────────────────────────────────────────────────────
// Sprint 2: logged when a streak breaks so Analytics can show "last 5 streaks".
export interface StreakHistoryEntry {
  id: number;
  start_date: string;  // "YYYY-MM-DD"
  end_date: string;    // "YYYY-MM-DD"
  length: number;
}

// ─── Analytics ────────────────────────────────────────────────────────────────
// One day's worth of analytics data, computed in the Analytics screen.
export interface DayAnalytics {
  date: string;
  adherence: number;   // 0-100
  tasks: Task[];
  isException: boolean;
  isFuture?: boolean;  // Phase A: true when date > today; excluded from averages
}

// ─── Treat History ────────────────────────────────────────────────────────────
// Sprint 2: log every treat earn / spend event.
export type TreatEventType =
  | 'streak_milestone'
  | 'weekly_box_gold'
  | 'weekly_box_silver'
  | 'weekly_box_basic'
  | 'journal_bonus'
  | 'shop_purchase'
  | 'chest_purchase'   // bought a chest in the Shop (negative)
  | 'chest_open';      // treats from an opened chest, duplicate refunds included (positive)

export interface TreatHistoryEntry {
  id: number;
  event_type: TreatEventType;
  delta: number;         // positive = earned, negative = spent
  note: string;          // human-readable description
  created_at: string;
}

// ─── Shop ─────────────────────────────────────────────────────────────────────
// Sprint 2: shop catalog items and owned items.
export type ShopCategory = 'outfit' | 'accessory' | 'house' | 'shield';

export interface ShopItemDef {
  id: string;           // unique slug, e.g. "outfit_cozy_sweater"
  category: ShopCategory;
  name: string;
  description: string;
  price: number;        // in treats
  tier: number;         // 1-5 (shields = tier 1)
  emoji: string;        // display icon
}

export interface OwnedItem {
  id: number;
  item_id: string;      // references ShopItemDef.id
  purchased_at: string;
}

// ─── Box reward ───────────────────────────────────────────────────────────────
// Sprint 2: weekly accuracy box result, shown in modal on Home.
// Houses run: the box is now a chest that is opened on screen, so it carries
// the chest tier instead of a treat amount.
export type BoxTier = 'gold' | 'silver' | 'basic';
export type ChestTier = 'wooden' | 'silver' | 'gold';
export interface BoxReward {
  tier: BoxTier;
  chest: ChestTier;     // the chest that was added to the inventory
  adherence: number;    // 0-100, the adherence percentage earned
}

// ─── Treat deliveries ─────────────────────────────────────────────────────────
// Phase C: twice-weekly on-device personalised card deliveries.
export type DeliveryCardType = 'quote' | 'book' | 'movie' | 'activity';

export interface DeliveryRow {
  id: number;
  delivered_on: string;       // "YYYY-MM-DD"
  card_type: DeliveryCardType;
  content_id: string;
  why_line: string;           // short explanation, e.g. "Your Care pillar needs a boost"
  opened: boolean;
  feedback: 'up' | 'down' | null;
  saved: boolean;
  bones_given: boolean;       // +3 bones paid for this delivery already
  created_at: string;
}
