// SettingsScreen.tsx — Settings modal, opened via the gear icon on Home.
// Sprint 2: live total "XX / 24 hrs", unstructured hours, updated presets,
//           Notifications section, Data Export section.

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  Share,
  Platform,
} from 'react-native';
import { useAppStore } from '../store/useAppStore';
import CustomSlider from '../components/CustomSlider';
import { getTodayString } from '../utils/dateHelpers';
import {
  requestNotificationPermissions,
  scheduleNotifications,
  cancelAllNotifications,
} from '../utils/notifications';
import { getAllTablesForExport } from '../db/queries';
import CalendarSettingsScreen from './CalendarSettingsScreen';

// ─── Presets ──────────────────────────────────────────────────────────────────
// Without Care: Default / Student / Founder
// With Care:    Default / Student / Founder / Parent
const PRESETS_NO_CARE = [
  { label: 'Default', work: 8,  personal: 6, sleep: 10, care: 0 },
  { label: 'Student', work: 6,  personal: 8, sleep: 10, care: 0 },
  { label: 'Founder', work: 10, personal: 6, sleep:  8, care: 0 },
];
const PRESETS_WITH_CARE = [
  { label: 'Default', work: 8,  personal: 6, sleep: 8, care: 2 },
  { label: 'Student', work: 6,  personal: 8, sleep: 9, care: 1 },
  { label: 'Founder', work: 10, personal: 5, sleep: 7, care: 2 },
  { label: 'Parent',  work: 6,  personal: 4, sleep: 8, care: 6 },
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function SettingsScreen({ visible, onClose }: Props) {
  const { settings, updateSettings } = useAppStore();

  const [name, setName]                       = useState('');
  const [careEnabled, setCareEnabled]         = useState(false);
  const [workTarget, setWorkTarget]           = useState(8);
  const [personalTarget, setPersonalTarget]   = useState(6);
  const [sleepTarget, setSleepTarget]         = useState(8);
  const [careTarget, setCareTarget]           = useState(2);

  // Notification settings
  const [notiEnabled, setNotiEnabled]         = useState(true);
  const [morningTime, setMorningTime]         = useState('08:00');
  const [eveningTime, setEveningTime]         = useState('20:00');

  const [exporting, setExporting]             = useState(false);
  const [calendarOpen, setCalendarOpen]       = useState(false);

  useEffect(() => {
    if (visible && settings) {
      setName(settings.companion_name);
      setCareEnabled(settings.care_enabled);
      setWorkTarget(settings.work_target_hours);
      setPersonalTarget(settings.personal_target_hours);
      setSleepTarget(settings.sleep_target_hours);
      setCareTarget(settings.care_target_hours);
      setNotiEnabled(settings.notifications_enabled !== false);
      setMorningTime(settings.morning_notification_time ?? '08:00');
      setEveningTime(settings.evening_notification_time ?? '20:00');
    }
  }, [visible, settings]);

  // ── Cooldown ─────────────────────────────────────────────────────────────────
  function daysLeftInCooldown(): number {
    if (!settings?.targets_last_changed) return 0;
    const daysSince = Math.floor(
      (Date.now() - new Date(settings.targets_last_changed).getTime()) / 86400000
    );
    return Math.max(0, 7 - daysSince);
  }
  const cooldownDays  = daysLeftInCooldown();
  const targetsLocked = cooldownDays > 0;

  // ── Live totals ───────────────────────────────────────────────────────────────
  const activeTotal = workTarget + personalTarget + sleepTarget + (careEnabled ? careTarget : 0);
  const unstructured = Math.max(0, 24 - activeTotal);
  const overLimit    = activeTotal > 24;

  // ── Slider change — clamp so total never exceeds 24 ──────────────────────────
  function setWithCap(
    setter: (v: number) => void,
    newVal: number,
    others: number[]
  ) {
    const otherTotal = others.reduce((s, v) => s + v, 0);
    const maxAllowed = parseFloat((24 - otherTotal).toFixed(1));
    setter(Math.min(newVal, maxAllowed));
  }

  // ── Presets ───────────────────────────────────────────────────────────────────
  function applyPreset(p: { work: number; personal: number; sleep: number; care: number }) {
    if (targetsLocked) {
      Alert.alert(
        'Cooldown active',
        `You can change targets again in ${cooldownDays} day${cooldownDays !== 1 ? 's' : ''}.`
      );
      return;
    }
    setWorkTarget(p.work);
    setPersonalTarget(p.personal);
    setSleepTarget(p.sleep);
    if (careEnabled) setCareTarget(p.care);
  }

  // ── Time picker helper (simple HH:MM input validation) ───────────────────────
  function parseTimeInput(raw: string): string | null {
    const m = raw.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    const h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    if (h < 0 || h > 23 || min < 0 || min > 59) return null;
    return `${h.toString().padStart(2, '0')}:${m[2]}`;
  }

  // ── Save ──────────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter a companion name.');
      return;
    }

    // Validate time inputs
    const parsedMorning = parseTimeInput(morningTime);
    const parsedEvening = parseTimeInput(eveningTime);
    if (notiEnabled && !parsedMorning) {
      Alert.alert('Invalid time', 'Morning notification time must be HH:MM (e.g. 08:00).');
      return;
    }
    if (notiEnabled && !parsedEvening) {
      Alert.alert('Invalid time', 'Evening notification time must be HH:MM (e.g. 20:00).');
      return;
    }

    const targetsChanged =
      workTarget     !== settings?.work_target_hours     ||
      personalTarget !== settings?.personal_target_hours ||
      sleepTarget    !== settings?.sleep_target_hours    ||
      careTarget     !== settings?.care_target_hours;

    await updateSettings({
      companion_name:               name.trim(),
      care_enabled:                 careEnabled,
      work_target_hours:            workTarget,
      personal_target_hours:        personalTarget,
      sleep_target_hours:           sleepTarget,
      care_target_hours:            careTarget,
      notifications_enabled:        notiEnabled,
      morning_notification_time:    parsedMorning ?? '08:00',
      evening_notification_time:    parsedEvening ?? '20:00',
      ...(targetsChanged ? { targets_last_changed: getTodayString() } : {}),
    });

    // Re-schedule (or cancel) notifications based on new settings
    if (notiEnabled && parsedMorning && parsedEvening) {
      const granted = await requestNotificationPermissions();
      if (granted) {
        await scheduleNotifications(parsedMorning, parsedEvening, name.trim());
      } else {
        Alert.alert(
          'Notifications blocked',
          'Please enable notifications in your device Settings to receive reminders.'
        );
      }
    } else {
      await cancelAllNotifications();
    }

    onClose();
  }

  // ── Data export ────────────────────────────────────────────────────────────────
  // Uses React Native's built-in Share API — no extra packages needed, works in Expo Go.
  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    try {
      const data = await getAllTablesForExport();
      const json = JSON.stringify(data, null, 2);

      await Share.share(
        {
          title:   `twenty-four-backup-${getTodayString()}.json`,
          message: json,         // on iOS the share sheet lets you save/copy/AirDrop this
        },
        { dialogTitle: 'Export your 24 data' }
      );
    } catch (err: any) {
      // User dismissed the share sheet — not an error worth alerting
      if (err?.message !== 'User did not share') {
        Alert.alert('Export failed', String(err));
      }
    } finally {
      setExporting(false);
    }
  }

  const presets = careEnabled ? PRESETS_WITH_CARE : PRESETS_NO_CARE;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Settings</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Companion name ──────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Companion Name</Text>
            <Text style={styles.sectionSub}>What would you like to call your companion?</Text>
            <TextInput
              style={styles.nameInput}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Nova"
              autoCorrect={false}
              maxLength={20}
              selectionColor="#3C3489"
            />
          </View>

          {/* ── Care pillar toggle ───────────────────────────────── */}
          <View style={styles.section}>
            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Care Pillar</Text>
                <Text style={styles.sectionSub}>
                  Track time spent on caregiving, chores, errands, and life maintenance
                </Text>
              </View>
              <Switch
                value={careEnabled}
                onValueChange={setCareEnabled}
                trackColor={{ false: '#E5E7EB', true: '#C4B5FD' }}
                thumbColor={careEnabled ? '#3C3489' : '#9CA3AF'}
              />
            </View>
          </View>

          {/* ── Daily targets ────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Daily Targets</Text>

            {/* Live total pill */}
            <View style={[styles.totalRow, overLimit && styles.totalRowOver]}>
              <Text style={[styles.totalText, overLimit && styles.totalTextOver]}>
                Total: {activeTotal.toFixed(1)} / 24 hours
              </Text>
              <Text style={styles.unstructuredText}>
                Unstructured: {unstructured.toFixed(1)}h
              </Text>
            </View>

            {/* Cooldown notice */}
            {targetsLocked && (
              <View style={styles.cooldownBanner}>
                <Text style={styles.cooldownText}>
                  🔒 Targets locked for {cooldownDays} more day{cooldownDays !== 1 ? 's' : ''}.
                  {'\n'}You can change targets once per week.
                </Text>
              </View>
            )}

            {/* Preset buttons */}
            <View style={styles.presetRow}>
              {presets.map((p) => (
                <TouchableOpacity
                  key={p.label}
                  style={[styles.presetBtn, targetsLocked && styles.presetBtnLocked]}
                  onPress={() => applyPreset(p)}
                  activeOpacity={targetsLocked ? 1 : 0.7}
                >
                  <Text style={[styles.presetBtnText, targetsLocked && styles.presetBtnTextLocked]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Sliders */}
            <SliderRow
              label="Work" value={workTarget} color="#3C3489" disabled={targetsLocked}
              onChange={(v) => setWithCap(setWorkTarget, v, [personalTarget, sleepTarget, careEnabled ? careTarget : 0])}
            />
            <SliderRow
              label="Personal" value={personalTarget} color="#1D9E75" disabled={targetsLocked}
              onChange={(v) => setWithCap(setPersonalTarget, v, [workTarget, sleepTarget, careEnabled ? careTarget : 0])}
            />
            <SliderRow
              label="Sleep" value={sleepTarget} color="#185FA5" disabled={targetsLocked}
              onChange={(v) => setWithCap(setSleepTarget, v, [workTarget, personalTarget, careEnabled ? careTarget : 0])}
            />
            {careEnabled && (
              <SliderRow
                label="Care" value={careTarget} color="#D97706" disabled={targetsLocked}
                onChange={(v) => setWithCap(setCareTarget, v, [workTarget, personalTarget, sleepTarget])}
              />
            )}
          </View>

          {/* ── Notifications ───────────────────────────────────── */}
          <View style={styles.section}>
            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Notifications</Text>
                <Text style={styles.sectionSub}>
                  Daily reminders to plan your day and reflect
                </Text>
              </View>
              <Switch
                value={notiEnabled}
                onValueChange={setNotiEnabled}
                trackColor={{ false: '#E5E7EB', true: '#C4B5FD' }}
                thumbColor={notiEnabled ? '#3C3489' : '#9CA3AF'}
              />
            </View>

            {notiEnabled && (
              <>
                <View style={styles.timeRow}>
                  <View style={styles.timeField}>
                    <Text style={styles.timeLabel}>🌅 Morning</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={morningTime}
                      onChangeText={setMorningTime}
                      placeholder="08:00"
                      keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
                      maxLength={5}
                      selectionColor="#3C3489"
                    />
                  </View>
                  <View style={styles.timeField}>
                    <Text style={styles.timeLabel}>🌙 Evening</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={eveningTime}
                      onChangeText={setEveningTime}
                      placeholder="20:00"
                      keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
                      maxLength={5}
                      selectionColor="#3C3489"
                    />
                  </View>
                </View>
                <Text style={styles.timeHint}>Enter times in 24-hour format (HH:MM)</Text>
              </>
            )}
          </View>

          {/* ── Google Calendar Sync ────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Google Calendar</Text>
            <Text style={styles.sectionSub}>
              {settings?.google_account_email
                ? `Connected as ${settings.google_account_email}. Two-way sync with your "Twenty-Four" calendar.`
                : 'Sync your tasks with Google Calendar (two-way). Events you add in Google land in the Work pillar.'}
            </Text>
            <TouchableOpacity
              style={styles.exportBtn}
              onPress={() => setCalendarOpen(true)}
              activeOpacity={0.75}
            >
              <Text style={styles.exportBtnText}>
                {settings?.google_account_email
                  ? '🗓️  Manage Calendar Sync'
                  : '🗓️  Connect Google Calendar'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Your Data ───────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Data</Text>
            <Text style={styles.sectionSub}>
              Export all your tasks, journal entries, and history as a JSON file
            </Text>
            <TouchableOpacity
              style={[styles.exportBtn, exporting && styles.exportBtnDisabled]}
              onPress={handleExport}
              activeOpacity={0.75}
            >
              <Text style={styles.exportBtnText}>
                {exporting ? 'Exporting…' : '📤 Export Backup'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Nested modal for the calendar sync screen */}
        <CalendarSettingsScreen
          visible={calendarOpen}
          onClose={() => setCalendarOpen(false)}
        />
      </View>
    </Modal>
  );
}

// ─── SliderRow ────────────────────────────────────────────────────────────────
function SliderRow({
  label, value, color, disabled, onChange,
}: { label: string; value: number; color: string; disabled: boolean; onChange: (v: number) => void }) {
  return (
    <View style={styles.sliderRow}>
      <View style={styles.sliderLabelRow}>
        <View style={[styles.pillarDot, { backgroundColor: color }]} />
        <Text style={styles.sliderLabel}>{label}</Text>
        <Text style={[styles.sliderValue, { color }]}>{value}h</Text>
      </View>
      <CustomSlider
        min={0.5} max={14} step={0.5}
        value={value} color={color} disabled={disabled} onChange={onChange}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 20, paddingHorizontal: 20, paddingBottom: 16,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  closeBtn:     { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 18, color: '#6B7280' },
  title:        { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  saveText:     { fontSize: 16, fontWeight: '700', color: '#3C3489' },
  content:      { padding: 20, paddingBottom: 60 },
  section: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05,
    shadowRadius: 4, elevation: 1,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
  sectionSub:   { fontSize: 13, color: '#6B7280', marginBottom: 12 },
  toggleRow:    { flexDirection: 'row', alignItems: 'center' },
  nameInput: {
    backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: '#1F2937',
  },
  totalRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F0FDF4', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 14,
  },
  totalRowOver:       { backgroundColor: '#FEF2F2' },
  totalText:          { fontSize: 14, fontWeight: '700', color: '#166534' },
  totalTextOver:      { color: '#991B1B' },
  unstructuredText:   { fontSize: 12, color: '#6B7280' },
  cooldownBanner: {
    backgroundColor: '#FEF3C7', borderRadius: 10, padding: 12,
    marginBottom: 16, borderLeftWidth: 3, borderLeftColor: '#F59E0B',
  },
  cooldownText:   { fontSize: 13, color: '#92400E', lineHeight: 19 },
  presetRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 22 },
  presetBtn:      { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#EDE9FE', borderRadius: 20 },
  presetBtnLocked:{ backgroundColor: '#F3F4F6' },
  presetBtnText:  { fontSize: 13, fontWeight: '600', color: '#3C3489' },
  presetBtnTextLocked: { color: '#9CA3AF' },
  sliderRow:      { marginBottom: 22 },
  sliderLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  pillarDot:      { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  sliderLabel:    { flex: 1, fontSize: 14, fontWeight: '600', color: '#374151' },
  sliderValue:    { fontSize: 14, fontWeight: '700', minWidth: 34, textAlign: 'right' },

  // Notifications
  timeRow: {
    flexDirection:  'row',
    gap:            12,
    marginTop:      14,
    marginBottom:   6,
  },
  timeField: {
    flex: 1,
  },
  timeLabel: {
    fontSize:     12,
    fontWeight:   '600',
    color:        '#6B7280',
    marginBottom:  6,
  },
  timeInput: {
    backgroundColor: '#F9FAFB',
    borderWidth:     1.5,
    borderColor:     '#E5E7EB',
    borderRadius:    10,
    paddingHorizontal: 12,
    paddingVertical:   10,
    fontSize:        16,
    color:           '#1F2937',
    textAlign:       'center',
  },
  timeHint: {
    fontSize:  12,
    color:     '#9CA3AF',
    marginTop:  4,
  },

  // Export
  exportBtn: {
    marginTop:         8,
    backgroundColor:   '#3C3489',
    borderRadius:      12,
    paddingVertical:   12,
    paddingHorizontal: 20,
    alignItems:        'center',
  },
  exportBtnDisabled: {
    backgroundColor: '#9CA3AF',
  },
  exportBtnText: {
    color:      '#FFFFFF',
    fontSize:   15,
    fontWeight: '700',
  },
});
