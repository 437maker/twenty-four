// PillarSelector.tsx — Three buttons for choosing Work / Personal / Sleep.
// The selected button is filled with the pillar's color; others are outlined.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Pillar } from '../types';

interface PillarSelectorProps {
  selected: Pillar;
  onChange: (pillar: Pillar) => void;
}

// Constant list of pillars with their labels and colors.
// Defined outside the component so it isn't re-created on every render.
const PILLARS: { value: Pillar; label: string; color: string }[] = [
  { value: 'work',     label: 'Work',     color: '#3C3489' },
  { value: 'personal', label: 'Personal', color: '#1D9E75' },
  { value: 'sleep',    label: 'Sleep',    color: '#185FA5' },
];

export default function PillarSelector({ selected, onChange }: PillarSelectorProps) {
  return (
    <View style={styles.row}>
      {PILLARS.map((p) => {
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
