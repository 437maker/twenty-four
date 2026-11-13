// CustomSlider.tsx — A draggable horizontal slider built with PanResponder.
// Pure React Native — no native modules — so it works in Expo Go.
//
// PanResponder is React Native's way of tracking touch gestures.
// When a finger moves horizontally across the slider track, we calculate
// where it is as a percentage of the track width and convert that to a value.

import React, { useRef, useState } from 'react';
import {
  View,
  PanResponder,
  StyleSheet,
  GestureResponderEvent,
} from 'react-native';

const THUMB = 26; // diameter of the circular thumb handle

interface Props {
  min: number;
  max: number;
  step: number;      // e.g. 0.5 means values snap to 0.0, 0.5, 1.0 …
  value: number;
  color: string;     // fill and thumb color
  disabled?: boolean;
  onChange: (v: number) => void;
}

export default function CustomSlider({
  min, max, step, value, color, disabled = false, onChange,
}: Props) {
  // We need the pixel width of the track to convert touch position → value.
  // Using state (not ref) so the thumb re-renders when the layout is measured.
  const [trackWidth, setTrackWidth] = useState(0);

  // Clamp: keep value within [min, max].
  // Snap: round to nearest step.
  function clean(raw: number): number {
    const snapped = Math.round((raw - min) / step) * step + min;
    const clamped = Math.max(min, Math.min(max, snapped));
    return parseFloat(clamped.toFixed(1)); // avoid floating point noise like 1.0000000001
  }

  function xToValue(x: number): number {
    if (trackWidth === 0) return value;
    const ratio = Math.max(0, Math.min(1, x / trackWidth));
    return clean(ratio * (max - min) + min);
  }

  // PanResponder.create() sets up handlers for touch start, move, and release.
  const pan = useRef(
    PanResponder.create({
      // Should this responder activate? Only if not disabled.
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder:  () => !disabled,

      // User touched the track — jump to that position immediately
      onPanResponderGrant: (e: GestureResponderEvent) => {
        onChange(xToValue(e.nativeEvent.locationX));
      },

      // User is dragging — update value continuously
      onPanResponderMove: (e: GestureResponderEvent) => {
        const x = Math.max(0, Math.min(e.nativeEvent.locationX, trackWidth));
        onChange(xToValue(x));
      },
    })
  ).current;

  // Position the thumb as a fraction of the track width
  const fillRatio = max > min ? (value - min) / (max - min) : 0;
  const thumbLeft = trackWidth > 0
    ? fillRatio * (trackWidth - THUMB)
    : 0;

  return (
    // The outer View captures the layout and touch events.
    // Height 44 ensures the minimum tap target.
    <View
      style={styles.container}
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
      {...pan.panHandlers}
    >
      {/* Grey track background */}
      <View style={[styles.track, disabled && styles.trackDisabled]}>
        {/* Coloured fill from left edge to current value */}
        <View
          style={[
            styles.fill,
            { width: `${fillRatio * 100}%`, backgroundColor: color },
          ]}
        />
      </View>

      {/* Circular thumb — positioned absolutely along the track */}
      {trackWidth > 0 && (
        <View
          style={[
            styles.thumb,
            {
              left: thumbLeft,
              backgroundColor: color,
              opacity: disabled ? 0.35 : 1,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 44,
    justifyContent: 'center',
  },
  track: {
    height: 7,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  trackDisabled: {
    opacity: 0.45,
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    top: (44 - THUMB) / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 3,
  },
});
