// useAppStore.ts — Global state manager (Zustand).
//
// Problem: React screens can't easily share data with each other.
// Solution: A global "store" that any screen can read from or write to.
//
// Zustand is like a shared box. You put things in it. Any screen can open the
// box and read or change what's inside. When the box changes, any screen that's
// watching it automatically re-renders.

import { create } from 'zustand';
import { Settings, Task } from '../types';
import { getSettings, saveSettings, getTasksForDate } from '../db/queries';

// AppState describes everything our global store holds.
interface AppState {
  // ── Data ──────────────────────────────────────
  settings: Settings | null;   // null until loaded from the database
  isOnboarded: boolean;        // shortcut so App.tsx doesn't have to dig into settings
  todaysTasks: Task[];         // tasks for today (used on the Home screen)

  // ── Actions ───────────────────────────────────
  // Functions that read from or write to the store.
  // Any screen can call these.
  loadSettings: () => Promise<void>;
  updateSettings: (updates: Partial<Settings>) => Promise<void>;
  completeOnboarding: (finalSettings: Partial<Settings>) => Promise<void>;
  loadTodaysTasks: (date: string) => Promise<void>;
  refreshTasks: (date: string) => Promise<void>;
}

// create() builds the store and returns a hook (useAppStore).
// "set" replaces values in the store. "get" reads the current values.
export const useAppStore = create<AppState>((set, get) => ({
  // ── Starting values ───────────────────────────
  settings: null,
  isOnboarded: false,
  todaysTasks: [],

  // ── loadSettings ──────────────────────────────
  // Called once when the app starts. Reads from SQLite into memory.
  loadSettings: async () => {
    const settings = await getSettings();
    set({
      settings,
      isOnboarded: settings?.onboarded ?? false,
    });
  },

  // ── updateSettings ────────────────────────────
  // Saves changes to SQLite and updates this store at the same time.
  updateSettings: async (updates) => {
    await saveSettings(updates);
    const current = get().settings;

    // "..." is the spread operator — it copies all existing fields, then
    // the new "updates" overwrite just the fields we changed.
    set({
      settings: current ? { ...current, ...updates } : null,
      isOnboarded: updates.onboarded ?? current?.onboarded ?? false,
    });
  },

  // ── completeOnboarding ────────────────────────
  // Called at the very end of onboarding to flip the "onboarded" flag.
  // App.tsx watches isOnboarded, so flipping it switches the whole UI.
  completeOnboarding: async (finalSettings) => {
    const updates = { ...finalSettings, onboarded: true };
    await saveSettings(updates);
    const current = get().settings;
    set({
      settings: current ? { ...current, ...updates } : null,
      isOnboarded: true,
    });
  },

  // ── loadTodaysTasks / refreshTasks ───────────
  // Fetches tasks for a given date and stores them.
  // refreshTasks is an alias — use it after creating/editing/deleting a task.
  loadTodaysTasks: async (date) => {
    const tasks = await getTasksForDate(date);
    set({ todaysTasks: tasks });
  },

  refreshTasks: async (date) => {
    const tasks = await getTasksForDate(date);
    set({ todaysTasks: tasks });
  },
}));
