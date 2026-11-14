// useAppStore.ts — Global state (Zustand).
// Sprint 1: pendingCelebration for streak milestones.
// Sprint 2: checkStreakOnOpen (streak check/reset, shield consume, weekly box),
//           streakJustBroke message flag, pendingBoxReward.

import { create } from 'zustand';
import { Settings, Task, BoxReward } from '../types';
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
} from '../db/queries';
import { chestForBoxTier } from '../data/chestLoot';
import {
  isStreakMilestone, milestoneBonus,
  weeklyBoxTier,
  weeklyAdherence, buildDayAnalytics, getLastNDates,
} from '../utils/calculations';
import { runSync, isSyncReady } from '../services/calendarSync';
import { getTodayString, getYesterdayString } from '../utils/dateHelpers';

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
}));
