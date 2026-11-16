// TimeFields.tsx — the two time controls of the task form.
//
//   <StartTimeField time="09:30" onChange={...} />
//   <DurationField hours={1.5} onChange={...} />
//
// Each offers three ways to set its value, fastest first:
//   1. chips: Now, +15m, +30m, +1h for the start; 15m … 2h for the duration
//   2. typing: tap the time shown, type "9:30" or "930p"
//   3. the wheels (WheelPicker), for anything else
//
// The math (reading a typed time, adding minutes past midnight) is in
// utils/timeInput.ts, where the tests can reach it without rendering.

import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import WheelPicker from './WheelPicker';
import {
  DURATION_CHIPS, DURATION_VALUES, QUICK_CHIPS,
  applyQuickChip, durationToIdx, formatClock, formatDurationLabel, formatTime12,
  parseTypedTime, snapTime, toClock,
} from '../utils/timeInput';

const HOURS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const MINUTES = ['00', '15', '30', '45']; // quarter-hour steps
const AMPM = ['AM', 'PM'];
const DURATION_LABELS = DURATION_VALUES.map(formatDurationLabel);

// "HH:MM" → the row each of the three wheels is on.
export function timeToIndices(time: string) {
  const { h, m } = toClock(snapTime(time));
  return { hourIdx: (h % 12 || 12) - 1, minIdx: Math.round(m / 15) % 4, ampmIdx: h >= 12 ? 1 : 0 };
}

// ...and back.
export function indicesToTime(hourIdx: number, minIdx: number, ampmIdx: number): string {
  const hour12 = hourIdx + 1;
  return formatClock({ h: (hour12 % 12) + (ampmIdx === 1 ? 12 : 0), m: minIdx * 15 });
}

function Chip({ label, hint, selected, onPress, testID }: {
  label: string; hint: string; selected?: boolean; onPress: () => void; testID?: string;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipOn]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={hint}
      accessibilityState={{ selected: !!selected }}
      hitSlop={{ top: 6, bottom: 6 }}
      testID={testID}
    >
      <Text style={[styles.chipText, selected && styles.chipTextOn]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Start time ───────────────────────────────────────────────────────────────
export function StartTimeField({ time, onChange }: { time: string; onChange: (time: string) => void }) {
  const { hourIdx, minIdx, ampmIdx } = useMemo(() => timeToIndices(time), [time]);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState(false);

  function startTyping() {
    setDraft('');
    setError(false);
    setTyping(true);
  }
  // Enter: take the time if it can be read, otherwise say so and keep the field open.
  function submit() {
    const clock = parseTypedTime(draft, ampmIdx === 1);
    if (!clock) {
      setError(true);
      return;
    }
    onChange(snapTime(formatClock(clock)));
    setTyping(false);
  }
  // Tapping away: take it if it can be read, otherwise leave the time as it was.
  function blur() {
    const clock = parseTypedTime(draft, ampmIdx === 1);
    if (clock) onChange(snapTime(formatClock(clock)));
    setTyping(false);
    setError(false);
  }

  return (
    <View>
      <View style={styles.valueRow}>
        {typing ? (
          <TextInput
            style={[styles.valueInput, error && styles.valueInputError]}
            value={draft}
            onChangeText={(t) => {
              setDraft(t);
              setError(false);
            }}
            onSubmitEditing={submit}
            onBlur={blur}
            submitBehavior="submit"
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="numbers-and-punctuation"
            returnKeyType="done"
            placeholder="9:30 or 930p"
            placeholderTextColor="#9CA3AF"
            maxLength={8}
            selectionColor="#3C3489"
            accessibilityLabel="Type a start time"
            testID="start-time-input"
          />
        ) : (
          <TouchableOpacity
            style={styles.valueBtn}
            onPress={startTyping}
            accessibilityRole="button"
            accessibilityLabel={`Start time ${formatTime12(time)}. Tap to type a time`}
            testID="start-time-value"
          >
            <Text style={styles.valueText}>{formatTime12(time)}</Text>
            <Text style={styles.valueHint}>tap to type</Text>
          </TouchableOpacity>
        )}
      </View>
      {typing && (
        <Text style={[styles.typeHelp, error && styles.typeHelpError]} accessibilityRole={error ? 'alert' : undefined} testID="start-time-help">
          {error ? 'That is not a time. Try 9:30, 930p or 21:30.' : 'Type 9, 930, 9:30p or 21:30, then Done.'}
        </Text>
      )}

      <View style={styles.chips}>
        {QUICK_CHIPS.map((chip) => (
          <Chip
            key={chip.label}
            label={chip.label}
            hint={chip.hint}
            onPress={() => onChange(applyQuickChip(time, chip))}
            testID={`start-chip-${chip.label}`}
          />
        ))}
      </View>

      <View style={styles.wheelRow}>
        <WheelPicker items={HOURS} selectedIndex={hourIdx} onChange={(i) => onChange(indicesToTime(i, minIdx, ampmIdx))} width={72} accessibilityLabel="Start hour" testID="wheel-hour" />
        <Text style={styles.wheelColon} accessible={false}>:</Text>
        <WheelPicker items={MINUTES} selectedIndex={minIdx} onChange={(i) => onChange(indicesToTime(hourIdx, i, ampmIdx))} width={72} accessibilityLabel="Start minute" testID="wheel-minute" />
        <WheelPicker items={AMPM} selectedIndex={ampmIdx} onChange={(i) => onChange(indicesToTime(hourIdx, minIdx, i))} width={72} accessibilityLabel="AM or PM" testID="wheel-ampm" />
      </View>
    </View>
  );
}

// ─── Duration ─────────────────────────────────────────────────────────────────
export function DurationField({ hours, onChange }: { hours: number; onChange: (hours: number) => void }) {
  const idx = durationToIdx(hours);
  return (
    <View>
      <View style={styles.chips}>
        {DURATION_CHIPS.map((chip) => (
          <Chip
            key={chip.label}
            label={chip.label}
            hint={chip.hint}
            selected={Math.abs(chip.hours - hours) < 0.001}
            onPress={() => onChange(chip.hours)}
            testID={`duration-chip-${chip.label}`}
          />
        ))}
      </View>
      <View style={styles.wheelRow}>
        <WheelPicker items={DURATION_LABELS} selectedIndex={idx} onChange={(i) => onChange(DURATION_VALUES[i])} width={132} accessibilityLabel="Duration" testID="wheel-duration" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  valueRow: { flexDirection: 'row', alignItems: 'center', minHeight: 48 },
  valueBtn: { flexDirection: 'row', alignItems: 'baseline', gap: 8, minHeight: 44, paddingVertical: 6 },
  valueText: { fontSize: 26, fontWeight: '800', color: '#1F2937', fontVariant: ['tabular-nums'] },
  valueHint: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  valueInput: {
    minWidth: 170, minHeight: 44, fontSize: 22, fontWeight: '700', color: '#1F2937',
    borderWidth: 1.5, borderColor: '#3C3489', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  valueInputError: { borderColor: '#B91C1C' },
  typeHelp: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  typeHelpError: { color: '#B91C1C', fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6, marginBottom: 10 },
  chip: {
    minHeight: 36, minWidth: 52, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 12, borderRadius: 18, borderWidth: 1.5, borderColor: '#D1D5DB', backgroundColor: '#FFFFFF',
  },
  chipOn: { backgroundColor: '#3C3489', borderColor: '#3C3489' },
  chipText: { fontSize: 13, fontWeight: '700', color: '#3C3489' },
  chipTextOn: { color: '#FFFFFF' },
  wheelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wheelColon: { fontSize: 28, fontWeight: '700', color: '#374151', marginBottom: 4 },
});
