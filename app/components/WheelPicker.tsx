// WheelPicker.tsx — A bounded vertical scroll picker.
//
// Fixes applied (Sprint 2 bug-fix pass):
//   • bounces={false} + overScrollMode="never" — scroll stops at first/last item,
//     no infinite looping, no over-scroll bounce.
//   • Per-item solid background — selected row has a SOLID purple (#3C3489)
//     background with white text. Previous version used a sibling absolute View
//     that was hidden behind the ScrollView. Now each item styles itself directly.
//   • Single source of scrollTo — only the useEffect moves the scroll position
//     programmatically, never the onPress handler. This prevents two competing
//     animations from locking the picker after a tap.
//   • draggingRef — prevents a programmatic scrollTo from fighting a live drag.

import React, { useRef, useEffect } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

// Height of one row in pixels — also the snap interval.
const ITEM_H = 52;

// We show 3 rows at a time: the item above, the selected item, the item below.
const VISIBLE  = 3;
const PICKER_H = ITEM_H * VISIBLE; // 156 px total height

interface Props {
  items:         string[];   // display labels, e.g. ["1","2",…"12"]
  selectedIndex: number;     // which index is currently selected
  onChange:      (index: number) => void;
  width?:        number;     // column width in pixels (default 80)
}

export default function WheelPicker({ items, selectedIndex, onChange, width = 80 }: Props) {
  const scrollRef  = useRef<ScrollView>(null);

  // draggingRef  — true while the user's finger is physically touching the picker.
  // momentumRef  — true while a fling is decelerating after the finger lifts.
  // Both must be false before we allow a programmatic scrollTo from useEffect,
  // otherwise the programmatic scroll fights the live gesture and causes the
  // oscillating / locked state on fast flings.
  const draggingRef  = useRef(false);
  const momentumRef  = useRef(false);

  // ── Programmatic scroll ───────────────────────────────────────────────────────
  // Runs whenever selectedIndex changes from outside (e.g. pre-filling the edit
  // form with an existing task's start time).
  // Guarded by BOTH refs — if a drag or momentum scroll is active we skip it
  // entirely to avoid competing scroll commands.
  useEffect(() => {
    if (!draggingRef.current && !momentumRef.current) {
      const t = setTimeout(() => {
        scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_H, animated: false });
      }, 20);
      return () => clearTimeout(t);
    }
  }, [selectedIndex]);

  // ── Shared snap helper ────────────────────────────────────────────────────────
  function snapToNearest(y: number) {
    const index = Math.max(0, Math.min(Math.round(y / ITEM_H), items.length - 1));
    scrollRef.current?.scrollTo({ y: index * ITEM_H, animated: false });
    onChange(index);
  }

  // ── Scroll event handlers ─────────────────────────────────────────────────────
  function handleScrollBeginDrag() {
    draggingRef.current  = true;
    momentumRef.current  = false;
  }

  function handleMomentumScrollBegin() {
    // Finger has already lifted (onScrollEndDrag fired first) but a fling is
    // now decelerating — mark momentum active so we know NOT to snap yet.
    momentumRef.current = true;
  }

  function handleScrollEndDrag(e: any) {
    // Finger lifted. We don't know yet whether momentum will follow.
    // onMomentumScrollBegin fires in the same JS event flush (or very next tick),
    // so a 50 ms defer is plenty of time to detect it.
    draggingRef.current = false;
    const y = e.nativeEvent.contentOffset.y;
    setTimeout(() => {
      // If momentum started in the meantime, leave snapping to handleMomentumScrollEnd.
      if (!momentumRef.current) {
        snapToNearest(y);
      }
    }, 50);
  }

  function handleMomentumScrollEnd(e: any) {
    // Fling has fully decelerated — safe to snap now.
    momentumRef.current = false;
    draggingRef.current = false;
    snapToNearest(e.nativeEvent.contentOffset.y);
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { width }]}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}

        // Snap so the scroll always lands on a full item, not halfway between
        snapToInterval={ITEM_H}
        decelerationRate="fast"

        // ── The two key fixes for infinite scroll ──
        bounces={false}          // iOS:     prevents rubber-band over-scroll past ends
        overScrollMode="never"   // Android: prevents glow/stretch over-scroll past ends

        onScrollBeginDrag={handleScrollBeginDrag}
        onMomentumScrollBegin={handleMomentumScrollBegin}  // fling started
        onScrollEndDrag={handleScrollEndDrag}              // finger lifted
        onMomentumScrollEnd={handleMomentumScrollEnd}      // fling fully stopped

        // paddingVertical: ITEM_H lets the first and last items scroll into the
        // centre slot.  With padding = 52px:
        //   • scroll offset 0          → item 0 is centred
        //   • scroll offset i * 52     → item i is centred
        //   • max offset (n-1) * 52    → last item is centred, can't scroll further
        contentContainerStyle={{ paddingVertical: ITEM_H }}
        style={{ height: PICKER_H }}
      >
        {items.map((label, i) => {
          const isSelected = i === selectedIndex;
          return (
            // Tapping an item navigates directly to it.
            // We call onChange first (updates parent state → new selectedIndex prop
            // → useEffect scrolls to it).  We do NOT call scrollTo here to avoid
            // two competing scroll commands.
            <TouchableOpacity
              key={i}
              style={[
                styles.item,
                isSelected && styles.itemSelected,  // solid purple when selected
              ]}
              onPress={() => onChange(i)}
              activeOpacity={0.75}
            >
              <Text style={[
                styles.itemText,
                isSelected && styles.itemTextSelected,  // white text on purple
              ]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow:        'hidden',
    borderRadius:    12,
    backgroundColor: '#FFFFFF',
    borderWidth:     1,
    borderColor:     '#E5E7EB',
  },
  item: {
    height:          ITEM_H,
    alignItems:      'center',
    justifyContent:  'center',
    // Every unselected row has an explicit WHITE background.
    // This is important — without it, the View is transparent and whatever is
    // behind it (e.g. the modal background) bleeds through.
    backgroundColor: '#FFFFFF',
  },
  // ── SELECTED ROW: solid purple fill + white text ──────────────────────────
  // Using a solid background here (not an overlay or opacity trick) guarantees
  // the purple is visible regardless of what's behind the ScrollView.
  itemSelected: {
    backgroundColor: '#3C3489',
  },
  itemText: {
    fontSize:   20,
    color:      '#333333',   // dark text on white background
    fontWeight: '500',
  },
  itemTextSelected: {
    fontSize:   22,
    color:      '#FFFFFF',   // white text on purple background
    fontWeight: '700',
  },
});
