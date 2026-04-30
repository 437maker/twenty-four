// HomeScreen.tsx — The main dashboard: Nova, streak, progress bars, and today's summary.

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAppStore } from '../store/useAppStore';
import ProgressBar from '../components/ProgressBar';
import { getTodayString } from '../utils/dateHelpers';
import { calculatePlanAdherence, getHoursPerPillar } from '../utils/calculations';
import { getTasksForDate } from '../db/queries';

export default function HomeScreen() {
  const { settings, loadTodaysTasks, todaysTasks } = useAppStore();

  const [yesterdayAdherence, setYesterdayAdherence] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const today = getTodayString();

  // useFocusEffect re-runs its callback every time this screen comes into focus.
  // This means the home screen always shows fresh data when you navigate back to it.
  // React.useCallback with [] means "create this function once and reuse it".
  useFocusEffect(
    React.useCallback(() => {
      loadAll();
    }, [today])
  );

  async function loadAll() {
    await loadTodaysTasks(today);

    // Calculate yesterday's adherence for the badge
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yTasks = await getTasksForDate(d.toISOString().split('T')[0]);
    setYesterdayAdherence(calculatePlanAdherence(yTasks));
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }

  // Compute hours per pillar from today's completed tasks
  const logged = getHoursPerPillar(todaysTasks);
  const name = settings?.companion_name ?? 'Nova';
  const streak = settings?.current_streak ?? 0;
  const doneCount = todaysTasks.filter((t) => t.completed).length;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={
        // Pull-to-refresh: drag down from the top to reload data
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3C3489" />
      }
    >
      {/* ── Sky-blue header ─────────────────────── */}
      <View style={styles.header}>
        {/* Streak badge — top right corner */}
        <View style={styles.streakBadge}>
          <Text style={styles.streakText}>🔥 {streak} day streak</Text>
        </View>

        {/* Nova */}
        <View style={styles.novaBox}>
          <Text style={styles.novaEmoji}>🐕</Text>
          <Text style={styles.novaName}>{name}</Text>
        </View>

        {/* Yesterday's adherence */}
        <View style={styles.adherencePill}>
          <Text style={styles.adherenceText}>
            Yesterday: {yesterdayAdherence}% adherence
          </Text>
        </View>
      </View>

      {/* ── Today's progress bars ───────────────── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today's Progress</Text>
        <ProgressBar
          label="Work"
          current={logged.work}
          target={settings?.work_target_hours ?? 8}
          color="#3C3489"
        />
        <ProgressBar
          label="Personal"
          current={logged.personal}
          target={settings?.personal_target_hours ?? 6}
          color="#1D9E75"
        />
        <ProgressBar
          label="Sleep"
          current={logged.sleep}
          target={settings?.sleep_target_hours ?? 8}
          color="#185FA5"
        />
      </View>

      {/* ── Task count summary ──────────────────── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today's Tasks</Text>
        {todaysTasks.length === 0 ? (
          <Text style={styles.emptyHint}>
            No tasks yet. Head to Schedule to plan your day! →
          </Text>
        ) : (
          <Text style={styles.taskCount}>
            {doneCount} of {todaysTasks.length} completed
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    backgroundColor: '#87CEEB',
    paddingTop: 56,
    paddingBottom: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  streakBadge: {
    alignSelf: 'flex-end',
    backgroundColor: '#F97316',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  streakText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  novaBox: {
    alignItems: 'center',
    marginBottom: 12,
  },
  novaEmoji: {
    fontSize: 84,
  },
  novaName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 4,
  },
  adherencePill: {
    backgroundColor: 'rgba(255,255,255,0.75)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  adherenceText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 14,
  },
  taskCount: {
    fontSize: 16,
    color: '#374151',
  },
  emptyHint: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
});
