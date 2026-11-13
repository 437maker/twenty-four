// YearlySection.tsx
// ---------------------------------------------------------------------------
// "Year in Review" section for the Analytics screen.
//
// Sub-sections rendered top to bottom:
//   A. Section header + year selector
//   B. 6 summary cards (horizontal scroll)
//   C. 12-month trend bar chart
//   D. Yearly pillar balance bars
//   E. GitHub-style consistency heatmap (horizontal scroll)
//   F. Auto-generated insights (shown when ≥30 tracked days)
// ---------------------------------------------------------------------------

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

// ─── Internal imports ─────────────────────────────────────────────────────────
import { Settings, DayAnalytics } from '../../types';
import {
  getTasksForMonth,
  getTreatEarnedForYear,
  getJournalCountForYear,
  getOwnedItemsCount,
  getRecentStreaks,
} from '../../db/queries';
import {
  buildDayAnalytics,
  adherenceColor,
  getHoursPerPillar,
  weeklyAdherence,
  monthAbbr,
} from '../../utils/calculations';

// ─── Constants ────────────────────────────────────────────────────────────────

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

// All four pillars in display order
const PILLARS = ['work', 'personal', 'sleep', 'care'] as const;

// Cell size + gap for the heatmap grid
const CELL_SIZE = 11;   // each square is 11×11
const CELL_GAP  = 2;    // gap between squares
const CELL_STEP = CELL_SIZE + CELL_GAP; // 13 px per column

// 53 weeks covers every possible year layout (52 full + potential partial)
const WEEKS = 53;

// ─── Types ────────────────────────────────────────────────────────────────────

interface YearlyData {
  // One entry per calendar month (0 = Jan … 11 = Dec)
  monthAdherence: Array<{
    month:    number;
    adherence: number;
    hasData:  boolean;
  }>;
  totalDaysTracked:   number;
  overallAdherence:   number;
  treatsEarned:       number;
  journalCount:       number;
  ownedItemsCount:    number;
  longestStreak:      number;
  // Average completed hours per tracked day, by pillar
  avgPillarHoursPerDay: {
    work:     number;
    personal: number;
    sleep:    number;
    care:     number;
  };
  // Every day's analytics for this year — sorted by date asc — used by the heatmap
  allDayAnalytics: DayAnalytics[];
}

// Shape of what we cache in the ref so we don't re-fetch the same year twice
interface CachedYear {
  year: number;
  data: YearlyData;
}

// Props accepted by this component
interface Props {
  settings:     Settings | null;
  appStartDate: string | null; // "YYYY-MM-DD" — earliest allowed year
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns true if year is a leap year (needed for "X / 366" display). */
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Given a DayAnalytics adherence value + whether the day has data,
 *  returns the heatmap square colour. */
function heatmapColor(adherence: number, hasData: boolean, isEmpty: boolean): string {
  if (isEmpty) return 'transparent'; // before Jan 1 or after Dec 31 padding cells
  if (!hasData) return '#E5E7EB';   // tracked nothing that day
  if (adherence >= 80) return '#4CAF50';
  if (adherence >= 65) return '#FFC107';
  return '#EF5350';
}

/** Returns "YYYY-MM-DD" for a JS Date object, using local midnight. */
function toDateStr(d: Date): string {
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/** Returns today's date string "YYYY-MM-DD". */
function todayStr(): string {
  return toDateStr(new Date());
}

/** Full month names for the insights section. */
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function YearlySection({ settings, appStartDate }: Props) {
  // The year currently being displayed
  const [viewYear, setViewYear] = useState(new Date().getFullYear());

  // Loaded data for the current viewYear (null while loading)
  const [yearlyData, setYearlyData] = useState<YearlyData | null>(null);

  // Whether we are currently fetching data from SQLite
  const [loading, setLoading] = useState(false);

  // Cache: avoid re-fetching a year we already loaded
  const cache = useRef<CachedYear | null>(null);

  // ── Year boundary calculation ────────────────────────────────────────────────
  const currentYear = new Date().getFullYear();
  const maxYear     = currentYear;
  // Minimum year = the year the app was first opened, or (currentYear - 3) as fallback
  const minYear = appStartDate
    ? parseInt(appStartDate.slice(0, 4), 10)
    : currentYear - 3;

  // ── Data loading ─────────────────────────────────────────────────────────────
  const loadYear = useCallback(async (year: number) => {
    // Serve from cache if we already loaded this year
    if (cache.current?.year === year) {
      setYearlyData(cache.current.data);
      return;
    }

    setLoading(true);
    setYearlyData(null);

    try {
      // ── Step 1: Load month-by-month task data ────────────────────────────────
      const monthAdherence: YearlyData['monthAdherence'] = [];
      const allDayAnalytics: DayAnalytics[] = [];

      for (let m = 0; m < 12; m++) {
        // getTasksForMonth returns a { "YYYY-MM-DD": Task[] } map for that month
        const taskMap  = await getTasksForMonth(year, m);
        // Convert task map → DayAnalytics (computes adherence per day)
        const analytics = buildDayAnalytics(taskMap, new Set());
        allDayAnalytics.push(...analytics);

        // A month "has data" if at least one day had tasks
        const monthDaysWithData = analytics.filter((d) => d.tasks.length > 0);
        monthAdherence.push({
          month:    m,
          adherence: weeklyAdherence(analytics), // average adherence across tracked days
          hasData:  monthDaysWithData.length > 0,
        });
      }

      // Sort all days oldest → newest (needed by heatmap lookup)
      allDayAnalytics.sort((a, b) => a.date.localeCompare(b.date));

      // ── Step 2: Other yearly stats ───────────────────────────────────────────
      const treatsEarned    = await getTreatEarnedForYear(year);
      const journalCount    = await getJournalCountForYear(year);
      const ownedCount      = await getOwnedItemsCount();

      // Longest streak = max of what's stored in settings vs streak history
      const streaks      = await getRecentStreaks(10);
      const longestStreak = Math.max(
        settings?.longest_streak ?? 0,
        ...streaks.map((s) => s.length),
      );

      // ── Step 3: Aggregated pillar stats ─────────────────────────────────────
      const daysWithData     = allDayAnalytics.filter((d) => d.tasks.length > 0);
      const totalDaysTracked = daysWithData.length;
      const overallAdherence = weeklyAdherence(allDayAnalytics);

      // Average completed hours per tracked day, by pillar
      const avgPillarHoursPerDay = { work: 0, personal: 0, sleep: 0, care: 0 };
      if (daysWithData.length > 0) {
        for (const p of PILLARS) {
          const total = daysWithData.reduce(
            (s, d) => s + getHoursPerPillar(d.tasks)[p],
            0,
          );
          avgPillarHoursPerDay[p] = total / daysWithData.length;
        }
      }

      // ── Assemble and cache ───────────────────────────────────────────────────
      const data: YearlyData = {
        monthAdherence,
        totalDaysTracked,
        overallAdherence,
        treatsEarned,
        journalCount,
        ownedItemsCount: ownedCount,
        longestStreak,
        avgPillarHoursPerDay,
        allDayAnalytics,
      };

      cache.current = { year, data };
      setYearlyData(data);
    } catch (err) {
      console.error('[YearlySection] loadYear error:', err);
    } finally {
      setLoading(false);
    }
  }, [settings]);

  // Re-load whenever the viewed year changes
  useEffect(() => {
    loadYear(viewYear);
  }, [viewYear, loadYear]);

  // ── Reload on screen focus ────────────────────────────────────────────────────
  // The cache stops the same year being re-fetched on normal re-renders, but it
  // also means task completions on prior days won't be reflected until the user
  // navigates to a different year and back.  We fix this by clearing the cache
  // and forcing a fresh fetch every time the Analytics tab comes into focus.
  useFocusEffect(
    useCallback(() => {
      cache.current = null;   // invalidate stale cache
      loadYear(viewYear);
    }, [viewYear, loadYear])
  );

  // ── Year navigation helpers ──────────────────────────────────────────────────
  const canGoBack    = viewYear > minYear;
  const canGoForward = viewYear < maxYear;

  // ── Derived display values (safe defaults while loading) ─────────────────────
  const daysInYear       = isLeapYear(viewYear) ? 366 : 365;
  const totalDaysTracked = yearlyData?.totalDaysTracked  ?? 0;
  const overallAdh       = yearlyData?.overallAdherence  ?? 0;
  const longestStreak    = yearlyData?.longestStreak     ?? 0;
  const treatsEarned     = yearlyData?.treatsEarned      ?? 0;
  const journalCount     = yearlyData?.journalCount      ?? 0;
  const ownedCount       = yearlyData?.ownedItemsCount   ?? 0;

  // Pillar targets from settings (fall back to 0 if not loaded yet)
  const targets = {
    work:     settings?.work_target_hours     ?? 0,
    personal: settings?.personal_target_hours ?? 0,
    sleep:    settings?.sleep_target_hours    ?? 0,
    care:     settings?.care_enabled ? (settings?.care_target_hours ?? 0) : 0,
  };

  // ── Heatmap grid construction ─────────────────────────────────────────────────
  // We build a lookup map from date string → adherence/hasData, then lay out a
  // 7-row × 53-column grid (one row per day-of-week, one column per week).
  const buildHeatmapGrid = (): Array<Array<{
    dateStr:   string;
    adherence: number;
    hasData:   boolean;
    isEmpty:   boolean;   // true = padding cell outside Jan 1 – Dec 31
    isToday:   boolean;
  }>> => {
    // Build fast lookup: dateStr → DayAnalytics
    const lookup: Record<string, DayAnalytics> = {};
    if (yearlyData) {
      for (const d of yearlyData.allDayAnalytics) {
        lookup[d.date] = d;
      }
    }

    const today = todayStr();

    // Jan 1 of the viewed year
    const jan1      = new Date(viewYear, 0, 1);
    const jan1Dow   = jan1.getDay(); // 0 = Sunday

    // Go back to the Sunday on or before Jan 1
    const gridStart = new Date(jan1);
    gridStart.setDate(1 - jan1Dow); // subtracts jan1Dow days

    // We'll store 7 rows (Sun–Sat), each with WEEKS columns
    const rows: ReturnType<typeof buildHeatmapGrid> = Array.from(
      { length: 7 },
      () => [],
    );

    for (let week = 0; week < WEEKS; week++) {
      for (let dow = 0; dow < 7; dow++) {
        // Compute the actual calendar date for this cell
        const cellDate = new Date(gridStart);
        cellDate.setDate(gridStart.getDate() + week * 7 + dow);

        const ds      = toDateStr(cellDate);
        const yr      = cellDate.getFullYear();
        // Cells outside the viewed year are "empty" padding
        const isEmpty = yr !== viewYear;
        const day     = lookup[ds];

        rows[dow].push({
          dateStr:   ds,
          adherence: day?.adherence ?? 0,
          hasData:   !isEmpty && (day?.tasks.length ?? 0) > 0,
          isEmpty,
          isToday:   ds === today && yr === viewYear,
        });
      }
    }

    return rows;
  };

  // Memoize the grid only when yearlyData changes (avoids rebuilding on every render)
  const heatmapGrid = React.useMemo(buildHeatmapGrid, [yearlyData, viewYear]);

  // ── Month label positions for heatmap ────────────────────────────────────────
  // For each month, find the first week-column index that contains a day from that month.
  const monthLabelPositions = React.useMemo(() => {
    const positions: Array<{ month: number; col: number }> = [];
    // Use the Sun row (index 0) to find where each month starts
    const sunRow = heatmapGrid[0] ?? [];
    let lastMonth = -1;
    for (let col = 0; col < sunRow.length; col++) {
      const cell = sunRow[col];
      if (cell.isEmpty) continue;
      const month = parseInt(cell.dateStr.slice(5, 7), 10) - 1; // 0-indexed
      if (month !== lastMonth) {
        positions.push({ month, col });
        lastMonth = month;
      }
    }
    return positions;
  }, [heatmapGrid]);

  // ── Insights derivation ───────────────────────────────────────────────────────
  const insights = React.useMemo(() => {
    if (!yearlyData || yearlyData.totalDaysTracked < 30) return null;

    // 1. Most consistent month
    const monthsWithData = yearlyData.monthAdherence.filter((m) => m.hasData);
    const bestMonth = monthsWithData.length > 0
      ? monthsWithData.reduce((best, m) =>
          m.adherence > best.adherence ? m : best,
        )
      : null;

    // 2. Strongest pillar = furthest above its target (hours/day).
    // We compute targets inline here so there's no stale closure issue.
    const insightTargets = {
      work:     settings?.work_target_hours     ?? 0,
      personal: settings?.personal_target_hours ?? 0,
      sleep:    settings?.sleep_target_hours    ?? 0,
      care:     settings?.care_enabled ? (settings?.care_target_hours ?? 0) : 0,
    };

    let strongestPillar: (typeof PILLARS)[number] | null = null;
    let strongestDelta = -Infinity;
    for (const p of PILLARS) {
      if (p === 'care' && !settings?.care_enabled) continue;
      const avg    = yearlyData.avgPillarHoursPerDay[p];
      const target = insightTargets[p];
      if (target <= 0) continue;
      const delta = avg - target;
      if (delta > strongestDelta) { strongestDelta = delta; strongestPillar = p; }
    }

    // 3. Total completed tasks across all tracked days
    const totalCompleted = yearlyData.allDayAnalytics
      .flatMap((d) => d.tasks)
      .filter((t) => t.completed).length;

    return {
      bestMonth,
      strongestPillar,
      strongestAvgHours: strongestPillar
        ? yearlyData.avgPillarHoursPerDay[strongestPillar]
        : 0,
      journalCount: yearlyData.journalCount,
      totalCompleted,
      totalDaysTracked: yearlyData.totalDaysTracked,
    };
  }, [yearlyData, settings]);

  // Day-of-week abbreviations for the heatmap left column (only Mon / Wed / Fri shown)
  const DOW_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

  // Total heatmap width (used to size the inner container inside the ScrollView)
  const heatmapInnerWidth = WEEKS * CELL_STEP + 28; // 28 for the dow label column

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <View>
      {/* ══════════════════════════════════════════════════════════════════════
          A. SECTION HEADER + YEAR SELECTOR
      ══════════════════════════════════════════════════════════════════════ */}

      {/* "Year in Review" label — outside any card, matches MonthlySection style */}
      <Text style={styles.sectionHeader}>Year in Review</Text>

      {/* White card containing the year nav controls */}
      <View style={styles.card}>
        <View style={styles.yearNavRow}>
          {/* ‹ back arrow — dimmed when at minimum year */}
          <TouchableOpacity
            onPress={() => canGoBack && setViewYear((y) => y - 1)}
            activeOpacity={0.7}
            style={[styles.navArrow, !canGoBack && styles.navArrowDisabled]}
            disabled={!canGoBack}
          >
            <Text style={styles.navArrowText}>‹</Text>
          </TouchableOpacity>

          {/* Year label or spinner while loading */}
          {loading ? (
            <ActivityIndicator size="small" color="#3C3489" style={styles.yearSpinner} />
          ) : (
            <Text style={styles.yearLabel}>{viewYear}</Text>
          )}

          {/* › forward arrow — dimmed when at maximum year */}
          <TouchableOpacity
            onPress={() => canGoForward && setViewYear((y) => y + 1)}
            activeOpacity={0.7}
            style={[styles.navArrow, !canGoForward && styles.navArrowDisabled]}
            disabled={!canGoForward}
          >
            <Text style={styles.navArrowText}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ══════════════════════════════════════════════════════════════════════
          B. 6 SUMMARY CARDS (horizontal scroll row)
          Each card is ~130px wide with a purple left border.
      ══════════════════════════════════════════════════════════════════════ */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.summaryRow}
        contentContainerStyle={styles.summaryRowContent}
      >
        <YearlySummaryCard
          emoji="📅"
          label="Days Tracked"
          value={loading ? '—' : `${totalDaysTracked} / ${daysInYear}`}
        />
        <YearlySummaryCard
          emoji="📊"
          label="Adherence"
          value={loading || !yearlyData ? '—' : `${overallAdh}%`}
        />
        <YearlySummaryCard
          emoji="🔥"
          label="Longest Streak"
          value={loading || !yearlyData ? '—' : `${longestStreak} days`}
        />
        <YearlySummaryCard
          emoji="🦴"
          label="Treats Earned"
          value={loading || !yearlyData ? '—' : `${treatsEarned} treats`}
        />
        <YearlySummaryCard
          emoji="📝"
          label="Reflections"
          value={loading || !yearlyData ? '—' : `${journalCount} entries`}
        />
        <YearlySummaryCard
          emoji="🛍️"
          label="Items Owned"
          value={loading || !yearlyData ? '—' : `${ownedCount} items`}
        />
      </ScrollView>

      {/* ══════════════════════════════════════════════════════════════════════
          C. 12-MONTH TREND BAR CHART
      ══════════════════════════════════════════════════════════════════════ */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Monthly Trend</Text>

        {/* Bar chart: 12 bars side by side, aligned to their bottoms */}
        <View style={styles.monthBarChart}>
          {Array.from({ length: 12 }, (_, m) => {
            const monthData = yearlyData?.monthAdherence[m];
            const hasData   = monthData?.hasData ?? false;
            const adherence = monthData?.adherence ?? 0;

            // Bar colour: green / amber / red / gray
            let barColor = '#E0E0E0';
            if (!loading && hasData) {
              barColor = adherenceColor(adherence, true);
            }

            // Bar height proportional to adherence (max 100px)
            const barHeight = hasData ? Math.max(4, (adherence / 100) * 100) : 4;

            // Is this the current month in the current year?
            const now        = new Date();
            const isCurrent  =
              viewYear === now.getFullYear() && m === now.getMonth();

            return (
              <View key={m} style={styles.monthBarWrapper}>
                {/* Percentage label above bar (blank if no data) */}
                <Text style={styles.monthBarLabel}>
                  {!loading && hasData ? `${adherence}%` : ''}
                </Text>

                {/* Bar track — bars grow from the bottom */}
                <View style={styles.monthBarTrack}>
                  <View
                    style={[
                      styles.monthBar,
                      { height: barHeight, backgroundColor: barColor },
                    ]}
                  />
                </View>

                {/* 1-letter month label: J F M A M J J A S O N D */}
                <Text style={styles.monthBarMonthLabel}>
                  {monthAbbr(m).charAt(0)}
                </Text>

                {/* Subtle purple dot below current month's label */}
                {isCurrent ? (
                  <View style={styles.currentMonthDot} />
                ) : (
                  <View style={styles.currentMonthDotPlaceholder} />
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* ══════════════════════════════════════════════════════════════════════
          D. YEARLY PILLAR BALANCE
      ══════════════════════════════════════════════════════════════════════ */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Yearly Pillar Balance</Text>
        <Text style={styles.cardSubtitle}>Avg completed hours per tracked day</Text>

        {(PILLARS.filter((p) => p !== 'care' || settings?.care_enabled)).map((p) => {
          const avg    = yearlyData?.avgPillarHoursPerDay[p] ?? 0;
          const target = targets[p];

          // Fill width: avg / 16 hours (a representative day), capped at 100%
          const fillPct = Math.min(1, avg / Math.max(0.001, 16)) * 100;
          // Target line position: same denominator
          const targetPct = Math.min(1, target / Math.max(0.001, 16)) * 100;

          // Status label below the bar
          let statusLabel = '';
          let statusColor = '#4CAF50';
          if (yearlyData && totalDaysTracked > 0) {
            const diff = avg - target;
            if (Math.abs(diff) <= 0.5) {
              statusLabel = '✓ On track';
              statusColor = '#4CAF50';
            } else if (diff > 1) {
              statusLabel = '↑ Heavy';
              statusColor = '#F59E0B';
            } else if (diff < -1) {
              statusLabel = '↓ Light';
              statusColor = '#EF5350';
            }
          }

          return (
            <View key={p} style={styles.pillarRow}>
              {/* ── Flex row: name | bar track | avg label ── */}
              <View style={styles.pillarFlexRow}>
                {/* Pillar name with coloured dot (fixed 60px width) */}
                <View style={styles.pillarLabelCol}>
                  <View style={[styles.pillarDot, { backgroundColor: PILLAR_COLORS[p] }]} />
                  <Text style={styles.pillarName}>{PILLAR_LABELS[p]}</Text>
                </View>

                {/* Bar track — fills remaining space between name and avg label */}
                <View style={styles.pillarTrack}>
                  {/* Filled portion: proportional to avg hours / 16h */}
                  <View
                    style={[
                      styles.pillarFill,
                      {
                        width:           `${fillPct}%`,
                        backgroundColor: PILLAR_COLORS[p],
                      },
                    ]}
                  />

                  {/* Target line: thin vertical mark at the target position.
                      Only shown when target > 0 so it doesn't sit at the left edge. */}
                  {target > 0 && (
                    <View
                      style={[
                        styles.pillarTargetLine,
                        { left: `${targetPct}%` },
                      ]}
                    />
                  )}
                </View>

                {/* Avg hours label (fixed 55px, right-aligned) */}
                <Text style={styles.pillarAvgLabel}>
                  {loading || !yearlyData ? '—' : `${avg.toFixed(1)}h avg`}
                </Text>
              </View>

              {/* Status label on its own line below the bar row */}
              {statusLabel ? (
                <View style={styles.pillarStatusRow}>
                  <Text style={[styles.pillarStatusLabel, { color: statusColor }]}>
                    {statusLabel}
                  </Text>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      {/* ══════════════════════════════════════════════════════════════════════
          E. YEARLY CONSISTENCY HEATMAP
          GitHub contribution graph layout: 7 rows (Sun–Sat) × 53 columns.
          Wrapped in a horizontal ScrollView so it scrolls on narrow phones.
      ══════════════════════════════════════════════════════════════════════ */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Year at a Glance</Text>
        <Text style={styles.cardSubtitle}>Every day of the year — swipe to explore</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.heatmapScroll}
        >
          {/* Fixed-width inner container so the scroll works correctly */}
          <View style={{ width: heatmapInnerWidth }}>
            {/* ── Month labels row ──────────────────────────────────────────── */}
            <View style={styles.heatmapMonthRow}>
              {/* Spacer for the day-of-week label column on the left */}
              <View style={{ width: 28 }} />

              {/* Position each month label at the start column of that month */}
              <View style={styles.heatmapMonthLabels}>
                {monthLabelPositions.map(({ month, col }) => (
                  <Text
                    key={month}
                    style={[
                      styles.heatmapMonthLabel,
                      // Absolute position: col × (CELL_SIZE + CELL_GAP)
                      { left: col * CELL_STEP },
                    ]}
                  >
                    {monthAbbr(month)}
                  </Text>
                ))}
              </View>
            </View>

            {/* ── Grid body: day-of-week labels + 7 cell rows ───────────────── */}
            <View style={styles.heatmapBody}>
              {/* Left column: day-of-week labels (Mon, Wed, Fri only) */}
              <View style={styles.heatmapDowColumn}>
                {DOW_LABELS.map((label, i) => (
                  <Text key={i} style={styles.heatmapDowLabel}>
                    {label}
                  </Text>
                ))}
              </View>

              {/* Grid of 7 rows × 53 cells */}
              <View>
                {heatmapGrid.map((rowCells, dowIndex) => (
                  <View key={dowIndex} style={styles.heatmapRow}>
                    {rowCells.map((cell, weekIndex) => {
                      const color = heatmapColor(
                        cell.adherence,
                        cell.hasData,
                        cell.isEmpty,
                      );
                      return (
                        <View
                          key={weekIndex}
                          style={[
                            styles.heatmapCell,
                            {
                              backgroundColor: color,
                              // Today's cell gets a purple outline
                              borderWidth:  cell.isToday ? 1 : 0,
                              borderColor:  '#3C3489',
                            },
                          ]}
                        />
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>

            {/* ── Colour legend ─────────────────────────────────────────────── */}
            <View style={styles.heatmapLegend}>
              <View style={styles.heatmapLegendItem}>
                <View style={[styles.heatmapLegendSwatch, { backgroundColor: '#4CAF50' }]} />
                <Text style={styles.heatmapLegendText}>80%+</Text>
              </View>
              <View style={styles.heatmapLegendItem}>
                <View style={[styles.heatmapLegendSwatch, { backgroundColor: '#FFC107' }]} />
                <Text style={styles.heatmapLegendText}>65–79%</Text>
              </View>
              <View style={styles.heatmapLegendItem}>
                <View style={[styles.heatmapLegendSwatch, { backgroundColor: '#EF5350' }]} />
                <Text style={styles.heatmapLegendText}>&lt;65%</Text>
              </View>
              <View style={styles.heatmapLegendItem}>
                <View style={[styles.heatmapLegendSwatch, { backgroundColor: '#E5E7EB' }]} />
                <Text style={styles.heatmapLegendText}>No data</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* ══════════════════════════════════════════════════════════════════════
          F. YEARLY INSIGHTS (only shown once ≥30 days are tracked)
      ══════════════════════════════════════════════════════════════════════ */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Insights</Text>

        {/* Not enough data yet */}
        {(!yearlyData || totalDaysTracked < 30) && !loading && (
          <Text style={styles.insightsPlaceholder}>
            Keep logging to unlock your yearly insights! 📈
          </Text>
        )}

        {/* Loading skeleton */}
        {loading && (
          <Text style={styles.insightsPlaceholder}>Loading insights…</Text>
        )}

        {/* Real insights — only shown when ≥30 tracked days */}
        {insights && (
          <View style={styles.insightsList}>
            {/* 1. Most consistent month */}
            {insights.bestMonth && (
              <Text style={styles.insightBullet}>
                {'📅 Most consistent month: '}
                {MONTH_NAMES[insights.bestMonth.month]}
                {` (${insights.bestMonth.adherence}%)`}
              </Text>
            )}

            {/* 2. Strongest pillar */}
            {insights.strongestPillar && (
              <Text style={styles.insightBullet}>
                {'💪 Strongest pillar: '}
                {PILLAR_LABELS[insights.strongestPillar]}
                {` averaged ${insights.strongestAvgHours.toFixed(1)}h/day`}
              </Text>
            )}

            {/* 3. Journal entries */}
            <Text style={styles.insightBullet}>
              {`📝 You wrote ${insights.journalCount} journal `}
              {insights.journalCount === 1 ? 'entry' : 'entries'}
              {' this year'}
            </Text>

            {/* 4. Tasks completed */}
            <Text style={styles.insightBullet}>
              {`✅ ${insights.totalCompleted} tasks completed across `}
              {`${insights.totalDaysTracked} tracked `}
              {insights.totalDaysTracked === 1 ? 'day' : 'days'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Sub-component: YearlySummaryCard ────────────────────────────────────────
// One of the 6 horizontal cards in section B.
interface SummaryCardProps {
  emoji: string;
  label: string;
  value: string;
}

function YearlySummaryCard({ emoji, label, value }: SummaryCardProps) {
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
  // ── Section header outside cards ────────────────────────────────────────────
  sectionHeader: {
    fontSize:        20,
    fontWeight:      '800',
    color:           '#1A1A2E',
    paddingHorizontal: 16,
    marginBottom:    12,
    marginTop:       8,
  },

  // ── White card (used for all sub-section cards) ──────────────────────────────
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

  cardTitle: {
    fontSize:     17,
    fontWeight:   '700',
    color:        '#1A1A2E',
    marginBottom: 4,
  },

  cardSubtitle: {
    fontSize:     13,
    color:        '#888',
    marginBottom: 14,
  },

  // ── A. Year navigation row ───────────────────────────────────────────────────
  yearNavRow: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
  },

  navArrow: {
    paddingHorizontal: 20,
    paddingVertical:   6,
  },

  navArrowDisabled: {
    opacity: 0.3,
  },

  navArrowText: {
    fontSize:   28,
    fontWeight: '300',
    color:      '#3C3489',
    lineHeight: 32,
  },

  yearLabel: {
    fontSize:   22,
    fontWeight: '700',
    color:      '#1A1A2E',
    minWidth:   70,
    textAlign:  'center',
  },

  yearSpinner: {
    minWidth: 70,
    height:   32,
  },

  // ── B. Summary cards row ─────────────────────────────────────────────────────
  summaryRow: {
    marginBottom: 0, // cards have their own marginBottom
  },

  summaryRowContent: {
    paddingHorizontal: 16,
    gap:               12,
    paddingBottom:     16,
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
    // Purple left border — brand accent
    borderLeftWidth:  4,
    borderLeftColor:  '#3C3489',
  },

  summaryEmoji: {
    fontSize:     20,
    marginBottom: 4,
  },

  summaryValue: {
    fontSize:     16,
    fontWeight:   '800',
    color:        '#1A1A2E',
    marginBottom: 2,
  },

  summaryLabel: {
    fontSize: 11,
    color:    '#888',
  },

  // ── C. 12-month trend bar chart ──────────────────────────────────────────────
  monthBarChart: {
    flexDirection:   'row',
    alignItems:      'flex-end',
    justifyContent:  'space-between',
    marginTop:       12,
  },

  // One bar + labels, taking equal flex space
  monthBarWrapper: {
    flex:        1,
    alignItems:  'center',
    marginHorizontal: 1,
  },

  // Percentage label above the bar
  monthBarLabel: {
    fontSize:     8,
    color:        '#666',
    marginBottom: 2,
    textAlign:    'center',
    minHeight:    12,
  },

  // Fixed-height track so all bars align at the bottom
  monthBarTrack: {
    height:          100,
    justifyContent:  'flex-end',
    width:           '100%',
  },

  // The coloured bar itself
  monthBar: {
    width:        '100%',
    borderRadius: 3,
    minHeight:    4,
  },

  // 1-letter month abbreviation below the bar
  monthBarMonthLabel: {
    fontSize:  10,
    color:     '#555',
    marginTop: 4,
    textAlign: 'center',
  },

  // Small purple dot marking the current month
  currentMonthDot: {
    width:           5,
    height:          5,
    borderRadius:    3,
    backgroundColor: '#3C3489',
    marginTop:       3,
  },

  // Invisible placeholder so other months stay the same height
  currentMonthDotPlaceholder: {
    width:     5,
    height:    5,
    marginTop: 3,
  },

  // ── D. Pillar balance ────────────────────────────────────────────────────────
  pillarRow: {
    // Each pillar is laid out as a 3-column row (name | bar | avg label)
    // wrapped in a View so we can place the status label below
    marginBottom: 14,
  },

  // Flex row containing [name col | track | avg label]
  pillarFlexRow: {
    flexDirection: 'row',
    alignItems:    'center',
  },

  pillarLabelCol: {
    width:         60,
    flexDirection: 'row',
    alignItems:    'center',
  },

  pillarDot: {
    width:        8,
    height:       8,
    borderRadius: 4,
    marginRight:  4,
  },

  pillarName: {
    fontSize: 12,
    color:    '#1A1A2E',
  },

  pillarTrack: {
    flex:            1, // fills the space between name label and avg label
    height:          10,
    backgroundColor: '#F0F0F0',
    borderRadius:    5,
    overflow:        'visible', // target line extends slightly above/below the track
    marginHorizontal: 8,
  },

  pillarFill: {
    height:       '100%',
    borderRadius: 5,
  },

  // Thin vertical target line — absolutely positioned on the track
  pillarTargetLine: {
    position:        'absolute',
    top:             -2,
    width:           2,
    height:          14, // slightly taller than the track (10 + 4px)
    backgroundColor: 'rgba(0,0,0,0.3)',
  },

  pillarAvgLabel: {
    width:     55,
    fontSize:  12,
    color:     '#555',
    textAlign: 'right',
  },

  pillarStatusRow: {
    marginTop:  2,
    marginLeft: 68, // align under the track (name col 60px + 8px gap)
  },

  pillarStatusLabel: {
    fontSize: 11,
  },

  // ── E. Heatmap ───────────────────────────────────────────────────────────────
  heatmapScroll: {
    marginTop: 8,
  },

  // Month labels strip along the top
  heatmapMonthRow: {
    flexDirection: 'row',
    marginBottom:  4,
  },

  heatmapMonthLabels: {
    flex:     1,
    position: 'relative',
    height:   14,
  },

  heatmapMonthLabel: {
    position: 'absolute',
    fontSize: 10,
    color:    '#888',
  },

  // Body = DOW column + grid
  heatmapBody: {
    flexDirection: 'row',
  },

  // Left column: Mon / Wed / Fri labels
  heatmapDowColumn: {
    width:          28,
    justifyContent: 'space-between',
    paddingVertical: 0,
  },

  heatmapDowLabel: {
    fontSize:   9,
    color:      '#AAA',
    height:     CELL_STEP,
    lineHeight: CELL_STEP,
  },

  // One row of 53 cells
  heatmapRow: {
    flexDirection: 'row',
    marginBottom:  CELL_GAP,
  },

  // One 11×11 square
  heatmapCell: {
    width:        CELL_SIZE,
    height:       CELL_SIZE,
    borderRadius: 2,
    marginRight:  CELL_GAP,
  },

  // Legend row below the grid
  heatmapLegend: {
    flexDirection:  'row',
    flexWrap:       'wrap',
    gap:            10,
    marginTop:      10,
  },

  heatmapLegendItem: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
  },

  heatmapLegendSwatch: {
    width:        10,
    height:       10,
    borderRadius: 2,
  },

  heatmapLegendText: {
    fontSize: 10,
    color:    '#888',
  },

  // ── F. Insights ──────────────────────────────────────────────────────────────
  insightsPlaceholder: {
    fontSize: 14,
    color:    '#888',
    marginTop: 4,
  },

  insightsList: {
    gap: 10,
    marginTop: 4,
  },

  insightBullet: {
    fontSize:   14,
    color:      '#333',
    lineHeight: 20,
  },
});

// ─── Pillar balance row layout ────────────────────────────────────────────────
// Each pillar row uses this horizontal layout:
//
//  [ dot + name (60px) ]  [ ══════ track (flex:1, marginHorizontal:8) ══════ ]  [ X.Xh avg (55px) ]
//                                          ^target line (absolute, 2px wide)
//                          status label indented 68px on the next line
