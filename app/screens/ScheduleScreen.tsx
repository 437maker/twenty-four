// ScheduleScreen.tsx — View and manage tasks for any day.
//
// Features:
//   • Navigate between days with ← → arrows (or tap the date to pick from a calendar)
//   • Tap a task to edit or delete it
//   • Tap "Add Task" to create a new task
//   • Check off tasks to log progress (updates streak on today's tasks)

import React, { useState, useCallback } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, addDays, subDays, parseISO } from 'date-fns';

import { useAppStore } from '../store/useAppStore';
import TaskCard from '../components/TaskCard';
import PillarSelector from '../components/PillarSelector';
import {
  getTasksForDate,
  createTask,
  updateTask,
  deleteTask,
  toggleTaskComplete,
} from '../db/queries';
import { Task, NewTaskInput, Pillar } from '../types';
import {
  getTodayString,
  formatDisplayDate,
  dateToTimeString,
  timeStringToDate,
} from '../utils/dateHelpers';
import { calculateNewStreak } from '../utils/calculations';

export default function ScheduleScreen() {
  const { settings, updateSettings, refreshTasks } = useAppStore();

  // Which date is currently shown
  const [selectedDate, setSelectedDate] = useState(getTodayString());

  // All tasks for the selected date
  const [tasks, setTasks] = useState<Task[]>([]);

  // Controls the native date-picker calendar overlay
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Modal open/closed, and which task (if any) we're editing
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // ── Form fields inside the modal ─────────────────────────
  const [formName, setFormName] = useState('');
  const [formPillar, setFormPillar] = useState<Pillar>('work');
  const [formDuration, setFormDuration] = useState('1');
  const [formStartTime, setFormStartTime] = useState(new Date());
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);

  // Reload tasks whenever this screen comes into focus or the date changes.
  // useCallback wraps the function so React doesn't recreate it on every render.
  useFocusEffect(
    useCallback(() => {
      loadTasks();
    }, [selectedDate])
  );

  async function loadTasks() {
    const loaded = await getTasksForDate(selectedDate);
    setTasks(loaded);
  }

  // ── Date navigation ────────────────────────────────────────
  function shiftDate(dir: 'prev' | 'next') {
    const current = parseISO(selectedDate);
    const next = dir === 'next' ? addDays(current, 1) : subDays(current, 1);
    setSelectedDate(format(next, 'yyyy-MM-dd'));
  }

  // ── Modal helpers ──────────────────────────────────────────
  function openAdd() {
    setEditingTask(null);
    setFormName('');
    setFormPillar('work');
    setFormDuration('1');
    const now = new Date();
    now.setMinutes(0, 0, 0); // snap to the hour
    setFormStartTime(now);
    setModalVisible(true);
  }

  function openEdit(task: Task) {
    setEditingTask(task);
    setFormName(task.name);
    setFormPillar(task.pillar);
    setFormDuration(task.duration_hours.toString());
    setFormStartTime(timeStringToDate(task.start_time));
    setModalVisible(true);
  }

  // ── Save (create or update) ────────────────────────────────
  async function handleSave() {
    if (!formName.trim()) {
      Alert.alert('Name required', 'Please enter a task name.');
      return;
    }
    const duration = parseFloat(formDuration);
    if (isNaN(duration) || duration <= 0) {
      Alert.alert('Invalid duration', 'Enter a number greater than 0, e.g. "1.5".');
      return;
    }

    const input: NewTaskInput = {
      date: selectedDate,
      name: formName.trim(),
      start_time: dateToTimeString(formStartTime),
      duration_hours: duration,
      pillar: formPillar,
    };

    if (editingTask) {
      await updateTask(editingTask.id, input);
    } else {
      await createTask(input);
    }

    setModalVisible(false);
    await loadTasks();
    // Keep the home screen's store in sync if we edited today
    if (selectedDate === getTodayString()) await refreshTasks(selectedDate);
  }

  // ── Delete ─────────────────────────────────────────────────
  function handleDelete() {
    if (!editingTask) return;
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

  // ── Toggle complete ────────────────────────────────────────
  async function handleToggle(id: number, completed: boolean) {
    await toggleTaskComplete(id, completed);
    await loadTasks();

    // Update streak — but only once per day (check last_active_date)
    if (selectedDate === getTodayString() && settings) {
      const updated = await getTasksForDate(selectedDate);
      const today = getTodayString();

      if (settings.last_active_date !== today) {
        const newStreak = calculateNewStreak(updated, settings.current_streak);
        await updateSettings({
          current_streak: newStreak,
          longest_streak: Math.max(newStreak, settings.longest_streak),
          last_active_date: today,
        });
      }

      await refreshTasks(selectedDate);
    }
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Date navigation bar */}
      <View style={styles.dateBar}>
        <TouchableOpacity style={styles.arrowBtn} onPress={() => shiftDate('prev')}>
          <Text style={styles.arrow}>‹</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dateTouchable}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.dateLabel}>{formatDisplayDate(selectedDate)}</Text>
          <Text style={styles.dateSub}>
            {format(parseISO(selectedDate), 'MMMM d, yyyy')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.arrowBtn} onPress={() => shiftDate('next')}>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Native date picker (appears when user taps the date) */}
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

      {/* Task list */}
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TaskCard
            task={item}
            onToggleComplete={handleToggle}
            onPress={openEdit}
          />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No tasks for this day.</Text>
            <Text style={styles.emptySubText}>Tap "+ Add Task" to start planning.</Text>
          </View>
        }
      />

      {/* Floating "Add Task" button */}
      <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
        <Text style={styles.addBtnText}>+ Add Task</Text>
      </TouchableOpacity>

      {/* ── Add / Edit Modal ─────────────────────────────── */}
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
          >
            {/* Modal header row */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {editingTask ? 'Edit Task' : 'New Task'}
              </Text>
              <TouchableOpacity onPress={handleSave}>
                <Text style={styles.saveText}>Save</Text>
              </TouchableOpacity>
            </View>

            {/* Task name */}
            <Text style={styles.fieldLabel}>Task name</Text>
            <TextInput
              style={styles.textInput}
              value={formName}
              onChangeText={setFormName}
              placeholder="e.g. Morning run"
              autoFocus={!editingTask}
              returnKeyType="done"
              selectionColor="#3C3489"
            />

            {/* Pillar */}
            <Text style={styles.fieldLabel}>Pillar</Text>
            <PillarSelector selected={formPillar} onChange={setFormPillar} />

            {/* Duration */}
            <Text style={styles.fieldLabel}>Duration (hours)</Text>
            <TextInput
              style={styles.textInput}
              value={formDuration}
              onChangeText={setFormDuration}
              keyboardType="decimal-pad"
              placeholder="1"
              returnKeyType="done"
              selectionColor="#3C3489"
            />

            {/* Start time */}
            <Text style={styles.fieldLabel}>Start time</Text>
            <TouchableOpacity
              style={styles.timeBtn}
              onPress={() => setShowStartTimePicker(true)}
            >
              <Text style={styles.timeBtnText}>
                {format(formStartTime, 'h:mm a')}
              </Text>
            </TouchableOpacity>

            {showStartTimePicker && (
              <DateTimePicker
                value={formStartTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, date) => {
                  setShowStartTimePicker(false);
                  if (date) setFormStartTime(date);
                }}
              />
            )}

            {/* Delete button (edit mode only) */}
            {editingTask && (
              <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                <Text style={styles.deleteBtnText}>Delete Task</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  // Date bar
  dateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingTop: 52,
    paddingBottom: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  arrowBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: {
    fontSize: 34,
    color: '#3C3489',
    fontWeight: '300',
  },
  dateTouchable: {
    flex: 1,
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  dateSub: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  // List
  list: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 110, // extra room above the floating button
  },
  empty: {
    alignItems: 'center',
    paddingTop: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
  },
  emptySubText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  // Add button
  addBtn: {
    position: 'absolute',
    bottom: 32,
    left: 24,
    right: 24,
    backgroundColor: '#3C3489',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#3C3489',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  // Modal
  modal: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalContent: {
    padding: 20,
    paddingTop: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    marginBottom: 4,
  },
  cancelText: {
    fontSize: 16,
    color: '#6B7280',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3C3489',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginTop: 20,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
  },
  timeBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  timeBtnText: {
    fontSize: 16,
    color: '#1F2937',
  },
  deleteBtn: {
    marginTop: 40,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    alignItems: 'center',
  },
  deleteBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
  },
});
