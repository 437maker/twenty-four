// JournalScreen.tsx — Daily reflection journal for the "24" habit tracker app.
// Sprint 2: Full journal list + modal editor, prompts, exception day toggle,
//           reflection-count milestones, and treat rewards.
//
// HOW THIS SCREEN WORKS (beginner-friendly overview):
//   - When you open it, it loads all your past journal entries from the database.
//   - You see a list of cards — one per entry, newest first.
//   - Tap "Write Today's Reflection" to open a modal (pop-up sheet) where you can
//     write, choose a prompt, and mark the day as an exception.
//   - When you save, the entry is written to the database and the list refreshes.

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Switch,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

// ── Store & DB ────────────────────────────────────────────────────────────────
import { useAppStore } from '../store/useAppStore';
import Companion from '../components/companion/Companion';
import { useReduceMotion } from '../components/companion/useReduceMotion';
import { useCompanionLook } from '../components/companion/useCompanionLook';
import {
  getJournalEntry,
  getTasksForDates,
  saveJournalEntry,
  getRecentJournalEntries,
  incrementReflectionCount,
  changeTreats,
  logTreatEvent,
} from '../db/queries';

// ── Helpers & data ────────────────────────────────────────────────────────────
import { getTodayString, getDayOfYear } from '../utils/dateHelpers';
import {
  selectDailyPrompt,
  formatPromptText,
  findPromptByText,
  formatOf,
  templateFor,
  withRating,
  splitRating,
  FORMAT_LABELS,
  Prompt,
} from '../data/journalPrompts';
import { getLastNDates } from '../utils/calculations';
import { computeWeekSignals } from '../utils/insights';
import {
  differentPrompt, neglectedTwoWeeks, parsePromptHistory, promptSignals, recordShown, selectSmartPrompt,
} from '../utils/promptPicker';
import type { PromptSignals } from '../utils/promptPicker';
import { thump } from '../components/companion/haptics';

// ── Types ─────────────────────────────────────────────────────────────────────
import { JournalEntry } from '../types';

// ── Nova images ───────────────────────────────────────────────────────────────
// These are the little companion images shown in the empty-state.

// ─────────────────────────────────────────────────────────────────────────────
// Tiny helper: turn "2026-05-13" → "Tuesday, May 13"
// Used for the date badge on each card in the list.
// ─────────────────────────────────────────────────────────────────────────────
function formatCardDate(dateStr: string): string {
  // Parse the ISO date string manually to avoid timezone-shift bugs.
  // new Date('2026-05-13') in JS is treated as UTC midnight, which can shift
  // one day back when printed in a local timezone behind UTC.
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day); // local midnight — safe
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

// ─────────────────────────────────────────────────────────────────────────────
// The two-minute timer for "two-minute" prompts: press Start, write until it
// ends. It counts from a fixed end time, so it stays right if the phone is
// slow or the app is left for a moment.
// ─────────────────────────────────────────────────────────────────────────────
export const TWO_MINUTES_MS = 2 * 60 * 1000;

export function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

export function TwoMinuteTimer() {
  const [endsAt, setEndsAt] = useState<number | null>(null); // null = not running
  const [left, setLeft] = useState(TWO_MINUTES_MS);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (endsAt === null) return undefined;
    const tick = () => {
      const remaining = endsAt - Date.now();
      if (remaining <= 0) {
        setLeft(0);
        setEndsAt(null);
        setDone(true);
        thump();
      } else {
        setLeft(remaining);
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [endsAt]);

  const running = endsAt !== null;
  function press() {
    if (running) {
      setEndsAt(null);             // stop, and go back to 2:00
      setLeft(TWO_MINUTES_MS);
    } else {
      setDone(false);
      setLeft(TWO_MINUTES_MS);
      setEndsAt(Date.now() + TWO_MINUTES_MS);
    }
  }

  return (
    <View style={styles.timerRow}>
      <Text
        style={[styles.timerClock, done && styles.timerClockDone]}
        accessibilityLabel={done ? 'Time is up' : `${formatCountdown(left)} left`}
        accessibilityLiveRegion="polite"
        testID="two-minute-clock"
      >
        {formatCountdown(left)}
      </Text>
      <Text style={styles.timerHelp}>
        {done ? 'Time. Finish your sentence.' : running ? 'Keep writing until it ends.' : 'Press Start, then write without stopping.'}
      </Text>
      <TouchableOpacity
        style={styles.timerBtn}
        onPress={press}
        accessibilityRole="button"
        accessibilityLabel={running ? 'Stop the timer' : done ? 'Start the two-minute timer again' : 'Start the two-minute timer'}
        testID="two-minute-button"
      >
        <Text style={styles.timerBtnText}>{running ? 'Stop' : done ? 'Again' : 'Start'}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// JournalScreen component — the main export used by the navigation stack.
// ─────────────────────────────────────────────────────────────────────────────
export default function JournalScreen() {
  const reduceMotion = useReduceMotion(); // for the companion in the empty state
  const look = useCompanionLook();
  // ── Global state (Zustand) ─────────────────────────────────────────────────
  // settings contains streak, treat_count, care_enabled, companion_name, etc.
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);

  // Convenience shortcuts so we don't need to keep writing "settings?.xxx ?? 0"
  const streak      = settings?.current_streak ?? 0;
  const careEnabled = settings?.care_enabled    ?? false;

  // ── List state ─────────────────────────────────────────────────────────────
  const [entries,     setEntries]     = useState<JournalEntry[]>([]); // all past entries
  const [todayEntry,  setTodayEntry]  = useState<JournalEntry | null>(null); // today's entry if it exists
  const [loading,     setLoading]     = useState(true);   // initial load
  const [refreshing,  setRefreshing]  = useState(false);  // pull-to-refresh spinner

  // ── Modal state ────────────────────────────────────────────────────────────
  const [modalVisible,     setModalVisible]     = useState(false);
  const [reflectionText,   setReflectionText]   = useState('');       // the text the user types
  const [isException,      setIsException]      = useState(false);    // exception-day toggle
  const [exceptionReason,  setExceptionReason]  = useState('');       // reason field (shown when isException=true)
  const [saving,           setSaving]           = useState(false);    // prevent double-taps
  const [rating,           setRating]           = useState<number | null>(null); // 1 to 5, for "scale" prompts
  // How the week went (completion, mood, a pillar neglected twice). The
  // prompt of the day is picked from this. null until the first load.
  const [weekSignals,      setWeekSignals]      = useState<PromptSignals | null>(null);

  // ── Prompt state ───────────────────────────────────────────────────────────
  // We pick a daily prompt when the modal opens. The user can swap it with 🔄.
  const [currentPrompt, setCurrentPrompt] = useState<Prompt>(() =>
    selectDailyPrompt(getDayOfYear(), streak, new Date().getDay() === 0, careEnabled)
  );

  // ─────────────────────────────────────────────────────────────────────────
  // loadData — fetches all entries + today's entry from the DB.
  // Called on mount, on pull-to-refresh, and after a successful save.
  // ─────────────────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const todayStr = getTodayString(); // e.g. "2026-05-13"

      // Run both queries in parallel for speed
      const [all, todayEnt] = await Promise.all([
        getRecentJournalEntries(50), // get up to 50 most recent entries
        getJournalEntry(todayStr),
      ]);

      setEntries(all);
      setTodayEntry(todayEnt);

      // This week and last week, for the prompt picker.
      const current = useAppStore.getState().settings;
      if (current) {
        const days = getLastNDates(14);
        const taskMap = await getTasksForDates(days);
        const tasksOf = (dates: string[]) => dates.flatMap((d) => taskMap[d] ?? []).filter((t) => !t.is_master);
        const thisWeek = tasksOf(days.slice(7));
        const lastWeek = tasksOf(days.slice(0, 7));
        const weekEntries = all.filter((e) => e.date >= days[7]);
        setWeekSignals(promptSignals(
          computeWeekSignals(thisWeek, weekEntries, current),
          neglectedTwoWeeks(thisWeek, lastWeek, current),
        ));
      }
    } catch (err) {
      console.error('[JournalScreen] loadData error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // useFocusEffect fires every time this screen comes into view (e.g. tab switch).
  // That means our list is always fresh even if data changed on another screen.
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // ── Pull-to-refresh handler ────────────────────────────────────────────────
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  // ─────────────────────────────────────────────────────────────────────────
  // openModal — called when user taps "Write / Edit Today's Reflection".
  // Pre-fills the modal if an entry already exists for today.
  // ─────────────────────────────────────────────────────────────────────────
  const openModal = useCallback(() => {
    // Decide which prompt to show (daily rotation, or the one already saved)
    const isSunday = new Date().getDay() === 0;
    const doy      = getDayOfYear();

    if (todayEntry) {
      // Editing an existing entry — restore its text and settings
      // A rating is stored as the first line of the entry: take it back out.
      const saved = splitRating(todayEntry.reflection_text);
      setReflectionText(saved.body);
      setRating(saved.rating);
      setIsException(todayEntry.is_exception_day);
      setExceptionReason(todayEntry.exception_reason ?? '');
      // Find the original prompt (and with it its format), otherwise just show the saved text
      setCurrentPrompt(findPromptByText(todayEntry.prompt_used) ?? { text: todayEntry.prompt_used, category: 'balance' });
    } else {
      // Fresh entry: the prompt of the day, picked from how the week went.
      const today = getTodayString();
      const history = parsePromptHistory(settings?.prompt_history);
      const prompt = weekSignals
        ? selectSmartPrompt({ signals: weekSignals, history, today, context: { streak, isSunday, careEnabled } }).prompt
        : selectDailyPrompt(doy, streak, isSunday, careEnabled);
      setCurrentPrompt(prompt);
      setReflectionText(templateFor(prompt)); // a fill-in sentence, "Dear future me," ...
      setRating(null);
      setIsException(false);
      setExceptionReason('');
      // Remember it was shown, so it does not come back for 30 days.
      if (prompt.id) {
        const next = JSON.stringify(recordShown(history, prompt.id, today));
        if (next !== settings?.prompt_history) updateSettings({ prompt_history: next }).catch(() => {});
      }
    }

    setModalVisible(true);
  }, [todayEntry, streak, careEnabled, settings?.prompt_history, weekSignals, updateSettings]);

  // ── Swap the prompt (🔄 button) ────────────────────────────────────────────
  const handleNewPrompt = useCallback(() => {
    // Another prompt from the SAME category as the one on screen.
    const today = getTodayString();
    const history = parsePromptHistory(settings?.prompt_history);
    const newP = differentPrompt({ current: currentPrompt, history, today });
    // Swap the starting text too, unless the user has already written something of their own.
    const untouched = reflectionText.trim() === '' || reflectionText === templateFor(currentPrompt);
    if (untouched) setReflectionText(templateFor(newP));
    setRating(null);
    setCurrentPrompt(newP);
    if (newP.id) {
      const next = JSON.stringify(recordShown(history, newP.id, today));
      if (next !== settings?.prompt_history) updateSettings({ prompt_history: next }).catch(() => {});
    }
  }, [currentPrompt, reflectionText, settings?.prompt_history, updateSettings]);

  // ─────────────────────────────────────────────────────────────────────────
  // handleSave — validates + writes the entry, then awards treats if milestone.
  // ─────────────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    // 1. Validate: make sure there's something written
    const trimmed = reflectionText.trim();
    // The starting text of a fill-in, zoom or letter prompt, left as it
    // was, is not an entry.
    if (!trimmed || trimmed === templateFor(currentPrompt).trim()) {
      Alert.alert('Nothing to save', 'Please write something before saving.');
      return;
    }

    setSaving(true);

    try {
      const todayStr = getTodayString();

      // 2. Count words (split on whitespace, remove empties)
      const wordCount = trimmed.split(/\s+/).filter(Boolean).length;

      // 3. Save the entry to the database.
      //    saveJournalEntry uses INSERT OR REPLACE so editing also works.
      await saveJournalEntry({
        date:             todayStr,
        // A 1 to 5 rating becomes the first line of the entry.
        reflection_text:  formatOf(currentPrompt) === 'scale' ? withRating(trimmed, rating) : trimmed,
        prompt_used:      currentPrompt.text,
        is_exception_day: isException,
        exception_reason: isException ? exceptionReason.trim() : '',
        word_count:       wordCount,
      });

      // The dog trots over and nuzzles the next time Home is on screen.
      useAppStore.getState().queueReaction('journalNuzzle');

      // 4. Increment the global reflection counter and get the new total
      const newCount = await incrementReflectionCount();

      // 5. Milestone reward: every 10 reflections → +25 treats!
      if (newCount % 10 === 0) {
        await changeTreats(25);
        await logTreatEvent('journal_bonus', 25, `Journal milestone: ${newCount} reflections`);
        Alert.alert(
          '📝 10 Reflections Complete!',
          '+25 treats! Nova is proud of you 🐾'
        );
      }

      // 6. Close modal and reload the list so the new entry appears
      setModalVisible(false);
      await loadData();
    } catch (err) {
      console.error('[JournalScreen] handleSave error:', err);
      Alert.alert('Error', 'Something went wrong saving your reflection. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [
    reflectionText,
    currentPrompt,
    rating,
    isException,
    exceptionReason,
    loadData,
  ]);

  // ─────────────────────────────────────────────────────────────────────────
  // renderEntry — renders a single card in the FlatList.
  // ─────────────────────────────────────────────────────────────────────────
  const renderEntry = useCallback(({ item }: { item: JournalEntry }) => {
    // Preview: first 80 characters of the reflection text
    const preview =
      item.reflection_text.length > 80
        ? item.reflection_text.slice(0, 80) + '…'
        : item.reflection_text;

    // Read each entry as one sentence instead of four separate fragments.
    const spoken =
      `${formatCardDate(item.date)}, ` +
      `${item.is_exception_day ? 'exception day' : 'standard day'}, ` +
      `${item.word_count} words. ${preview}`;

    return (
      <View style={styles.card} accessible accessibilityLabel={spoken}>
        {/* Row: date (left) + badge (right) */}
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardDate}>{formatCardDate(item.date)}</Text>

          {/* Exception-day badge (orange) or Standard badge (purple) */}
          {item.is_exception_day ? (
            <View style={styles.badgeException}>
              <Text style={styles.badgeExceptionText}>Exception</Text>
            </View>
          ) : (
            <View style={styles.badgeStandard}>
              <Text style={styles.badgeStandardText}>Standard</Text>
            </View>
          )}
        </View>

        {/* Preview text */}
        <Text style={styles.cardPreview}>{preview}</Text>

        {/* Word count — right-aligned */}
        <Text style={styles.cardWordCount}>{item.word_count} words</Text>
      </View>
    );
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Empty state — shown when there are no entries yet.
  // ─────────────────────────────────────────────────────────────────────────
  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyNova}>
        <Companion state="idle" size={100} breed={look.breed} equipped={look.equipped} reduceMotion={reduceMotion} interactive={false} label={look.name} />
      </View>
      <Text style={styles.emptyText}>
        Your reflections live here. Start writing to unlock treats and track your growth!
      </Text>
    </View>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // formatPromptDisplay — replaces [X] placeholder in streak prompts with the
  // actual streak number before displaying.
  // ─────────────────────────────────────────────────────────────────────────
  const promptDisplay = formatPromptText(currentPrompt.text, streak);
  const format = formatOf(currentPrompt);

  // ── Full-screen loading spinner (only on very first load) ─────────────────
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3C3489" />
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.screen}>

      {/* ── LIST VIEW ─────────────────────────────────────────────────────── */}
      <FlatList
        data={entries}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderEntry}
        ListEmptyComponent={<EmptyState />}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#3C3489"  // iOS spinner colour
            colors={['#3C3489']} // Android spinner colour
          />
        }
        // The screen title and "Write" button live in the list header so they
        // scroll away naturally as you read older entries.
        ListHeaderComponent={
          <View style={styles.listHeader}>
            {/* Screen title */}
            <Text style={styles.screenTitle} accessibilityRole="header">Journal</Text>

            {/* Write / Edit button */}
            <TouchableOpacity
              style={styles.writeButton}
              onPress={openModal}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={todayEntry ? "Edit today's reflection" : "Write today's reflection"}
            >
              <Text style={styles.writeButtonText}>
                {todayEntry ? "Edit Today's Reflection" : "Write Today's Reflection"}
              </Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* ── ENTRY EDITOR MODAL ────────────────────────────────────────────── */}
      {/*
        presentationStyle="pageSheet" gives the native iOS bottom-sheet look.
        On Android it just shows as a regular full-screen modal.
      */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)} // Android back button
      >
        {/*
          KeyboardAvoidingView pushes the content up when the keyboard opens
          so the text input is never hidden behind the keyboard.
        */}
        <KeyboardAvoidingView
          style={styles.modalRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* ── Modal header ────────────────────────────────────────────── */}
          <View style={styles.modalHeader}>
            {/* Cancel — closes without saving */}
            <TouchableOpacity
              style={styles.modalHeaderBtn}
              onPress={() => setModalVisible(false)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              accessibilityHint="Closes without saving"
            >
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>

            {/* Title centred */}
            <Text style={styles.modalTitle} accessibilityRole="header">Today's Reflection</Text>

            {/* Save — writes to DB */}
            <TouchableOpacity
              style={[styles.modalHeaderBtn, styles.modalHeaderBtnRight]}
              onPress={handleSave}
              disabled={saving}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Save reflection"
              accessibilityState={{ disabled: saving, busy: saving }}
            >
              <Text style={[styles.modalSave, saving && styles.modalSaveDisabled]}>
                {saving ? 'Saving…' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          {/*
            ScrollView wraps everything inside the modal so the user can scroll
            to see all content even on smaller phones.
            keyboardShouldPersistTaps="handled" lets taps on buttons work even
            while the keyboard is open.
          */}
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ── Full date display ──────────────────────────────────────── */}
            {/*
              Uses the local device date in a friendly long format.
              e.g. "Tuesday, May 13, 2026"
            */}
            <Text style={styles.modalDateText}>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year:    'numeric',
                month:   'long',
                day:     'numeric',
              })}
            </Text>

            {/* ── Exception day toggle ───────────────────────────────────── */}
            <View style={styles.exceptionSection}>
              {/* Toggle row */}
              <View style={styles.exceptionRow}>
                <Text style={styles.exceptionLabel} accessible={false}>Mark as exception day</Text>
                <Switch
                  value={isException}
                  onValueChange={setIsException}
                  accessibilityLabel="Mark as exception day"
                  accessibilityHint="Pauses your targets for today"
                  trackColor={{ false: '#E5E7EB', true: '#C4B5FD' }}
                  thumbColor={isException ? '#3C3489' : '#9CA3AF'}
                />
              </View>

              {/* Reason field — only shown when toggle is ON */}
              {isException && (
                <TextInput
                  style={styles.exceptionReasonInput}
                  value={exceptionReason}
                  onChangeText={setExceptionReason}
                  placeholder="Holiday, Vacation, Personal Event…"
                  accessibilityLabel="Reason for the exception day"
                  placeholderTextColor="#9CA3AF"
                  returnKeyType="done"
                  selectionColor="#3C3489"
                />
              )}

              {/* Explanation text */}
              <Text style={styles.exceptionHelp}>
                On exception days, your targets are paused. A reflection keeps your streak alive.
              </Text>
            </View>

            {/* ── Prompt card ────────────────────────────────────────────── */}
            <View style={styles.promptCard}>
              {/* Small label */}
              <Text style={styles.promptLabel}>TODAY'S PROMPT</Text>
              {format !== 'open' && (
                <Text style={styles.formatBadge} testID="prompt-format">{FORMAT_LABELS[format]}</Text>
              )}

              {/* The actual prompt text */}
              <Text style={styles.promptText}>{promptDisplay}</Text>

              {/* 🔄 New prompt — swaps to a random different prompt */}
              <TouchableOpacity
                style={styles.newPromptButton}
                onPress={handleNewPrompt}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Different prompt"
                accessibilityHint="Shows another prompt of the same kind"
                testID="different-prompt"
              >
                <Text style={styles.newPromptButtonText}>🔄 Different prompt</Text>
              </TouchableOpacity>
            </View>

            {/* ── Rate 1 to 5 (scale prompts) ────────────────────────────── */}
            {format === 'scale' && (
              <View style={styles.scaleRow} accessibilityRole="radiogroup" accessibilityLabel="Your rating, 1 to 5">
                {[1, 2, 3, 4, 5].map((n) => {
                  const on = rating === n;
                  return (
                    <TouchableOpacity
                      key={n}
                      style={[styles.scaleChip, on && styles.scaleChipOn]}
                      onPress={() => setRating(on ? null : n)}
                      accessibilityRole="radio"
                      accessibilityLabel={`${n} out of 5`}
                      accessibilityState={{ selected: on }}
                      testID={`rating-${n}`}
                    >
                      <Text style={[styles.scaleChipText, on && styles.scaleChipTextOn]}>{n}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* ── Two-minute timer (two-minute prompts). The key gives each
                 prompt its own fresh timer. ────────────────────────────── */}
            {format === 'two-minute' && <TwoMinuteTimer key={currentPrompt.text} />}

            {/* ── Main text area ─────────────────────────────────────────── */}
            {/*
              multiline lets the user type multiple lines.
              textAlignVertical="top" ensures the cursor starts at the top-left
              corner (important on Android where it defaults to centred).
            */}
            <TextInput
              style={styles.textArea}
              value={reflectionText}
              onChangeText={setReflectionText}
              placeholder={format === 'scale' ? 'One line on why…' : 'Start writing…'}
              accessibilityLabel="Your reflection"
              accessibilityHint={promptDisplay}
              placeholderTextColor="#9CA3AF"
              multiline
              scrollEnabled           // TextInput handles its own internal scroll
              textAlignVertical="top"
              selectionColor="#3C3489"
              autoCorrect
              autoCapitalize="sentences"
            />

            {/* ── Save button (inside scroll, at the bottom) ─────────────── */}
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Save reflection"
              accessibilityState={{ disabled: saving, busy: saving }}
            >
              <Text style={styles.saveButtonText}>
                {saving ? 'Saving…' : 'Save Reflection'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// StyleSheet.create compiles styles at startup for better performance.
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({

  // ── Screen wrapper ──────────────────────────────────────────────────────────
  screen: {
    flex:            1,
    backgroundColor: '#F9FAFB', // light off-white background
  },

  // ── Loading spinner container ───────────────────────────────────────────────
  loadingContainer: {
    flex:            1,
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: '#F9FAFB',
  },

  // ── FlatList content padding ────────────────────────────────────────────────
  listContent: {
    paddingBottom: 40, // breathing room at the bottom of the list
  },

  // ── List header (title + write button) ─────────────────────────────────────
  listHeader: {
    paddingHorizontal: 16,
    paddingBottom:     8,
  },

  screenTitle: {
    fontSize:    28,
    fontWeight:  '700',
    color:       '#1F2937',
    paddingTop:  52,  // clears the status bar on notched phones
    marginBottom: 16,
  },

  writeButton: {
    backgroundColor: '#3C3489', // purple
    borderRadius:    16,
    paddingVertical: 16,
    alignItems:      'center',
    marginBottom:    20,
    // subtle shadow
    shadowColor:   '#3C3489',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius:  8,
    elevation:     4,
  },

  writeButtonText: {
    color:      '#FFFFFF',
    fontSize:   16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // ── Entry card ──────────────────────────────────────────────────────────────
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius:    16,
    padding:         16,
    marginHorizontal: 16,
    marginBottom:    12,
    // shadow (iOS)
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius:  4,
    // shadow (Android)
    elevation: 2,
  },

  cardHeaderRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   6,
  },

  cardDate: {
    fontSize:   15,
    fontWeight: '700',
    color:      '#1F2937',
    flexShrink: 1, // allow long date strings to wrap
    marginRight: 8,
  },

  // Purple "Standard" pill
  badgeStandard: {
    backgroundColor: '#EDE9FE',
    borderRadius:    20,
    paddingHorizontal: 10,
    paddingVertical:   3,
  },
  badgeStandardText: {
    color:      '#3C3489',
    fontSize:   12,
    fontWeight: '600',
  },

  // Orange "Exception" pill
  badgeException: {
    backgroundColor: '#FEF3C7',
    borderRadius:    20,
    paddingHorizontal: 10,
    paddingVertical:   3,
  },
  badgeExceptionText: {
    color:      '#D97706',
    fontSize:   12,
    fontWeight: '600',
  },

  cardPreview: {
    fontSize:    14,
    color:       '#6B7280',
    fontStyle:   'italic',
    lineHeight:  20,
    marginBottom: 8,
  },

  cardWordCount: {
    fontSize:  12,
    color:     '#9CA3AF',
    textAlign: 'right',
  },

  // ── Empty state ─────────────────────────────────────────────────────────────
  emptyContainer: {
    alignItems:  'center',
    paddingTop:  40,
    paddingHorizontal: 32,
  },

  emptyNova: {
    width:        100,
    height:       100,
    marginBottom: 16,
  },

  emptyText: {
    fontSize:   14,
    color:      '#6B7280',
    fontStyle:  'italic',
    textAlign:  'center',
    lineHeight: 22,
  },

  // ── Modal root ──────────────────────────────────────────────────────────────
  // flex:1 makes the KeyboardAvoidingView fill the whole sheet
  modalRoot: {
    flex:            1,
    backgroundColor: '#F9FAFB',
  },

  // ── Modal header bar ────────────────────────────────────────────────────────
  modalHeader: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    paddingHorizontal: 20,
    paddingTop:      20,
    paddingBottom:   14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },

  // 44×44pt minimum touch target for the text-only header buttons
  modalHeaderBtn: {
    minWidth:       44,
    minHeight:      44,
    justifyContent: 'center',
  },
  modalHeaderBtnRight: {
    alignItems: 'flex-end',
  },

  modalCancel: {
    fontSize:   16,
    color:      '#6B7280',
  },

  modalTitle: {
    fontSize:   17,
    fontWeight: '700',
    color:      '#1F2937',
  },

  modalSave: {
    fontSize:   16,
    fontWeight: '700',
    color:      '#3C3489',
  },

  modalSaveDisabled: {
    opacity: 0.4,
  },

  // ── Modal scroll area ───────────────────────────────────────────────────────
  modalScroll: {
    flex: 1,
  },

  modalScrollContent: {
    padding:       20,
    paddingBottom: 48, // extra space so save button isn't cramped by home bar
  },

  // ── Date display inside modal ───────────────────────────────────────────────
  modalDateText: {
    fontSize:     15,
    color:        '#4B5563',
    fontWeight:   '500',
    marginBottom: 20,
    textAlign:    'center',
  },

  // ── Exception day section ───────────────────────────────────────────────────
  exceptionSection: {
    backgroundColor: '#FFFFFF',
    borderRadius:    12,
    padding:         14,
    marginBottom:    16,
    borderWidth:     1,
    borderColor:     '#E5E7EB',
  },

  exceptionRow: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    marginBottom:    8,
  },

  exceptionLabel: {
    fontSize:   15,
    color:      '#1F2937',
    fontWeight: '500',
    flexShrink: 1,
    marginRight: 12,
  },

  exceptionReasonInput: {
    borderWidth:    1,
    borderColor:    '#E5E7EB',
    borderRadius:   8,
    paddingHorizontal: 12,
    paddingVertical:   10,
    fontSize:       14,
    color:          '#1F2937',
    backgroundColor: '#F9FAFB',
    marginBottom:   8,
  },

  exceptionHelp: {
    fontSize:   12,
    color:      '#9CA3AF',
    lineHeight: 18,
  },

  // ── Prompt card ─────────────────────────────────────────────────────────────
  promptCard: {
    backgroundColor: '#EDE9FE', // light purple
    borderRadius:    12,
    borderWidth:     1.5,
    borderColor:     '#3C3489',
    padding:         14,
    marginBottom:    16,
  },

  promptLabel: {
    fontSize:      11,
    color:         '#6B7280',
    fontWeight:    '600',
    letterSpacing: 1.2,
    marginBottom:  6,
    textTransform: 'uppercase',
  },

  promptText: {
    fontSize:     16,
    color:        '#3C3489',
    lineHeight:   22,
    marginBottom: 10,
  },

  newPromptButton: {
    alignSelf:      'flex-end', // right-aligned
    minHeight:      44,         // comfortable touch target
    minWidth:       44,
    justifyContent: 'center',
  },

  newPromptButtonText: {
    fontSize:   13,
    color:      '#6B7280',
  },

  // ── Prompt formats ──────────────────────────────────────────────────────────
  formatBadge: {
    alignSelf: 'flex-start', fontSize: 11, fontWeight: '700', color: '#3C3489',
    backgroundColor: '#FFFFFF', borderRadius: 8, overflow: 'hidden',
    paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8,
  },
  scaleRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  scaleChip: {
    flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center',
    borderRadius: 12, borderWidth: 1.5, borderColor: '#D1D5DB', backgroundColor: '#FFFFFF',
  },
  scaleChipOn: { backgroundColor: '#3C3489', borderColor: '#3C3489' },
  scaleChipText: { fontSize: 17, fontWeight: '700', color: '#3C3489' },
  scaleChipTextOn: { color: '#FFFFFF' },
  timerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14,
    backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 10,
  },
  timerClock: { fontSize: 24, fontWeight: '800', color: '#3C3489', fontVariant: ['tabular-nums'], minWidth: 58 },
  timerClockDone: { color: '#15803D' },
  timerHelp: { flex: 1, fontSize: 12, color: '#6B7280', lineHeight: 16 },
  timerBtn: {
    minHeight: 44, minWidth: 64, alignItems: 'center', justifyContent: 'center',
    borderRadius: 22, backgroundColor: '#3C3489', paddingHorizontal: 14,
  },
  timerBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  // ── Main text area ──────────────────────────────────────────────────────────
  textArea: {
    backgroundColor: '#FFFFFF',
    borderRadius:    12,
    borderWidth:     1.5,
    borderColor:     '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical:   12,
    fontSize:         15,
    color:            '#1F2937',
    lineHeight:       22,
    minHeight:        200,   // ensures there's plenty of writing space
    textAlignVertical: 'top', // Android: cursor starts at top-left
    marginBottom:     0,     // save button provides bottom margin
  },

  // ── Save button (inside modal) ──────────────────────────────────────────────
  saveButton: {
    backgroundColor: '#3C3489',
    borderRadius:    16,
    paddingVertical: 16,
    alignItems:      'center',
    marginTop:       24,
    // shadow
    shadowColor:   '#3C3489',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius:  8,
    elevation:     4,
  },

  saveButtonDisabled: {
    opacity: 0.6,
  },

  saveButtonText: {
    color:      '#FFFFFF',
    fontSize:   16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
