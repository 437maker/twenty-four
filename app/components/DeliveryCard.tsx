// DeliveryCard.tsx — Treat delivery card shown on Home when a delivery is pending.
// Privacy footer: "Picked on your phone from your week"

import React, { useRef, useEffect } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { DeliveryRow } from '../types';
import { getContentById } from '../utils/delivery';
import { QUOTES } from '../data/insights/quotes';
import { BOOKS } from '../data/insights/books';
import { MOVIES } from '../data/insights/movies';
import { ACTIVITIES } from '../data/insights/activities';

// ─────────────────────────────────────────────────────────────
// Crisis card (shown instead of normal content)
// ─────────────────────────────────────────────────────────────

function CrisisCard({ onDismiss }: { onDismiss: () => void }) {
  return (
    <View style={[styles.card, styles.crisisCard]}>
      <Text style={styles.crisisEmoji}>💙</Text>
      <Text style={styles.crisisTitle}>Rough week?{'\n'}You don't have to handle it alone.</Text>
      <Text style={styles.crisisBody}>
        If you're going through something heavy, reaching out can make a real difference.
      </Text>
      <View style={styles.crisisLine}>
        <Text style={styles.crisisHotlineLabel}>988 Suicide & Crisis Lifeline</Text>
        <Text style={styles.crisisHotlineNum}>Call or text 988</Text>
      </View>
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
// Content renderers
// ─────────────────────────────────────────────────────────────

function QuoteContent({ contentId }: { contentId: string }) {
  const q = QUOTES.find((x) => x.id === contentId);
  if (!q) return null;
  return (
    <>
      <Text style={styles.quoteText}>"{q.text}"</Text>
      <Text style={styles.quoteAttrib}>— {q.attribution}</Text>
    </>
  );
}

function BookContent({ contentId }: { contentId: string }) {
  const b = BOOKS.find((x) => x.id === contentId);
  if (!b) return null;
  return (
    <>
      <Text style={styles.recTitle}>{b.title}</Text>
      <Text style={styles.recMeta}>by {b.author}</Text>
      <Text style={styles.recPitch}>{b.pitch}</Text>
    </>
  );
}

function MovieContent({ contentId }: { contentId: string }) {
  const m = MOVIES.find((x) => x.id === contentId);
  if (!m) return null;
  return (
    <>
      <Text style={styles.recTitle}>{m.title}</Text>
      <Text style={styles.recMeta}>{m.year}</Text>
      <Text style={styles.recPitch}>{m.pitch}</Text>
    </>
  );
}

function ActivityContent({ contentId }: { contentId: string }) {
  const a = ACTIVITIES.find((x) => x.id === contentId);
  if (!a) return null;
  return (
    <>
      <Text style={styles.recTitle}>{a.title}</Text>
      {a.duration_min > 0 && <Text style={styles.recMeta}>{a.duration_min} min</Text>}
      <Text style={styles.recPitch}>{a.pitch}</Text>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Card header emoji and label
// ─────────────────────────────────────────────────────────────

const CARD_TYPE_LABEL: Record<string, string> = {
  quote:    '💬 Quote',
  book:     '📚 Book',
  movie:    '🎬 Watch',
  activity: '🎯 Try this',
};

// ─────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────

interface Props {
  delivery: DeliveryRow;
  onOpen:    () => void;    // give +3 bones + mark opened
  onDismiss: () => void;    // close without opening
  onFeedback: (fb: 'up' | 'down') => void;
  onSave:     (saved: boolean) => void;
}

export default function DeliveryCard({ delivery, onOpen, onDismiss, onFeedback, onSave }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [opened, setOpened] = React.useState(delivery.opened);
  const [saved, setSaved] = React.useState(delivery.saved);
  const [fb, setFb] = React.useState<'up' | 'down' | null>(delivery.feedback);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, []);

  function handleOpen() {
    if (!opened) {
      setOpened(true);
      onOpen();
    }
  }

  // Crisis card
  if (delivery.content_id === 'crisis') {
    return (
      <CrisisCard
        onDismiss={() => {
          onDismiss();
        }}
      />
    );
  }

  const typeLabel = CARD_TYPE_LABEL[delivery.card_type] ?? '📦 Delivery';

  return (
    <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.boxEmoji}>📦</Text>
          <Text style={styles.cardTypeLabel}>{typeLabel}</Text>
        </View>
        <TouchableOpacity
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Dismiss delivery"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.dismissX}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Unopened state: tap to open */}
      {!opened ? (
        <TouchableOpacity style={styles.openBox} onPress={handleOpen} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Open treat delivery">
          <Text style={styles.openBoxEmoji}>📦</Text>
          <Text style={styles.openBoxText}>Tap to open your delivery</Text>
          <Text style={styles.openBoxBones}>+3 🦴</Text>
        </TouchableOpacity>
      ) : (
        <>
          {/* Why line */}
          {!!delivery.why_line && (
            <Text style={styles.whyLine}>{delivery.why_line}</Text>
          )}

          {/* Content */}
          <View style={styles.content}>
            {delivery.card_type === 'quote'    && <QuoteContent    contentId={delivery.content_id} />}
            {delivery.card_type === 'book'     && <BookContent     contentId={delivery.content_id} />}
            {delivery.card_type === 'movie'    && <MovieContent    contentId={delivery.content_id} />}
            {delivery.card_type === 'activity' && <ActivityContent contentId={delivery.content_id} />}
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
              <Text style={styles.saveBtnText}>{saved ? '✓ Saved' : 'Save'}</Text>
            </TouchableOpacity>
          </View>

          {/* Privacy footer */}
          <Text style={styles.privacyFooter}>Picked on your phone from your week</Text>
        </>
      )}
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
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

  openBox: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  openBoxEmoji: { fontSize: 48, marginBottom: 8 },
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
