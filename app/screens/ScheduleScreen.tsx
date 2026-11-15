// ScheduleScreen.tsx — View and manage tasks for any day.
// Sprint 2: conflict dots on task cards, long-press series delete,
//           minutes fixed to 00/15/30/45, milestone celebration trigger.

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
// React Native 0.87+ types: a ref to a ScrollView holds a ScrollViewInstance,
// not the ScrollView component type itself.
import type { ScrollViewInstance } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { format, addDays, subDays, parseISO } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useAppStore } from '../store/useAppStore';
import TaskCard from '../components/TaskCard';
import PillarSelector from '../components/PillarSelector';
import WheelPicker from '../components/WheelPicker';
import {
  getTasksForDate,
  createTask,
  updateTask,
  deleteTask,
  deleteTaskSeries,
  moveTask,
  toggleTaskComplete,
  findConflict,
  getConflictingIds,
} from '../db/queries';
import { Task, NewTaskInput, Pillar, RepeatType } from '../types';
import { getTodayString, formatDisplayDate } from '../utils/dateHelpers';
import { calculateNewStreak, isStreakMilestone } from '../utils/calculations';
import SettingsScreen from './SettingsScreen';

// ─── Wheel data ───────────────────────────────────────────────────────────────
const HOURS    = ['1','2','3','4','5','6','7','8','9','10','11','12'];
const MINUTES  = ['00','15','30','45'];   // quarter-hour steps
const AMPM     = ['AM', 'PM'];
// Duration values in hours: 0.25, 0.50, 0.75 … 12.00  (48 steps of 0.25 h)
const DURATION_VALUES: number[] = Array.from(
  { length: 48 },
  (_, i) => parseFloat(((i + 1) * 0.25).toFixed(2))
);

// Human-readable label for each duration value:
//   0.25 → "15 min"   0.5 → "30 min"   0.75 → "45 min"
//   1.0  → "1 hr"     1.25 → "1 hr 15 min"   2.0 → "2 hr"  etc.
function formatDurationLabel(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0)  return `${m} min`;
  if (m === 0)  return `${h} hr`;
  return `${h} hr ${m} min`;
}

const DURATIONS: string[] = DURATION_VALUES.map(formatDurationLabel);

const REPEAT_OPTIONS: { value: RepeatType; label: string }[] = [
  { value: 'none',     label: 'None'     },
  { value: 'daily',    label: 'Daily'    },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekends', label: 'Weekends' },
  { value: 'weekly',   label: 'Weekly'   },
  { value: 'custom',   label: 'Custom'   },
];
const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
// Full names for screen readers ("Su" would be read as "soo").
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ─── Conversion helpers ───────────────────────────────────────────────────────
function timeToIndices(time: string) {
  const [h, m]  = time.split(':').map(Number);
  const ampmIdx = h >= 12 ? 1 : 0;
  const hour12  = h % 12 || 12;
  const hourIdx = hour12 - 1;
  // Snap minute to nearest quarter
  const minSnapped = Math.round(m / 15) % 4;
  return { hourIdx, minIdx: minSnapped, ampmIdx };
}

function indicesToTime(hourIdx: number, minIdx: number, ampmIdx: number): string {
  const hour12 = hourIdx + 1;
  const h      = ampmIdx === 0
    ? (hour12 === 12 ? 0 : hour12)
    : (hour12 === 12 ? 12 : hour12 + 12);
  return `${h.toString().padStart(2, '0')}:${MINUTES[minIdx]}`;
}

// Map a numeric hours value → index in DURATION_VALUES (0.25-step, 48 items)
function durationToIdx(hours: number): number {
  return Math.max(0, Math.min(47, Math.round(hours / 0.25) - 1));
}

// ─── MoveDayStrip ─────────────────────────────────────────────────────────────
// Horizontal row of day chips. Tap any chip to instantly move the task there.
// Shows 3 days before + 10 days after today (14 days total), scrollable.
function MoveDayStrip({
  taskDate,
  onMove,
}: {
  taskDate: string;
  onMove: (dateStr: string) => void;
}) {
  const today = getTodayString();

  // Build 14-day window: 3 days back → 10 days forward
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + (i - 3));
    return format(d, 'yyyy-MM-dd');
  });

  // Auto-scroll so the task's current day is visible on open
  const listRef = useRef<ScrollViewInstance>(null);
  const taskIdx = days.findIndex((d) => d === taskDate);

  return (
    <View style={styles.moveStrip}>
      <View style={styles.moveLabelRow}>
        <Text style={styles.moveLabel}>Move to</Text>
        <Text style={styles.moveHint}>tap a day</Text>
      </View>
      <ScrollView
        ref={listRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.moveDayList}
        onLayout={() => {
          // Scroll so the task's current chip is roughly centred
          if (taskIdx > 0) {
            listRef.current?.scrollTo({ x: Math.max(0, (taskIdx - 2) * 74), animated: false });
          }
        }}
      >
        {days.map((dateStr) => {
          const isCurrent = dateStr === taskDate;
          const isToday   = dateStr === today;
          const d         = parseISO(dateStr);
          const abbr      = format(d, 'EEE');   // Mon, Tue…
          const num       = format(d, 'd');      // 1, 2…

          return (
            <TouchableOpacity
              key={dateStr}
              style={[
                styles.moveDayChip,
                isCurrent && styles.moveDayChipCurrent,
                !isCurrent && isToday && styles.moveDayChipToday,
              ]}
              onPress={() => !isCurrent && onMove(dateStr)}
              activeOpacity={isCurrent ? 1 : 0.7}
              accessibilityRole="button"
              accessibilityLabel={
                isCurrent
                  ? `${format(d, 'EEEE, MMMM d')}, current day`
                  : `Move to ${format(d, 'EEEE, MMMM d')}${isToday ? ', today' : ''}`
              }
              accessibilityState={{ selected: isCurrent, disabled: isCurrent }}
            >
              <Text style={[
                styles.moveDayAbbr,
                isCurrent && styles.moveDayAbbrCurrent,
              ]}>
                {abbr}
              </Text>
              <Text style={[
                styles.moveDayNum,
                isCurrent && styles.moveDayNumCurrent,
              ]}>
                {num}
              </Text>
              {isToday && !isCurrent && <View style={styles.moveDayTodayDot} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── DailyGoalsBanner ─────────────────────────────────────────────────────────
// Compact progress-bar card shown above the task list.
// For each active pillar it shows:
//   • A light-coloured fill representing total planned hours
//   • A solid fill on top representing completed hours
//   • A "Xh done · Xh planned / Xh target" label
const GOAL_PILLAR_COLORS: Record<string, string> = {
  work:     '#3C3489',
  personal: '#1D9E75',
  sleep:    '#185FA5',
  care:     '#D97706',
};
const GOAL_PILLAR_LABELS: Record<string, string> = {
  work:     'Work',
  personal: 'Personal',
  sleep:    'Sleep',
  care:     'Care',
};

function DailyGoalsBanner({
  tasks,
  settings,
  careEnabled,
}: {
  tasks:       Task[];
  settings:    import('../types').Settings | null;
  careEnabled: boolean;
}) {
  if (!settings) return null;

  const pillars = (careEnabled
    ? ['work', 'personal', 'sleep', 'care']
    : ['work', 'personal', 'sleep']) as string[];

  const targets: Record<string, number> = {
    work:     settings.work_target_hours     ?? 8,
    personal: settings.personal_target_hours ?? 4,
    sleep:    settings.sleep_target_hours    ?? 8,
    care:     settings.care_target_hours     ?? 2,
  };

  return (
    <View style={goalStyles.card}>
      <Text style={goalStyles.heading} accessibilityRole="header">Goal Progress</Text>
      {pillars.map((p) => {
        const target    = targets[p] ?? 0;
        const planned   = tasks
          .filter((t) => t.pillar === p)
          .reduce((s, t) => s + t.duration_hours, 0);
        const completed = tasks
          .filter((t) => t.pillar === p && t.completed)
          .reduce((s, t) => s + t.duration_hours, 0);

        const plannedPct   = target > 0 ? Math.min(1, planned   / target) : 0;
        const completedPct = target > 0 ? Math.min(1, completed / target) : 0;

        const fmt = (h: number) =>
          h % 1 === 0 ? `${h}h` : `${h.toFixed(1)}h`;

        const color = GOAL_PILLAR_COLORS[p];

        return (
          <View
            key={p}
            style={goalStyles.row}
            accessible
            accessibilityLabel={`${GOAL_PILLAR_LABELS[p]}: ${fmt(completed)} done, ${fmt(planned)} planned, target ${fmt(target)}`.replace(/(\d)h/g, '$1 hours')}
          >
            {/* Label row: dot + pillar name + hours */}
            <View style={goalStyles.labelRow}>
              <View style={[goalStyles.dot, { backgroundColor: color }]} />
              <Text style={goalStyles.pillarName}>{GOAL_PILLAR_LABELS[p]}</Text>
              <Text style={goalStyles.hoursLabel}>
                {completed > 0 ? `${fmt(completed)} done · ` : ''}
                {fmt(planned)} / {fmt(target)}
              </Text>
            </View>

            {/* Progress track */}
            <View style={goalStyles.track}>
              {/* Light fill = total planned */}
              {plannedPct > 0 && (
                <View
                  style={[
                    goalStyles.barBase,
                    { width: `${plannedPct * 100}%` as any, backgroundColor: color + '35' },
                  ]}
                />
              )}
              {/* Solid fill = completed */}
              {completedPct > 0 && (
                <View
                  style={[
                    goalStyles.barBase,
                    goalStyles.barCompleted,
                    { width: `${completedPct * 100}%` as any, backgroundColor: color },
                  ]}
                />
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const goalStyles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  heading: {
    fontSize:   13,
    fontWeight: '700',
    color:      '#6B7280',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  row: {
    marginBottom: 10,
  },
  labelRow: {
    flexDirection:  'row',
    alignItems:     'center',
    marginBottom:   5,
  },
  dot: {
    width:        8,
    height:       8,
    borderRadius: 4,
    marginRight:  6,
  },
  pillarName: {
    fontSize:   13,
    fontWeight: '600',
    color:      '#374151',
    flex:       1,
  },
  hoursLabel: {
    fontSize: 12,
    color:    '#6B7280',
  },
  track: {
    height:          8,
    backgroundColor: '#F3F4F6',
    borderRadius:    4,
    overflow:        'hidden',
  },
  barBase: {
    position:     'absolute',
    top:           0,
    left:          0,
    height:        '100%',
    borderRadius:  4,
  },
  barCompleted: {
    // sits on top of the lighter planned bar — no extra styles needed,
    // colour is passed inline
  },
});

// ─────────────────────────────────────────────────────────────────────────────

export default function ScheduleScreen() {
  const { settings, updateSettings, refreshTasks, setPendingCelebration, syncWithGoogle } = useAppStore();

  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [tasks, setTasks]               = useState<Task[]>([]);
  const [conflictIds, setConflictIds]   = useState<Set<number>>(new Set());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [settingsVisible, setSettingsVisible] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingTask, setEditingTask]   = useState<Task | null>(null);

  const [formName, setFormName]         = useState('');
  const [formPillar, setFormPillar]     = useState<Pillar>('work');
  const [formHourIdx, setFormHourIdx]   = useState(8);
  const [formMinIdx, setFormMinIdx]     = useState(0);
  const [formAmPmIdx, setFormAmPmIdx]   = useState(0);
  const [formDurIdx, setFormDurIdx]     = useState(1);
  const [formRepeatType, setFormRepeatType] = useState<RepeatType>('none');
  const [formRepeatDays, setFormRepeatDays] = useState<number[]>([]);

  useFocusEffect(
    useCallback(() => { loadTasks(); }, [selectedDate])
  );

  async function loadTasks() {
    const loaded = await getTasksForDate(selectedDate);
    setTasks(loaded);
    setConflictIds(getConflictingIds(loaded));

    // Fire-and-forget Google Calendar sync. Safe no-op if not connected.
    // Once it finishes, re-pull the date so newly imported events appear.
    syncWithGoogle().then(async () => {
      const refreshed = await getTasksForDate(selectedDate);
      setTasks(refreshed);
      setConflictIds(getConflictingIds(refreshed));
    });
  }

  function shiftDate(dir: 'prev' | 'next') {
    const current = parseISO(selectedDate);
    const next    = dir === 'next' ? addDays(current, 1) : subDays(current, 1);
    setSelectedDate(format(next, 'yyyy-MM-dd'));
  }

  function openAdd() {
    setEditingTask(null);
    setFormName('');
    setFormPillar('work');
    const now     = new Date();
    const timeStr = `${now.getHours().toString().padStart(2,'0')}:${
      (Math.round(now.getMinutes() / 15) * 15 % 60).toString().padStart(2,'0')
    }`;
    const { hourIdx, minIdx, ampmIdx } = timeToIndices(timeStr);
    setFormHourIdx(hourIdx);
    setFormMinIdx(minIdx);
    setFormAmPmIdx(ampmIdx);
    setFormDurIdx(3);   // index 3 = 1.0 hr (0.25, 0.50, 0.75, 1.00 = index 3)
    setFormRepeatType('none');
    setFormRepeatDays([]);
    setModalVisible(true);
  }

  function openEdit(task: Task) {
    setEditingTask(task);
    setFormName(task.name);
    setFormPillar(task.pillar);
    const { hourIdx, minIdx, ampmIdx } = timeToIndices(task.start_time);
    setFormHourIdx(hourIdx);
    setFormMinIdx(minIdx);
    setFormAmPmIdx(ampmIdx);
    setFormDurIdx(durationToIdx(task.duration_hours));
    setFormRepeatType(task.repeat_type);
    setFormRepeatDays(
      task.repeat_days
        ? task.repeat_days.split(',').map(Number).filter((n) => !isNaN(n))
        : []
    );
    setModalVisible(true);
  }

  // Long-press shortcut: immediately offer "Delete series" for repeat tasks
  function handleLongPress(task: Task) {
    if (task.master_id !== null) {
      Alert.alert('Recurring task', `"${task.name}"`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete this occurrence',
          onPress: async () => {
            await deleteTask(task.id);
            await loadTasks();
            if (selectedDate === getTodayString()) await refreshTasks(selectedDate);
          },
        },
        {
          text: 'Delete entire series',
          style: 'destructive',
          onPress: async () => {
            await deleteTaskSeries(task.master_id!);
            await loadTasks();
            if (selectedDate === getTodayString()) await refreshTasks(selectedDate);
          },
        },
      ]);
    }
  }

  const liveStartTime = indicesToTime(formHourIdx, formMinIdx, formAmPmIdx);
  // Read the numeric value from DURATION_VALUES (not the label string from DURATIONS)
  const liveDuration  = DURATION_VALUES[formDurIdx];
  const conflict      = findConflict(tasks, liveStartTime, liveDuration, editingTask?.id);

  function toggleDay(dow: number) {
    setFormRepeatDays((prev) =>
      prev.includes(dow) ? prev.filter((d) => d !== dow) : [...prev, dow]
    );
  }

  async function handleMove(newDateStr: string) {
    if (!editingTask) return;
    if (newDateStr === editingTask.date) return; // already on this day

    await moveTask(editingTask.id, newDateStr);
    setModalVisible(false);
    await loadTasks();
    if (selectedDate === getTodayString()) await refreshTasks(selectedDate);

    const displayDate = format(parseISO(newDateStr), 'EEE, MMM d');
    Alert.alert('Task moved', `"${editingTask.name}" moved to ${displayDate}.`);
  }

  async function handleSave() {
    if (!formName.trim()) {
      Alert.alert('Name required', 'Please enter a task name.');
      return;
    }
    if (formRepeatType === 'custom' && formRepeatDays.length === 0) {
      Alert.alert('Select days', 'Choose at least one day for the custom repeat.');
      return;
    }
    const input: NewTaskInput = {
      date:           selectedDate,
      name:           formName.trim(),
      start_time:     liveStartTime,
      duration_hours: liveDuration,
      pillar:         formPillar,
      repeat_type:    formRepeatType,
      repeat_days:    formRepeatType === 'custom' ? formRepeatDays.join(',') : '',
    };
    if (editingTask) {
      await updateTask(editingTask.id, input);
    } else {
      await createTask(input);
    }
    setModalVisible(false);
    await loadTasks();
    if (selectedDate === getTodayString()) await refreshTasks(selectedDate);
  }

  function handleDelete() {
    if (!editingTask) return;
    if (editingTask.master_id !== null) {
      Alert.alert('Delete recurring task', `"${editingTask.name}"`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'This occurrence',
          onPress: async () => {
            await deleteTask(editingTask.id);
            setModalVisible(false);
            await loadTasks();
            if (selectedDate === getTodayString()) await refreshTasks(selectedDate);
          },
        },
        {
          text: 'Entire series',
          style: 'destructive',
          onPress: async () => {
            await deleteTaskSeries(editingTask.master_id!);
            setModalVisible(false);
            await loadTasks();
            if (selectedDate === getTodayString()) await refreshTasks(selectedDate);
          },
        },
      ]);
    } else {
      Alert.alert('Delete task', `Delete "${editingTask.name}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteTask(editingTask.id);
            setModalVisible(false);
            await loadTasks();
            if (selectedDate === getTodayString()) await refreshTasks(selectedDate);
          },
        },
      ]);
    }
  }

  async function handleToggle(id: number, completed: boolean) {
    await toggleTaskComplete(id, completed);
    await loadTasks();

    if (selectedDate === getTodayString() && settings) {
      const updated = await getTasksForDate(selectedDate);
      const today   = getTodayString();
      if (settings.last_active_date !== today) {
        const newStreak = calculateNewStreak(updated, settings.current_streak);
        await updateSettings({
          current_streak:   newStreak,
          longest_streak:   Math.max(newStreak, settings.longest_streak),
          last_active_date: today,
        });
        if (isStreakMilestone(newStreak)) setPendingCelebration(true);
      }
      await refreshTasks(selectedDate);
    }
  }

  const careEnabled = settings?.care_enabled ?? false;

  return (
    <View style={styles.container}>
      {/* Date navigation bar */}
      <View style={styles.dateBar}>
        <TouchableOpacity
          style={styles.arrowBtn}
          onPress={() => shiftDate('prev')}
          accessibilityRole="button"
          accessibilityLabel="Previous day"
        >
          <Text style={styles.arrow}>‹</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.dateTouchable}
          onPress={() => setShowDatePicker(true)}
          accessibilityRole="button"
          accessibilityLabel={`${formatDisplayDate(selectedDate)}, ${format(parseISO(selectedDate), 'MMMM d, yyyy')}`}
          accessibilityHint="Opens the date picker"
        >
          <Text style={styles.dateLabel}>{formatDisplayDate(selectedDate)}</Text>
          <Text style={styles.dateSub}>{format(parseISO(selectedDate), 'MMMM d, yyyy')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.arrowBtn}
          onPress={() => shiftDate('next')}
          accessibilityRole="button"
          accessibilityLabel="Next day"
        >
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.schedGearBtn}
          onPress={() => setSettingsVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Open settings"
          hitSlop={8}
          testID="schedule-settings-gear"
        >
          <Text style={styles.schedGearIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={parseISO(selectedDate)}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(_, date) => {
            setShowDatePicker(false);
            if (date) setSelectedDate(format(date, 'yyyy-MM-dd'));
          }}
        />
      )}

      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TaskCard
            task={item}
            onToggleComplete={handleToggle}
            onPress={openEdit}
            onLongPress={handleLongPress}
            hasConflict={conflictIds.has(item.id)}
          />
        )}
        ListHeaderComponent={
          <DailyGoalsBanner
            tasks={tasks}
            settings={settings}
            careEnabled={careEnabled}
          />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No tasks for this day.</Text>
            <Text style={styles.emptySubText}>Tap "+ Add Task" to start planning.</Text>
          </View>
        }
      />

      <SettingsScreen visible={settingsVisible} onClose={() => setSettingsVisible(false)} />

      <TouchableOpacity
        style={styles.addBtn}
        onPress={openAdd}
        accessibilityRole="button"
        accessibilityLabel="Add task"
      >
        <Text style={styles.addBtnText}>+ Add Task</Text>
      </TouchableOpacity>

      {/* ══ Add / Edit Modal ══════════════════════════════════════════ */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modal}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.headerBtn}
                onPress={() => setModalVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle} accessibilityRole="header">
                {editingTask ? 'Edit Task' : 'New Task'}
              </Text>
              <TouchableOpacity
                style={[styles.headerBtn, styles.headerBtnRight]}
                onPress={handleSave}
                accessibilityRole="button"
                accessibilityLabel="Save task"
              >
                <Text style={styles.saveText}>Save</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Task name</Text>
            <TextInput
              style={styles.textInput}
              value={formName}
              onChangeText={setFormName}
              placeholder="e.g. Morning run"
              accessibilityLabel="Task name"
              autoFocus={!editingTask}
              returnKeyType="done"
              selectionColor="#3C3489"
            />

            <Text style={styles.fieldLabel}>Pillar</Text>
            <PillarSelector
              selected={formPillar}
              onChange={setFormPillar}
              showCare={careEnabled}
            />

            <Text style={styles.fieldLabel}>Start time</Text>
            <View style={styles.wheelRow}>
              <WheelPicker items={HOURS}   selectedIndex={formHourIdx}  onChange={setFormHourIdx}  width={72} accessibilityLabel="Start hour" />
              <Text style={styles.wheelColon} accessible={false}>:</Text>
              <WheelPicker items={MINUTES} selectedIndex={formMinIdx}   onChange={setFormMinIdx}   width={72} accessibilityLabel="Start minute" />
              <WheelPicker items={AMPM}    selectedIndex={formAmPmIdx}  onChange={setFormAmPmIdx}  width={72} accessibilityLabel="AM or PM" />
            </View>

            <Text style={styles.fieldLabel}>Duration</Text>
            <View style={styles.wheelRow}>
              <WheelPicker items={DURATIONS} selectedIndex={formDurIdx} onChange={setFormDurIdx} width={90} accessibilityLabel="Duration" />
              <Text style={styles.wheelUnit}>hours</Text>
            </View>

            {/* Conflict warning */}
            {conflict && (
              <View style={styles.conflictBanner} accessibilityRole="alert">
                <Text style={styles.conflictText}>
                  ⚠️ Overlaps with "{conflict.name}" ({conflict.start_time})
                </Text>
              </View>
            )}

            <Text style={styles.fieldLabel}>Repeat</Text>
            <View style={styles.repeatChips} accessibilityRole="radiogroup" accessibilityLabel="Repeat">
              {REPEAT_OPTIONS.map((opt) => {
                const active = formRepeatType === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setFormRepeatType(opt.value)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active, checked: active }}
                    accessibilityLabel={`Repeat ${opt.label.toLowerCase()}`}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {formRepeatType === 'custom' && (
              <>
                <Text style={styles.customDaysHint}>Select which days:</Text>
                <View style={styles.dayRow}>
                  {DAY_LABELS.map((label, dow) => {
                    const sel = formRepeatDays.includes(dow);
                    return (
                      <TouchableOpacity
                        key={dow}
                        style={[styles.dayBtn, sel && styles.dayBtnActive]}
                        onPress={() => toggleDay(dow)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: sel }}
                        accessibilityLabel={DAY_NAMES[dow]}
                      >
                        <Text style={[styles.dayBtnText, sel && styles.dayBtnTextActive]}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            {editingTask && (
              <>
                {/* ── Move strip — not for master repeat templates ── */}
                {!editingTask.is_master && (
                  <MoveDayStrip
                    taskDate={editingTask.date}
                    onMove={handleMove}
                  />
                )}

                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={handleDelete}
                  accessibilityRole="button"
                  accessibilityLabel="Delete task"
                >
                  <Text style={styles.deleteBtnText}>
                    {editingTask.master_id !== null ? 'Delete task…' : 'Delete Task'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#F9FAFB' },
  dateBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    paddingTop: 52, paddingBottom: 14, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  arrowBtn:      { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  arrow:         { fontSize: 34, color: '#3C3489', fontWeight: '300' },
  schedGearBtn:  { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  schedGearIcon: { fontSize: 20 },
  dateTouchable: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  dateLabel:     { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  dateSub:       { fontSize: 13, color: '#6B7280', marginTop: 2 },
  list:          { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 110 },
  empty:         { alignItems: 'center', paddingTop: 64 },
  emptyText:     { fontSize: 16, color: '#6B7280', fontWeight: '600' },
  emptySubText:  { fontSize: 14, color: '#9CA3AF', marginTop: 4 },
  addBtn: {
    position: 'absolute', bottom: 32, left: 24, right: 24,
    backgroundColor: '#3C3489', borderRadius: 16, paddingVertical: 16, alignItems: 'center',
    shadowColor: '#3C3489', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 6,
  },
  addBtnText:    { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  modal:         { flex: 1, backgroundColor: '#F9FAFB' },
  modalContent:  { padding: 20, paddingTop: 0, paddingBottom: 40 },
  modalHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, marginBottom: 4 },
  // 44×44pt minimum touch target for the text-only header buttons
  headerBtn:      { minWidth: 44, minHeight: 44, justifyContent: 'center' },
  headerBtnRight: { alignItems: 'flex-end' },
  cancelText:    { fontSize: 16, color: '#6B7280' },
  modalTitle:    { fontSize: 17, fontWeight: '700', color: '#1F2937' },
  saveText:      { fontSize: 16, fontWeight: '700', color: '#3C3489' },
  fieldLabel:    { fontSize: 14, fontWeight: '600', color: '#374151', marginTop: 22, marginBottom: 10 },
  textInput: {
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: '#1F2937',
  },
  wheelRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wheelColon:    { fontSize: 28, fontWeight: '700', color: '#374151', marginBottom: 4 },
  wheelUnit:     { fontSize: 16, color: '#6B7280', fontWeight: '500', marginLeft: 8 },
  conflictBanner:{ marginTop: 14, backgroundColor: '#FEF9C3', borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: '#EAB308' },
  conflictText:  { fontSize: 13, color: '#713F12', lineHeight: 18 },
  repeatChips:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:          { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 22, borderWidth: 1.5, borderColor: '#D1D5DB', backgroundColor: '#FFFFFF' },
  chipActive:    { backgroundColor: '#3C3489', borderColor: '#3C3489' },
  chipText:      { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  chipTextActive:{ color: '#FFFFFF' },
  customDaysHint:{ fontSize: 13, color: '#6B7280', marginTop: 12, marginBottom: 10 },
  dayRow:        { flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  dayBtn:        { flex: 1, minHeight: 44, justifyContent: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: '#D1D5DB', alignItems: 'center', backgroundColor: '#FFFFFF' },
  dayBtnActive:  { backgroundColor: '#3C3489', borderColor: '#3C3489' },
  dayBtnText:    { fontSize: 12, fontWeight: '700', color: '#6B7280' },
  dayBtnTextActive: { color: '#FFFFFF' },
  // ── Move day strip ────────────────────────────────────────────────────────────
  moveStrip: {
    marginTop: 22,
  },
  moveLabelRow: {
    flexDirection:  'row',
    alignItems:     'baseline',
    gap:             6,
    marginBottom:   10,
  },
  moveLabel:     { fontSize: 14, fontWeight: '600', color: '#374151' },
  moveHint:      { fontSize: 12, color: '#9CA3AF' },
  moveDayList:   { paddingBottom: 2 },
  moveDayChip: {
    alignItems:      'center',
    justifyContent:  'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius:    12,
    borderWidth:     1.5,
    borderColor:     '#E5E7EB',
    backgroundColor: '#FFFFFF',
    marginRight:     8,
    minWidth:        58,
  },
  moveDayChipCurrent: {
    backgroundColor: '#F5F3FF',
    borderColor:     '#C4B5FD',
  },
  moveDayChipTarget: {
    backgroundColor: '#3C3489',
    borderColor:     '#3C3489',
  },
  moveDayChipToday: {
    borderColor:     '#1D9E75',
  },
  moveDayAbbr: {
    fontSize:   11,
    fontWeight: '700',
    color:      '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  moveDayAbbrCurrent: { color: '#7C3AED' },
  moveDayAbbrTarget:  { color: '#FFFFFF' },
  moveDayNum: {
    fontSize:   17,
    fontWeight: '700',
    color:      '#1F2937',
    marginTop:   2,
  },
  moveDayNumCurrent: { color: '#7C3AED' },
  moveDayNumTarget:  { color: '#FFFFFF' },
  moveDayTodayDot: {
    width:          4,
    height:         4,
    borderRadius:   2,
    backgroundColor: '#1D9E75',
    marginTop:      3,
  },

  deleteBtn:     { marginTop: 14, paddingVertical: 16, borderRadius: 12, borderWidth: 1.5, borderColor: '#FCA5A5', alignItems: 'center' },
  deleteBtnText: { fontSize: 16, fontWeight: '600', color: '#DC2626' },
});
