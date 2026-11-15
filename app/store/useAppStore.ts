// useAppStore.ts — Global state (Zustand).
// Sprint 1: pendingCelebration for streak milestones.
// Sprint 2: checkStreakOnOpen (streak check/reset, shield consume, weekly box),
//           streakJustBroke message flag, pendingBoxReward.

import { create } from 'zustand';
import { Settings, Task, BoxReward, DeliveryRow, DeliveryCardType } from '../types';
import {
  getSettings,
  saveSettings,
  getTasksForDate,
  getTasksForDates,
  logStreakEnd,
  changeTreats,
  logTreatEvent,
  deleteAllData,
  grantChest,
  getPendingDeliveries,
  insertDelivery,
  openDelivery,
  markDeliveryBonesGiven,
  setDeliveryFeedback,
  saveDelivery,
  deliveryExistsForDate,
  getDeliveryStats,
  getRecentJournalEntries,
} from '../db/queries';
import { chestForBoxTier } from '../data/chestLoot';
import {
  isStreakMilestone, milestoneBonus,
  weeklyBoxTier,
  weeklyAdherence, buildDayAnalytics, getLastNDates,
} from '../utils/calculations';
import { runSync, isSyncReady } from '../services/calendarSync';
import { getTodayString, getYesterdayString } from '../utils/dateHelpers';
import { computeWeekSignals } from '../utils/insights';
import {
  isoWeekString, weekDeliveryDays, deliveryProgress,
  pickContent, pushToHistory, parseHistory, getContentById,
} from '../utils/delivery';
import type { DeliveryProgress } from '../utils/delivery';

// Date keys ("YYYY-MM-DD") must be the phone's LOCAL calendar day.
// The old code cut the date out of toISOString(), which is UTC: in Boston
// that rolls over at 7-8pm, so an evening open looked like "tomorrow" and
// could reset or double-count the streak. dateHelpers formats in local time.
const getTodayStr     = getTodayString;
const getYesterdayStr = getYesterdayString;

interface AppState {
  settings: Settings | null;
  isOnboarded: boolean;
  todaysTasks: Task[];

  // Sprint 1: triggers celebrating Nova on milestone streaks
  pendingCelebration: boolean;
  // Sprint 2: new streak value when a milestone is hit (for the modal title)
  milestoneStreak: number;
  // Sprint 2: true for one render cycle when a streak breaks
  streakJustBroke: boolean;
  // Sprint 2: when not null, show weekly accuracy box modal
  pendingBoxReward: BoxReward | null;
  // Sprint 2: shield consumed message (streak was saved)
  shieldConsumed: boolean;

  // Phase C: Treat deliveries
  pendingDeliveries: DeliveryRow[];
  // Progress toward the first delivery (days / tasks / journals). null until checked.
  deliveryProgress: DeliveryProgress | null;
  setPendingDeliveries: (v: DeliveryRow[]) => void;
  checkDeliveriesOnOpen: () => Promise<void>;
  openDeliveryAndGiveBones: (id: number) => Promise<void>;
  dismissDelivery: (id: number) => Promise<void>;
  giveDeliveryFeedback: (id: number, fb: 'up' | 'down') => Promise<void>;
  toggleDeliverySaved: (id: number, saved: boolean) => Promise<void>;
  forceDelivery: () => Promise<void>;    // tester only

  loadSettings: () => Promise<void>;
  updateSettings: (updates: Partial<Settings>) => Promise<void>;
  completeOnboarding: (finalSettings: Partial<Settings>) => Promise<void>;
  loadTodaysTasks: (date: string) => Promise<void>;
  refreshTasks: (date: string) => Promise<void>;
  setPendingCelebration: (v: boolean) => void;
  setStreakJustBroke: (v: boolean) => void;
  setPendingBoxReward: (v: BoxReward | null) => void;
  setShieldConsumed: (v: boolean) => void;
  // Reload treat count from DB into store (call after shop purchases)
  refreshTreatCount: () => Promise<void>;

  // Sprint 2: called once on every app open — handles streak increment / reset
  checkStreakOnOpen: () => Promise<void>;

  // Sprint 3: run Google Calendar sync (no-op when not connected)
  syncWithGoogle: () => Promise<void>;
  // True while a background sync is mid-flight, so the UI can show a hint
  isSyncing: boolean;

  // Phase 3: wipe the database and put the store back to a first-launch state.
  // App.tsx shows onboarding whenever isOnboarded is false, so this is also
  // what sends the user back to onboarding.
  resetAllData: () => Promise<void>;

  // Tester menu: incrementing this token causes YardDog to remount, which
  // resets its rest state to outside/awake. REMOVE BEFORE APP STORE RELEASE.
  restResetToken: number;
  resetRestState: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  settings:           null,
  isOnboarded:        false,
  todaysTasks:        [],
  pendingCelebration: false,
  milestoneStreak:    0,
  streakJustBroke:    false,
  pendingBoxReward:   null,
  shieldConsumed:     false,
  isSyncing:          false,
  restResetToken:     0,
  pendingDeliveries:  [],
  deliveryProgress:   null,

  loadSettings: async () => {
    const settings = await getSettings();
    set({ settings, isOnboarded: settings?.onboarded ?? false });
  },

  updateSettings: async (updates) => {
    await saveSettings(updates);
    const current = get().settings;
    set({
      settings:    current ? { ...current, ...updates } : null,
      isOnboarded: updates.onboarded ?? current?.onboarded ?? false,
    });
  },

  completeOnboarding: async (finalSettings) => {
    const updates = { ...finalSettings, onboarded: true };
    await saveSettings(updates);
    const current = get().settings;
    set({
      settings:    current ? { ...current, ...updates } : null,
      isOnboarded: true,
    });
  },

  loadTodaysTasks: async (date) => {
    const tasks = await getTasksForDate(date);
    set({ todaysTasks: tasks });
  },

  refreshTasks: async (date) => {
    const tasks = await getTasksForDate(date);
    set({ todaysTasks: tasks });
  },

  setPendingCelebration: (v) => set({ pendingCelebration: v }),
  setStreakJustBroke:    (v) => set({ streakJustBroke: v }),
  setPendingBoxReward:   (v) => set({ pendingBoxReward: v }),
  setShieldConsumed:     (v) => set({ shieldConsumed: v }),

  // ── Sprint 3: Google Calendar sync trigger ─────────────────────────────────
  // Safe to call from anywhere — no-ops if user hasn't connected Google.
  // We refresh tasks + settings after a successful sync so the UI reflects
  // anything pulled from Google.
  syncWithGoogle: async () => {
    if (get().isSyncing) return;
    const ready = await isSyncReady();
    if (!ready) return;

    set({ isSyncing: true });
    try {
      const result = await runSync();
      if (result.ok) {
        // Re-load settings (for last_sync_at) and today's tasks (in case pull
        // added/changed something for today).
        const settings = await getSettings();
        set({ settings });
        const today = getTodayStr();
        const tasks = await getTasksForDate(today);
        set({ todaysTasks: tasks });
      }
    } catch (err) {
      // Swallow — surface details in CalendarSettingsScreen, not here.
      console.warn('[useAppStore] syncWithGoogle failed', err);
    } finally {
      set({ isSyncing: false });
    }
  },

  resetAllData: async () => {
    await deleteAllData();
    const settings = await getSettings(); // the fresh default row
    set({
      settings,
      isOnboarded:        false,
      todaysTasks:        [],
      pendingCelebration: false,
      milestoneStreak:    0,
      streakJustBroke:    false,
      pendingBoxReward:   null,
      shieldConsumed:     false,
      isSyncing:          false,
      pendingDeliveries:  [],
      deliveryProgress:   null,
    });
    // Same step App.tsx runs on a real first launch: stamps app_start_date
    // and last_active_date so the new streak starts counting from today.
    await get().checkStreakOnOpen();
  },

  refreshTreatCount: async () => {
    const s = await getSettings();
    if (!s) return;
    set((state) => ({
      settings: state.settings
        ? {
            ...state.settings,
            treat_count:   s.treat_count,
            shields_owned: s.shields_owned,
            chests_wooden: s.chests_wooden,
            chests_silver: s.chests_silver,
            chests_gold:   s.chests_gold,
            chest_pity:    s.chest_pity,
          }
        : null,
    }));
  },

  // ── Sprint 2: streak check on every app open ─────────────────────────────────
  // Rules:
  //   • last_active_date == today          → check weekly box only (already opened today)
  //   • last_active_date == yesterday      → consecutive day: increment streak
  //   • last_active_date is anything else  → try to consume shield; if no shield → reset
  checkStreakOnOpen: async () => {
    const settings = await getSettings();
    if (!settings) return;

    const today     = getTodayStr();
    const yesterday = getYesterdayStr();
    const last      = settings.last_active_date;

    // ── First open ever: record app_start_date ────────────────────────────────
    if (!settings.app_start_date) {
      await saveSettings({ app_start_date: today });
    }

    if (last !== today) {
      // ── Determine if consecutive or missed ──────────────────────────────────
      if (last === yesterday) {
        // Consecutive day — increment streak
        const newStreak  = settings.current_streak + 1;
        const newLongest = Math.max(newStreak, settings.longest_streak);

        // Check milestone claim (avoid re-claiming the same streak)
        const claimed: number[] = JSON.parse(settings.milestones_claimed || '[]');
        const isMilestone = isStreakMilestone(newStreak) && !claimed.includes(newStreak);

        let treatDelta = 0;
        if (isMilestone) {
          const bonus = milestoneBonus(newStreak);
          treatDelta = bonus;
          await changeTreats(bonus);
          await logTreatEvent('streak_milestone', bonus, `${newStreak}-day streak milestone`);
          claimed.push(newStreak);
        }

        await saveSettings({
          current_streak:    newStreak,
          longest_streak:    newLongest,
          last_active_date:  today,
          milestones_claimed: JSON.stringify(claimed),
        });

        set((state) => ({
          settings: state.settings
            ? {
                ...state.settings,
                current_streak:     newStreak,
                longest_streak:     newLongest,
                last_active_date:   today,
                milestones_claimed: JSON.stringify(claimed),
                treat_count:        (state.settings.treat_count ?? 0) + treatDelta,
              }
            : null,
          pendingCelebration: isMilestone,
          milestoneStreak:    isMilestone ? newStreak : get().milestoneStreak,
        }));
      } else {
        // Missed one or more days — try to use a shield
        const oldStreak  = settings.current_streak;
        const hasShield  = (settings.shields_owned ?? 0) > 0;

        if (hasShield && oldStreak > 0) {
          // Shield absorbs the break — streak unchanged, shield consumed
          await saveSettings({
            shields_owned:   (settings.shields_owned ?? 1) - 1,
            last_active_date: today,
          });
          set((state) => ({
            settings: state.settings
              ? {
                  ...state.settings,
                  shields_owned:    Math.max(0, (state.settings.shields_owned ?? 1) - 1),
                  last_active_date: today,
                }
              : null,
            shieldConsumed: true,
          }));
        } else {
          // No shield — reset streak
          if (oldStreak > 0 && last) {
            await logStreakEnd(last, oldStreak);
          }
          await saveSettings({ current_streak: 0, last_active_date: today });
          set((state) => ({
            settings: state.settings
              ? { ...state.settings, current_streak: 0, last_active_date: today }
              : null,
            streakJustBroke: oldStreak > 0,
          }));
        }
      }
    }

    // ── Weekly accuracy box check ─────────────────────────────────────────────
    // Give a box if it's been ≥7 days since app_start_date AND the last box
    // was not given in the last 7 days.
    const freshSettings = await getSettings();
    if (!freshSettings) return;

    const startDate  = freshSettings.app_start_date ?? today;
    const daysSinceStart = Math.floor(
      (new Date(today).getTime() - new Date(startDate).getTime()) / 86400000
    );
    const lastBox = freshSettings.last_box_date;
    const daysSinceBox = lastBox
      ? Math.floor((new Date(today).getTime() - new Date(lastBox).getTime()) / 86400000)
      : 999;

    if (daysSinceStart >= 7 && daysSinceBox >= 7) {
      // Compute adherence for last 7 completed days
      const last7 = getLastNDates(7);
      const taskMap = await getTasksForDates(last7);
      const dayAnalytics = buildDayAnalytics(taskMap, new Set());
      const adherence = weeklyAdherence(dayAnalytics);

      // The box is a chest (Basic → Wooden, Silver → Silver, Gold → Gold).
      // It goes into the inventory unopened; its treats are paid, and logged,
      // when it is opened. The ledger row here records the box with 0 treats.
      const tier  = weeklyBoxTier(adherence);
      const chest = chestForBoxTier(tier);
      await grantChest(chest);
      await logTreatEvent(
        tier === 'gold'   ? 'weekly_box_gold'   :
        tier === 'silver' ? 'weekly_box_silver' : 'weekly_box_basic',
        0,
        `Weekly ${chest} chest (${adherence}% adherence)`
      );
      await saveSettings({ last_box_date: today });

      const column = chest === 'gold' ? 'chests_gold' : chest === 'silver' ? 'chests_silver' : 'chests_wooden';
      set((state) => ({
        settings: state.settings
          ? {
              ...state.settings,
              [column]:      (state.settings[column] ?? 0) + 1,
              last_box_date: today,
            }
          : null,
        pendingBoxReward: { tier, chest, adherence },
      }));
    }
  },

  // REMOVE BEFORE APP STORE RELEASE (tester menu, see docs/DECISIONS.md D69)
  resetRestState: () => set((s) => ({ restResetToken: s.restResetToken + 1 })),

  // ── Phase C: Treat deliveries ─────────────────────────────────────────────
  setPendingDeliveries: (v) => set({ pendingDeliveries: v }),

  checkDeliveriesOnOpen: async () => {
    const settings = await getSettings();
    if (!settings) return;

    const today   = getTodayStr();
    const weekStr = isoWeekString(new Date());

    // Data threshold: no scheduled deliveries until there is enough to go on
    // (7 days of use, 10 completed tasks, 3 journal entries). Home shows a
    // progress hint until then. A delivery forced from the tester menu is
    // already in the table and still shows.
    const stats = await getDeliveryStats();
    const progress = deliveryProgress({
      firstUseDate: settings.app_start_date,
      today,
      completedTasks: stats.completedTasks,
      journalEntries: stats.journalEntries,
    });

    if (progress.unlocked) {
      if (settings.last_delivery_week !== weekStr) {
        await saveSettings({ last_delivery_week: weekStr });
      }
      // Create a row for each delivery day that has arrived and has none yet.
      const [day1, day2] = weekDeliveryDays(weekStr);
      for (const deliveryDate of [day1, day2]) {
        if (deliveryDate <= today && !(await deliveryExistsForDate(deliveryDate))) {
          const fresh = (await getSettings()) ?? settings; // history changes with each insert
          await _insertDeliveryForDate(deliveryDate, fresh);
        }
      }
    }

    set({ deliveryProgress: progress, pendingDeliveries: await _shownDeliveries(get().pendingDeliveries) });
  },

  // Opening pays the bones and marks the row opened, but the card STAYS on
  // Home so the recommendation can be read. It leaves when it is dismissed
  // (or the next time the app starts); it is always in the Analytics history.
  openDeliveryAndGiveBones: async (id) => {
    const delivery = get().pendingDeliveries.find((d) => d.id === id);
    await openDelivery(id);
    if (delivery && !delivery.bones_given) {
      await changeTreats(3);
      await logTreatEvent('journal_bonus', 3, 'Treat delivery opened');
      await markDeliveryBonesGiven(id);
    }
    set((s) => ({
      pendingDeliveries: s.pendingDeliveries.map((d) =>
        d.id === id ? { ...d, opened: true, bones_given: true } : d),
    }));
    get().refreshTreatCount();
  },

  dismissDelivery: async (id) => {
    await openDelivery(id);
    set((s) => ({ pendingDeliveries: s.pendingDeliveries.filter((d) => d.id !== id) }));
    set({ pendingDeliveries: await _shownDeliveries(get().pendingDeliveries) });
  },

  giveDeliveryFeedback: async (id, fb) => {
    await setDeliveryFeedback(id, fb);
    const delivery = get().pendingDeliveries.find((d) => d.id === id);
    set((s) => ({
      pendingDeliveries: s.pendingDeliveries.map((d) => (d.id === id ? { ...d, feedback: fb } : d)),
    }));
    // Adjust tag weights for future picks
    const settings = await getSettings();
    if (!settings || !delivery) return;
    const content = getContentById(delivery.content_id);
    if (!content) return;
    const tags = content.item.tags ?? [];
    const delta = fb === 'up' ? 5 : -5;
    let weights: Record<string, number> = {};
    try { weights = JSON.parse(settings.delivery_tag_weights); } catch {}
    for (const tag of tags) {
      weights[tag] = (weights[tag] ?? 0) + delta;
    }
    await saveSettings({ delivery_tag_weights: JSON.stringify(weights) });
  },

  toggleDeliverySaved: async (id, saved) => {
    await saveDelivery(id, saved);
    set((s) => ({
      pendingDeliveries: s.pendingDeliveries.map((d) => (d.id === id ? { ...d, saved } : d)),
    }));
  },

  // Tester only. Skips the data threshold and the schedule: every press adds
  // a new delivery for today, even if today already has one.
  forceDelivery: async () => {
    const settings = await getSettings();
    if (!settings) return;
    await _insertDeliveryForDate(getTodayStr(), settings);
    set({ pendingDeliveries: await _shownDeliveries(get().pendingDeliveries) });
  },
}));

// What Home shows: cards already opened this session (still being read),
// then up to 2 unopened deliveries, oldest first.
async function _shownDeliveries(current: DeliveryRow[]): Promise<DeliveryRow[]> {
  const reading = current.filter((d) => d.opened);
  const pending = (await getPendingDeliveries()).slice(0, 2);
  return [...reading, ...pending.filter((p) => !reading.some((r) => r.id === p.id))];
}

// ─────────────────────────────────────────────────────────────
// Module-level helper (not in the store, avoids `this` issues)
// ─────────────────────────────────────────────────────────────
async function _insertDeliveryForDate(date: string, settings: Settings): Promise<void> {
  // Load last 7 days of tasks and journal entries for signals
  const last7 = getLastNDates(7);
  const taskMap = await getTasksForDates(last7);
  const allTasks = Object.values(taskMap).flat();
  const journalEntries = await getRecentJournalEntries(7);

  const signals = computeWeekSignals(allTasks, journalEntries, settings);

  // Crisis check: insert a support card instead of normal content
  if (signals.journalMood.hasCrisisLanguage) {
    await insertDelivery(date, 'quote', 'crisis', '');
    return;
  }

  const recentContentIds = parseHistory(settings.delivery_content_history);
  const recentCardTypes  = parseHistory(settings.delivery_type_history) as DeliveryCardType[];
  let tagWeights: Record<string, number> = {};
  try { tagWeights = JSON.parse(settings.delivery_tag_weights); } catch {}

  // If the whole library was used in the last 8 weeks, or the rotation rule
  // leaves nothing, relax the rules rather than deliver nothing.
  const picked =
    pickContent(signals, recentContentIds, recentCardTypes, tagWeights) ??
    pickContent(signals, [], recentCardTypes, tagWeights) ??
    pickContent(signals, [], [], tagWeights);
  if (!picked) return;

  await insertDelivery(date, picked.cardType, picked.contentId, picked.whyLine);

  // Update history
  const newContentHistory = pushToHistory(settings.delivery_content_history, picked.contentId, 56);
  const newTypeHistory    = pushToHistory(settings.delivery_type_history, picked.cardType, 10);
  await saveSettings({
    delivery_content_history: newContentHistory,
    delivery_type_history:    newTypeHistory,
  });
}
