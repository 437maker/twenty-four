// TaskCard.tsx — A single row in the Schedule screen task list.
// Sprint 2: added Care pillar colour, orange conflict dot, long-press for series.

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

  return (
    <TouchableOpacity
      style={[styles.card, task.completed && styles.cardDone]}
      onPress={() => onPress(task)}
      onLongPress={onLongPress ? () => onLongPress(task) : undefined}
      delayLongPress={500}
      activeOpacity={0.75}
    >
      {/* Coloured left stripe — shows which pillar this task belongs to */}
      <View style={[styles.stripe, { backgroundColor: color }]} />

      {/* Main content */}
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

      {/* Checkmark circle */}
      <TouchableOpacity
        style={[
          styles.check,
          task.completed && { backgroundColor: color, borderColor: color },
        ]}
        onPress={() => onToggleComplete(task.id, !task.completed)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        {task.completed && <Text style={styles.tick}>✓</Text>}
      </TouchableOpacity>
    </TouchableOpacity>
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
  check: {
    width:        28,
    height:       28,
    borderRadius: 14,
    borderWidth:  2,
    borderColor:  '#D1D5DB',
    marginRight:  14,
    alignItems:   'center',
    justifyContent: 'center',
  },
  tick: {
    color:      '#FFFFFF',
    fontSize:   14,
    fontWeight: '700',
  },
});
