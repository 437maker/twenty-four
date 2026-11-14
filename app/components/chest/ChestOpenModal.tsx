// ChestOpenModal.tsx — opens a chest on screen.
//
// What happens, in order:
//   1. The chest is opened in the DATABASE first, in one transaction
//      (openChest in db/queries.ts). By the time anything moves on screen the
//      reward is already safely stored, so closing the app mid-animation
//      loses nothing.
//   2. The animation plays: the chest shakes, the lid pops, the reward
//      floats up, and the phone gives a thump. A Gold chest also throws a
//      burst of sparkles.
//   3. A reward card says what was inside.
//
// With Reduce Motion the animation is skipped and the reward card is shown
// straight away.
//
// <ChestSvg> (the closed chest as one still picture) lives here too; the
// Shop cards use it.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import Svg, { G } from 'react-native-svg';

import { CHESTS, PITY_LIMIT, SHIELD_ID } from '../../data/chestLoot';
import type { ChestRoll, ChestTier } from '../../data/chestLoot';
import { openChest } from '../../db/queries';
import CompanionSvg, { Shapes } from '../companion/CompanionSvg';
import { thump } from '../companion/haptics';
import { getHouse } from '../companion/houses';
import { HouseStill } from '../companion/houses/HouseScene';
import { isWearable, withItem } from '../companion/items/itemSlots';
import type { Equipped } from '../companion/items/itemSlots';
import { sparkle } from '../companion/shapes';
import type { Shape } from '../companion/shapes';
import { CHEST_BOX, chestParts } from './chestArt';

const BOX = `0 0 ${CHEST_BOX} ${CHEST_BOX}`;
const fill = StyleSheet.absoluteFill;

// How long the opening takes, and when the lid pops (as a share of it).
export const CHEST_OPEN_MS = 1500;
export const LID_POP_AT = 0.58;

// ─── The closed chest, as one still picture ───────────────────────────────────
export const ChestSvg = React.memo(function ChestSvg({ tier, size }: { tier: ChestTier; size: number }) {
  const parts = useMemo(() => chestParts(tier), [tier]);
  return (
    <Svg width={size} height={size} viewBox={BOX} testID={`chest-svg-${tier}`}>
      <G><Shapes list={parts.body} /></G>
      <G><Shapes list={parts.lid} /></G>
    </Svg>
  );
});

const Layer = React.memo(function Layer({ shapes, size, viewBox = BOX }: { shapes: readonly Shape[]; size: number; viewBox?: string }) {
  return (
    <Svg width={size} height={size} viewBox={viewBox}>
      <G><Shapes list={shapes} /></G>
    </Svg>
  );
});

// ─── The animated chest ───────────────────────────────────────────────────────
// `t` runs 0..1 over the opening:
//   0 .. 0.55    the chest shakes, harder and harder
//   0.58 .. 0.72 the lid pops up and the light inside shows
//   0.66 .. 1    the reward floats up (and, for Gold, sparkles burst out)
const SPARK_COUNT = 8;
const SPARK_COLORS = ['#FFFFFF', '#FFE08A', '#F6C343', '#FF8FB1'];
const SPARK_BOX = '-8 -8 16 16';

function Spark({ index, t, size }: { index: number; t: SharedValue<number>; size: number }) {
  const shapes = useMemo(() => sparkle(SPARK_COLORS[index % SPARK_COLORS.length]), [index]);
  const s = size * 0.16;
  const style = useAnimatedStyle(() => {
    const v = Math.min(1, Math.max(0, (t.value - 0.6) / 0.4));
    const angle = (index / SPARK_COUNT) * Math.PI * 2 - Math.PI / 2 + 0.2;
    const r = size * (0.12 + 0.46 * v);
    return {
      opacity: Math.sin(Math.PI * v),
      transform: [
        { translateX: size / 2 + Math.cos(angle) * r - s / 2 },
        { translateY: size * 0.46 + Math.sin(angle) * r * 0.9 - s / 2 },
        { scale: 0.5 + v * (0.8 + (index % 3) * 0.3) },
        { rotate: `${v * 120}deg` },
      ],
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: s, height: s }, style]}>
      <Layer shapes={shapes} size={s} viewBox={SPARK_BOX} />
    </Animated.View>
  );
}

function AnimatedChest({ tier, size, t, bubble }: { tier: ChestTier; size: number; t: SharedValue<number>; bubble: string }) {
  const parts = useMemo(() => chestParts(tier), [tier]);
  const k = size / CHEST_BOX;

  const shake = useAnimatedStyle(() => {
    const v = t.value;
    const envelope = v < 0.55 ? v / 0.55 : 0;
    const bump = Math.max(0, 1 - Math.abs(v - 0.62) / 0.08);
    return {
      transform: [
        { rotate: `${Math.sin(v * Math.PI * 16) * 7 * envelope}deg` },
        { scale: 1 + 0.07 * bump },
      ],
    };
  });
  const lid = useAnimatedStyle(() => {
    const v = Math.min(1, Math.max(0, (t.value - LID_POP_AT) / 0.14));
    return { transform: [{ translateY: -24 * v * k }, { rotate: `${-14 * v}deg` }] };
  });
  const glow = useAnimatedStyle(() => ({ opacity: Math.min(1, Math.max(0, (t.value - LID_POP_AT) / 0.14)) }));
  const reward = useAnimatedStyle(() => {
    const v = Math.min(1, Math.max(0, (t.value - 0.66) / 0.34));
    return { opacity: v, transform: [{ translateY: -0.5 * size * v }, { scale: 0.5 + 0.5 * v }] };
  });

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View style={[fill, { transformOrigin: [size / 2, size * 0.88, 0] }, shake]}>
        <Animated.View style={[fill, glow]}><Layer shapes={parts.inside} size={size} /></Animated.View>
        <View style={fill}><Layer shapes={parts.body} size={size} /></View>
        <Animated.View style={[fill, { transformOrigin: [size * 0.12, size * 0.5, 0] }, lid]}>
          <Layer shapes={parts.lid} size={size} />
        </Animated.View>
      </Animated.View>
      {tier === 'gold' && Array.from({ length: SPARK_COUNT }, (_, i) => <Spark key={i} index={i} t={t} size={size} />)}
      <Animated.View pointerEvents="none" style={[styles.bubbleWrap, { top: size * 0.3 }, reward]}>
        <View style={styles.bubble}><Text style={styles.bubbleText}>{bubble}</Text></View>
      </Animated.View>
    </View>
  );
}

// ─── The reward card ──────────────────────────────────────────────────────────
function RewardCard({ roll, breed, equipped }: { roll: ChestRoll; breed: string; equipped: Equipped }) {
  const item = roll.item;
  const house = item && item.category === 'house' ? getHouse(item.id) : null;
  const tryOn = useMemo(() => (item && isWearable(item.id) ? withItem(equipped, item.id) : null), [item, equipped]);

  return (
    <View style={styles.reward} testID="chest-reward">
      <View style={styles.bonesRow}>
        <Text style={styles.bonesText} testID="chest-reward-bones">+{roll.bones} treats 🦴</Text>
      </View>

      {item && (
        <View style={styles.itemBox} testID="chest-reward-item">
          {item.id === SHIELD_ID ? (
            <Text style={styles.itemEmoji}>🛡️</Text>
          ) : house ? (
            <View style={styles.housePic}><HouseStill def={house} width={150} height={100} /></View>
          ) : tryOn ? (
            <View style={styles.dogPic}><CompanionSvg state="happy" size={104} breed={breed} equipped={tryOn} /></View>
          ) : null}
          <Text style={styles.itemName}>{item.name}</Text>
          {item.duplicate ? (
            <Text style={styles.itemNote} testID="chest-reward-duplicate">
              You already have this one, so it became +{item.refund} treats 🦴
            </Text>
          ) : (
            <Text style={styles.itemNote}>
              {item.id === SHIELD_ID ? 'One more Streak Shield in stock.' : `New! Tier ${item.tier}. Find it in the Shop to use it.`}
            </Text>
          )}
          {roll.pityUsed && (
            <Text style={styles.pityNote}>Guaranteed: {PITY_LIMIT} chests in a row had no item.</Text>
          )}
        </View>
      )}
      {!item && <Text style={styles.noItem}>No item this time.</Text>}
    </View>
  );
}

// ─── The modal ────────────────────────────────────────────────────────────────
export interface ChestOpenModalProps {
  tier: ChestTier | null;       // null = closed
  reduceMotion: boolean;
  breed: string;
  equipped: Equipped;
  onClose: (roll: ChestRoll | null) => void;
  // The function that opens the chest in the database. Tests pass their own.
  open?: (tier: ChestTier) => Promise<ChestRoll | null>;
}

type Stage = 'working' | 'opening' | 'reward' | 'none';

export default function ChestOpenModal({ tier, reduceMotion, breed, equipped, onClose, open = openChest }: ChestOpenModalProps) {
  const [stage, setStage] = useState<Stage>('working');
  const [roll, setRoll] = useState<ChestRoll | null>(null);
  const t = useSharedValue(0);
  const live = useRef({ reduceMotion, open });
  live.current = { reduceMotion, open };

  useEffect(() => {
    if (!tier) return undefined;
    let alive = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    setStage('working');
    setRoll(null);
    t.value = 0;

    live.current
      .open(tier)
      .then((result) => {
        if (!alive) return;
        if (!result) {
          setStage('none');
          return;
        }
        setRoll(result);
        if (live.current.reduceMotion) {
          // Reduce Motion: no shake, no pop. Straight to what was inside.
          t.value = 1;
          thump();
          setStage('reward');
          return;
        }
        setStage('opening');
        t.value = withTiming(1, { duration: CHEST_OPEN_MS, easing: Easing.linear });
        timers.push(setTimeout(thump, CHEST_OPEN_MS * LID_POP_AT));
        timers.push(setTimeout(() => alive && setStage('reward'), CHEST_OPEN_MS + 150));
      })
      .catch(() => {
        if (alive) setStage('none');
      });

    return () => {
      alive = false;
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tier]);

  if (!tier) return null;
  const def = CHESTS[tier];
  const close = () => onClose(roll);

  return (
    <Modal transparent animationType="fade" visible onRequestClose={close} statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.card} testID="chest-modal" accessibilityViewIsModal>
          <Text style={styles.title}>{def.name}</Text>

          {stage === 'none' ? (
            <Text style={styles.noItem} testID="chest-none">There is no {def.name} to open.</Text>
          ) : (
            <>
              {!(stage === 'reward' && reduceMotion) && (
                <View style={styles.chestStage}>
                  <AnimatedChest tier={tier} size={150} t={t} bubble={roll ? `+${roll.bones} 🦴` : ''} />
                </View>
              )}
              {stage === 'reward' && roll && <RewardCard roll={roll} breed={breed} equipped={equipped} />}
            </>
          )}

          {(stage === 'reward' || stage === 'none') && (
            <TouchableOpacity
              style={styles.button}
              onPress={close}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={stage === 'reward' ? 'Collect' : 'Close'}
              testID="chest-collect"
            >
              <Text style={styles.buttonText}>{stage === 'reward' ? 'Collect' : 'Close'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, width: '100%', maxWidth: 360, alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: '#1F2937', marginBottom: 4 },
  chestStage: { width: 150, height: 170, justifyContent: 'flex-end', alignItems: 'center' },
  bubbleWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  bubble: { backgroundColor: '#FDF2F8', borderColor: '#FBCFE8', borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 5 },
  bubbleText: { fontSize: 18, fontWeight: '800', color: '#BE185D' },

  reward: { alignItems: 'center', marginTop: 6, width: '100%' },
  bonesRow: { backgroundColor: '#FDF2F8', borderRadius: 12, paddingHorizontal: 18, paddingVertical: 8 },
  bonesText: { fontSize: 18, fontWeight: '800', color: '#BE185D' },
  itemBox: { alignItems: 'center', marginTop: 12, backgroundColor: '#F5F3FF', borderRadius: 16, padding: 12, width: '100%' },
  itemEmoji: { fontSize: 48 },
  dogPic: { width: 104, height: 104, borderRadius: 16, backgroundColor: '#EAF3FC', overflow: 'hidden' },
  housePic: { width: 150, height: 100, borderRadius: 12, overflow: 'hidden' },
  itemName: { fontSize: 17, fontWeight: '800', color: '#3C3489', marginTop: 8, textAlign: 'center' },
  itemNote: { fontSize: 13, color: '#6B7280', marginTop: 3, textAlign: 'center', lineHeight: 18 },
  pityNote: { fontSize: 12, color: '#7C3AED', marginTop: 4, textAlign: 'center' },
  noItem: { fontSize: 14, color: '#6B7280', marginTop: 10, textAlign: 'center' },

  button: { marginTop: 18, backgroundColor: '#3C3489', borderRadius: 14, paddingVertical: 13, paddingHorizontal: 44 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
