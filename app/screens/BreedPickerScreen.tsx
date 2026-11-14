// BreedPickerScreen.tsx — "Choose your dog".
//
// A swipeable row of breeds, each animated and wearing whatever is currently
// equipped. "Choose" switches the breed. The name and every equipped item
// stay exactly as they are: only the dog underneath changes.
//
// Switching is free and unlimited. That is a product decision (D34 in
// docs/DECISIONS.md) and can be changed later, for example by pricing breeds
// in treats.
//
// Opened from Settings, and by pressing and holding the dog on Home.

import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions,
} from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent, ScrollViewInstance } from 'react-native';

import Companion from '../components/companion/Companion';
import { BREEDS } from '../components/companion/breeds';
import { useCompanionLook } from '../components/companion/useCompanionLook';
import { useReduceMotion } from '../components/companion/useReduceMotion';
import { setBreed } from '../db/queries';
import { useAppStore } from '../store/useAppStore';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function BreedPickerScreen({ visible, onClose }: Props) {
  const look = useCompanionLook();
  const loadSettings = useAppStore((s) => s.loadSettings);
  const reduceMotion = useReduceMotion();
  const { width } = useWindowDimensions();
  const scroller = useRef<ScrollViewInstance>(null);

  const currentIndex = Math.max(0, BREEDS.findIndex((b) => b.id === look.breed));
  const [page, setPage] = useState(currentIndex);
  const [saving, setSaving] = useState(false);

  // Open on the breed she is right now.
  useEffect(() => {
    if (!visible) return;
    setPage(currentIndex);
    const id = setTimeout(() => scroller.current?.scrollTo({ x: currentIndex * width, animated: false }), 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function onScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(e.nativeEvent.contentOffset.x / Math.max(1, width));
    setPage(Math.max(0, Math.min(BREEDS.length - 1, next)));
  }

  function goTo(index: number) {
    const next = Math.max(0, Math.min(BREEDS.length - 1, index));
    setPage(next);
    scroller.current?.scrollTo({ x: next * width, animated: !reduceMotion });
  }

  async function choose() {
    const breed = BREEDS[page];
    if (!breed || saving) return;
    setSaving(true);
    try {
      await setBreed(breed.id);
      await loadSettings();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const selected = BREEDS[page];
  const isCurrent = selected?.id === look.breed;
  const dogSize = Math.min(240, width * 0.62);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Close">
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Choose your dog</Text>
          <View style={styles.closeBtn} />
        </View>

        <Text style={styles.sub}>
          {look.name} keeps the same name and everything she is wearing.
        </Text>

        <ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScrollEnd}
          style={styles.carousel}
        >
          {BREEDS.map((breed, i) => (
            <View key={breed.id} style={[styles.page, { width }]}>
              <View style={styles.stage}>
                <View style={styles.stageGround} />
                {/* Only the dog you are looking at animates; the others hold still. */}
                <Companion
                  testID={`breed-${breed.id}`}
                  state="happy"
                  size={dogSize}
                  breed={breed.id}
                  equipped={look.equipped}
                  reduceMotion={reduceMotion || i !== page}
                  interactive={false}
                  label={breed.displayName}
                />
              </View>
              <Text style={styles.breedName}>{breed.displayName}</Text>
              <Text style={styles.breedBlurb}>{breed.blurb}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Dots, and arrows for anyone who would rather tap than swipe */}
        <View style={styles.pager}>
          <TouchableOpacity
            style={styles.arrow}
            onPress={() => goTo(page - 1)}
            disabled={page === 0}
            accessibilityRole="button"
            accessibilityLabel="Previous dog"
          >
            <Text style={[styles.arrowText, page === 0 && styles.arrowOff]}>‹</Text>
          </TouchableOpacity>
          <View style={styles.dots}>
            {BREEDS.map((b, i) => (
              <View key={b.id} style={[styles.dot, i === page && styles.dotOn]} />
            ))}
          </View>
          <TouchableOpacity
            style={styles.arrow}
            onPress={() => goTo(page + 1)}
            disabled={page === BREEDS.length - 1}
            accessibilityRole="button"
            accessibilityLabel="Next dog"
          >
            <Text style={[styles.arrowText, page === BREEDS.length - 1 && styles.arrowOff]}>›</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          testID="breed-choose"
          style={[styles.chooseBtn, (isCurrent || saving) && styles.chooseBtnOff]}
          onPress={choose}
          disabled={isCurrent || saving}
          accessibilityRole="button"
          accessibilityLabel={isCurrent ? `${selected?.displayName} is your dog` : `Choose ${selected?.displayName}`}
        >
          <Text style={styles.chooseText}>
            {isCurrent ? 'This is your dog' : saving ? 'Choosing…' : `Choose ${selected?.displayName ?? ''}`}
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 20, paddingHorizontal: 20, paddingBottom: 12,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  closeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 18, color: '#6B7280' },
  title: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  sub: { fontSize: 14, color: '#6B7280', textAlign: 'center', paddingHorizontal: 24, paddingTop: 14 },

  carousel: { flexGrow: 0, marginTop: 12 },
  page: { alignItems: 'center', paddingHorizontal: 24 },
  stage: {
    width: '100%', borderRadius: 24, backgroundColor: '#B5D4F4', alignItems: 'center',
    paddingTop: 24, paddingBottom: 12, overflow: 'hidden',
  },
  stageGround: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '34%', backgroundColor: '#8BC98A' },
  breedName: { fontSize: 24, fontWeight: '800', color: '#1F2937', marginTop: 16 },
  breedBlurb: { fontSize: 14, color: '#6B7280', marginTop: 4, textAlign: 'center' },

  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, gap: 12 },
  arrow: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  arrowText: { fontSize: 34, color: '#3C3489', fontWeight: '700', lineHeight: 38 },
  arrowOff: { color: '#D1D5DB' },
  dots: { flexDirection: 'row', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D1D5DB' },
  dotOn: { backgroundColor: '#3C3489', width: 20 },

  chooseBtn: {
    marginHorizontal: 24, marginTop: 20, minHeight: 54, borderRadius: 16,
    backgroundColor: '#3C3489', alignItems: 'center', justifyContent: 'center',
  },
  chooseBtnOff: { backgroundColor: '#A5A1CF' },
  chooseText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
});
