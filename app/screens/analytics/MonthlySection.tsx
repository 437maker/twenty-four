// MonthlySection.tsx
// ---------------------------------------------------------------------------
// "Monthly Analytics" section for the Analytics screen.
//
// Renders 6 sub-sections:
//   A. Section header + month navigator
//   B. Summary cards (horizontal scroll)
//   C. Weekly bar chart
//   D. Pillar breakdown (stacked bar + grid)
//   E. Consistency calendar grid + tooltip
//   F. Journal / reflection summary
// ---------------------------------------------------------------------------

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

// ─── Types ────────────────────────────────────────────────────────────────────
import { Settings, DayAnalytics, JournalEntry } from '../../types';
import { getTodayString } from '../../utils/dateHelpers';

// ─── Database queries ─────────────────────────────────────────────────────────
import {
  getTasksForMonth,
  getJournalEntriesForMonth,
} from '../../db/queries';

// ─── Calculation helpers ──────────────────────────────────────────────────────
import {
  buildDayAnalytics,
  adherenceColor,
  getHoursPerPillar,
  weeklyAdherence,
  getDatesForMonth,
  getCalendarWeeksForMonth,
  getWeekBucketsForMonth,
  monthName,
} from '../../utils/calculations';

// ─── Navigation tab list ──────────────────────────────────────────────────────
type TabParamList = {
  Home:      undefined;
  Schedule:  undefined;
  Analytics: undefined;
  Journal:   undefined;
  Shop:      undefined;
};

// ─── Pillar config ────────────────────────────────────────────────────────────
// Keep these in sync with the rest of the app; used for colours and labels.
const PILLAR_COLORS = {
  work:     '#3C3489',
  personal: '#1D9E75',
  sleep:    '#185FA5',
  care:     '#D97706',
} as const;

const PILLAR_LABELS = {
  work:     'Work',
  personal: 'Personal',
  sleep:    'Sleep',
  care:     'Care',
} as const;

// Typed array of all four pillar keys — used in .map() loops.
const PILLARS = ['work', 'personal', 'sleep', 'care'] as const;
type PillarKey = typeof PILLARS[number];

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  /** User settings from the global store (targets, care toggle, etc.) */
  settings: Settings | null;
  /** "YYYY-MM-DD" earliest allowed month; null = default to 12 months back */
  appStartDate: string | null;
}

// ─── Utility helpers ──────────────────────────────────────────────────────────

/** "YYYY-MM-DD" → "May 12" */
function shortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Returns today's LOCAL date as "YYYY-MM-DD" (not the UTC date). */
function todayStr(): string {
  return getTodayString();
}

/** Number of days in a given month (month is 0-indexed). */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function MonthlySection({ settings, appStartDate }: Props) {
  // ── Navigation ──────────────────────────────────────────────────────────────
  const navigation = useNavigation<BottomTabNavigationProp<TabParamList>>();

  // ── Month/year being viewed (starts at the current month) ───────────────────
  const [viewYear,  setViewYear]  = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth()); // 0-indexed

  // ── Data for the current viewYear/viewMonth ──────────────────────────────────
  const [dayAnalytics, setDayAnalytics] = useState<DayAnalytics[]>([]);
  const [journalCount, setJournalCount] = useState(0);
  const [loading,      setLoading]      = useState(false);

  // ── Which calendar cell the user tapped (to show the tooltip) ───────────────
  const [tooltipDate, setTooltipDate] = useState<string | null>(null);

  // ── Boundary helpers ─────────────────────────────────────────────────────────

  // The earliest month we allow navigating to.
  // If appStartDate exists use it; otherwise fall back to 12 months ago.
  const minYear  = (() => {
    if (appStartDate) return parseInt(appStartDate.slice(0, 4), 10);
    const d = new Date();
    d.setMonth(d.getMonth() - 12);
    return d.getFullYear();
  })();
  const minMonth = (() => {
    if (appStartDate) return parseInt(appStartDate.slice(5, 7), 10) - 1; // "YYYY-MM-DD" → 0-indexed
    const d = new Date();
    d.setMonth(d.getMonth() - 12);
    return d.getMonth();
  })();

  // Cannot go forward past today's month.
  const todayYear  = new Date().getFullYear();
  const todayMonth = new Date().getMonth(); // 0-indexed

  const canGoBack    = (viewYear > minYear)  || (viewYear === minYear  && viewMonth > minMonth);
  const canGoForward = (viewYear < todayYear) || (viewYear === todayYear && viewMonth < todayMonth);

  // ── Navigation callbacks ─────────────────────────────────────────────────────
  const goBack = useCallback(() => {
    if (!canGoBack) return;
    // Clear tooltip when switching months
    setTooltipDate(null);
    if (viewMonth === 0) {
      setViewYear(y => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth(m => m - 1);
    }
  }, [canGoBack, viewMonth]);

  const goForward = useCallback(() => {
    if (!canGoForward) return;
    setTooltipDate(null);
    if (viewMonth === 11) {
      setViewYear(y => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth(m => m + 1);
    }
  }, [canGoForward, viewMonth]);

  // ── Data loading ─────────────────────────────────────────────────────────────
  // Runs every time viewYear or viewMonth changes.
  useEffect(() => {
    let cancelled = false; // prevent state updates on unmounted component

    async function load() {
      setLoading(true);
      try {
        // 1. Fetch all tasks for this month → { "YYYY-MM-DD": Task[] }
        const taskMap = await getTasksForMonth(viewYear, viewMonth);

        // 2. Fetch all journal entries for this month
        const journals = await getJournalEntriesForMonth(viewYear, viewMonth);

        if (cancelled) return;

        // 3. Build the exception-dates set (days the user marked as off days)
        const exceptionDates = new Set<string>();
        journals.forEach((j: JournalEntry) => {
          if (j.is_exception_day) exceptionDates.add(j.date);
        });

        // 4. Convert the raw task map into structured DayAnalytics objects
        const analytics = buildDayAnalytics(taskMap, exceptionDates);
        // Sort oldest → newest
        analytics.sort((a, b) => a.date.localeCompare(b.date));

        // 5. Count only entries that have actual reflection text written
        const reflections = journals.filter(
          (j: JournalEntry) => j.reflection_text.length > 0
        ).length;

        setDayAnalytics(analytics);
        setJournalCount(reflections);
      } catch (err) {
        console.error('[MonthlySection] load error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [viewYear, viewMonth]);

  // ── Reload on screen focus ────────────────────────────────────────────────────
  // The useEffect above only fires when viewYear/viewMonth changes.
  // If the user checks off a task on a prior day in the Schedule screen and then
  // navigates back here without changing the month, the data would be stale.
  // useFocusEffect re-fetches every time the Analytics tab comes into focus.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function reload() {
        setLoading(true);
        try {
          const taskMap  = await getTasksForMonth(viewYear, viewMonth);
          const journals = await getJournalEntriesForMonth(viewYear, viewMonth);
          if (cancelled) return;

          const exceptionDates = new Set<string>();
          journals.forEach((j: JournalEntry) => {
            if (j.is_exception_day) exceptionDates.add(j.date);
          });

          const analytics = buildDayAnalytics(taskMap, exceptionDates);
          analytics.sort((a, b) => a.date.localeCompare(b.date));

          const reflections = journals.filter(
            (j: JournalEntry) => j.reflection_text.length > 0
          ).length;

          setDayAnalytics(analytics);
          setJournalCount(reflections);
        } catch (err) {
          console.error('[MonthlySection] focus reload error:', err);
        } finally {
          if (!cancelled) setLoading(false);
        }
      }

      reload();
      return () => { cancelled = true; };
    }, [viewYear, viewMonth])
  );

  // ── Derived metrics ──────────────────────────────────────────────────────────

  // Total days in the month (e.g. 31 for January)
  const totalDays  = daysInMonth(viewYear, viewMonth);
  // Days that have at least one task logged
  const daysTracked = dayAnalytics.filter(d => d.tasks.length > 0).length;
  // Average adherence using the existing helper (ignores days with no tasks)
  const avgAdherence = weeklyAdherence(dayAnalytics);

  // Find the single best and worst day (only among days that have task data)
  const daysWithData = dayAnalytics.filter(d => d.tasks.length > 0);
  const bestDay  = daysWithData.length > 0
    ? daysWithData.reduce((a, b) => b.adherence > a.adherence ? b : a)
    : null;
  const worstDay = daysWithData.length > 0
    ? daysWithData.reduce((a, b) => b.adherence < a.adherence ? b : a)
    : null;

  // Consecutive-day streak count:
  // Walk through sorted days and count pairs where both day[i] and day[i-1] have data.
  const streakDays = (() => {
    const sorted = [...dayAnalytics].sort((a, b) => a.date.localeCompare(b.date));
    let count = 0;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].tasks.length > 0 && sorted[i - 1].tasks.length > 0) count++;
    }
    return count;
  })();

  // Total hours per pillar for the whole month
  const totalPillarHours: Record<PillarKey, number> = { work: 0, personal: 0, sleep: 0, care: 0 };
  for (const day of dayAnalytics) {
    const h = getHoursPerPillar(day.tasks);
    totalPillarHours.work     += h.work;
    totalPillarHours.personal += h.personal;
    totalPillarHours.sleep    += h.sleep;
    totalPillarHours.care     += h.care;
  }
  // Only count days that actually had tracked tasks for the average
  const trackedDays = Math.max(1, dayAnalytics.filter(d => d.tasks.length > 0).length);

  // Total hours across all pillars (used for stacked bar width calculation)
  const totalAllHours = PILLARS.reduce((sum, p) => sum + totalPillarHours[p], 0);

  // Which pillars to show — respect the care_enabled toggle in settings
  const activePillars = PILLARS.filter(
    p => p !== 'care' || settings?.care_enabled
  );

  // User's per-pillar target hours (fall back to safe defaults)
  const targets: Record<PillarKey, number> = {
    work:     settings?.work_target_hours     ?? 8,
    personal: settings?.personal_target_hours ?? 4,
    sleep:    settings?.sleep_target_hours    ?? 8,
    care:     settings?.care_enabled ? (settings?.care_target_hours ?? 2) : 0,
  };

  // Weekly bar chart buckets (up to 5 weeks, each an array of date strings)
  const weekBuckets = getWeekBucketsForMonth(viewYear, viewMonth);

  // Calendar grid weeks (each row is 7 cells; empty string = padding cell)
  const calendarWeeks = getCalendarWeeksForMonth(viewYear, viewMonth);

  // Build a lookup map for quick O(1) access: date → DayAnalytics
  const analyticsMap: Record<string, DayAnalytics> = {};
  for (const d of dayAnalytics) analyticsMap[d.date] = d;

  // ── Tooltip data ─────────────────────────────────────────────────────────────
  const tooltipData = tooltipDate ? analyticsMap[tooltipDate] : null;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <View>
      {/* ══════════════════════════════════════════════════════════════════════
          A. SECTION HEADER + MONTH NAVIGATOR
      ══════════════════════════════════════════════════════════════════════ */}

      {/* Big label outside the card, matching the screen's other section headers */}
      <Text style={styles.sectionHeader}>Monthly Analytics</Text>

      {/* White card containing the month navigator */}
      <View style={styles.card}>
        <View style={styles.navRow}>
          {/* ‹ Back button — disabled (faded) when at the earliest allowed month */}
          <TouchableOpacity
            onPress={goBack}
            disabled={!canGoBack}
            style={[styles.navArrow, !canGoBack && styles.navArrowDisabled]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.navArrowText}>‹</Text>
          </TouchableOpacity>

          {/* Center: month + year label, with a loading spinner beside it */}
          <View style={styles.navCenter}>
            <Text style={styles.navLabel}>
              {monthName(viewMonth)} {viewYear}
            </Text>
            {/* Small spinner shown while the database query is in flight */}
            {loading && (
              <ActivityIndicator
                size="small"
                color="#3C3489"
                style={styles.navSpinner}
              />
            )}
          </View>

          {/* › Forward button — disabled when already at the current month */}
          <TouchableOpacity
            onPress={goForward}
            disabled={!canGoForward}
            style={[styles.navArrow, !canGoForward && styles.navArrowDisabled]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.navArrowText}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ══════════════════════════════════════════════════════════════════════
          B. SUMMARY CARDS (horizontal scrollable row, outside main card)
      ══════════════════════════════════════════════════════════════════════ */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.summaryScroll}
        contentContainerStyle={styles.summaryScrollContent}
      >
        {/* 1. Days Tracked */}
        <SummaryCard
          label="Days Tracked"
          value={`${daysTracked} / ${totalDays}`}
          borderColor={PILLAR_COLORS.work}
        />

        {/* 2. Avg Adherence — border colour reflects how good the score is */}
        <SummaryCard
          label="Avg Adherence"
          value={`${avgAdherence}%`}
          borderColor={adherenceColor(avgAdherence, avgAdherence > 0)}
        />

        {/* 3. Best Day — "May 3 (87%)" or "—" if no data at all */}
        <SummaryCard
          label="Best Day"
          value={
            bestDay
              ? `${shortDate(bestDay.date)} (${bestDay.adherence}%)`
              : '—'
          }
          borderColor="#4CAF50"
        />

        {/* 4. Worst Day */}
        <SummaryCard
          label="Worst Day"
          value={
            worstDay
              ? `${shortDate(worstDay.date)} (${worstDay.adherence}%)`
              : '—'
          }
          borderColor="#EF5350"
        />

        {/* 5. Reflections written this month */}
        <SummaryCard
          label="Reflections"
          value={journalCount.toString()}
          borderColor="#8B5CF6"
        />

        {/* 6. Consecutive days (streak within this month) */}
        <SummaryCard
          label="Streak Days"
          value={streakDays.toString()}
          borderColor={PILLAR_COLORS.personal}
        />
      </ScrollView>

      {/* ══════════════════════════════════════════════════════════════════════
          C. WEEKLY BAR CHART
      ══════════════════════════════════════════════════════════════════════ */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Weekly Breakdown</Text>

        <View style={styles.barChartContainer}>
          {weekBuckets.map((bucket, weekIndex) => {
            // Compute the average adherence for this bucket (skip days with no tasks)
            const daysInBucket = bucket.map(date => analyticsMap[date]).filter(Boolean);
            const bucketWithData = daysInBucket.filter(d => d && d.tasks.length > 0);
            const hasData = bucketWithData.length > 0;
            const bucketAdherence = hasData
              ? Math.round(
                  bucketWithData.reduce((sum, d) => sum + d.adherence, 0) /
                  bucketWithData.length
                )
              : 0;

            // Choose bar colour based on adherence thresholds
            const barColor = hasData
              ? bucketAdherence >= 80
                ? '#4CAF50'          // green
                : bucketAdherence >= 65
                ? '#FFC107'          // amber
                : '#EF5350'          // red
              : '#E0E0E0';           // gray = no data

            // Bar height proportional to adherence (max 100px)
            const barHeight = hasData
              ? Math.max(6, (bucketAdherence / 100) * 100)
              : 6;

            return (
              <View key={weekIndex} style={styles.weekBarWrapper}>
                {/* Percentage label above the bar (blank if no data) */}
                <Text style={styles.weekBarLabel}>
                  {hasData ? `${bucketAdherence}%` : ''}
                </Text>

                {/* The track holds the bar at the bottom (bars grow upward) */}
                <View style={styles.weekBarTrack}>
                  <View
                    style={[
                      styles.weekBar,
                      { height: barHeight, backgroundColor: barColor },
                    ]}
                  />
                </View>

                {/* "Wk 1", "Wk 2", … label below the bar */}
                <Text style={styles.weekBarDayLabel}>Wk {weekIndex + 1}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* ══════════════════════════════════════════════════════════════════════
          D. PILLAR BREAKDOWN
      ══════════════════════════════════════════════════════════════════════ */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Pillar Breakdown</Text>

        {totalAllHours === 0 ? (
          <Text style={styles.emptyNote}>No completed tasks this month.</Text>
        ) : (
          <>
            {/* Stacked horizontal bar — each segment proportional to total hours */}
            <View style={styles.stackedBar}>
              {activePillars.map(p => {
                const hrs = totalPillarHours[p];
                if (hrs === 0) return null;
                // Width as a percentage of total tracked hours
                const widthPct = (hrs / totalAllHours) * 100;
                return (
                  <View
                    key={p}
                    style={[
                      styles.stackedSegment,
                      {
                        width:           `${widthPct}%` as any,
                        backgroundColor: PILLAR_COLORS[p],
                      },
                    ]}
                  />
                );
              })}
            </View>

            {/* 2-column grid of per-pillar detail cards */}
            <View style={styles.pillarGrid}>
              {activePillars.map(p => {
                const totalHrs = totalPillarHours[p];
                const avgHrs   = totalHrs / trackedDays;
                const target   = targets[p];

                // Determine status relative to the user's daily target
                let statusText: string;
                let statusColor: string;
                if (avgHrs >= target - 0.5) {
                  statusText  = '✓ On track';
                  statusColor = '#4CAF50';  // green
                } else if (avgHrs > target + 1) {
                  statusText  = '↑ Heavy';
                  statusColor = '#F59E0B';  // amber
                } else {
                  statusText  = '↓ Light';
                  statusColor = '#EF5350';  // red
                }

                return (
                  <View key={p} style={styles.pillarCard}>
                    {/* Coloured dot + pillar name */}
                    <View style={styles.pillarCardHeader}>
                      <View
                        style={[
                          styles.pillarDot,
                          { backgroundColor: PILLAR_COLORS[p] },
                        ]}
                      />
                      <Text style={styles.pillarCardName}>
                        {PILLAR_LABELS[p]}
                      </Text>
                    </View>

                    {/* Avg and total hours */}
                    <Text style={styles.pillarCardStat}>
                      Avg: {avgHrs.toFixed(1)} hrs/day
                    </Text>
                    <Text style={styles.pillarCardStat}>
                      Total: {totalHrs.toFixed(1)} hrs
                    </Text>

                    {/* On track / Heavy / Light badge */}
                    <Text style={[styles.pillarStatus, { color: statusColor }]}>
                      {statusText}
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </View>

      {/* ══════════════════════════════════════════════════════════════════════
          E. CONSISTENCY CALENDAR GRID
      ══════════════════════════════════════════════════════════════════════ */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Consistency Grid</Text>

        {/* Day-of-week header row: Sun → Sat */}
        <View style={styles.calendarHeaderRow}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(dow => (
            <View key={dow} style={styles.calendarCell}>
              <Text style={styles.calendarDowLabel}>{dow}</Text>
            </View>
          ))}
        </View>

        {/* One row per week */}
        {calendarWeeks.map((week, weekIdx) => (
          <View key={weekIdx} style={styles.calendarRow}>
            {week.map((dateStr, cellIdx) => {
              // Empty string = padding cell before the 1st or after the last day
              if (dateStr === '') {
                return (
                  <View
                    key={`empty-${cellIdx}`}
                    style={[styles.calendarCell, styles.calendarCellEmpty]}
                  />
                );
              }

              const dayData    = analyticsMap[dateStr];
              const hasData    = dayData && dayData.tasks.length > 0;
              const isException = dayData?.isException ?? false;
              const isToday    = dateStr === todayStr();

              // Choose circle fill colour:
              // exception day → light purple, has data → adherence colour, no data → gray
              let circleColor: string;
              if (isException) {
                circleColor = '#EDE9FE'; // light purple
              } else if (hasData) {
                circleColor = adherenceColor(dayData.adherence, true);
              } else {
                circleColor = '#E5E7EB'; // light gray
              }

              // The day number from the date string (last 2 characters)
              const dayNum = parseInt(dateStr.slice(8), 10);

              return (
                <TouchableOpacity
                  key={dateStr}
                  style={styles.calendarCell}
                  onPress={() =>
                    // Tap toggles: tap same cell again to dismiss tooltip
                    setTooltipDate(prev => (prev === dateStr ? null : dateStr))
                  }
                  activeOpacity={0.7}
                >
                  {/* Coloured circle — extra ring for today */}
                  <View
                    style={[
                      styles.calendarCircle,
                      { backgroundColor: circleColor },
                      isToday && styles.calendarCircleToday,
                    ]}
                  >
                    <Text
                      style={[
                        styles.calendarDayNum,
                        // White text on dark/vivid backgrounds, dark text on pale ones
                        hasData && !isException
                          ? styles.calendarDayNumLight
                          : styles.calendarDayNumDark,
                      ]}
                    >
                      {dayNum}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {/* Legend */}
        <View style={styles.legendRow}>
          <LegendDot color="#4CAF50" label="80%+" />
          <LegendDot color="#FFC107" label="65–79%" />
          <LegendDot color="#EF5350" label="<65%" />
          <LegendDot color="#E5E7EB" label="None" />
          <LegendDot color="#EDE9FE" label="Off" />
        </View>

        {/* Tooltip — shown when a cell is tapped */}
        {tooltipDate && (
          <View style={styles.tooltip}>
            <View style={styles.tooltipContent}>
              {/* Date + stats text */}
              <Text style={styles.tooltipText}>
                {(() => {
                  const d = new Date(tooltipDate + 'T12:00:00');
                  const label = d.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month:   'short',
                    day:     'numeric',
                  });
                  if (tooltipData && tooltipData.tasks.length > 0) {
                    const completed = tooltipData.tasks.filter(t => t.completed).length;
                    return `${label}: ${tooltipData.adherence}% — ${completed} task${completed !== 1 ? 's' : ''} completed`;
                  }
                  if (tooltipData?.isException) {
                    return `${label}: Exception day`;
                  }
                  return `${label}: No tasks logged`;
                })()}
              </Text>

              {/* Dismiss button */}
              <TouchableOpacity
                onPress={() => setTooltipDate(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.tooltipDismiss}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* ══════════════════════════════════════════════════════════════════════
          F. JOURNAL SUMMARY
      ══════════════════════════════════════════════════════════════════════ */}
      <View style={styles.card}>
        {/* Reflection count */}
        <Text style={styles.journalCountText}>
          📝 Reflections this month: {journalCount}
        </Text>

        {/* Link to the Journal tab */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Journal')}
          activeOpacity={0.7}
          style={styles.journalLink}
        >
          <Text style={styles.journalLinkText}>Read entries →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Sub-component: SummaryCard ───────────────────────────────────────────────
// A small metric card with a coloured left border.
function SummaryCard({
  label,
  value,
  borderColor,
}: {
  label:       string;
  value:       string;
  borderColor: string;
}) {
  return (
    <View style={[styles.summaryCard, { borderLeftColor: borderColor }]}>
      <Text style={styles.summaryValue} numberOfLines={2} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

// ─── Sub-component: LegendDot ─────────────────────────────────────────────────
// A coloured dot + label for the calendar legend.
function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({

  // ── Section header (outside any card) ──────────────────────────────────────
  sectionHeader: {
    fontSize:         20,
    fontWeight:       '800',
    color:            '#1A1A2E',
    paddingHorizontal: 16,
    marginBottom:     12,
    marginTop:        8,
  },

  // ── Generic white card ──────────────────────────────────────────────────────
  card: {
    backgroundColor:  '#FFFFFF',
    borderRadius:     16,
    elevation:        2,
    shadowColor:      '#000',
    shadowOpacity:    0.06,
    shadowRadius:     8,
    shadowOffset:     { width: 0, height: 2 },
    padding:          16,
    marginHorizontal: 16,
    marginBottom:     16,
  },

  // Card section title (inside a card)
  cardTitle: {
    fontSize:     17,
    fontWeight:   '700',
    color:        '#1A1A2E',
    marginBottom: 4,
  },

  // Placeholder text when there's no data to display
  emptyNote: {
    fontSize:  14,
    color:     '#888',
    marginTop: 4,
  },

  // ── A. Month navigator ──────────────────────────────────────────────────────
  navRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  navArrow: {
    padding:  8,
    opacity:  1,
  },
  // Faded state for a disabled arrow (at the boundary month)
  navArrowDisabled: {
    opacity: 0.3,
  },
  navArrowText: {
    fontSize:   28,
    color:      '#3C3489',
    fontWeight: '600',
    lineHeight: 32,
  },
  navCenter: {
    flex:           1,
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
  },
  navLabel: {
    fontSize:   17,
    fontWeight: '700',
    color:      '#1A1A2E',
  },
  navSpinner: {
    marginLeft: 8,
  },

  // ── B. Summary cards row ────────────────────────────────────────────────────
  summaryScroll: {
    marginBottom: 16,
  },
  summaryScrollContent: {
    paddingHorizontal: 16,
    gap:               12,
  },
  summaryCard: {
    width:            130,
    backgroundColor:  '#FFFFFF',
    borderRadius:     12,
    elevation:        2,
    shadowColor:      '#000',
    shadowOpacity:    0.05,
    shadowRadius:     6,
    shadowOffset:     { width: 0, height: 1 },
    padding:          12,
    // Left border applied as an inline prop (borderLeftColor varies per card)
    borderLeftWidth:  4,
  },
  summaryValue: {
    fontSize:     17,
    fontWeight:   '800',
    color:        '#1A1A2E',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 11,
    color:    '#888',
  },

  // ── C. Weekly bar chart ─────────────────────────────────────────────────────
  barChartContainer: {
    flexDirection:  'row',
    alignItems:     'flex-end',
    justifyContent: 'space-around',
    marginTop:      12,
  },
  weekBarWrapper: {
    flex:       1,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  weekBarLabel: {
    fontSize:     9,
    color:        '#555',
    marginBottom: 2,
    textAlign:    'center',
  },
  weekBarTrack: {
    // Fixed-height container; bar grows up from the bottom
    height:         100,
    justifyContent: 'flex-end',
    width:          '100%',
  },
  weekBar: {
    width:        '100%',
    borderRadius: 4,
    minHeight:    6,
  },
  weekBarDayLabel: {
    fontSize:  10,
    color:     '#555',
    marginTop: 4,
    textAlign: 'center',
  },

  // ── D. Pillar breakdown ─────────────────────────────────────────────────────
  stackedBar: {
    flexDirection: 'row',
    height:        14,
    borderRadius:  7,
    overflow:      'hidden',
    backgroundColor: '#E5E7EB',
    marginTop:     10,
    marginBottom:  16,
  },
  stackedSegment: {
    height: 14,
  },

  // 2-column grid for pillar detail cards
  pillarGrid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           10,
  },
  pillarCard: {
    // Each card occupies roughly half the available width (minus gap and padding)
    width:            '47%',
    backgroundColor:  '#F9FAFB',
    borderRadius:     10,
    padding:          10,
  },
  pillarCardHeader: {
    flexDirection: 'row',
    alignItems:    'center',
    marginBottom:  6,
  },
  pillarDot: {
    width:        10,
    height:       10,
    borderRadius: 5,
    marginRight:  6,
  },
  pillarCardName: {
    fontSize:   13,
    fontWeight: '700',
    color:      '#1A1A2E',
  },
  pillarCardStat: {
    fontSize: 12,
    color:    '#555',
    marginBottom: 2,
  },
  pillarStatus: {
    fontSize:   12,
    fontWeight: '600',
    marginTop:  4,
  },

  // ── E. Calendar grid ────────────────────────────────────────────────────────
  calendarHeaderRow: {
    flexDirection: 'row',
    marginBottom:  4,
    marginTop:     8,
  },
  calendarRow: {
    flexDirection: 'row',
    marginBottom:  4,
  },
  // Each cell occupies 1/7 of the available width
  calendarCell: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
  },
  // Transparent spacer for padding cells (before 1st day / after last day)
  calendarCellEmpty: {
    // No background, just occupies space
  },
  calendarDowLabel: {
    fontSize:  10,
    color:     '#9CA3AF',
    textAlign: 'center',
  },
  // The coloured circle for each day
  calendarCircle: {
    width:           32,
    height:          32,
    borderRadius:    16,
    alignItems:      'center',
    justifyContent:  'center',
  },
  // Extra ring for today's date
  calendarCircleToday: {
    borderWidth: 2,
    borderColor: '#3C3489',
  },
  calendarDayNum: {
    fontSize:   11,
    fontWeight: '600',
  },
  // White text on vivid (green/amber/red) circles
  calendarDayNumLight: {
    color: '#FFFFFF',
  },
  // Dark text on pale circles (light gray, light purple)
  calendarDayNumDark: {
    color: '#374151',
  },

  // Legend row below the calendar
  legendRow: {
    flexDirection:  'row',
    flexWrap:       'wrap',
    marginTop:      12,
    gap:            8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems:    'center',
  },
  legendDot: {
    width:        10,
    height:       10,
    borderRadius: 5,
    marginRight:  4,
    borderWidth:  1,
    borderColor:  '#E5E7EB',
  },
  legendLabel: {
    fontSize: 11,
    color:    '#6B7280',
  },

  // Tooltip bar below the calendar
  tooltip: {
    marginTop:       12,
    backgroundColor: '#F5F4FB',
    borderRadius:    10,
    padding:         10,
    borderLeftWidth: 3,
    borderLeftColor: '#3C3489',
  },
  tooltipContent: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  tooltipText: {
    flex:       1,
    fontSize:   13,
    color:      '#1A1A2E',
    lineHeight: 18,
  },
  tooltipDismiss: {
    fontSize:   16,
    color:      '#9CA3AF',
    marginLeft: 8,
    fontWeight: '600',
  },

  // ── F. Journal summary ──────────────────────────────────────────────────────
  journalCountText: {
    fontSize:     15,
    fontWeight:   '600',
    color:        '#1A1A2E',
    marginBottom: 10,
  },
  journalLink: {
    alignSelf: 'flex-start',
  },
  journalLinkText: {
    fontSize:   14,
    fontWeight: '700',
    color:      '#3C3489',
  },
});
