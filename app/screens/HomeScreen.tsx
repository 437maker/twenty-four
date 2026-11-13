// HomeScreen.tsx — Main dashboard.
// Sprint 1: LinearGradient header, NovaCompanion, streak pulse, treats, care bar.
// Sprint 2: Celebration modal (confetti + Nova), streak-broke gentle message,
//           refined progress bars, weekly box modal, quick-action navigation,
//           treat count bounce animation, shield-consumed message, Plan Tomorrow card.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Animated,
  Modal,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { useAppStore } from '../store/useAppStore';
import NovaCompanion from '../components/NovaCompanion';
import SettingsScreen from './SettingsScreen';
import { getTodayString, shiftDateString } from '../utils/dateHelpers';
import { calculatePlanAdherence, getHoursPerPillar, weeklyBoxLabel } from '../utils/calculations';
import { getTasksForDate } from '../db/queries';
import { NovaState } from '../types';

const SCREEN_W = Dimensions.get('window').width;

// Colours for the falling confetti balls
const CONFETTI_COLORS = [
  '#F97316', '#3C3489', '#1D9E75', '#185FA5',
  '#D97706', '#EC4899', '#10B981', '#6366F1',
];

// Build stable confetti data once (15 balls)
function makeConfetti() {
  return Array.from({ length: 15 }, (_, i) => ({
    x:     (i / 15) * SCREEN_W + Math.random() * (SCREEN_W / 15),
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    size:  8 + (i % 5) * 3,
  }));
}
const CONFETTI_DATA = makeConfetti();

// ─── Confetti ball component ──────────────────────────────────────────────────
function ConfettiBall({
  x, color, size, fallAnim,
}: { x: number; color: string; size: number; fallAnim: Animated.Value }) {
  const translateY = fallAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [-20, Dimensions.get('window').height * 0.7],
  });
  const opacity = fallAnim.interpolate({
    inputRange:  [0, 0.8, 1],
    outputRange: [1, 1, 0],
  });
  return (
    <Animated.View
      style={[
        styles.confetti,
        {
          left:      x,
          width:     size,
          height:    size,
          borderRadius: size / 2,
          backgroundColor: color,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    />
  );
}

type RootTabParamList = {
  Home: undefined;
  Schedule: undefined;
  Analytics: undefined;
  Journal: undefined;
  Shop: undefined;
};

// ─── Main component ───────────────────────────────────────────────────────────
export default function HomeScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();

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
  const [tomorrowEmpty, setTomorrowEmpty]           = useState(false);
  const [refreshing, setRefreshing]                 = useState(false);
  const [settingsVisible, setSettingsVisible]       = useState(false);
  // Controls whether the full-screen streak celebration modal is open
  const [celebModalVisible, setCelebModalVisible]   = useState(false);
  // Controls the weekly box modal
  const [boxModalVisible, setBoxModalVisible]       = useState(false);

  const today    = getTodayString();
  const tomorrow = shiftDateString(today, 1);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [today])
  );

  async function loadAll() {
    await loadTodaysTasks(today);
    // Local yesterday (the old code used the UTC date here)
    const yTasks = await getTasksForDate(shiftDateString(today, -1));
    setYesterdayAdherence(calculatePlanAdherence(yTasks));
    // Check if tomorrow has any tasks planned (for "Plan Tomorrow" card)
    const tmrTasks = await getTasksForDate(tomorrow);
    setTomorrowEmpty(tmrTasks.length === 0);

    // Kick off a Google Calendar sync. No-op if not connected. When it
    // finishes, reload today's tasks in case anything came in.
    syncWithGoogle().then(() => loadTodaysTasks(today));
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }

  // ── Open celebration modal when pendingCelebration fires ─────────────────────
  useEffect(() => {
    if (pendingCelebration) {
      setCelebModalVisible(true);
      fallAnim.setValue(0);
      Animated.timing(fallAnim, {
        toValue:         1,
        duration:        2800,
        useNativeDriver: true,
      }).start();
    }
  }, [pendingCelebration]);

  // ── Open box modal when pendingBoxReward fires ────────────────────────────────
  useEffect(() => {
    if (pendingBoxReward) {
      setBoxModalVisible(true);
    }
  }, [pendingBoxReward]);

  // ── Clear streakJustBroke message after 4 s ───────────────────────────────────
  useEffect(() => {
    if (streakJustBroke) {
      const t = setTimeout(() => setStreakJustBroke(false), 4000);
      return () => clearTimeout(t);
    }
  }, [streakJustBroke]);

  // ── Clear shieldConsumed message after 4 s ───────────────────────────────────
  useEffect(() => {
    if (shieldConsumed) {
      const t = setTimeout(() => setShieldConsumed(false), 4500);
      return () => clearTimeout(t);
    }
  }, [shieldConsumed]);

  // ── Nova state logic ──────────────────────────────────────────────────────────
  function getNovaState(): NovaState {
    if (pendingCelebration) return 'celebrating';
    const hour = new Date().getHours();
    if (hour < 7 || hour >= 21) return 'sleeping';
    if (todaysTasks.some((t) => t.completed)) return 'happy';
    return 'idle';
  }

  const novaState  = getNovaState();
  const isSleeping = novaState === 'sleeping';

  // ── Streak pulse ──────────────────────────────────────────────────────────────
  const pulse  = useRef(new Animated.Value(1)).current;
  const streak = settings?.current_streak ?? 0;

  useEffect(() => {
    if (streak > 0) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.08, duration: 750, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1,    duration: 750, useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => anim.stop();
    } else {
      pulse.setValue(1);
    }
  }, [streak]);

  // Bounce on app-open streak increase (fires when streak changes)
  const bounceAnim = useRef(new Animated.Value(1)).current;
  const prevStreak = useRef(streak);
  useEffect(() => {
    if (streak > prevStreak.current) {
      Animated.sequence([
        Animated.spring(bounceAnim, { toValue: 1.3, useNativeDriver: true, friction: 3 }),
        Animated.spring(bounceAnim, { toValue: 1,   useNativeDriver: true, friction: 4 }),
      ]).start();
    }
    prevStreak.current = streak;
  }, [streak]);

  // ── Confetti animation ────────────────────────────────────────────────────────
  const fallAnim = useRef(new Animated.Value(0)).current;

  // ── Treat count bounce animation ──────────────────────────────────────────────
  const treatBounce  = useRef(new Animated.Value(1)).current;
  const prevTreats   = useRef(settings?.treat_count ?? 0);
  useEffect(() => {
    const cur = settings?.treat_count ?? 0;
    if (cur > prevTreats.current) {
      Animated.sequence([
        Animated.spring(treatBounce, { toValue: 1.25, useNativeDriver: true, friction: 3 }),
        Animated.spring(treatBounce, { toValue: 1,    useNativeDriver: true, friction: 4 }),
      ]).start();
    }
    prevTreats.current = cur;
  }, [settings?.treat_count]);

  // ── Derived values ────────────────────────────────────────────────────────────
  const logged      = getHoursPerPillar(todaysTasks);
  const name        = settings?.companion_name   ?? 'Nova';
  const doneCount   = todaysTasks.filter((t) => t.completed).length;
  const treatCount  = settings?.treat_count      ?? 0;
  const shieldsOwned = settings?.shields_owned   ?? 0;
  const careEnabled = settings?.care_enabled     ?? false;

  const gradientColors: [string, string] = isSleeping
    ? ['#2D4A7A', '#1E3A5F']
    : ['#87CEEB', '#FFF8F0'];

  // Milestone details for the celebration modal
  const milestoneTitle  = `🎉 ${milestoneStreak}-Day Streak!`;
  const milestoneTreats = milestoneStreak === 7 ? 15 : milestoneStreak === 30 ? 35 : milestoneStreak === 100 ? 70 : 130;

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3C3489"
          />
        }
      >
        {/* ── Gradient header ─────────────────────────────────────── */}
        <LinearGradient colors={gradientColors} style={styles.header}>

          {/* Top row: treats (left) + gear (right) */}
          <View style={styles.topRow}>
            <TouchableOpacity onPress={() => navigation.navigate('Shop')}>
              <Animated.View style={[styles.treatsBadge, { transform: [{ scale: treatBounce }] }]}>
                <Text style={styles.treatsText}>🦴 {treatCount}</Text>
                {shieldsOwned > 0 && (
                  <Text style={styles.shieldsBadgeText}> 🛡️{shieldsOwned}</Text>
                )}
              </Animated.View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.gearBtn}
              onPress={() => setSettingsVisible(true)}
            >
              <Text style={styles.gearIcon}>⚙️</Text>
            </TouchableOpacity>
          </View>

          {/* Nova */}
          <NovaCompanion state={novaState} name={name} size={200} />

          {/* Pulsing streak badge — taps to Analytics */}
          {streak > 0 && (
            <TouchableOpacity onPress={() => navigation.navigate('Analytics')}>
              <Animated.View
                style={[
                  styles.streakBadge,
                  { transform: [{ scale: Animated.multiply(pulse, bounceAnim) }] },
                ]}
              >
                <Text style={styles.streakText}>🔥 {streak} day streak</Text>
              </Animated.View>
            </TouchableOpacity>
          )}

          {/* Tappable yesterday adherence → Analytics */}
          <TouchableOpacity
            style={styles.adherencePill}
            onPress={() => navigation.navigate('Analytics')}
          >
            <Text style={[
              styles.adherenceText,
              isSleeping && styles.adherenceTextOnDark,
            ]}>
              Yesterday: {yesterdayAdherence}%  →
            </Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Streak-broke gentle message */}
        {streakJustBroke && (
          <View style={styles.brokeBanner}>
            <Text style={styles.brokeText}>
              Streaks are made to be rebuilt. Let's plan today. 🐾
            </Text>
          </View>
        )}

        {/* Shield consumed message */}
        {shieldConsumed && (
          <View style={[styles.brokeBanner, styles.shieldBanner]}>
            <Text style={styles.shieldBannerText}>
              🛡️ Streak Shield activated! Your streak is safe.
            </Text>
          </View>
        )}

        {/* ── Progress bars (tap → Schedule) ────────────────────── */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('Schedule')}
          activeOpacity={0.85}
        >
          <Text style={styles.cardTitle}>Today's Progress  →</Text>

          <PillarBar
            label="Work"
            current={logged.work}
            target={settings?.work_target_hours ?? 8}
            color="#3C3489"
          />
          <PillarBar
            label="Personal"
            current={logged.personal}
            target={settings?.personal_target_hours ?? 6}
            color="#1D9E75"
          />
          <PillarBar
            label="Sleep"
            current={logged.sleep}
            target={settings?.sleep_target_hours ?? 8}
            color="#185FA5"
          />
          {careEnabled && (
            <PillarBar
              label="Care"
              current={logged.care}
              target={settings?.care_target_hours ?? 2}
              color="#D97706"
            />
          )}
        </TouchableOpacity>

        {/* ── Tasks summary (tap → Schedule) ────────────────────── */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('Schedule')}
          activeOpacity={0.85}
        >
          <Text style={styles.cardTitle}>Today's Tasks  →</Text>
          {todaysTasks.length === 0 ? (
            <Text style={styles.emptyHint}>
              No tasks yet. Tap to plan your day!
            </Text>
          ) : (
            <Text style={styles.taskCount}>
              {doneCount} of {todaysTasks.length} completed
            </Text>
          )}
        </TouchableOpacity>

        {/* ── Plan Tomorrow card (only when tomorrow is empty) ──── */}
        {tomorrowEmpty && (
          <TouchableOpacity
            style={[styles.card, styles.tomorrowCard]}
            onPress={() => navigation.navigate('Schedule')}
            activeOpacity={0.85}
          >
            <Text style={styles.tomorrowTitle}>📅 Plan Tomorrow</Text>
            <Text style={styles.tomorrowSub}>
              Tomorrow has no tasks yet. Get ahead of your day!
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* ── Settings modal ───────────────────────────────────────── */}
      <SettingsScreen
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
      />

      {/* ── Streak celebration modal ─────────────────────────────── */}
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
            <NovaCompanion state="celebrating" name={name} size={140} />
            <Text style={styles.celebTitle}>{milestoneTitle}</Text>
            <Text style={styles.celebSubtitle}>Nova is so proud of you!</Text>
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

      {/* ── Weekly accuracy box modal ────────────────────────────── */}
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
            <NovaCompanion state="happy" name={name} size={120} />
            <Text style={styles.celebTitle}>
              {weeklyBoxLabel(pendingBoxReward?.tier ?? 'basic')}
            </Text>
            <Text style={styles.celebSubtitle}>
              Last week's adherence: {pendingBoxReward?.adherence ?? 0}%
            </Text>
            <Text style={styles.boxDescription}>
              {pendingBoxReward?.tier === 'gold'
                ? 'Outstanding! You crushed your goals last week.'
                : pendingBoxReward?.tier === 'silver'
                ? 'Great effort! You stayed consistent last week.'
                : 'Good start! Let\'s aim higher this week.'}
            </Text>
            <View style={styles.celebBonus}>
              <Text style={styles.celebBonusText}>
                +{pendingBoxReward?.treats ?? 0} treats! 🦴
              </Text>
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

// ─── PillarBar — progress bar with label and "X.X / Y hrs" ───────────────────
function PillarBar({
  label, current, target, color,
}: { label: string; current: number; target: number; color: string }) {
  const ratio     = target > 0 ? Math.min(1, current / target) : 0;
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue:         ratio,
      duration:        500,
      useNativeDriver: false,
    }).start();
  }, [ratio]);

  return (
    <View style={barStyles.row}>
      <Text style={barStyles.label}>{label}</Text>
      <View style={barStyles.track}>
        <Animated.View
          style={[
            barStyles.fill,
            {
              backgroundColor: color,
              width: widthAnim.interpolate({
                inputRange:  [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
      <Text style={[barStyles.value, { color }]}>
        {current.toFixed(1)} / {target}h
      </Text>
    </View>
  );
}

const barStyles = StyleSheet.create({
  row: {
    flexDirection:  'row',
    alignItems:     'center',
    marginBottom:   14,
  },
  label: {
    width:      64,
    fontSize:   13,
    fontWeight: '600',
    color:      '#374151',
  },
  track: {
    flex:            1,
    height:          8,
    backgroundColor: '#F3F4F6',
    borderRadius:    4,
    overflow:        'hidden',
    marginHorizontal: 10,
  },
  fill: {
    height:       '100%',
    borderRadius: 4,
  },
  value: {
    width:      68,
    fontSize:   12,
    fontWeight: '600',
    textAlign:  'right',
  },
});

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scroll: {
    flex:            1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    paddingTop:       56,
    paddingBottom:    28,
    paddingHorizontal: 20,
    alignItems:       'center',
  },
  topRow: {
    flexDirection:  'row',
    width:          '100%',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   8,
  },
  treatsBadge: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 12,
    paddingVertical:   6,
    borderRadius:      20,
  },
  treatsText: {
    fontSize:   13,
    fontWeight: '700',
    color:      '#92400E',
  },
  gearBtn: {
    width:          38,
    height:         38,
    alignItems:     'center',
    justifyContent: 'center',
  },
  gearIcon: { fontSize: 24 },
  streakBadge: {
    backgroundColor: '#F97316',
    paddingHorizontal: 18,
    paddingVertical:    8,
    borderRadius:      24,
    marginTop:         12,
    marginBottom:       8,
    shadowColor:       '#F97316',
    shadowOffset:      { width: 0, height: 3 },
    shadowOpacity:     0.45,
    shadowRadius:       6,
    elevation:          5,
  },
  streakText: {
    color:      '#FFFFFF',
    fontWeight: '700',
    fontSize:   14,
  },
  adherencePill: {
    backgroundColor: 'rgba(255,255,255,0.75)',
    paddingHorizontal: 14,
    paddingVertical:    6,
    borderRadius:      20,
    marginTop:          6,
  },
  adherenceText: {
    fontSize:   13,
    fontWeight: '600',
    color:      '#374151',
  },
  adherenceTextOnDark: {
    color: '#CBD5E1',
  },
  shieldsBadgeText: {
    fontSize:   12,
    fontWeight: '700',
    color:      '#1D4ED8',
  },
  brokeBanner: {
    marginHorizontal: 16,
    marginTop:        12,
    backgroundColor:  '#F3F4F6',
    borderRadius:     12,
    padding:          14,
    borderLeftWidth:   3,
    borderLeftColor:  '#9CA3AF',
  },
  brokeText: {
    fontSize:   14,
    color:      '#6B7280',
    lineHeight: 20,
  },
  shieldBanner: {
    backgroundColor: '#EFF6FF',
    borderLeftColor: '#3B82F6',
  },
  shieldBannerText: {
    fontSize:   14,
    color:      '#1D4ED8',
    lineHeight: 20,
  },
  tomorrowCard: {
    backgroundColor: '#F0FDF4',
    borderWidth:      1,
    borderColor:      '#BBF7D0',
  },
  tomorrowTitle: {
    fontSize:     16,
    fontWeight:   '700',
    color:        '#166534',
    marginBottom: 4,
  },
  tomorrowSub: {
    fontSize:  14,
    color:     '#4B7C62',
    lineHeight: 20,
  },
  boxDescription: {
    fontSize:   14,
    color:      '#6B7280',
    textAlign:  'center',
    marginTop:   8,
    lineHeight:  20,
    paddingHorizontal: 8,
  },
  card: {
    backgroundColor:  '#FFFFFF',
    borderRadius:     16,
    padding:          20,
    marginHorizontal: 16,
    marginTop:        16,
    shadowColor:      '#000',
    shadowOffset:     { width: 0, height: 2 },
    shadowOpacity:    0.06,
    shadowRadius:      8,
    elevation:         2,
  },
  cardTitle: {
    fontSize:     17,
    fontWeight:   '700',
    color:        '#1F2937',
    marginBottom: 14,
  },
  taskCount: {
    fontSize: 16,
    color:    '#374151',
  },
  emptyHint: {
    fontSize:   14,
    color:      '#9CA3AF',
    fontStyle:  'italic',
  },

  // ── Celebration modal ────────────────────────────────────────────────────────
  celebOverlay: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems:      'center',
    justifyContent:  'center',
  },
  confetti: {
    position: 'absolute',
    top:      0,
  },
  celebCard: {
    backgroundColor: '#FFFFFF',
    borderRadius:    24,
    padding:         32,
    width:           SCREEN_W - 48,
    alignItems:      'center',
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 8 },
    shadowOpacity:   0.2,
    shadowRadius:    16,
    elevation:        10,
  },
  celebTitle: {
    fontSize:     32,
    fontWeight:   '800',
    color:        '#1F2937',
    textAlign:    'center',
    marginTop:    8,
  },
  celebSubtitle: {
    fontSize:    16,
    color:       '#6B7280',
    marginTop:    6,
    textAlign:   'center',
  },
  celebBonus: {
    backgroundColor:  '#FEF3C7',
    borderRadius:     12,
    paddingHorizontal: 20,
    paddingVertical:    8,
    marginTop:         16,
  },
  celebBonusText: {
    fontSize:   18,
    fontWeight: '700',
    color:      '#92400E',
  },
  celebBtn: {
    marginTop:         24,
    backgroundColor:   '#3C3489',
    borderRadius:      14,
    paddingVertical:   14,
    paddingHorizontal: 48,
  },
  celebBtnText: {
    color:      '#FFFFFF',
    fontSize:   17,
    fontWeight: '700',
  },
});
