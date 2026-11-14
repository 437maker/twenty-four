// HomeScreen.tsx — Main dashboard.
// Sprint 1: Nova, streak, treats, care bar.
// Sprint 2: Celebration modal (confetti + Nova), streak-broke message, weekly box
//           modal, shield-consumed message, Plan Tomorrow card, Google sync on focus.
// Redesign (Nov 2026): compact yard scene (30% of screen) with drifting clouds,
//           day/night sky, five yard stages driven by owned House items,
//           a daily balance score next to Nova, overflow segments on the
//           pillar bars, separate colors for streak / Care / treats, and
//           animations built only on React Native's Animated API (works in Expo Go).
//
// Animation map (each one is explained in detail where it is defined):
//   1. Clouds         — slow, endless drift across the sky          → Cloud
//   2. Day / night    — sky crossfades to #2D4A7A after 10pm          → YardHeader
//   3. Yard stage     — 700ms crossfade when the house upgrades       → YardHeader
//   4. Companion      — the animated Maltese (breathing, blinking,
//                       wagging, hopping). Lives in components/companion → NovaSprite
//   6. Bars filling   — staggered fill each time Home comes into view → PillarBar
//   7. Streak pulse   — pop + expanding halo when the streak goes up  → StreakBadge
//   (kept) Treat bounce when treats increase, confetti in the milestone modal.
//
// Almost everything uses useNativeDriver: true, so animations run on the native
// UI thread and stay smooth while JavaScript is busy (SQLite reads, Google sync).
// The native driver can only animate `transform` and `opacity`, so the bars
// fill with scaleX (a transform) rather than animating width.
//
// All looping motion turns off when the phone's "Reduce Motion" setting is on.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Dimensions,
  Easing,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect, useIsFocused, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppStore } from '../store/useAppStore';
import NovaCompanion from '../components/NovaCompanion';
import Companion from '../components/companion/Companion';
import type { Equipped } from '../components/companion/items/itemSlots';
import { useCompanionLook } from '../components/companion/useCompanionLook';
import { getHouse } from '../components/companion/houses';
import type { HouseDef } from '../components/companion/houses';
import { HouseScene, NIGHT_TINT, dogFrame, skyColor } from '../components/companion/houses/HouseScene';
import { sceneFit } from '../components/companion/houses/types';
import RenameCompanionModal from '../components/RenameCompanionModal';
import BreedPickerScreen from './BreedPickerScreen';
import SettingsScreen from './SettingsScreen';
import { getTodayString, shiftDateString } from '../utils/dateHelpers';
import { calculatePlanAdherence, getHoursPerPillar, weeklyBoxLabel } from '../utils/calculations';
import { getOwnedItems, getTasksForDate } from '../db/queries';
import { getCatalogItem } from '../data/shopCatalog';
import { NovaState, Pillar } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens
// ─────────────────────────────────────────────────────────────────────────────
// Streak, Care, and treats used to be three similar oranges. Now:
//   • Care pillar  → amber     #D97706  (pillar color, unchanged)
//   • Streak badge → rose red  #E11D48  ("fire" without being orange)
//   • Treat card   → pink      #FDF2F8 card / #BE185D accent (reward color)
const COLORS = {
  background: '#FFFBF5',
  skyDay: '#B5D4F4',
  skyNight: '#2D4A7A',
  grassDay: '#8BC98A',
  grassNight: '#3E6B4C',
  ink: '#1F2937',
  inkSoft: '#6B7280',
  track: '#EEE9E2',

  work: '#3C3489',
  personal: '#1D9E75',
  care: '#D97706',
  sleep: '#185FA5',

  streak: '#E11D48',
  treatCard: '#FDF2F8',
  treatBorder: '#FBCFE8',
  treatAccent: '#BE185D',
  brand: '#3C3489',
};

const CELEBRATION_MS = 5000; // Nova celebrates in the yard for 5 seconds
const NIGHT_START_HOUR = 22; // sky turns dark and Nova sleeps after 10pm
const NIGHT_END_HOUR = 7;    // ...until 7am (same wake time as before)

const SCREEN_W = Dimensions.get('window').width;
const CONFETTI_COLORS = ['#E11D48', '#3C3489', '#1D9E75', '#185FA5', '#D97706', '#EC4899', '#10B981', '#6366F1'];
const CONFETTI_DATA = Array.from({ length: 15 }, (_, i) => ({
  x: (i / 15) * SCREEN_W + Math.random() * (SCREEN_W / 15),
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  size: 8 + (i % 5) * 3,
}));

type RootTabParamList = {
  Home: undefined;
  Schedule: undefined;
  Analytics: undefined;
  Journal: undefined;
  Shop: undefined;
};

interface PillarRow {
  key: Pillar;
  label: string;
  color: string;
  logged: number;
  target: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers (exported so they can be unit-tested in __tests__)
// ─────────────────────────────────────────────────────────────────────────────

// Daily balance score, 0–100.
// Each pillar earns up to 1 point for reaching its target. Going OVER earns
// nothing extra and costs half a point per 100% overflow, so 12h of Work on an
// 8h target lowers balance instead of raising it. Score = average of active pillars.
export function calculateBalanceScore(rows: { logged: number; target: number }[]): number {
  const active = rows.filter((r) => r.target > 0);
  if (active.length === 0) return 0;
  const total = active.reduce((sum, r) => {
    const reached = Math.min(r.logged, r.target) / r.target;
    const overflow = Math.max(0, r.logged - r.target) / r.target;
    return sum + Math.max(0, reached - 0.5 * Math.min(overflow, 1));
  }, 0);
  return Math.round((total / active.length) * 100);
}

// Yard stage 0–4 from the highest-tier House item owned.
// No house = stage 0 (starter doghouse); tier 1–4 = stages 1–4; tier 5 stays 4.
// Which house tier the yard should show. If the user picked a house with
// "Show in yard" and still owns it, that one wins. Otherwise the best house
// owned (0 = none).
export function houseTierToShow(ownedItemIds: string[], shownHouse: string | null): number {
  if (shownHouse && ownedItemIds.includes(shownHouse)) {
    const chosen = getCatalogItem(shownHouse);
    if (chosen?.category === 'house') return chosen.tier;
  }
  return ownedItemIds.reduce((max, id) => {
    const item = getCatalogItem(id);
    return item?.category === 'house' ? Math.max(max, item.tier) : max;
  }, 0);
}

// Which house the yard draws: the one picked with "Show in yard" if it is
// still owned, otherwise the best house owned (highest tier, then highest
// price). null = no house owned, so the yard shows the starter doghouse.
export function houseToShow(ownedItemIds: string[], shownHouse: string | null): string | null {
  if (shownHouse && ownedItemIds.includes(shownHouse) && getCatalogItem(shownHouse)?.category === 'house') {
    return shownHouse;
  }
  let best: { id: string; tier: number; price: number } | null = null;
  for (const id of ownedItemIds) {
    const item = getCatalogItem(id);
    if (item?.category !== 'house') continue;
    if (!best || item.tier > best.tier || (item.tier === best.tier && item.price > best.price)) {
      best = { id, tier: item.tier, price: item.price };
    }
  }
  return best?.id ?? null;
}

export function yardStageFromHouseTier(maxTier: number): number {
  return Math.max(0, Math.min(4, maxTier));
}

export function isNightTime(date: Date): boolean {
  const h = date.getHours();
  return h >= NIGHT_START_HOUR || h < NIGHT_END_HOUR;
}

// Mix a hex color with white (0 = original, 1 = white). Used for overflow segments.
function tint(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

function formatHours(h: number): string {
  return Number.isInteger(h) ? `${h}` : h.toFixed(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────────────────────

function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => sub.remove();
  }, []);
  return reduce;
}

// Re-checks the clock every minute so the sky darkens at 10pm while the app is open.
function useIsNight(): boolean {
  const [night, setNight] = useState(() => isNightTime(new Date()));
  useEffect(() => {
    const id = setInterval(() => setNight(isNightTime(new Date())), 60_000);
    return () => clearInterval(id);
  }, []);
  return night;
}

// Calls onChange(prev, next) only when `value` actually changes — never on the
// first render. The previous value lives in a ref, so unrelated re-renders
// (store updates, sync finishing) can't cancel an animation mid-flight.
function useOnChange<T>(value: T, onChange: (prev: T, next: T) => void | (() => void)) {
  const last = useRef(value);
  const cb = useRef(onChange);
  cb.current = onChange;
  useEffect(() => {
    const prev = last.current;
    last.current = value;
    if (prev === value) return;
    return cb.current(prev, value);
  }, [value]);
}

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATION 1 — Drifting clouds
// ─────────────────────────────────────────────────────────────────────────────
// `progress` goes 0 → 1 and is interpolated to an X position from just off the
// left edge to just off the right edge. Easing.linear keeps the speed constant.
// Clouds start part-way across (startAt) so the sky is never empty on open:
// the first leg covers only the remaining distance in proportionally less time,
// then Animated.loop repeats full 0 → 1 trips forever at the same speed.
function Cloud({
  top, scale, durationMs, startAt, skyWidth, night, reduceMotion,
}: {
  top: number; scale: number; durationMs: number; startAt: number;
  skyWidth: number; night: boolean; reduceMotion: boolean;
}) {
  const progress = useRef(new Animated.Value(startAt)).current;
  const cloudWidth = 90 * scale;

  useEffect(() => {
    if (reduceMotion) return;
    let loop: Animated.CompositeAnimation | null = null;
    const firstLeg = Animated.timing(progress, {
      toValue: 1,
      duration: durationMs * (1 - startAt),
      easing: Easing.linear,
      useNativeDriver: true,
    });
    firstLeg.start(({ finished }) => {
      if (!finished) return;
      progress.setValue(0);
      loop = Animated.loop(
        Animated.timing(progress, { toValue: 1, duration: durationMs, easing: Easing.linear, useNativeDriver: true }),
      );
      loop.start();
    });
    return () => {
      firstLeg.stop();
      loop?.stop();
    };
  }, [reduceMotion, durationMs, startAt, progress]);

  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [-cloudWidth, skyWidth] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.cloud,
        { top, width: cloudWidth, height: 34 * scale, opacity: night ? 0.3 : 0.92 },
        { transform: [{ translateX }] },
      ]}
    >
      <View style={[styles.puff, { left: 0, top: 12 * scale, width: 36 * scale, height: 22 * scale }]} />
      <View style={[styles.puff, { left: 22 * scale, top: 0, width: 42 * scale, height: 34 * scale }]} />
      <View style={[styles.puff, { left: 52 * scale, top: 10 * scale, width: 38 * scale, height: 24 * scale }]} />
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Yard art — five stages drawn with plain Views
// ─────────────────────────────────────────────────────────────────────────────
// 0: starter doghouse · 1: painted doghouse + bowl · 2: bigger house + flowers
// 3: + trees and fence · 4: full house with garden, pool, and trees.
// Replace any piece with your Canva art later; the crossfade logic stays the same.
function YardStageArt({ stage, night }: { stage: number; night: boolean }) {
  const wood = stage === 0 ? '#A47148' : '#C0843F';
  const roof = stage === 0 ? '#7A4E2D' : '#B4472E';
  const houseW = stage >= 4 ? 120 : stage >= 2 ? 92 : 76;
  const houseH = stage >= 4 ? 70 : stage >= 2 ? 54 : 46;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[styles.ground, { backgroundColor: night ? COLORS.grassNight : COLORS.grassDay }]} />
      {stage >= 3 && (
        <>
          <View style={[styles.treeTop, { right: 14, bottom: '44%' }]} />
          <View style={[styles.treeTrunk, { right: 33, bottom: '34%' }]} />
        </>
      )}
      <View style={[styles.houseWrap, { width: houseW }]}>
        {/* Roof: a triangle made with the CSS border trick */}
        <View
          style={{
            width: 0, height: 0,
            borderLeftWidth: houseW / 2 + 8, borderRightWidth: houseW / 2 + 8,
            borderBottomWidth: houseH * 0.6,
            borderLeftColor: 'transparent', borderRightColor: 'transparent',
            borderBottomColor: roof,
          }}
        />
        <View style={{ width: houseW, height: houseH, backgroundColor: wood, borderRadius: 4, alignItems: 'center', justifyContent: 'flex-end' }}>
          <View style={{ width: houseW * 0.34, height: houseH * 0.62, backgroundColor: '#3B2414', borderTopLeftRadius: 20, borderTopRightRadius: 20 }} />
        </View>
      </View>
      {stage >= 1 && <View style={styles.bowl} />}
      {stage >= 2 && (
        <View style={styles.flowers}>
          {['#F472B6', '#FBBF24', '#F87171', '#A78BFA', '#F472B6'].map((c, i) => (
            <View key={i} style={[styles.flower, { backgroundColor: c }]} />
          ))}
        </View>
      )}
      {stage >= 3 && <View style={styles.fence} />}
      {stage >= 4 && <View style={styles.pool} />}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// The companion in the yard — ANIMATION 4
// ─────────────────────────────────────────────────────────────────────────────
// The animated Maltese from components/companion. She breathes, blinks, wags,
// hops when happy, and curls up at night. All of that motion is driven by
// Reanimated on the UI thread inside <Companion>; this wrapper only passes the
// state, breed, and equipped items down. Tapping her plays the tap reaction
// (squash, heart, haptic), stroking her head for a second makes her lean in,
// and pressing and holding opens "Choose your dog".
function NovaSprite({
  state, size, reduceMotion, name, breed, equipped, onLongPress,
}: {
  state: NovaState; size: number; reduceMotion: boolean; name: string;
  breed: string; equipped: Equipped; onLongPress: () => void;
}) {
  return (
    <Companion
      state={state}
      size={size}
      reduceMotion={reduceMotion}
      breed={breed}
      equipped={equipped}
      label={`${name} is ${state}. Tap to pet. Press and hold to choose a different dog.`}
      onPress={noop}
      onLongPress={onLongPress}
    />
  );
}
function noop() {}

// ─────────────────────────────────────────────────────────────────────────────
// Yard header — ANIMATIONS 2 (night crossfade) and 3 (yard stage crossfade)
// ─────────────────────────────────────────────────────────────────────────────
// Night: a dark-blue sky layer sits over the day sky at opacity 0 and fades to 1
// over 900ms at 10pm, so the sky dims instead of snapping.
// Yard stage: when the stage changes, the OLD yard stays drawn underneath while
// the NEW yard fades in on top (opacity 0 → 1, 700ms). Then the old layer is removed.
function YardHeader({
  height, width, stage, house, night, novaState, balanceScore, reduceMotion, onSettings, companionName, breed, equipped, onLongPressDog,
}: {
  height: number; width: number; stage: number; house: HouseDef | null; night: boolean; novaState: NovaState;
  balanceScore: number; reduceMotion: boolean; onSettings: () => void;
  companionName: string; breed: string; equipped: Equipped; onLongPressDog: () => void;
}) {
  const nightOpacity = useRef(new Animated.Value(night ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(nightOpacity, {
      toValue: night ? 1 : 0,
      duration: reduceMotion ? 0 : 900,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [night, reduceMotion, nightOpacity]);

  const [shownStage, setShownStage] = useState(stage);
  const [fadingFrom, setFadingFrom] = useState<number | null>(null);
  const stageOpacity = useRef(new Animated.Value(1)).current;
  useOnChange(stage, (prev, next) => {
    setFadingFrom(prev);   // keep the old yard underneath
    setShownStage(next);
    stageOpacity.setValue(0); // new yard starts invisible...
    const fade = Animated.timing(stageOpacity, {
      toValue: 1,             // ...and fades in on top
      duration: reduceMotion ? 0 : 700,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    fade.start(() => setFadingFrom(null));
  });

  const clouds = useMemo(
    () => [
      { top: height * 0.08, scale: 0.9, durationMs: 48_000, startAt: 0.2 },
      { top: height * 0.22, scale: 0.65, durationMs: 70_000, startAt: 0.65 },
      { top: height * 0.03, scale: 0.5, durationMs: 90_000, startAt: 0.9 },
    ],
    [height],
  );

  const novaSize = Math.min(150, height * 0.62);

  // ── The owned house: its own backdrop, drawn over the default yard ──
  // When the house changes, the old one stays underneath while the new one
  // fades in on top (700ms), the same way the yard stages crossfade.
  const focused = useIsFocused();
  const fit = useMemo(() => sceneFit(width, height), [width, height]);
  const [shownHouse, setShownHouse] = useState<HouseDef | null>(house);
  const [fromHouse, setFromHouse] = useState<HouseDef | null>(null);
  const [houseFading, setHouseFading] = useState(false);
  const houseOpacity = useRef(new Animated.Value(1)).current;
  useOnChange(house?.id ?? null, () => {
    setFromHouse(shownHouse);
    setShownHouse(house);
    setHouseFading(true);
    houseOpacity.setValue(0);
    Animated.timing(houseOpacity, {
      toValue: 1,
      duration: reduceMotion ? 0 : 700,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      setFromHouse(null);
      setHouseFading(false);
    });
  });
  // The default yard is only drawn when it can be seen.
  const showDefault = !shownHouse || (houseFading && !fromHouse);
  const dogBox = shownHouse ? dogFrame(fit, shownHouse.dog) : null;

  return (
    <View style={[styles.yard, { height }]}>
      {showDefault && (
        <>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.skyDay }]} />
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.skyNight, opacity: nightOpacity }]} />
          <View style={[styles.celestial, night ? styles.moon : styles.sun]} />

          {clouds.map((c, i) => (
            <Cloud key={i} {...c} skyWidth={width} night={night} reduceMotion={reduceMotion} />
          ))}

          {fadingFrom !== null && <YardStageArt stage={fadingFrom} night={night} />}
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: stageOpacity }]} pointerEvents="none">
            <YardStageArt stage={shownStage} night={night} />
          </Animated.View>
        </>
      )}

      {fromHouse && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <HouseScene def={fromHouse} width={width} height={height} reduceMotion paused night={night} />
        </View>
      )}
      {shownHouse && (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: houseOpacity }]} pointerEvents="none">
          <HouseScene def={shownHouse} width={width} height={height} reduceMotion={reduceMotion} paused={!focused} night={night} />
        </Animated.View>
      )}

      {/* Nova in front of the house */}
      <View style={dogBox ? { position: 'absolute', left: dogBox.left, top: dogBox.top } : [styles.novaSpot, { bottom: height * 0.02 }]}>
        <NovaSprite
          state={novaState}
          size={dogBox ? dogBox.size : novaSize}
          reduceMotion={reduceMotion}
          name={companionName}
          breed={breed}
          equipped={equipped}
          onLongPress={onLongPressDog}
        />
      </View>

      {/* Compact balance score next to Nova */}
      <BalanceChip score={balanceScore} />

      {/* Settings gear (kept from the old header) */}
      <TouchableOpacity style={styles.gearBtn} onPress={onSettings} accessibilityLabel="Open settings">
        <Text style={styles.gearIcon}>⚙️</Text>
      </TouchableOpacity>
    </View>
  );
}

function BalanceChip({ score }: { score: number }) {
  const color = score >= 75 ? COLORS.personal : score >= 45 ? COLORS.work : COLORS.inkSoft;
  return (
    <View style={styles.balanceChip} accessible accessibilityLabel={`Balance score ${score} out of 100`}>
      <Text style={[styles.balanceValue, { color }]}>{score}</Text>
      <Text style={styles.balanceLabel}>balance</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATION 7 — Streak badge pulse (only when the streak goes UP)
// ─────────────────────────────────────────────────────────────────────────────
// Replaces the old always-on pulse loop. On an increase:
//   • the badge pops to 1.22× (ease-out-back) and springs back to 1×, and
//   • a halo ring behind it grows 1× → 1.9× while fading 0.45 → 0.
// They run in parallel, both on the native thread.
function StreakBadge({ streak, reduceMotion, onPress }: { streak: number; reduceMotion: boolean; onPress: () => void }) {
  const pop = useRef(new Animated.Value(1)).current;
  const halo = useRef(new Animated.Value(0)).current;

  useOnChange(streak, (prev, next) => {
    if (next <= prev || reduceMotion) return;
    halo.setValue(0);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(pop, { toValue: 1.22, duration: 160, easing: Easing.out(Easing.back(2)), useNativeDriver: true }),
        Animated.spring(pop, { toValue: 1, friction: 4, tension: 160, useNativeDriver: true }),
      ]),
      Animated.timing(halo, { toValue: 1, duration: 650, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  });

  const haloScale = halo.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] });
  const haloOpacity = halo.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.45, 0] });

  return (
    <TouchableOpacity onPress={onPress} accessibilityLabel={`${streak} day streak. Open analytics`}>
      <View style={styles.streakWrap}>
        <Animated.View pointerEvents="none" style={[styles.streakHalo, { opacity: haloOpacity, transform: [{ scale: haloScale }] }]} />
        <Animated.View style={[styles.streakBadge, { transform: [{ scale: pop }] }]}>
          <Text style={styles.streakText}>🔥 {streak} day{streak === 1 ? '' : 's'}</Text>
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATION 6 — Pillar bars filling, with an overflow segment
// ─────────────────────────────────────────────────────────────────────────────
// The bar's scale is max(target, logged):
//   • solid segment = hours up to the target (pillar color)
//   • light segment = hours PAST the target (same hue, 60% toward white) plus a
//     thin tick where the target was. Overwork reads as a signal, not "extra full".
// Each segment scales on X from 0 → 1 with transformOrigin 'left', so it grows
// from the left edge. Bars stagger by 110ms (top to bottom), and the overflow
// segment starts only after its solid segment finishes, so it "spills past" the goal.
// `playKey` changes every time Home comes into focus, which replays the fill.
function PillarBar({ row, index, playKey, reduceMotion }: { row: PillarRow; index: number; playKey: number; reduceMotion: boolean }) {
  const base = useRef(new Animated.Value(0)).current;
  const over = useRef(new Animated.Value(0)).current;

  const { logged, target, color, label } = row;
  const scaleMax = Math.max(target, logged, 0.0001);
  const basePct = (Math.min(logged, target) / scaleMax) * 100;
  const overflowHours = Math.max(0, logged - target);
  const overPct = (overflowHours / scaleMax) * 100;
  const targetPct = (target / scaleMax) * 100;

  useEffect(() => {
    if (reduceMotion) {
      base.setValue(1);
      over.setValue(1);
      return;
    }
    base.setValue(0);
    over.setValue(0);
    const anim = Animated.sequence([
      Animated.delay(index * 110),
      Animated.timing(base, { toValue: 1, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(over, { toValue: 1, duration: 380, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [playKey, reduceMotion, index, base, over]);

  return (
    <View
      style={styles.barBlock}
      accessible
      accessibilityLabel={`${label}: ${formatHours(logged)} of ${formatHours(target)} hours${overflowHours > 0 ? `, ${formatHours(overflowHours)} over target` : ''}`}
    >
      <View style={styles.barRow}>
        <View style={styles.barLabelWrap}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <Text style={styles.barLabel}>{label}</Text>
        </View>
        <Text style={styles.barHours}>
          {formatHours(Math.min(logged, target))}
          <Text style={styles.barHoursSoft}> / {formatHours(target)}h</Text>
          {overflowHours > 0 && <Text style={[styles.overText, { color }]}>  +{formatHours(overflowHours)}h over</Text>}
        </Text>
      </View>
      <View style={styles.track}>
        <Animated.View
          style={[
            styles.segment,
            { left: 0, width: `${basePct}%`, backgroundColor: color },
            { transformOrigin: 'left', transform: [{ scaleX: base }] },
          ]}
        />
        {overPct > 0 && (
          <>
            <Animated.View
              style={[
                styles.segment,
                { left: `${basePct}%`, width: `${overPct}%`, backgroundColor: tint(color, 0.6) },
                { transformOrigin: 'left', transform: [{ scaleX: over }] },
              ]}
            />
            <View style={[styles.targetTick, { left: `${targetPct}%` }]} />
          </>
        )}
      </View>
    </View>
  );
}

// Confetti for the milestone modal (unchanged behavior from Sprint 2).
function ConfettiBall({ x, color, size, fallAnim }: { x: number; color: string; size: number; fallAnim: Animated.Value }) {
  const translateY = fallAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, Dimensions.get('window').height * 0.7] });
  const opacity = fallAnim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] });
  return (
    <Animated.View
      style={[styles.confetti, { left: x, width: size, height: size, borderRadius: size / 2, backgroundColor: color, transform: [{ translateY }], opacity }]}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const insets = useSafeAreaInsets();
  const { height: screenH, width: screenW } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const night = useIsNight();

  const {
    settings,
    loadTodaysTasks,
    todaysTasks,
    pendingCelebration,
    milestoneStreak,
    setPendingCelebration,
    streakJustBroke,
    setStreakJustBroke,
    pendingBoxReward,
    setPendingBoxReward,
    shieldConsumed,
    setShieldConsumed,
    syncWithGoogle,
  } = useAppStore();

  const [yesterdayAdherence, setYesterdayAdherence] = useState(0);
  const [tomorrowEmpty, setTomorrowEmpty] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [celebModalVisible, setCelebModalVisible] = useState(false);
  const [boxModalVisible, setBoxModalVisible] = useState(false);
  const [yardStage, setYardStage] = useState(0);
  const [yardHouseId, setYardHouseId] = useState<string | null>(null); // the house drawn in the yard
  const [renameVisible, setRenameVisible] = useState(false);       // tap the name
  const [breedPickerVisible, setBreedPickerVisible] = useState(false); // press and hold the dog
  const look = useCompanionLook(); // breed, equipped items, name
  const [celebratingInYard, setCelebratingInYard] = useState(false);
  const [playKey, setPlayKey] = useState(0); // bumps on each focus → replays bar fill

  const today = getTodayString();
  const tomorrow = shiftDateString(today, 1);
  const yesterday = shiftDateString(today, -1); // local date (old code used UTC)

  const loadAll = useCallback(async () => {
    await loadTodaysTasks(today);
    const [yTasks, tmrTasks, owned] = await Promise.all([
      getTasksForDate(yesterday),
      getTasksForDate(tomorrow),
      getOwnedItems(),
    ]);
    setYesterdayAdherence(calculatePlanAdherence(yTasks));
    setTomorrowEmpty(tmrTasks.length === 0);

    // Yard stage follows the house chosen in the Shop ("Show in yard"), or
    // the best House item owned if none was chosen.
    const shownHouse = useAppStore.getState().settings?.shown_house ?? null;
    const ownedIds = owned.map((o) => o.item_id);
    setYardStage(yardStageFromHouseTier(houseTierToShow(ownedIds, shownHouse)));
    setYardHouseId(houseToShow(ownedIds, shownHouse));
    setPlayKey((k) => k + 1);

    // Google Calendar sync: no-op if not connected; reload today when done.
    syncWithGoogle().then(() => loadTodaysTasks(today));
  }, [today, yesterday, tomorrow, loadTodaysTasks, syncWithGoogle]);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll]),
  );

  async function onRefresh() {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }

  // ── Milestone: modal with confetti + Nova celebrates in the yard for 5s ──
  const fallAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!pendingCelebration) return;
    setCelebModalVisible(true);
    setCelebratingInYard(true);
    fallAnim.setValue(0);
    Animated.timing(fallAnim, { toValue: 1, duration: 2800, useNativeDriver: true }).start();
    const id = setTimeout(() => setCelebratingInYard(false), CELEBRATION_MS);
    return () => clearTimeout(id);
  }, [pendingCelebration, fallAnim]);

  useEffect(() => {
    if (pendingBoxReward) setBoxModalVisible(true);
  }, [pendingBoxReward]);

  useEffect(() => {
    if (!streakJustBroke) return;
    const t = setTimeout(() => setStreakJustBroke(false), 4000);
    return () => clearTimeout(t);
  }, [streakJustBroke, setStreakJustBroke]);

  useEffect(() => {
    if (!shieldConsumed) return;
    const t = setTimeout(() => setShieldConsumed(false), 4500);
    return () => clearTimeout(t);
  }, [shieldConsumed, setShieldConsumed]);

  // ── Treat count bounce (kept from Sprint 2) ──
  const treatBounce = useRef(new Animated.Value(1)).current;
  const treatCount = settings?.treat_count ?? 0;
  useOnChange(treatCount, (prev, next) => {
    if (next <= prev || reduceMotion) return;
    Animated.sequence([
      Animated.spring(treatBounce, { toValue: 1.25, useNativeDriver: true, friction: 3 }),
      Animated.spring(treatBounce, { toValue: 1, useNativeDriver: true, friction: 4 }),
    ]).start();
  });

  // ── Derived values ──
  const name = settings?.companion_name ?? 'Nova';
  const streak = settings?.current_streak ?? 0;
  const shieldsOwned = settings?.shields_owned ?? 0;
  const careEnabled = settings?.care_enabled ?? false;
  const doneCount = todaysTasks.filter((t) => t.completed).length;
  const logged = getHoursPerPillar(todaysTasks);

  const rows: PillarRow[] = [
    { key: 'work', label: 'Work', color: COLORS.work, logged: logged.work, target: settings?.work_target_hours ?? 8 },
    { key: 'personal', label: 'Personal', color: COLORS.personal, logged: logged.personal, target: settings?.personal_target_hours ?? 6 },
    ...(careEnabled
      ? [{ key: 'care' as const, label: 'Care', color: COLORS.care, logged: logged.care, target: settings?.care_target_hours ?? 2 }]
      : []),
    { key: 'sleep', label: 'Sleep', color: COLORS.sleep, logged: logged.sleep, target: settings?.sleep_target_hours ?? 8 },
  ];
  const balanceScore = calculateBalanceScore(rows);

  // Priority: celebrating > sleeping > happy > idle
  const novaState: NovaState = celebratingInYard
    ? 'celebrating'
    : night
      ? 'sleeping'
      : doneCount > 0 || streak >= 3
        ? 'happy'
        : 'idle';

  // The house in the yard, and the sky color behind the status bar.
  const yardHouse = getHouse(yardHouseId);
  const topColor = yardHouse ? skyColor(yardHouse) : night ? COLORS.skyNight : COLORS.skyDay;

  const milestoneTreats = milestoneStreak === 7 ? 15 : milestoneStreak === 30 ? 35 : milestoneStreak === 100 ? 70 : 130;

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 28 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brand} />}
      >
        {/* Status-bar area takes the sky color so the yard reaches the top edge */}
        <View style={{ height: insets.top, backgroundColor: topColor }}>
          {yardHouse && night && !yardHouse.dark && <View style={[StyleSheet.absoluteFill, { backgroundColor: NIGHT_TINT }]} />}
        </View>

        <YardHeader
          height={Math.round(screenH * 0.3)}
          width={screenW}
          stage={yardStage}
          house={yardHouse}
          night={night}
          novaState={novaState}
          balanceScore={balanceScore}
          reduceMotion={reduceMotion}
          companionName={name}
          breed={look.breed}
          equipped={look.equipped}
          onLongPressDog={() => setBreedPickerVisible(true)}
          onSettings={() => setSettingsVisible(true)}
        />

        {/* Name + streak + yesterday's adherence */}
        <View style={styles.identityRow}>
          {/* Tap the name to rename her */}
          <TouchableOpacity
            style={styles.nameButton}
            onPress={() => setRenameVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={`${name}. Tap to rename.`}
            testID="home-name"
          >
            <Text style={styles.novaName} numberOfLines={1}>{name}</Text>
            <Text style={styles.nameEdit}>✎</Text>
          </TouchableOpacity>
          <View style={styles.badges}>
            {/* Streak Shields in stock: each one saves the streak for one missed day */}
            {shieldsOwned > 0 && (
              <View
                style={styles.shieldBadge}
                accessible
                accessibilityLabel={`${shieldsOwned} streak ${shieldsOwned === 1 ? 'shield' : 'shields'}`}
                testID="home-shield-badge"
              >
                <Text style={styles.shieldBadgeText}>🛡️ {shieldsOwned}</Text>
              </View>
            )}
            {streak > 0 && (
              <StreakBadge streak={streak} reduceMotion={reduceMotion} onPress={() => navigation.navigate('Analytics')} />
            )}
            <TouchableOpacity style={styles.adherenceBadge} onPress={() => navigation.navigate('Analytics')}>
              <Text style={styles.adherenceText}>Yesterday {yesterdayAdherence}%</Text>
            </TouchableOpacity>
          </View>
        </View>

        {streakJustBroke && (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>Streaks are made to be rebuilt. Let's plan today. 🐾</Text>
          </View>
        )}
        {shieldConsumed && (
          <View style={[styles.banner, styles.shieldBanner]}>
            <Text style={styles.shieldBannerText}>🛡️ Streak Shield activated! Your streak is safe.</Text>
          </View>
        )}

        {/* Pillar bars (tap → Schedule). Task count lives in the header to save space. */}
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Schedule')} activeOpacity={0.85}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Today's balance</Text>
            <Text style={styles.cardMeta}>
              {todaysTasks.length === 0 ? 'No tasks yet →' : `${doneCount}/${todaysTasks.length} tasks →`}
            </Text>
          </View>
          {rows.map((row, i) => (
            <PillarBar key={row.key} row={row} index={i} playKey={playKey} reduceMotion={reduceMotion} />
          ))}
        </TouchableOpacity>

        {/* Treat card (tap → Shop) */}
        <TouchableOpacity style={styles.treatCard} onPress={() => navigation.navigate('Shop')} activeOpacity={0.85}>
          <Animated.Text style={[styles.treatIcon, { transform: [{ scale: treatBounce }] }]}>🦴</Animated.Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.treatCount}>
              {treatCount} treats{shieldsOwned > 0 ? `  ·  🛡️ ${shieldsOwned}` : ''}
            </Text>
            <Text style={styles.treatHint}>Spend them on {name}'s yard and outfits</Text>
          </View>
          <View style={styles.shopButton}>
            <Text style={styles.shopButtonText}>Shop →</Text>
          </View>
        </TouchableOpacity>

        {tomorrowEmpty && (
          <TouchableOpacity style={[styles.card, styles.tomorrowCard]} onPress={() => navigation.navigate('Schedule')} activeOpacity={0.85}>
            <Text style={styles.tomorrowTitle}>📅 Plan Tomorrow</Text>
            <Text style={styles.tomorrowSub}>Tomorrow has no tasks yet. Get ahead of your day!</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <SettingsScreen visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
      <RenameCompanionModal visible={renameVisible} onClose={() => setRenameVisible(false)} />
      <BreedPickerScreen visible={breedPickerVisible} onClose={() => setBreedPickerVisible(false)} />

      {/* Streak milestone modal */}
      <Modal
        visible={celebModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => {
          setCelebModalVisible(false);
          setPendingCelebration(false);
        }}
      >
        <View style={styles.celebOverlay}>
          {CONFETTI_DATA.map((ball, i) => (
            <ConfettiBall key={i} {...ball} fallAnim={fallAnim} />
          ))}
          <View style={styles.celebCard}>
            <NovaCompanion state="celebrating" name={name} size={140} reduceMotion={reduceMotion} />
            <Text style={styles.celebTitle}>🎉 {milestoneStreak}-Day Streak!</Text>
            <Text style={styles.celebSubtitle}>{name} is so proud of you!</Text>
            <View style={styles.celebBonus}>
              <Text style={styles.celebBonusText}>+{milestoneTreats} treats! 🦴</Text>
            </View>
            <TouchableOpacity
              style={styles.celebBtn}
              onPress={() => {
                setCelebModalVisible(false);
                setPendingCelebration(false);
              }}
            >
              <Text style={styles.celebBtnText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Weekly accuracy box modal */}
      <Modal
        visible={boxModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setBoxModalVisible(false);
          setPendingBoxReward(null);
        }}
      >
        <View style={styles.celebOverlay}>
          <View style={styles.celebCard}>
            <NovaCompanion state="happy" name={name} size={120} reduceMotion={reduceMotion} />
            <Text style={styles.celebTitle}>{weeklyBoxLabel(pendingBoxReward?.tier ?? 'basic')}</Text>
            <Text style={styles.celebSubtitle}>Last week's adherence: {pendingBoxReward?.adherence ?? 0}%</Text>
            <Text style={styles.boxDescription}>
              {pendingBoxReward?.tier === 'gold'
                ? 'Outstanding! You crushed your goals last week.'
                : pendingBoxReward?.tier === 'silver'
                  ? 'Great effort! You stayed consistent last week.'
                  : "Good start! Let's aim higher this week."}
            </Text>
            <View style={styles.celebBonus}>
              <Text style={styles.celebBonusText}>+{pendingBoxReward?.treats ?? 0} treats! 🦴</Text>
            </View>
            <TouchableOpacity
              style={styles.celebBtn}
              onPress={() => {
                setBoxModalVisible(false);
                setPendingBoxReward(null);
              }}
            >
              <Text style={styles.celebBtnText}>Claim</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: COLORS.background },

  // Yard
  yard: { width: '100%', overflow: 'hidden' },
  ground: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '38%', borderTopLeftRadius: 40, borderTopRightRadius: 40 },
  celestial: { position: 'absolute', top: 14, right: 60, width: 28, height: 28, borderRadius: 14 },
  sun: { backgroundColor: '#FDE68A' },
  moon: { backgroundColor: '#F1F5F9', opacity: 0.9 },
  cloud: { position: 'absolute', left: 0 },
  puff: { position: 'absolute', backgroundColor: '#FFFFFF', borderRadius: 999 },
  houseWrap: { position: 'absolute', bottom: '24%', right: '8%', alignItems: 'center' },
  bowl: { position: 'absolute', bottom: '10%', right: '40%', width: 22, height: 9, borderRadius: 6, backgroundColor: '#E11D48' },
  flowers: { position: 'absolute', bottom: '7%', right: '5%', flexDirection: 'row', gap: 6 },
  flower: { width: 9, height: 9, borderRadius: 5 },
  fence: { position: 'absolute', bottom: '37%', left: 0, right: 0, height: 5, backgroundColor: '#F5E6CC', opacity: 0.85 },
  pool: { position: 'absolute', bottom: '4%', right: '22%', width: 64, height: 16, borderRadius: 10, backgroundColor: '#60A5FA', borderWidth: 2, borderColor: '#E0F2FE' },
  treeTop: { position: 'absolute', width: 40, height: 40, borderRadius: 20, backgroundColor: '#2F855A' },
  treeTrunk: { position: 'absolute', width: 7, height: 22, backgroundColor: '#7A4E2D' },
  novaSpot: { position: 'absolute', left: '18%' },

  balanceChip: {
    position: 'absolute', left: 12, top: 12,
    backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 14,
    paddingVertical: 5, paddingHorizontal: 10, alignItems: 'center',
  },
  balanceValue: { fontSize: 20, fontWeight: '800', lineHeight: 22 },
  balanceLabel: { fontSize: 10, fontWeight: '700', color: COLORS.inkSoft, textTransform: 'uppercase', letterSpacing: 0.6 },
  gearBtn: { position: 'absolute', top: 8, right: 10, width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  gearIcon: { fontSize: 22 },

  // Identity row
  identityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  nameButton: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, minHeight: 44, paddingRight: 8 },
  novaName: { fontSize: 22, fontWeight: '800', color: COLORS.ink, flexShrink: 1 },
  nameEdit: { fontSize: 15, color: COLORS.inkSoft, marginLeft: 6 },
  shieldBadge: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  shieldBadgeText: { color: '#1D4ED8', fontWeight: '800', fontSize: 13 },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  streakWrap: { alignItems: 'center', justifyContent: 'center' },
  streakHalo: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, borderRadius: 20, backgroundColor: COLORS.streak },
  streakBadge: { backgroundColor: COLORS.streak, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  streakText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  adherenceBadge: { backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  adherenceText: { color: COLORS.work, fontWeight: '700', fontSize: 12 },

  // Banners
  banner: { marginHorizontal: 16, marginTop: 8, backgroundColor: '#F3F4F6', borderRadius: 12, padding: 12, borderLeftWidth: 3, borderLeftColor: '#9CA3AF' },
  bannerText: { fontSize: 14, color: COLORS.inkSoft, lineHeight: 20 },
  shieldBanner: { backgroundColor: '#EFF6FF', borderLeftColor: '#3B82F6' },
  shieldBannerText: { fontSize: 14, color: '#1D4ED8', lineHeight: 20 },

  // Cards
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 20, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 8,
    marginHorizontal: 16, marginTop: 8,
    shadowColor: '#7C5E3C', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: COLORS.ink },
  cardMeta: { fontSize: 12, fontWeight: '600', color: COLORS.inkSoft },

  // Pillar bars
  barBlock: { marginVertical: 6 },
  barRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  barLabelWrap: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 7 },
  barLabel: { fontSize: 14, fontWeight: '700', color: '#374151' },
  barHours: { fontSize: 13, fontWeight: '700', color: COLORS.ink },
  barHoursSoft: { fontWeight: '500', color: COLORS.inkSoft },
  overText: { fontSize: 12, fontWeight: '700' },
  track: { height: 12, backgroundColor: COLORS.track, borderRadius: 6, overflow: 'hidden' },
  segment: { position: 'absolute', top: 0, bottom: 0 },
  targetTick: { position: 'absolute', top: -1, bottom: -1, width: 2, marginLeft: -1, backgroundColor: 'rgba(31,41,55,0.55)' },

  // Treat card
  treatCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.treatCard, borderRadius: 18, padding: 14,
    marginHorizontal: 16, marginTop: 10, borderWidth: 1, borderColor: COLORS.treatBorder,
  },
  treatIcon: { fontSize: 26 },
  treatCount: { fontSize: 16, fontWeight: '800', color: COLORS.treatAccent },
  treatHint: { fontSize: 12, color: '#9D174D', marginTop: 1 },
  shopButton: { backgroundColor: COLORS.treatAccent, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12 },
  shopButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },

  // Plan tomorrow
  tomorrowCard: { backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0', paddingBottom: 14 },
  tomorrowTitle: { fontSize: 16, fontWeight: '700', color: '#166534', marginBottom: 4 },
  tomorrowSub: { fontSize: 14, color: '#4B7C62', lineHeight: 20 },

  // Modals
  celebOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  confetti: { position: 'absolute', top: 0 },
  celebCard: {
    backgroundColor: '#FFFFFF', borderRadius: 24, padding: 32, width: SCREEN_W - 48, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 10,
  },
  celebTitle: { fontSize: 30, fontWeight: '800', color: COLORS.ink, textAlign: 'center', marginTop: 8 },
  celebSubtitle: { fontSize: 16, color: COLORS.inkSoft, marginTop: 6, textAlign: 'center' },
  boxDescription: { fontSize: 14, color: COLORS.inkSoft, textAlign: 'center', marginTop: 8, lineHeight: 20, paddingHorizontal: 8 },
  celebBonus: { backgroundColor: COLORS.treatCard, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 8, marginTop: 16 },
  celebBonusText: { fontSize: 18, fontWeight: '700', color: COLORS.treatAccent },
  celebBtn: { marginTop: 24, backgroundColor: COLORS.brand, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 48 },
  celebBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
});
