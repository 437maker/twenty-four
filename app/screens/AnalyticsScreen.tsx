// AnalyticsScreen.tsx
// ---------------------------------------------------------------------------
// Full analytics dashboard for the "24" habit & time-balance tracker.
//
// Sections (top → bottom):
//   1. Rotating Insights card  — one personalised tip
//   2. Summary cards row       — streak, adherence overview
//   3. Weekly bar chart        — last 7 days, tap for detail
//   4. Monthly dot grid        — last 30 days colour-coded
//   5. Pillar balance bar      — stacked horizontal bar this week
//   6. Streak history          — last 5 completed streaks
//   7. Daily breakdown         — last 14 days, tap to expand
// ---------------------------------------------------------------------------

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

// ─── Internal imports ────────────────────────────────────────────────────────
// The Zustand store holds user settings (streak, targets, care toggle, etc.)
import { useAppStore } from '../store/useAppStore';

// Database query helpers
import {
  getTasksForDates,
  getRecentStreaks,
  getJournalEntry,
} from '../db/queries';

// Pure calculation helpers — no side effects, easy to test
import {
  calculatePlanAdherence,
  getHoursPerPillar,
  getLastNDates,
  adherenceColor,
  buildDayAnalytics,
  weeklyAdherence,
  dayAbbr,
  mostBalancedDay,
  leastBalancedDay,
} from '../utils/calculations';

// Date utilities
import { getTodayString } from '../utils/dateHelpers';

// TypeScript types
import { Task, DayAnalytics, StreakHistoryEntry } from '../types';

// ─── Sprint 2: Monthly + Yearly analytics sections ───────────────────────────
import MonthlySection from './analytics/MonthlySection';
import YearlySection  from './analytics/YearlySection';

// ─── Constants ────────────────────────────────────────────────────────────────
const SCREEN_WIDTH = Dimensions.get('window').width;

// Pillar brand colours — one colour per pillar, used in stacked bar + dots
const PILLAR_COLORS: Record<string, string> = {
  work:     '#3C3489',
  personal: '#1D9E75',
  sleep:    '#185FA5',
  care:     '#D97706',
};

// Human-readable pillar labels
const PILLAR_LABELS: Record<string, string> = {
  work:     'Work',
  personal: 'Personal',
  sleep:    'Sleep',
  care:     'Care',
};

// ─── Helper: friendly date label ─────────────────────────────────────────────
// Converts "2025-01-06" → "Mon Jan 6"
function friendlyDate(dateStr: string): string {
  // We add T12:00:00 so JavaScript doesn't shift the date due to timezone offset
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// ─── Helper: day of week name from date string ────────────────────────────────
// Used for insight: "You're most consistent on Tuesday"
function dayOfWeekName(dateStr: string): string {
  const names = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  return names[new Date(dateStr + 'T12:00:00').getDay()];
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function AnalyticsScreen() {
  // ── State ──────────────────────────────────────────────────────────────────
  // Pull user settings from the global Zustand store
  const settings = useAppStore((s) => s.settings);

  // All 30 days of analytics data (one DayAnalytics per day)
  const [days30, setDays30] = useState<DayAnalytics[]>([]);

  // Completed streak history rows
  const [streakHistory, setStreakHistory] = useState<StreakHistoryEntry[]>([]);

  // Loading / refreshing flag — drives the pull-to-refresh spinner
  const [refreshing, setRefreshing] = useState(false);

  // Which bar in the weekly chart the user tapped (date string, or null)
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Which daily-breakdown row is expanded (date string, or null)
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Animated fade-in value for the insight card text (so it cross-fades)
  const insightOpacity = useRef(new Animated.Value(1)).current;

  // ── Data loading ───────────────────────────────────────────────────────────
  // This function fetches everything fresh from SQLite.
  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      // 1. Get the list of date strings for the last 30 days, e.g. ["2025-01-01", …]
      const dates = getLastNDates(30);

      // 2. Fetch all tasks for those dates in one query
      //    taskMap = { "2025-01-01": [task, task], "2025-01-02": [], … }
      const taskMap = await getTasksForDates(dates);

      // 3. For each date, check whether the journal entry marks it as an exception day
      //    (exception days = sick days, holidays — we exclude them from adherence calc)
      const exceptionDates = new Set<string>();
      await Promise.all(
        dates.map(async (date) => {
          const entry = await getJournalEntry(date);
          if (entry?.is_exception_day) exceptionDates.add(date);
        })
      );

      // 4. Build structured DayAnalytics objects from the raw task map
      //    This calls calculatePlanAdherence internally
      const analytics = buildDayAnalytics(taskMap, exceptionDates);

      // 5. Sort oldest → newest so charts render left to right
      analytics.sort((a, b) => a.date.localeCompare(b.date));
      setDays30(analytics);

      // 6. Load the most recent completed streaks (up to 5)
      const streaks = await getRecentStreaks(5);
      setStreakHistory(streaks);
    } catch (err) {
      // In a production app we'd show a toast, but for now just log
      console.error('[AnalyticsScreen] loadData error:', err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Re-fetch whenever the screen comes into focus (e.g., user switches back from Schedule)
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Fade the insight text in whenever days30 changes (cross-fade effect)
  useEffect(() => {
    insightOpacity.setValue(0);
    Animated.timing(insightOpacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [days30]);

  // ── Derived data ───────────────────────────────────────────────────────────
  // Check whether there is *any* task data to show
  const totalTasks = days30.reduce((sum, d) => sum + d.tasks.length, 0);
  const hasAnyData = totalTasks > 0;

  // Slice out the last 7 days and last 14 days from our sorted 30-day array
  const days7  = days30.slice(-7);
  const days14 = days30.slice(-14);

  // Adherence percentages for the summary cards
  const thisWeekAdherence = weeklyAdherence(days7);
  const overallAdherence  = weeklyAdherence(days30);

  // Targets — fall back to safe defaults while settings loads from SQLite
  const targets = {
    work:     settings?.work_target_hours     ?? 8,
    personal: settings?.personal_target_hours ?? 4,
    sleep:    settings?.sleep_target_hours    ?? 8,
    care:     settings?.care_enabled ? (settings?.care_target_hours ?? 2) : 0,
  };

  // Most / least balanced day labels for the pillar section
  const mostBalanced  = mostBalancedDay(days7, targets);
  const leastBalanced = leastBalancedDay(days7, targets);

  // Average hours per pillar this week (sum ÷ number of days that have tasks)
  const daysWithTasks7 = days7.filter((d) => d.tasks.length > 0);
  const avgPillarHours = daysWithTasks7.length === 0
    ? { work: 0, personal: 0, sleep: 0, care: 0 }
    : {
        work:     daysWithTasks7.reduce((s, d) => s + getHoursPerPillar(d.tasks).work, 0)     / daysWithTasks7.length,
        personal: daysWithTasks7.reduce((s, d) => s + getHoursPerPillar(d.tasks).personal, 0) / daysWithTasks7.length,
        sleep:    daysWithTasks7.reduce((s, d) => s + getHoursPerPillar(d.tasks).sleep, 0)    / daysWithTasks7.length,
        care:     daysWithTasks7.reduce((s, d) => s + getHoursPerPillar(d.tasks).care, 0)     / daysWithTasks7.length,
      };

  // Total hours (for the stacked bar width calculation)
  const totalAvgHours =
    avgPillarHours.work + avgPillarHours.personal + avgPillarHours.sleep + avgPillarHours.care;

  // ── Insight picker ─────────────────────────────────────────────────────────
  // We try each insight in priority order and return the first one with data.
  const insightText = (() => {
    // Not enough data yet
    if (days30.filter((d) => d.tasks.length > 0).length < 7) {
      return '📅 Keep logging to unlock your personal insights!';
    }

    // "You're most consistent on [Day]" — find day-of-week with highest avg adherence
    const dowSums: Record<number, { total: number; count: number }> = {};
    for (const day of days30) {
      if (day.tasks.length === 0) continue;
      const dow = new Date(day.date + 'T12:00:00').getDay();
      if (!dowSums[dow]) dowSums[dow] = { total: 0, count: 0 };
      dowSums[dow].total += day.adherence;
      dowSums[dow].count += 1;
    }
    let bestDow = -1;
    let bestAvg = -1;
    for (const [dow, { total, count }] of Object.entries(dowSums)) {
      const avg = total / count;
      if (avg > bestAvg) { bestAvg = avg; bestDow = Number(dow); }
    }
    if (bestDow >= 0) {
      const names = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
      return `⭐ You're most consistent on ${names[bestDow]}s!`;
    }

    // "Your Sleep average this week: X.Xh"
    if (avgPillarHours.sleep > 0) {
      return `😴 Your Sleep average this week: ${avgPillarHours.sleep.toFixed(1)}h`;
    }

    // "You've completed X tasks this week!"
    const completedThisWeek = days7
      .flatMap((d) => d.tasks)
      .filter((t) => t.completed).length;
    if (completedThisWeek > 0) {
      return `✅ You've completed ${completedThisWeek} tasks this week!`;
    }

    // Fallback: best adherence day
    const bestDay = [...days7].sort((a, b) => b.adherence - a.adherence).find((d) => d.tasks.length > 0);
    if (bestDay) {
      return `📈 Your best adherence day this week: ${dayAbbr(bestDay.date)} (${bestDay.adherence}%)`;
    }

    // Generic fallback
    return '💡 Tap any bar to see your daily breakdown!';
  })();

  // ── Render helpers ─────────────────────────────────────────────────────────

  // Renders the selected-day detail card below the weekly bar chart
  const renderSelectedDayDetail = () => {
    if (!selectedDay) return null;
    const day = days30.find((d) => d.date === selectedDay);
    if (!day) return null;

    const completed = day.tasks.filter((t) => t.completed).length;
    const total     = day.tasks.length;
    const pillarHrs = getHoursPerPillar(day.tasks);
    const pillars   = (['work', 'personal', 'sleep', 'care'] as const).filter(
      (p) => p !== 'care' || settings?.care_enabled
    );

    return (
      <View style={styles.detailCard}>
        {/* Date and overall adherence */}
        <Text style={styles.detailCardDate}>{friendlyDate(selectedDay)}</Text>
        <Text style={styles.detailCardAdherence}>
          Adherence: {day.tasks.length > 0 ? `${day.adherence}%` : 'No data'}
        </Text>
        {/* Task completion count */}
        {total > 0 && (
          <Text style={styles.detailCardTasks}>
            Tasks: {completed}/{total} completed
          </Text>
        )}
        {/* Hours per pillar as small coloured dots with labels */}
        {total > 0 && (
          <View style={styles.detailPillarRow}>
            {pillars.map((p) => (
              <View key={p} style={styles.detailPillarItem}>
                {/* Coloured dot */}
                <View style={[styles.detailPillarDot, { backgroundColor: PILLAR_COLORS[p] }]} />
                <Text style={styles.detailPillarLabel}>
                  {PILLAR_LABELS[p]}: {pillarHrs[p].toFixed(1)}h
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        // Pull-to-refresh — drag down to reload all data from SQLite
        <RefreshControl
          refreshing={refreshing}
          onRefresh={loadData}
          tintColor="#3C3489"
          colors={['#3C3489']}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* ── Screen title ─────────────────────────────────────────────────── */}
      <Text style={styles.screenTitle}>Analytics</Text>

      {/* ── Empty state ─────────────────────────────────────────────────── */}
      {/* Show this instead of all the charts if the user has no task data yet */}
      {!hasAnyData ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            Start planning to see your progress! 📊
          </Text>
          <Text style={styles.emptyStateSubtext}>
            Add tasks in the Schedule tab, then come back here.
          </Text>
        </View>
      ) : (
        <>
          {/* ════════════════════════════════════════════════════════════════
              SECTION 1 — INSIGHTS CARD
              One rotating line personalised to the user's data.
          ════════════════════════════════════════════════════════════════ */}
          <View style={styles.insightCard}>
            {/* Animated.Text fades in each time the insight changes */}
            <Animated.Text style={[styles.insightText, { opacity: insightOpacity }]}>
              {insightText}
            </Animated.Text>
          </View>

          {/* ════════════════════════════════════════════════════════════════
              SECTION 2 — SUMMARY CARDS (horizontal scrollable row)
              Four quick-glance metrics.
          ════════════════════════════════════════════════════════════════ */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.summaryRow}
            contentContainerStyle={styles.summaryRowContent}
          >
            {/* Each summaryCard is 120px wide with a purple left border */}
            <SummaryCard emoji="🔥" label="Current Streak" value={`${settings?.current_streak ?? 0} days`} />
            <SummaryCard emoji="🏆" label="Best Streak"    value={`${settings?.longest_streak ?? 0} days`} />
            <SummaryCard emoji="📊" label="This Week"      value={`${thisWeekAdherence}%`} />
            <SummaryCard emoji="📈" label="Overall"        value={`${overallAdherence}%`} />
          </ScrollView>

          {/* ════════════════════════════════════════════════════════════════
              SECTION 3 — WEEKLY BAR CHART (last 7 days)
          ════════════════════════════════════════════════════════════════ */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>This Week</Text>
            {/* Subtitle: total tasks completed out of planned */}
            <Text style={styles.cardSubtitle}>
              {days7.flatMap((d) => d.tasks).filter((t) => t.completed).length}
              {' / '}
              {days7.flatMap((d) => d.tasks).length} tasks completed
            </Text>

            {/* Bar chart container — a horizontal row of 7 bars */}
            <View style={styles.barChartContainer}>
              {days7.map((day) => {
                const hasData   = day.tasks.length > 0;
                const barColor  = adherenceColor(day.adherence, hasData);
                // Bar height is proportional to adherence (max 120px)
                const barHeight = hasData ? Math.max(6, (day.adherence / 100) * 120) : 6;
                const isSelected = selectedDay === day.date;

                return (
                  <TouchableOpacity
                    key={day.date}
                    style={styles.barWrapper}
                    onPress={() =>
                      // Tap toggles selection — tap same bar again to deselect
                      setSelectedDay(isSelected ? null : day.date)
                    }
                    activeOpacity={0.7}
                  >
                    {/* Percentage label above the bar (hidden if 0 and no data) */}
                    <Text style={styles.barLabel}>
                      {hasData ? `${day.adherence}%` : ''}
                    </Text>

                    {/* The actual bar — sits at the bottom of a 130px tall space */}
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.bar,
                          {
                            height:          barHeight,
                            backgroundColor: barColor,
                            // Highlight selected bar with a slight border
                            borderWidth:     isSelected ? 2 : 0,
                            borderColor:     '#3C3489',
                          },
                        ]}
                      />
                    </View>

                    {/* Day label below the bar: Mon, Tue, … */}
                    <Text style={styles.barDayLabel}>{dayAbbr(day.date)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Expandable detail card — shown when a bar is tapped */}
            {renderSelectedDayDetail()}
          </View>

          {/* ════════════════════════════════════════════════════════════════
              SECTION 4 — MONTHLY DOT GRID (last 30 days)
          ════════════════════════════════════════════════════════════════ */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Last 30 Days</Text>

            {/* Grid: 7 dots per row, each 14px wide with 6px gap */}
            <View style={styles.dotGrid}>
              {days30.map((day) => {
                const today = getTodayString();
                // Guard against future dates (shouldn't happen with getLastNDates, but be safe)
                const isFuture = day.date > today;
                const hasData  = day.tasks.length > 0;
                const color    = adherenceColor(day.adherence, hasData);

                return (
                  <View
                    key={day.date}
                    style={[
                      styles.dot,
                      {
                        backgroundColor: color,
                        // Future dates are very faint
                        opacity: isFuture ? 0.15 : 1,
                      },
                    ]}
                  />
                );
              })}
            </View>

            {/* Legend row */}
            <View style={styles.legendRow}>
              <Text style={styles.legendItem}>🟢 80%+</Text>
              <Text style={styles.legendItem}>🟡 65–79%</Text>
              <Text style={styles.legendItem}>🔴 &lt;65%</Text>
              <Text style={styles.legendItem}>⬜ No data</Text>
            </View>
          </View>

          {/* ════════════════════════════════════════════════════════════════
              SECTION 5 — PILLAR BALANCE (this week's average hours)
          ════════════════════════════════════════════════════════════════ */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Pillar Balance — This Week</Text>

            {totalAvgHours === 0 ? (
              <Text style={styles.emptyNote}>No completed tasks this week.</Text>
            ) : (
              <>
                {/* Stacked horizontal bar — each segment is proportional to avg hours */}
                <View style={styles.stackedBar}>
                  {(
                    (['work', 'personal', 'sleep', 'care'] as const).filter(
                      (p) => p !== 'care' || settings?.care_enabled
                    )
                  ).map((p) => {
                    const hrs = avgPillarHours[p];
                    if (hrs === 0) return null;
                    // Width as % of total avg hours (flex approach)
                    const widthPct = (hrs / totalAvgHours) * 100;
                    return (
                      <View
                        key={p}
                        style={[
                          styles.stackedSegment,
                          {
                            width:           `${widthPct}%`,
                            backgroundColor: PILLAR_COLORS[p],
                          },
                        ]}
                      />
                    );
                  })}
                </View>

                {/* Label row below the stacked bar */}
                <View style={styles.stackedLabelRow}>
                  {(
                    (['work', 'personal', 'sleep', 'care'] as const).filter(
                      (p) => p !== 'care' || settings?.care_enabled
                    )
                  ).map((p) => {
                    if (avgPillarHours[p] === 0) return null;
                    return (
                      <View key={p} style={styles.stackedLabelItem}>
                        <View style={[styles.stackedLabelDot, { backgroundColor: PILLAR_COLORS[p] }]} />
                        <Text style={styles.stackedLabelText}>
                          {PILLAR_LABELS[p]} {avgPillarHours[p].toFixed(1)}h
                        </Text>
                      </View>
                    );
                  })}
                </View>

                {/* Most / least balanced day */}
                <View style={styles.balanceRow}>
                  {mostBalanced ? (
                    <Text style={styles.balanceNote}>
                      Most balanced: {friendlyDate(mostBalanced)}
                    </Text>
                  ) : null}
                  {leastBalanced ? (
                    <Text style={styles.balanceNote}>
                      Least balanced: {friendlyDate(leastBalanced)}
                    </Text>
                  ) : null}
                </View>
              </>
            )}
          </View>

          {/* ════════════════════════════════════════════════════════════════
              SECTION 6 — STREAK HISTORY
          ════════════════════════════════════════════════════════════════ */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Streak History</Text>

            {streakHistory.length === 0 ? (
              <Text style={styles.emptyNote}>
                No completed streaks yet — keep going!
              </Text>
            ) : (
              streakHistory.map((s) => (
                <View key={s.id} style={styles.streakRow}>
                  <Text style={styles.streakText}>
                    🔥 {s.length} days
                  </Text>
                  <Text style={styles.streakDates}>
                    {s.start_date} – {s.end_date}
                  </Text>
                </View>
              ))
            )}
          </View>

          {/* ════════════════════════════════════════════════════════════════
              SECTION 7 — DAILY BREAKDOWN (last 14 days, expandable rows)
          ════════════════════════════════════════════════════════════════ */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Daily Breakdown</Text>

            {[...days14].reverse().map((day) => {
              // Is this row currently expanded?
              const isExpanded = expandedRow === day.date;
              const hasData    = day.tasks.length > 0;
              const completed  = day.tasks.filter((t) => t.completed).length;
              const badgeColor = adherenceColor(day.adherence, hasData);
              const pillarHrs  = getHoursPerPillar(day.tasks);
              const pillars    = (['work', 'personal', 'sleep', 'care'] as const).filter(
                (p) => p !== 'care' || settings?.care_enabled
              );

              return (
                <View key={day.date}>
                  {/* Tappable row header */}
                  <TouchableOpacity
                    style={styles.breakdownRow}
                    onPress={() => setExpandedRow(isExpanded ? null : day.date)}
                    activeOpacity={0.7}
                  >
                    {/* Date text */}
                    <Text style={styles.breakdownDate}>{friendlyDate(day.date)}</Text>

                    <View style={styles.breakdownRight}>
                      {/* Adherence badge — coloured pill */}
                      <View style={[styles.adherenceBadge, { backgroundColor: badgeColor }]}>
                        <Text style={styles.adherenceBadgeText}>
                          {hasData ? `${day.adherence}%` : '—'}
                        </Text>
                      </View>

                      {/* Task count */}
                      <Text style={styles.breakdownCount}>
                        {hasData ? `${completed}/${day.tasks.length}` : 'No tasks'}
                      </Text>

                      {/* Expand/collapse chevron */}
                      <Text style={styles.chevron}>{isExpanded ? '▲' : '▼'}</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Expanded content — task list + pillar hours */}
                  {isExpanded && day.tasks.length > 0 && (
                    <View style={styles.breakdownExpanded}>
                      {/* Individual task rows */}
                      {day.tasks.map((task) => (
                        <View key={task.id} style={styles.taskRow}>
                          {/* ✓ for done, ○ for not done */}
                          <Text style={[
                            styles.taskCheck,
                            { color: task.completed ? '#4CAF50' : '#BDBDBD' },
                          ]}>
                            {task.completed ? '✓' : '○'}
                          </Text>
                          <Text
                            style={[
                              styles.taskName,
                              task.completed && styles.taskNameDone,
                            ]}
                            numberOfLines={1}
                          >
                            {task.name}
                          </Text>
                          <Text style={styles.taskDuration}>
                            {task.duration_hours}h
                          </Text>
                        </View>
                      ))}

                      {/* Pillar hours summary for this day */}
                      <View style={styles.breakdownPillarRow}>
                        {pillars.map((p) => {
                          if (pillarHrs[p] === 0) return null;
                          return (
                            <View key={p} style={styles.breakdownPillarItem}>
                              <View style={[styles.detailPillarDot, { backgroundColor: PILLAR_COLORS[p] }]} />
                              <Text style={styles.detailPillarLabel}>
                                {PILLAR_LABELS[p]}: {pillarHrs[p].toFixed(1)}h
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  )}

                  {/* Divider line between rows */}
                  <View style={styles.divider} />
                </View>
              );
            })}
          </View>

          {/* ── Section 8: Monthly Analytics (Sprint 2) ──────────────────── */}
          <MonthlySection
            settings={settings}
            appStartDate={settings?.app_start_date ?? null}
          />

          {/* ── Section 9: Yearly Overview (Sprint 2) ────────────────────── */}
          <YearlySection
            settings={settings}
            appStartDate={settings?.app_start_date ?? null}
          />
        </>
      )}
    </ScrollView>
  );
}

// ─── Sub-component: SummaryCard ───────────────────────────────────────────────
// A small 120px-wide card used in the horizontal summary row.
function SummaryCard({
  emoji,
  label,
  value,
}: {
  emoji: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryEmoji}>{emoji}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── Scroll container ────────────────────────────────────────────────────────
  scroll: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  scrollContent: {
    paddingBottom: 100, // leave room above the bottom tab bar
  },

  // ── Screen title ────────────────────────────────────────────────────────────
  screenTitle: {
    fontSize:    28,
    fontWeight:  'bold',
    color:       '#1A1A2E',
    paddingTop:  52,           // safe area padding (no SafeAreaView needed)
    paddingLeft: 20,
    marginBottom: 16,
  },

  // ── Generic white card ──────────────────────────────────────────────────────
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius:    16,
    elevation:       2,              // Android shadow
    shadowColor:     '#000',         // iOS shadow
    shadowOpacity:   0.06,
    shadowRadius:    8,
    shadowOffset:    { width: 0, height: 2 },
    padding:         16,
    marginHorizontal: 16,
    marginBottom:    16,
  },

  cardTitle: {
    fontSize:    17,
    fontWeight:  '700',
    color:       '#1A1A2E',
    marginBottom: 4,
  },

  cardSubtitle: {
    fontSize:    13,
    color:       '#888',
    marginBottom: 14,
  },

  // ── Empty state ─────────────────────────────────────────────────────────────
  emptyState: {
    margin:      32,
    alignItems:  'center',
  },
  emptyStateText: {
    fontSize:   20,
    fontWeight: '600',
    color:      '#3C3489',
    textAlign:  'center',
  },
  emptyStateSubtext: {
    fontSize:   14,
    color:      '#888',
    marginTop:  8,
    textAlign:  'center',
  },
  emptyNote: {
    fontSize: 14,
    color:    '#888',
    marginTop: 4,
  },

  // ── Section 1: Insight card ─────────────────────────────────────────────────
  insightCard: {
    backgroundColor: '#E8E5F5',
    borderRadius:    16,
    padding:         16,
    marginHorizontal: 16,
    marginBottom:    16,
  },
  insightText: {
    fontSize:   15,
    fontWeight: '600',
    color:      '#3C3489',
    lineHeight: 22,
  },

  // ── Section 2: Summary row ──────────────────────────────────────────────────
  summaryRow: {
    marginBottom: 16,
  },
  summaryRowContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  summaryCard: {
    width:           120,
    backgroundColor: '#FFFFFF',
    borderRadius:    12,
    elevation:       2,
    shadowColor:     '#000',
    shadowOpacity:   0.05,
    shadowRadius:    6,
    shadowOffset:    { width: 0, height: 1 },
    padding:         12,
    // Purple left border — the characteristic stripe
    borderLeftWidth: 4,
    borderLeftColor: '#3C3489',
  },
  summaryEmoji: {
    fontSize:    22,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize:    18,
    fontWeight:  '800',
    color:       '#1A1A2E',
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 11,
    color:    '#888',
  },

  // ── Section 3: Bar chart ────────────────────────────────────────────────────
  barChartContainer: {
    flexDirection: 'row',
    alignItems:    'flex-end',
    justifyContent:'space-between',
    marginTop:     8,
  },
  barWrapper: {
    flex:       1,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  barLabel: {
    fontSize:     9,
    color:        '#555',
    marginBottom: 2,
    textAlign:    'center',
  },
  barTrack: {
    // The full-height container for the bar (bars grow from the bottom)
    height:          130,
    justifyContent:  'flex-end',
    width:           '100%',
  },
  bar: {
    width:        '100%',
    borderRadius: 4,
    minHeight:    6, // always show at least a sliver for days with no data
  },
  barDayLabel: {
    fontSize:  10,
    color:     '#555',
    marginTop: 4,
    textAlign: 'center',
  },

  // ── Bar chart: selected day detail card ──────────────────────────────────────
  detailCard: {
    backgroundColor: '#F5F4FB',
    borderRadius:    12,
    padding:         12,
    marginTop:       12,
    borderLeftWidth: 3,
    borderLeftColor: '#3C3489',
  },
  detailCardDate: {
    fontSize:    14,
    fontWeight:  '700',
    color:       '#1A1A2E',
    marginBottom: 2,
  },
  detailCardAdherence: {
    fontSize:    13,
    color:       '#3C3489',
    fontWeight:  '600',
    marginBottom: 2,
  },
  detailCardTasks: {
    fontSize:    13,
    color:       '#555',
    marginBottom: 8,
  },
  detailPillarRow: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           8,
  },
  detailPillarItem: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
  },
  detailPillarDot: {
    width:        8,
    height:       8,
    borderRadius: 4,
  },
  detailPillarLabel: {
    fontSize: 11,
    color:    '#555',
  },

  // ── Section 4: Dot grid ─────────────────────────────────────────────────────
  dotGrid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           6,
    marginTop:     8,
    marginBottom:  12,
  },
  dot: {
    width:        14,
    height:       14,
    borderRadius: 7, // perfect circle
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           10,
  },
  legendItem: {
    fontSize: 11,
    color:    '#555',
  },

  // ── Section 5: Pillar balance ───────────────────────────────────────────────
  stackedBar: {
    flexDirection: 'row',
    height:        20,
    borderRadius:  10,
    overflow:      'hidden',
    marginTop:     10,
    marginBottom:  8,
    backgroundColor: '#E0E0E0', // fallback colour for empty space
  },
  stackedSegment: {
    height: '100%',
  },
  stackedLabelRow: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           10,
    marginBottom:  8,
  },
  stackedLabelItem: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
  },
  stackedLabelDot: {
    width:        8,
    height:       8,
    borderRadius: 4,
  },
  stackedLabelText: {
    fontSize: 12,
    color:    '#555',
  },
  balanceRow: {
    gap: 2,
  },
  balanceNote: {
    fontSize: 12,
    color:    '#888',
  },

  // ── Section 6: Streak history ───────────────────────────────────────────────
  streakRow: {
    flexDirection: 'row',
    justifyContent:'space-between',
    alignItems:    'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  streakText: {
    fontSize:   15,
    fontWeight: '600',
    color:      '#1A1A2E',
  },
  streakDates: {
    fontSize: 12,
    color:    '#888',
  },

  // ── Section 7: Daily breakdown ──────────────────────────────────────────────
  breakdownRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    paddingVertical: 10,
  },
  breakdownDate: {
    fontSize:   14,
    fontWeight: '500',
    color:      '#1A1A2E',
    flex:       1,
  },
  breakdownRight: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           8,
  },
  adherenceBadge: {
    borderRadius:    8,
    paddingHorizontal: 8,
    paddingVertical:   2,
  },
  adherenceBadgeText: {
    fontSize:   12,
    fontWeight: '700',
    color:      '#FFFFFF',
  },
  breakdownCount: {
    fontSize: 12,
    color:    '#888',
    minWidth: 36,
    textAlign:'right',
  },
  chevron: {
    fontSize: 10,
    color:    '#AAAAAA',
  },
  breakdownExpanded: {
    backgroundColor: '#FAFAFA',
    borderRadius:    8,
    padding:         10,
    marginBottom:    6,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems:    'center',
    paddingVertical: 3,
    gap: 6,
  },
  taskCheck: {
    fontSize:   16,
    width:      18,
    textAlign:  'center',
  },
  taskName: {
    flex:     1,
    fontSize: 13,
    color:    '#333',
  },
  taskNameDone: {
    // Strike-through look via opacity (text-decoration not always supported in RN)
    opacity: 0.5,
  },
  taskDuration: {
    fontSize: 12,
    color:    '#888',
  },
  breakdownPillarRow: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           8,
    marginTop:     8,
  },
  breakdownPillarItem: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
  },
  divider: {
    height:          1,
    backgroundColor: '#F0F0F0',
  },
});
