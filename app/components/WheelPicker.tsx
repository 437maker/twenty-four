// WheelPicker.tsx — a vertical wheel for picking one value from a list.
//
// How it stays smooth
// -------------------
// The old wheel felt laggy on iPhone because it did work in JavaScript while
// the finger was moving: the highlighted row was React state, so every row
// re-rendered as the wheel turned, and JavaScript also issued its own
// scrollTo commands that fought the native snap.
//
// This one does nothing in JavaScript while it turns:
//   • The scroll position lives in a Reanimated shared value, written by a
//     scroll handler that runs on the UI thread.
//   • Each row scales, fades, and changes color from that value, also on the
//     UI thread (the way the iOS wheel does). No row re-renders.
//   • The native scroll view does the snapping (snapToInterval).
//   • React hears about it once, when the wheel has settled: onChange fires
//     when the momentum ends (or the finger lifts with no fling), never per
//     scroll event.
//   • A light haptic tick fires when the row under the highlight changes:
//     decided on the UI thread, once per row, at most one every 45 ms.

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

import { selectionTick } from './companion/haptics';

// Height of one row in pixels. Also the snap interval.
export const ITEM_H = 52;
// Three rows show: the one above, the chosen one, the one below.
const VISIBLE = 3;
const PICKER_H = ITEM_H * VISIBLE;
// The shortest time between two haptic ticks. A hard fling passes a row every
// few milliseconds; ticking for each would be a buzz, not a tick.
export const TICK_MIN_MS = 45;
// After the finger lifts, how long to wait for a fling to start before
// treating the lift as the end of the scroll.
export const SETTLE_WAIT_MS = 60;
// Rows far outside the window are detached from the view tree by the scroll
// view. Only worth it for a long wheel (the 48 durations). Set to a large
// number to turn it off.
const CLIP_FROM_ROWS = 13;

const PURPLE = '#3C3489';
const INK = '#333333';
const WHITE = '#FFFFFF';

// Which row is under the highlight at scroll offset `y`.
export function indexForOffset(y: number, count: number): number {
  'worklet';
  return Math.max(0, Math.min(count - 1, Math.round(y / ITEM_H)));
}

// Should a haptic tick fire? Once when the highlighted row changes, and not
// within TICK_MIN_MS of the last one.
export function shouldTick(prevIndex: number, nextIndex: number, lastTickAt: number, now: number): boolean {
  'worklet';
  return nextIndex !== prevIndex && now - lastTickAt >= TICK_MIN_MS;
}

interface Props {
  items: readonly string[];   // labels, e.g. ["1", "2", … "12"]
  selectedIndex: number;      // the chosen row
  onChange: (index: number) => void; // called once the wheel has settled on a new row
  width?: number;             // column width in pixels (default 80)
  // What this wheel picks, read by screen readers, e.g. "Hour".
  accessibilityLabel?: string;
  testID?: string;
}

// One row. Memoized: it renders once, and after that only its animated style
// changes, on the UI thread.
const WheelRow = React.memo(function WheelRow({
  label, index, y, onPress,
}: {
  label: string; index: number; y: SharedValue<number>; onPress: (index: number) => void;
}) {
  const boxStyle = useAnimatedStyle(() => {
    const d = Math.abs(y.value / ITEM_H - index); // rows away from the highlight
    return {
      opacity: interpolate(d, [0, 1, 2], [1, 0.5, 0.25], Extrapolation.CLAMP),
      transform: [{ scale: interpolate(d, [0, 1, 2], [1.1, 0.9, 0.78], Extrapolation.CLAMP) }],
    };
  });
  const textStyle = useAnimatedStyle(() => {
    const d = Math.abs(y.value / ITEM_H - index);
    return { color: interpolateColor(Math.min(d, 0.6), [0, 0.6], [WHITE, INK]) };
  });
  return (
    <Pressable style={styles.item} onPress={() => onPress(index)} accessible={false}>
      <Animated.View style={boxStyle}>
        <Animated.Text style={[styles.itemText, textStyle]}>{label}</Animated.Text>
      </Animated.View>
    </Pressable>
  );
});

export default function WheelPicker({
  items, selectedIndex, onChange, width = 80, accessibilityLabel, testID,
}: Props) {
  const count = items.length;
  const scrollRef = useAnimatedRef<Animated.ScrollView>();

  // ── UI-thread state ──
  const y = useSharedValue(selectedIndex * ITEM_H); // scroll offset
  const highlight = useSharedValue(selectedIndex);  // row under the highlight
  const touching = useSharedValue(0);               // 1 while the user is turning the wheel
  const lastTickAt = useSharedValue(0);

  // ── JS-thread state (refs: none of it re-renders anything) ──
  const dragging = useRef(false);
  const momentum = useRef(false);
  const settledIndex = useRef(selectedIndex); // the row the wheel is resting on
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ onChange, selectedIndex, count });
  latest.current = { onChange, selectedIndex, count };

  // Runs on the UI thread for every scroll event. Never touches React.
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      y.value = e.contentOffset.y;
      const next = indexForOffset(e.contentOffset.y, count);
      if (next === highlight.value) return;
      const now = Date.now();
      if (touching.value === 1 && shouldTick(highlight.value, next, lastTickAt.value, now)) {
        lastTickAt.value = now;
        runOnJS(selectionTick)();
      }
      highlight.value = next;
    },
  });

  // The wheel has come to rest: tell React, once.
  const settle = useCallback((offsetY: number) => {
    dragging.current = false;
    momentum.current = false;
    touching.value = 0;
    const index = indexForOffset(offsetY, latest.current.count);
    settledIndex.current = index;
    if (index !== latest.current.selectedIndex) latest.current.onChange(index);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearSettleTimer = () => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = null;
  };
  useEffect(() => clearSettleTimer, []);

  const handleBeginDrag = useCallback(() => {
    clearSettleTimer();
    dragging.current = true;
    momentum.current = false;
    touching.value = 1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const handleEndDrag = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    // The finger lifted. A fling may follow (then the momentum events take
    // over) or not (then this was the end). Wait a moment to find out.
    dragging.current = false;
    const offsetY = e.nativeEvent.contentOffset.y;
    clearSettleTimer();
    settleTimer.current = setTimeout(() => {
      settleTimer.current = null;
      if (!momentum.current && !dragging.current) settle(offsetY);
    }, SETTLE_WAIT_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settle]);
  const handleMomentumBegin = useCallback(() => {
    momentum.current = true;
    clearSettleTimer();
  }, []);
  const handleMomentumEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    clearSettleTimer();
    settle(e.nativeEvent.contentOffset.y);
  }, [settle]);

  // A new value from outside (a chip, a typed time, opening the form on an
  // existing task): turn the wheel to it. Skipped while the user is turning
  // it, and when the wheel is already there (the user just put it there).
  const first = useRef(true);
  useEffect(() => {
    const mounting = first.current;
    first.current = false;
    if (dragging.current || momentum.current) return undefined;
    if (!mounting && settledIndex.current === selectedIndex) return undefined;
    settledIndex.current = selectedIndex;
    if (mounting) y.value = selectedIndex * ITEM_H;
    const id = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_H, animated: !mounting });
    }, mounting ? 20 : 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndex]);

  // Tapping a row picks it.
  const pressRow = useCallback((index: number) => {
    if (index !== latest.current.selectedIndex) latest.current.onChange(index);
  }, []);

  const rows = useMemo(
    () => items.map((label, i) => <WheelRow key={i} label={label} index={i} y={y} onPress={pressRow} />),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, pressRow],
  );

  // Screen readers see the whole wheel as ONE "adjustable" control (like a
  // native picker): it announces "Hour, 9, adjustable" and the user swipes up
  // or down to change it, instead of stepping through every row.
  return (
    <View
      style={[styles.container, { width }]}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ text: items[selectedIndex] }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => {
        const step = event.nativeEvent.actionName === 'increment' ? 1 : -1;
        const next = Math.max(0, Math.min(count - 1, selectedIndex + step));
        if (next !== selectedIndex) onChange(next);
      }}
    >
      {/* The highlight: a fixed purple band behind the middle row. The rows
          slide over it; it never moves, so nothing has to re-render. */}
      <View pointerEvents="none" style={styles.band} />
      <Animated.ScrollView
        ref={scrollRef}
        testID={testID}
        showsVerticalScrollIndicator={false}
        // The native scroll view snaps to whole rows by itself.
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        // Stop at the first and last row: no rubber band, no glow.
        bounces={false}
        overScrollMode="never"
        nestedScrollEnabled
        scrollEventThrottle={16}
        removeClippedSubviews={count >= CLIP_FROM_ROWS}
        contentOffset={{ x: 0, y: selectedIndex * ITEM_H }}
        onScroll={onScroll}
        onScrollBeginDrag={handleBeginDrag}
        onScrollEndDrag={handleEndDrag}
        onMomentumScrollBegin={handleMomentumBegin}
        onMomentumScrollEnd={handleMomentumEnd}
        // One row of padding above and below lets the first and last rows
        // reach the middle: offset i * ITEM_H puts row i under the highlight.
        contentContainerStyle={styles.content}
        style={styles.scroll}
      >
        {rows}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: PICKER_H,
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  band: {
    position: 'absolute', left: 0, right: 0, top: ITEM_H, height: ITEM_H,
    backgroundColor: PURPLE,
  },
  scroll: { height: PICKER_H },
  content: { paddingVertical: ITEM_H },
  item: { height: ITEM_H, alignItems: 'center', justifyContent: 'center' },
  itemText: { fontSize: 20, fontWeight: '600', color: INK },
});
