// PillarSelector.tsx — Buttons for choosing Work / Personal / Sleep / Care.
// The selected button is filled with the pillar's color; others are outlined.
// Sprint 1: accepts showCare prop to conditionally show the Care option.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Pillar } from '../types';

interface PillarSelectorProps {
  selected: Pillar;
  onChange: (pillar: Pillar) => void;
  showCare?: boolean; // Sprint 1: show the optional Care pillar button
}

// All four pillars with their labels and colors.
const ALL_PILLARS: { value: Pillar; label: string; color: string }[] = [
  { value: 'work',     label: 'Work',     color: '#3C3489' },
  { value: 'personal', label: 'Personal', color: '#1D9E75' },
  { value: 'sleep',    label: 'Sleep',    color: '#185FA5' },
  { value: 'care',     label: 'Care',     color: '#D97706' },
];

export default function PillarSelector({ selected, onChange, showCare = false }: PillarSelectorProps) {
  // Only include Care if the user has enabled it in Settings
  const pillars = showCare ? ALL_PILLARS : ALL_PILLARS.slice(0, 3);

  return (
    <View style={styles.row}>
      {pillars.map((p) => {
        const isSelected = selected === p.value;
        return (
          <TouchableOpacity
            key={p.value}
            style={[
              styles.button,
              isSelected
                ? { backgroundColor: p.color, borderColor: p.color }
                : { borderColor: '#D1D5DB' },
            ]}
            onPress={() => onChange(p.value)}
          >
            <Text style={[styles.label, isSelected && styles.labelSelected]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    minHeight: 44, // iOS minimum tap target
    justifyContent: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  labelSelected: {
    color: '#FFFFFF',
  },
});
