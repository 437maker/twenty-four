// TaskCard.tsx — A single row in the Schedule screen task list.
// Shows the task name, time, duration, pillar color, and a checkmark button.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Task } from '../types';
import { formatTime } from '../utils/dateHelpers';

const PILLAR_COLORS: Record<string, string> = {
  work: '#3C3489',
  personal: '#1D9E75',
  sleep: '#185FA5',
};

const PILLAR_LABELS: Record<string, string> = {
  work: 'Work',
  personal: 'Personal',
  sleep: 'Sleep',
};

interface TaskCardProps {
  task: Task;
  onToggleComplete: (id: number, newCompleted: boolean) => void;
  onPress: (task: Task) => void; // opens the edit form
}

export default function TaskCard({ task, onToggleComplete, onPress }: TaskCardProps) {
  const color = PILLAR_COLORS[task.pillar];

  return (
    // TouchableOpacity dims slightly when tapped — gives visual feedback
    <TouchableOpacity
      style={[styles.card, task.completed && styles.cardDone]}
      onPress={() => onPress(task)}
      activeOpacity={0.75}
    >
      {/* Colored left stripe shows which pillar this task belongs to */}
      <View style={[styles.stripe, { backgroundColor: color }]} />

      {/* Main content area */}
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={[styles.name, task.completed && styles.nameDone]} numberOfLines={1}>
            {task.name}
          </Text>
          {/* Small colored badge with the pillar name */}
          <View style={[styles.badge, { backgroundColor: color + '22' }]}>
            <Text style={[styles.badgeText, { color }]}>{PILLAR_LABELS[task.pillar]}</Text>
          </View>
        </View>
        <Text style={styles.meta}>
          {formatTime(task.start_time)} · {task.duration_hours}h
        </Text>
      </View>

      {/* Checkmark circle on the right */}
      <TouchableOpacity
        style={[styles.check, task.completed && { backgroundColor: color, borderColor: color }]}
        onPress={() => onToggleComplete(task.id, !task.completed)}
        // hitSlop makes the tap target bigger than the visual size
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        {task.completed && <Text style={styles.tick}>✓</Text>}
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginVertical: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
    overflow: 'hidden',
    minHeight: 64,
  },
  cardDone: {
    opacity: 0.6,
  },
  stripe: {
    width: 5,
    alignSelf: 'stretch',
  },
  body: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    marginRight: 8,
  },
  nameDone: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  meta: {
    fontSize: 13,
    color: '#6B7280',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    flexShrink: 0,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tick: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
