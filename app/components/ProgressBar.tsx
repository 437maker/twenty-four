// ProgressBar.tsx — A labeled horizontal bar that fills based on progress.
// Used on the Home screen for Work, Personal, and Sleep pillars.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ProgressBarProps {
  label: string;    // e.g. "Work"
  current: number;  // hours logged today (completed tasks)
  target: number;   // daily target hours
  color: string;    // hex color for the filled portion
}

export default function ProgressBar({ label, current, target, color }: ProgressBarProps) {
  // Calculate what percentage of the target has been reached.
  // target > 0 prevents division by zero. Math.min caps it at 100%.
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;

  return (
    <View style={styles.container}>
      {/* Top row: label on the left, "X.X / Y.Y hrs" on the right */}
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.hours}>
          {current.toFixed(1)} / {target.toFixed(1)} hrs
        </Text>
      </View>

      {/* The "track" is the full-width gray background.
          The "fill" sits inside it and its width is a percentage. */}
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  row: {
    flexDirection: 'row',        // children side by side
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  hours: {
    fontSize: 13,
    color: '#6B7280',
  },
  track: {
    height: 12,
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
    overflow: 'hidden', // keeps the fill inside the rounded corners
  },
  fill: {
    height: '100%',
    borderRadius: 6,
  },
});
