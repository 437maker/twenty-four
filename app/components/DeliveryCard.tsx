// DeliveryCard.tsx — the treat delivery on Home.
//
// What happens, in order:
//   1. A closed cardboard box waits: "Tap to open your delivery".
//   2. On tap the delivery is opened in the DATABASE first (+3 bones), so
//      closing the app mid-animation loses nothing.
//   3. The animation plays: the box wiggles, the lid flaps open, bones and
//      confetti burst out, and the card slides up with a haptic thump.
//   4. The card shows a real quote, book, movie or activity with its title,
//      its pitch and a "why you got this" line. It stays until dismissed.
//
// With Reduce Motion the animation is skipped and the card is shown directly.
//
// Privacy footer: "Picked on your phone from your week".
// <DeliveryUnlockHint> (the progress hint shown before the first delivery)
// lives here too.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

import { DeliveryRow } from '../types';
import { DELIVERY_THRESHOLD, resolveDeliveryCard } from '../utils/delivery';
import type { DeliveryProgress } from '../utils/delivery';
import { lightTap, thump } from './companion/haptics';

// How long the opening takes, and when the lid flaps (as a share of it).
export const DELIVERY_OPEN_MS = 1350;
export const DELIVERY_LID_AT = 0.42;
const CARD_RISE_MS = 340;

// ─────────────────────────────────────────────────────────────
// Crisis card (shown instead of normal content)
// ─────────────────────────────────────────────────────────────

function CrisisCard({ onDismiss }: { onDismiss: () => void }) {
  return (
    <View style={[styles.card, styles.crisisCard]} testID="delivery-crisis">
      <Text style={styles.crisisEmoji}>💙</Text>
      <Text style={styles.crisisTitle}>Rough week?{'\n'}You don't have to handle it alone.</Text>
      <Text style={styles.crisisBody}>
        If you're going through something heavy, reaching out can make a real difference.
      </Text>
      <TouchableOpacity
        style={styles.crisisLine}
        onPress={() => { Linking.openURL('tel:988').catch(() => {}); }}
        activeOpacity={0.8}
        accessibilityRole="link"
        accessibilityLabel="Call the 988 Suicide and Crisis Lifeline"
      >
        <Text style={styles.crisisHotlineLabel}>988 Suicide & Crisis Lifeline</Text>
        <Text style={styles.crisisHotlineNum}>Call or text 988</Text>
      </TouchableOpacity>
      <Text style={styles.crisisSuggest}>
        You might also reach out to someone you trust — a friend, family member, or counsellor.
      </Text>
      <TouchableOpacity style={styles.dismissBtn} onPress={onDismiss} accessibilityRole="button">
        <Text style={styles.dismissBtnText}>Close</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// The box and its opening animation
// ─────────────────────────────────────────────────────────────
// `t` runs 0..1 over the opening:
//   0 .. 0.40    the box wiggles, harder and harder
//   0.42 .. 0.58 the lid flaps open on its hinge
//   0.46 .. 1    bones and confetti burst out and fall
const STAGE_W = 220;
const STAGE_H = 150;
const BOX_W = 92;
const BOX_H = 58;
const LID_H = 16;
const MOUTH_X = STAGE_W / 2;
const MOUTH_Y = STAGE_H - BOX_H - 6;

const CONFETTI_COLORS = ['#3C3489', '#F6C343', '#FF8FB1', '#34D399', '#60A5FA', '#F97316'];
export const BONE_COUNT = 6;
export const CONFETTI_COUNT = 14;

// One flying piece. `index`/`count` spread the pieces over an upward fan.
function Piece({ index, count, t, bone }: { index: number; count: number; t: SharedValue<number>; bone: boolean }) {
  const spread = (index + 0.5) / count;                       // 0..1 across the fan
  const angle = Math.PI * (0.12 + 0.76 * spread);             // 22°..158°, 90° = straight up
  const reach = (bone ? 62 : 78) + ((index * 37) % 5) * 9;    // px, varied per piece
  const delay = ((index * 13) % 4) * 0.025;
  const spin = (index % 2 === 0 ? 1 : -1) * (bone ? 200 : 420);
  const style = useAnimatedStyle(() => {
    const v = Math.min(1, Math.max(0, (t.value - 0.46 - delay) / (0.54 - delay)));
    const out = 1 - (1 - v) * (1 - v);                        // ease-out
    return {
      opacity: v <= 0 ? 0 : v < 0.75 ? 1 : (1 - v) / 0.25,
      transform: [
        { translateX: MOUTH_X + Math.cos(angle) * reach * out },
        { translateY: MOUTH_Y - Math.sin(angle) * reach * out + 70 * v * v },
        { rotate: `${spin * v}deg` },
        { scale: 0.5 + 0.6 * Math.min(1, v * 3) },
      ],
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[styles.piece, style]} testID={bone ? 'delivery-bone' : 'delivery-confetti'}>
      {bone ? (
        <Text style={styles.boneText}>🦴</Text>
      ) : (
        <View
          style={{
            width: index % 3 === 0 ? 7 : 5,
            height: index % 3 === 0 ? 7 : 11,
            borderRadius: index % 3 === 0 ? 4 : 1.5,
            backgroundColor: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
          }}
        />
      )}
    </Animated.View>
  );
}

function Box({ t, bursting }: { t: SharedValue<number>; bursting: boolean }) {
  const wiggle = useAnimatedStyle(() => {
    const v = t.value;
    const envelope = v < 0.4 ? v / 0.4 : 0;
    const bump = Math.max(0, 1 - Math.abs(v - 0.47) / 0.07);
    return {
      transform: [
        { rotate: `${Math.sin(v * Math.PI * 14) * 8 * envelope}deg` },
        { scale: 1 + 0.08 * bump },
      ],
    };
  });
  const lid = useAnimatedStyle(() => {
    const v = Math.min(1, Math.max(0, (t.value - DELIVERY_LID_AT) / 0.16));
    const over = Math.sin(v * Math.PI) * 10;                  // a little overshoot, then settle
    return { transform: [{ rotate: `${-(118 * v + over)}deg` }] };
  });
  const glow = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, (t.value - DELIVERY_LID_AT) / 0.16)),
  }));

  return (
    <View style={styles.stage} pointerEvents="none">
      <Animated.View style={[styles.boxWrap, { transformOrigin: [BOX_W / 2, BOX_H + LID_H, 0] }, wiggle]}>
        <Animated.View style={[styles.boxGlow, glow]} />
        <View style={styles.boxBody}>
          <View style={styles.boxTape} />
          <View style={styles.boxLabel}><Text style={styles.boxLabelText}>24</Text></View>
        </View>
        <Animated.View style={[styles.boxLid, { transformOrigin: [2, LID_H, 0] }, lid]}>
          <View style={styles.boxLidTape} />
        </Animated.View>
      </Animated.View>
      {bursting && Array.from({ length: CONFETTI_COUNT }, (_, i) => (
        <Piece key={`c${i}`} index={i} count={CONFETTI_COUNT} t={t} bone={false} />
      ))}
      {bursting && Array.from({ length: BONE_COUNT }, (_, i) => (
        <Piece key={`b${i}`} index={i} count={BONE_COUNT} t={t} bone />
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────

interface Props {
  delivery: DeliveryRow;
  reduceMotion?: boolean;
  onOpen:    () => void;    // give +3 bones + mark opened
  onDismiss: () => void;    // take the card off Home
  onFeedback: (fb: 'up' | 'down') => void;
  onSave:     (saved: boolean) => void;
}

type Stage = 'box' | 'opening' | 'card';

export default function DeliveryCard({ delivery, reduceMotion = false, onOpen, onDismiss, onFeedback, onSave }: Props) {
  const [stage, setStage] = useState<Stage>(delivery.opened ? 'card' : 'box');
  const [saved, setSaved] = useState(delivery.saved);
  const [fb, setFb] = useState<'up' | 'down' | null>(delivery.feedback);
  const t = useSharedValue(0);
  const rise = useSharedValue(delivery.opened ? 1 : 0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const view = useMemo(
    () => resolveDeliveryCard(delivery.content_id, delivery.why_line),
    [delivery.content_id, delivery.why_line],
  );

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const riseStyle = useAnimatedStyle(() => ({
    opacity: rise.value,
    transform: [{ translateY: (1 - rise.value) * 36 }],
  }));

  function showCard(animated: boolean) {
    setStage('card');
    thump();
    if (animated) {
      rise.value = 0;
      rise.value = withTiming(1, { duration: CARD_RISE_MS, easing: Easing.out(Easing.cubic) });
    } else {
      rise.value = 1;
    }
  }

  function handleOpen() {
    if (stage !== 'box') return;
    onOpen();
    if (reduceMotion) {
      // Reduce Motion: no wiggle, no burst. Straight to the card.
      showCard(false);
      return;
    }
    setStage('opening');
    t.value = 0;
    t.value = withTiming(1, { duration: DELIVERY_OPEN_MS, easing: Easing.linear });
    timers.current.push(setTimeout(lightTap, DELIVERY_OPEN_MS * DELIVERY_LID_AT));
    timers.current.push(setTimeout(() => showCard(true), DELIVERY_OPEN_MS));
  }

  // Crisis card
  if (delivery.content_id === 'crisis') {
    return <CrisisCard onDismiss={onDismiss} />;
  }

  return (
    <View style={styles.card} testID="delivery-card">
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.boxEmoji}>📦</Text>
          <Text style={styles.cardTypeLabel} testID="delivery-type">
            {stage === 'card' ? view.typeLabel : 'Treat delivery'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Dismiss delivery"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          testID="delivery-dismiss"
        >
          <Text style={styles.dismissX}>✕</Text>
        </TouchableOpacity>
      </View>

      {stage !== 'card' ? (
        <TouchableOpacity
          style={styles.openBox}
          onPress={handleOpen}
          disabled={stage === 'opening'}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Open treat delivery"
          testID="delivery-open"
        >
          <Box t={t} bursting={stage === 'opening'} />
          <Text style={styles.openBoxText}>
            {stage === 'opening' ? 'Opening…' : 'Tap to open your delivery'}
          </Text>
          <Text style={styles.openBoxBones}>+3 🦴</Text>
        </TouchableOpacity>
      ) : (
        <Animated.View style={riseStyle} testID="delivery-content">
          <Text style={styles.whyLine} testID="delivery-why">{view.why}</Text>

          <View style={styles.content}>
            <Text style={view.type === 'quote' ? styles.quoteText : styles.recTitle} testID="delivery-title">
              {view.title}
            </Text>
            <Text style={view.type === 'quote' ? styles.quoteAttrib : styles.recMeta} testID="delivery-meta">
              {view.meta}
            </Text>
            <Text style={styles.recPitch} testID="delivery-pitch">{view.pitch}</Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.fbBtn, fb === 'up' && styles.fbBtnActive]}
              onPress={() => { setFb('up'); onFeedback('up'); }}
              accessibilityRole="button"
              accessibilityLabel="Thumbs up"
            >
              <Text style={styles.fbBtnText}>👍</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.fbBtn, fb === 'down' && styles.fbBtnActive]}
              onPress={() => { setFb('down'); onFeedback('down'); }}
              accessibilityRole="button"
              accessibilityLabel="Thumbs down"
            >
              <Text style={styles.fbBtnText}>👎</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, saved && styles.saveBtnActive]}
              onPress={() => { setSaved(!saved); onSave(!saved); }}
              accessibilityRole="button"
              accessibilityLabel={saved ? 'Unsave' : 'Save'}
            >
              <Text style={[styles.saveBtnText, saved && styles.saveBtnTextActive]}>{saved ? '✓ Saved' : 'Save'}</Text>
            </TouchableOpacity>
          </View>

          {/* Privacy footer */}
          <Text style={styles.privacyFooter}>Picked on your phone from your week</Text>
        </Animated.View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// "First treat delivery unlocks soon": shown until there is enough data
// ─────────────────────────────────────────────────────────────

export function DeliveryUnlockHint({ progress }: { progress: DeliveryProgress }) {
  if (progress.unlocked) return null;
  const T = DELIVERY_THRESHOLD;
  const rows: { key: string; label: string; have: number; need: number }[] = [
    { key: 'days',     label: 'Days',     have: progress.days,     need: T.days },
    { key: 'tasks',    label: 'Tasks',    have: progress.tasks,    need: T.tasks },
    { key: 'journals', label: 'Journals', have: progress.journals, need: T.journals },
  ];
  return (
    <View
      style={styles.hint}
      testID="delivery-hint"
      accessible
      accessibilityLabel={`First treat delivery unlocks soon. ${rows.map((r) => `${r.label} ${r.have} of ${r.need}`).join(', ')}.`}
    >
      <Text style={styles.hintTitle}>📦 First treat delivery unlocks soon</Text>
      <View style={styles.hintRow}>
        {rows.map((r) => {
          const done = r.have >= r.need;
          return (
            <View key={r.key} style={styles.hintItem}>
              <View style={styles.hintTrack}>
                <View style={[styles.hintFill, { width: `${Math.round((r.have / r.need) * 100)}%` }, done && styles.hintFillDone]} />
              </View>
              <Text style={[styles.hintLabel, done && styles.hintLabelDone]} testID={`delivery-hint-${r.key}`}>
                {`${done ? '✓ ' : ''}${r.label} ${r.have}/${r.need}`}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // The opening stage
  stage: { width: STAGE_W, height: STAGE_H, alignSelf: 'center' },
  boxWrap: { position: 'absolute', left: (STAGE_W - BOX_W) / 2, bottom: 4, width: BOX_W, height: BOX_H + LID_H },
  boxGlow: {
    position: 'absolute', left: 6, right: 6, top: LID_H - 6, height: 14,
    borderRadius: 8, backgroundColor: '#FFE08A',
  },
  boxBody: {
    position: 'absolute', left: 3, right: 3, bottom: 0, height: BOX_H,
    backgroundColor: '#D9A066', borderColor: '#A8743A', borderWidth: 2,
    borderBottomLeftRadius: 8, borderBottomRightRadius: 8, borderTopLeftRadius: 2, borderTopRightRadius: 2,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  boxTape: { position: 'absolute', top: 0, bottom: 0, width: 16, backgroundColor: '#F3DDB0', opacity: 0.9 },
  boxLabel: {
    backgroundColor: '#FFFFFF', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 1,
    borderWidth: 1, borderColor: '#E5D3B0',
  },
  boxLabelText: { fontSize: 13, fontWeight: '900', color: '#3C3489' },
  boxLid: {
    position: 'absolute', left: 0, right: 0, top: 0, height: LID_H,
    backgroundColor: '#E6B57C', borderColor: '#A8743A', borderWidth: 2, borderRadius: 4,
    alignItems: 'center', overflow: 'hidden',
  },
  boxLidTape: { width: 16, height: LID_H, backgroundColor: '#F3DDB0', opacity: 0.9 },
  piece: { position: 'absolute', left: -8, top: -8, width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  boneText: { fontSize: 15 },

  // The unlock hint
  hint: {
    backgroundColor: '#F0F4FF', borderRadius: 14, marginHorizontal: 16, marginBottom: 12,
    paddingVertical: 10, paddingHorizontal: 14,
  },
  hintTitle: { fontSize: 13, fontWeight: '700', color: '#3C3489', marginBottom: 8 },
  hintRow: { flexDirection: 'row', gap: 10 },
  hintItem: { flex: 1 },
  hintTrack: { height: 5, borderRadius: 3, backgroundColor: '#DDE3F5', overflow: 'hidden' },
  hintFill: { height: 5, borderRadius: 3, backgroundColor: '#7C74D6' },
  hintFillDone: { backgroundColor: '#34D399' },
  hintLabel: { fontSize: 11, color: '#6B7280', marginTop: 4, fontWeight: '600' },
  hintLabelDone: { color: '#059669' },

  card: {
    backgroundColor: '#F0F4FF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  crisisCard: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#3B82F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  boxEmoji: { fontSize: 18 },
  cardTypeLabel: { fontSize: 13, fontWeight: '700', color: '#3C3489' },
  dismissX: { fontSize: 16, color: '#9CA3AF', paddingLeft: 8 },

  openBox: { alignItems: 'center', paddingBottom: 8 },
  openBoxText: { fontSize: 15, color: '#374151', fontWeight: '600' },
  openBoxBones: { fontSize: 13, color: '#D97706', marginTop: 4, fontWeight: '700' },

  whyLine: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginBottom: 10,
  },

  content: { marginBottom: 14 },
  quoteText: {
    fontSize: 17,
    fontWeight: '500',
    color: '#1F2937',
    lineHeight: 26,
    marginBottom: 6,
  },
  quoteAttrib: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
    marginBottom: 6,
  },
  recTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  recMeta: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
  },
  recPitch: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 21,
  },

  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  fbBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
  },
  fbBtnActive: { backgroundColor: '#D1FAE5' },
  fbBtnText: { fontSize: 16 },
  saveBtn: {
    marginLeft: 'auto',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
  },
  saveBtnActive: { backgroundColor: '#3C3489' },
  saveBtnText: { fontSize: 13, fontWeight: '700', color: '#374151' },
  saveBtnTextActive: { color: '#FFFFFF' },

  privacyFooter: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
  },

  // Crisis card
  crisisEmoji: { fontSize: 36, textAlign: 'center', marginBottom: 8 },
  crisisTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E3A8A',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 10,
  },
  crisisBody: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 14,
  },
  crisisLine: {
    backgroundColor: '#DBEAFE',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  crisisHotlineLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 2,
  },
  crisisHotlineNum: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1D4ED8',
    letterSpacing: 1,
  },
  crisisSuggest: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 14,
  },
  dismissBtn: {
    backgroundColor: '#1D4ED8',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  dismissBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
});
