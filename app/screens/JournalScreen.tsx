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

import React, { useState, useCallback, useRef } from 'react';
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
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

// ── Store & DB ────────────────────────────────────────────────────────────────
import { useAppStore } from '../store/useAppStore';
import {
  getJournalEntry,
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
  randomPrompt,
  formatPromptText,
  Prompt,
} from '../data/journalPrompts';

// ── Types ─────────────────────────────────────────────────────────────────────
import { JournalEntry } from '../types';

// ── Nova images ───────────────────────────────────────────────────────────────
// These are the little companion images shown in the empty-state.
const novaHappy   = require('../../assets/images/nova-happy.png');
const novaDefault = require('../../assets/images/nova-default.png');

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
// JournalScreen component — the main export used by the navigation stack.
// ─────────────────────────────────────────────────────────────────────────────
export default function JournalScreen() {
  // ── Global state (Zustand) ─────────────────────────────────────────────────
  // settings contains streak, treat_count, care_enabled, companion_name, etc.
  const settings = useAppStore((s) => s.settings);

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
      setReflectionText(todayEntry.reflection_text);
      setIsException(todayEntry.is_exception_day);
      setExceptionReason(todayEntry.exception_reason ?? '');
      // Try to find the original prompt in our data, otherwise just show the saved text
      setCurrentPrompt({ text: todayEntry.prompt_used, category: 'balance' });
    } else {
      // Fresh entry — reset everything
      setReflectionText('');
      setIsException(false);
      setExceptionReason('');
      setCurrentPrompt(selectDailyPrompt(doy, streak, isSunday, careEnabled));
    }

    setModalVisible(true);
  }, [todayEntry, streak, careEnabled]);

  // ── Swap the prompt (🔄 button) ────────────────────────────────────────────
  const handleNewPrompt = useCallback(() => {
    const isSunday = new Date().getDay() === 0;
    const newP = randomPrompt(streak, isSunday, careEnabled, currentPrompt.text);
    setCurrentPrompt(newP);
  }, [streak, careEnabled, currentPrompt.text]);

  // ─────────────────────────────────────────────────────────────────────────
  // handleSave — validates + writes the entry, then awards treats if milestone.
  // ─────────────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    // 1. Validate: make sure there's something written
    const trimmed = reflectionText.trim();
    if (!trimmed) {
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
        reflection_text:  trimmed,
        prompt_used:      currentPrompt.text,
        is_exception_day: isException,
        exception_reason: isException ? exceptionReason.trim() : '',
        word_count:       wordCount,
      });

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

    return (
      <View style={styles.card}>
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
      <Image source={novaDefault} style={styles.emptyNova} resizeMode="contain" />
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
            <Text style={styles.screenTitle}>Journal</Text>

            {/* Write / Edit button */}
            <TouchableOpacity
              style={styles.writeButton}
              onPress={openModal}
              activeOpacity={0.85}
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
              onPress={() => setModalVisible(false)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>

            {/* Title centred */}
            <Text style={styles.modalTitle}>Today's Reflection</Text>

            {/* Save — writes to DB */}
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
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
                <Text style={styles.exceptionLabel}>Mark as exception day</Text>
                <Switch
                  value={isException}
                  onValueChange={setIsException}
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

              {/* The actual prompt text */}
              <Text style={styles.promptText}>{promptDisplay}</Text>

              {/* 🔄 New prompt — swaps to a random different prompt */}
              <TouchableOpacity
                style={styles.newPromptButton}
                onPress={handleNewPrompt}
                activeOpacity={0.7}
              >
                <Text style={styles.newPromptButtonText}>🔄 New prompt</Text>
              </TouchableOpacity>
            </View>

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
              placeholder="Start writing…"
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
    alignSelf: 'flex-end', // right-aligned
  },

  newPromptButtonText: {
    fontSize:   13,
    color:      '#6B7280',
  },

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
