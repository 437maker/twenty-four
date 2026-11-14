// CompanionGalleryScreen.tsx — a review screen for the animated companion.
//
// Shows all four states side by side so they can be checked on a real phone:
// smoothness, tap and petting, Reduce Motion, size, visibility on each of the
// app's backgrounds, every breed, and the "max outfit" (one item in every
// slot, the heaviest thing the rig can be asked to draw). Opened from Settings (a "Developer" row when running
// with `npx expo start`, or a long-press on the "Settings" title in a
// published update).
//
// The breed and outfit chosen here are only a preview: nothing is saved. The
// one thing this screen can change is her name (the Rename button).

import React, { useState } from 'react';
import { runOnJS, useFrameCallback, useSharedValue } from 'react-native-reanimated';
import {
  Modal, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View, useWindowDimensions,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import Companion from '../components/companion/Companion';
import { BREEDS } from '../components/companion/breeds';
import { MAX_OUTFIT } from '../components/companion/items/itemSlots';
import type { Equipped } from '../components/companion/items/itemSlots';
import { useCompanionLook } from '../components/companion/useCompanionLook';
import RenameCompanionModal from '../components/RenameCompanionModal';
import { BACKDROPS } from '../components/companion/palette';
import type { BackdropName } from '../components/companion/palette';
import { useReduceMotion } from '../components/companion/useReduceMotion';
import CustomSlider from '../components/CustomSlider';
import type { NovaState } from '../types';

export const GALLERY_STATES: NovaState[] = ['idle', 'happy', 'celebrating', 'sleeping'];

const BACKDROP_CHOICES: { key: BackdropName; label: string }[] = [
  { key: 'warmWhite', label: 'Warm white' },
  { key: 'day', label: 'Day' },
  { key: 'night', label: 'Night' },
];

type OutfitChoice = 'mine' | 'none' | 'max';
const OUTFIT_CHOICES: { key: OutfitChoice; label: string }[] = [
  { key: 'mine', label: 'What she wears now' },
  { key: 'none', label: 'Nothing' },
  { key: 'max', label: 'Max outfit' },
];
const NOTHING: Equipped = {};

// Frames per second on the UI thread (the thread the dogs animate on),
// averaged over half a second. Development builds only: it is how to tell
// whether a fully dressed dog still animates smoothly.
function FrameCounter() {
  const [fps, setFps] = useState(0);
  const frames = useSharedValue(0);
  const since = useSharedValue(0);
  useFrameCallback((info) => {
    'worklet';
    frames.value += 1;
    const elapsed = info.timestamp - since.value;
    if (elapsed >= 500) {
      runOnJS(setFps)(Math.round((frames.value * 1000) / elapsed));
      frames.value = 0;
      since.value = info.timestamp;
    }
  });
  const color = fps >= 55 ? '#15803D' : fps >= 45 ? '#B45309' : '#B91C1C';
  return (
    <Text style={[styles.fps, { color }]} testID="gallery-fps">
      {fps} frames per second (60 is smooth)
    </Text>
  );
}

const MIN_SIZE = 64;
const MAX_SIZE = 240;

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function CompanionGalleryScreen({ visible, onClose }: Props) {
  const systemReduceMotion = useReduceMotion();
  // null = follow the phone's setting; true / false = forced by the switch
  const [reduceOverride, setReduceOverride] = useState<boolean | null>(null);
  const reduceMotion = reduceOverride ?? systemReduceMotion;

  const [size, setSize] = useState(140);
  const [backdrop, setBackdrop] = useState<BackdropName>('day');
  const look = useCompanionLook();
  const [breed, setBreed] = useState<string>(look.breed);
  const [outfit, setOutfit] = useState<OutfitChoice>('mine');
  const [renameVisible, setRenameVisible] = useState(false);
  const equipped = outfit === 'max' ? MAX_OUTFIT : outfit === 'none' ? NOTHING : look.equipped;
  const [taps, setTaps] = useState(0);
  const { width } = useWindowDimensions();

  const colors = BACKDROPS[backdrop];
  const tileWidth = Math.max(size + 16, Math.min(MAX_SIZE + 16, (width - 16 * 2 - 12) / 2));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {/* Gestures inside a Modal need their own root view. */}
      <GestureHandlerRootView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Close gallery">
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Companion Gallery</Text>
          <View style={styles.closeBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.grid}>
            {GALLERY_STATES.map((state) => (
              <View key={state} style={[styles.tile, { width: tileWidth, backgroundColor: colors.sky }]}>
                <View style={[styles.ground, { backgroundColor: colors.ground }]} />
                <Companion
                  testID={`gallery-companion-${state}`}
                  state={state}
                  size={size}
                  breed={breed}
                  equipped={equipped}
                  reduceMotion={reduceMotion}
                  label={`${look.name}, ${state}`}
                  onPress={() => setTaps((n) => n + 1)}
                />
                <Text style={[styles.tileLabel, backdrop === 'night' && styles.tileLabelNight]}>{state}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.hint}>
            Tap her for a heart and a tick. Stroke sideways across her head for one second to pet her. Taps: {taps}
          </Text>
          {__DEV__ && <FrameCounter />}

          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{look.name}</Text>
              <Text style={styles.rowSub}>Her name. You can also tap it on Home.</Text>
            </View>
            <TouchableOpacity
              testID="gallery-rename"
              style={styles.renameBtn}
              onPress={() => setRenameVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="Rename"
            >
              <Text style={styles.renameText}>Rename</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.block}>
            <Text style={styles.rowTitle}>Dog</Text>
            <View style={styles.chips}>
              {BREEDS.map((b) => (
                <Chip key={b.id} label={b.displayName} selected={breed === b.id} onPress={() => setBreed(b.id)} />
              ))}
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Reduce motion</Text>
              <Text style={styles.rowSub}>No loops or sparkles, a slow blink, states crossfade</Text>
            </View>
            <Switch
              testID="gallery-reduce-motion"
              value={reduceMotion}
              onValueChange={setReduceOverride}
              trackColor={{ true: '#3C3489' }}
              accessibilityLabel="Reduce motion"
            />
          </View>

          <View style={styles.block}>
            <Text style={styles.rowTitle}>Size: {size}px</Text>
            <CustomSlider min={MIN_SIZE} max={MAX_SIZE} step={4} value={size} color="#3C3489" onChange={setSize} />
          </View>

          <View style={styles.block}>
            <Text style={styles.rowTitle}>Background</Text>
            <View style={styles.chips}>
              {BACKDROP_CHOICES.map((b) => (
                <Chip key={b.key} label={b.label} selected={backdrop === b.key} onPress={() => setBackdrop(b.key)} />
              ))}
            </View>
          </View>

          <View style={styles.block}>
            <Text style={styles.rowTitle}>Wearing</Text>
            <View style={styles.chips}>
              {OUTFIT_CHOICES.map((c) => (
                <Chip key={c.key} label={c.label} selected={outfit === c.key} onPress={() => setOutfit(c.key)} />
              ))}
            </View>
            <Text style={styles.rowSub}>
              "Max outfit" puts one item in every slot. If the frame counter stays near 60 with it on, everything lighter will too.
            </Text>
          </View>
        </ScrollView>
        <RenameCompanionModal visible={renameVisible} onClose={() => setRenameVisible(false)} />
      </GestureHandlerRootView>
    </Modal>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 20, paddingHorizontal: 20, paddingBottom: 16,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  closeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 18, color: '#6B7280' },
  title: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  content: { padding: 16, paddingBottom: 60 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 },
  tile: { borderRadius: 16, alignItems: 'center', paddingTop: 12, paddingBottom: 8, overflow: 'hidden' },
  ground: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '36%' },
  tileLabel: { marginTop: 4, fontSize: 13, fontWeight: '700', color: '#1F2937' },
  tileLabelNight: { color: '#FFFFFF' },

  hint: { marginTop: 14, marginBottom: 6, fontSize: 13, lineHeight: 19, color: '#6B7280' },
  fps: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  renameBtn: { minHeight: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: '#EEF2FF', justifyContent: 'center' },
  renameText: { fontSize: 14, fontWeight: '700', color: '#3C3489' },

  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginTop: 12,
  },
  rowText: { flex: 1, paddingRight: 12 },
  rowTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  rowSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  block: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginTop: 12, gap: 10 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 44, paddingHorizontal: 14, borderRadius: 22, justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  chipSelected: { backgroundColor: '#3C3489' },
  chipText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  chipTextSelected: { color: '#FFFFFF' },
});
