// TaskCard.tsx — A single row in the Schedule screen task list.
// Sprint 2: added Care pillar colour, orange conflict dot, long-press for series.
// Phase 3 (accessibility): the card is now two SIBLING touch targets instead of
// a checkbox nested inside a button. VoiceOver treats a button as one element
// and hides anything inside it, so the nested checkbox could not be reached.
//   • body     → role "button", reads name, pillar, time, duration, status
//   • checkbox → role "checkbox" with a checked state, 44×44pt touch area

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Task } from '../types';
import { formatTime } from '../utils/dateHelpers';

// Pillar colours and labels for all four pillars
const PILLAR_COLORS: Record<string, string> = {
  work:     '#3C3489',
  personal: '#1D9E75',
  sleep:    '#185FA5',
  care:     '#D97706',
};

const PILLAR_LABELS: Record<string, string> = {
  work:     'Work',
  personal: 'Personal',
  sleep:    'Sleep',
  care:     'Care',
};

interface TaskCardProps {
  task: Task;
  onToggleComplete: (id: number, newCompleted: boolean) => void;
  onPress:          (task: Task) => void;  // opens the edit form
  onLongPress?:     (task: Task) => void;  // optional: used for "Delete series"
  hasConflict?:     boolean;               // true = show orange dot indicator
}

export default function TaskCard({
  task,
  onToggleComplete,
  onPress,
  onLongPress,
  hasConflict = false,
}: TaskCardProps) {
  const color = PILLAR_COLORS[task.pillar] ?? '#6B7280';
  const label = PILLAR_LABELS[task.pillar] ?? task.pillar;

  // One sentence for screen readers, e.g.
  // "Lab report, Work, 9:00 AM, 2 hours, completed, overlaps another task"
  const hoursWord = task.duration_hours === 1 ? 'hour' : 'hours';
  const spoken = [
    task.name,
    label,
    formatTime(task.start_time),
    `${task.duration_hours} ${hoursWord}`,
    task.completed ? 'completed' : 'not completed',
    task.master_id !== null ? 'repeating' : null,
    hasConflict ? 'overlaps another task' : null,
  ].filter(Boolean).join(', ');

  return (
    <View style={[styles.card, task.completed && styles.cardDone]}>
      {/* Coloured left stripe — shows which pillar this task belongs to */}
      <View style={[styles.stripe, { backgroundColor: color }]} />

      {/* Main content — tap to edit */}
      <TouchableOpacity
        style={styles.bodyTouch}
        onPress={() => onPress(task)}
        onLongPress={onLongPress ? () => onLongPress(task) : undefined}
        delayLongPress={500}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={spoken}
        accessibilityHint={
          onLongPress && task.master_id !== null
            ? 'Opens the task to edit. Long press for series options.'
            : 'Opens the task to edit.'
        }
      >
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text
            style={[styles.name, task.completed && styles.nameDone]}
            numberOfLines={1}
          >
            {task.name}
          </Text>

          {/* Repeat indicator — small "↻" next to name for recurring tasks */}
          {task.master_id !== null && (
            <Text style={styles.repeatIcon}>↻</Text>
          )}

          {/* Pillar badge */}
          <View style={[styles.badge, { backgroundColor: color + '22' }]}>
            <Text style={[styles.badgeText, { color }]}>{label}</Text>
          </View>
        </View>

        <Text style={styles.meta}>
          {formatTime(task.start_time)} · {task.duration_hours}h
        </Text>
      </View>

      {/* Orange conflict dot — shown when this task overlaps another */}
      {hasConflict && (
        <View style={styles.conflictDot} />
      )}
      </TouchableOpacity>

      {/* Checkmark circle. The visible circle is 28pt; the touchable around it
          is 44×44pt, Apple's minimum comfortable touch target. */}
      <TouchableOpacity
        style={styles.checkTouch}
        onPress={() => onToggleComplete(task.id, !task.completed)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: task.completed }}
        accessibilityLabel={`${task.name} done`}
        accessibilityHint={task.completed ? 'Marks the task as not done' : 'Marks the task as done'}
      >
        <View
          style={[
            styles.check,
            task.completed && { backgroundColor: color, borderColor: color },
          ]}
        >
          {task.completed && <Text style={styles.tick}>✓</Text>}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection:  'row',
    alignItems:     'center',
    backgroundColor: '#FFFFFF',
    borderRadius:   12,
    marginVertical: 5,
    shadowColor:    '#000',
    shadowOffset:   { width: 0, height: 1 },
    shadowOpacity:  0.06,
    shadowRadius:   3,
    elevation:      2,
    overflow:       'hidden',
    minHeight:      64,
  },
  cardDone: {
    opacity: 0.6,
  },
  stripe: {
    width:     5,
    alignSelf: 'stretch',
  },
  bodyTouch: {
    flex:          1,
    flexDirection: 'row',
    alignItems:    'center',
    alignSelf:     'stretch',
  },
  body: {
    flex:            1,
    paddingHorizontal: 12,
    paddingVertical:   12,
  },
  topRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   4,
  },
  name: {
    fontSize:   15,
    fontWeight: '600',
    color:      '#1F2937',
    flex:       1,
    marginRight: 4,
  },
  nameDone: {
    textDecorationLine: 'line-through',
    color:              '#9CA3AF',
  },
  repeatIcon: {
    fontSize:   13,
    color:      '#9CA3AF',
    marginRight: 6,
  },
  meta: {
    fontSize: 13,
    color:    '#6B7280',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical:   3,
    borderRadius:      20,
    flexShrink:        0,
  },
  badgeText: {
    fontSize:   11,
    fontWeight: '700',
  },
  // Orange dot shown when this task overlaps another task's time block
  conflictDot: {
    width:        8,
    height:       8,
    borderRadius: 4,
    backgroundColor: '#F97316',
    marginRight:  8,
  },
  checkTouch: {
    width:          44,
    height:         44,
    marginRight:    6,
    alignItems:     'center',
    justifyContent: 'center',
  },
  check: {
    width:        28,
    height:       28,
    borderRadius: 14,
    borderWidth:  2,
    borderColor:  '#D1D5DB',
    alignItems:   'center',
    justifyContent: 'center',
  },
  tick: {
    color:      '#FFFFFF',
    fontSize:   14,
    fontWeight: '700',
  },
});
