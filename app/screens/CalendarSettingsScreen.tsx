// CalendarSettingsScreen.tsx — Google Calendar sync UI.
//
// Reached from SettingsScreen → "Google Calendar Sync" row.
//
// States it handles:
//   - Not signed in     → "Connect Google Calendar" button (lazy-mounted)
//   - Expo Go           → info notice (useAuthRequest is never called)
//   - Signed in, idle   → Show account email, last-sync time, "Sync now" + "Disconnect"
//   - Syncing           → spinner + "Syncing…"
//   - Sync errored      → red banner with message
//
// IMPORTANT: useGoogleSignIn (which calls Google.useAuthRequest) is intentionally
// moved into GoogleSignInFlow, a child component that is only mounted after the
// user taps "Connect Google Calendar". This prevents the deep-link error thrown
// by expo-auth-session when the app has no custom scheme registered — which was
// the crash reported for iPhone.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import Constants from 'expo-constants';

import { useAppStore } from '../store/useAppStore';
import { useGoogleSignIn, clearTokens, GoogleTokens } from '../services/googleAuth';
import { runSync, SyncResult } from '../services/calendarSync';
import { saveSettings } from '../db/queries';

// True when running inside Expo Go (storeClient); false for standalone / dev-client builds.
const isExpoGo = Constants.executionEnvironment === 'storeClient';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function CalendarSettingsScreen({ visible, onClose }: Props) {
  const { settings, refreshSettings } = useAppStoreShim();

  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [connecting, setConnecting] = useState(false);

  const signedIn = !!settings?.google_account_email && settings?.google_sync_enabled;

  // ── Manual sync ───────────────────────────────────────────────────────────
  const handleSyncNow = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await runSync();
    setBusy(false);
    setLastResult(result);
    await refreshSettings();
    if (!result.ok) {
      setError(result.error ?? 'Sync failed.');
      if (result.signedOut) {
        Alert.alert(
          'Signed out',
          'Your Google session expired. Please reconnect.'
        );
      }
    }
  }, [busy, refreshSettings]);

  // Called by GoogleSignInFlow once OAuth succeeds.
  const handleSignInComplete = useCallback(async (_tokens: GoogleTokens, email: string) => {
    setConnecting(false);
    await saveSettings({
      google_account_email: email,
      google_sync_enabled:  true,
    });
    await refreshSettings();
    handleSyncNow();
  }, [refreshSettings, handleSyncNow]);

  // ── Disconnect ────────────────────────────────────────────────────────────
  async function handleDisconnect() {
    Alert.alert(
      'Disconnect Google Calendar?',
      'Your tasks will stay in the app. They will no longer sync with Google.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            await clearTokens();
            await saveSettings({
              google_account_email: null,
              google_sync_enabled:  false,
              google_sync_token:    null,
            });
            await refreshSettings();
            setLastResult(null);
            setError(null);
            setConnecting(false);
          },
        },
      ]
    );
  }

  // Auto-trigger a sync when the modal opens (and we're already signed in).
  useEffect(() => {
    if (visible && signedIn && !busy) handleSyncNow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const lastSync = settings?.google_last_sync_at;
  const lastSyncLabel = lastSync
    ? new Date(lastSync).toLocaleString()
    : 'never';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Google Calendar</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {!signedIn ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Connect Google Calendar</Text>
              <Text style={styles.sectionSub}>
                Sign in once to keep your tasks in sync. We&apos;ll create a calendar
                called &quot;Twenty-Four&quot; in your Google account — everything stays there
                and doesn&apos;t touch your other calendars.
              </Text>

              {isExpoGo ? (
                // Expo Go cannot perform native deep-link redirects required by
                // Google OAuth. Show an informative notice instead of the button.
                <View style={styles.expoGoNotice}>
                  <Text style={styles.expoGoText}>
                    Google Calendar works in the full app build, not Expo Go.
                  </Text>
                </View>
              ) : connecting ? (
                // GoogleSignInFlow is the ONLY place useGoogleSignIn / useAuthRequest
                // is called. It is mounted only after the user taps Connect.
                <GoogleSignInFlow
                  onComplete={handleSignInComplete}
                  onCancel={() => setConnecting(false)}
                />
              ) : (
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => setConnecting(true)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.primaryBtnText}>Connect Google Calendar</Text>
                </TouchableOpacity>
              )}

              <Text style={styles.smallNote}>
                Permissions requested: calendar read/write, your email address.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Connected</Text>
                <Text style={styles.accountEmail}>{settings?.google_account_email}</Text>
                <Text style={styles.metaLine}>Last sync: {lastSyncLabel}</Text>

                {busy ? (
                  <View style={styles.busyRow}>
                    <ActivityIndicator color="#3C3489" />
                    <Text style={styles.busyText}>Syncing…</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={handleSyncNow}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.primaryBtnText}>Sync now</Text>
                  </TouchableOpacity>
                )}

                {lastResult?.ok && (
                  <View style={styles.statsCard}>
                    <Text style={styles.statsHeading}>Last sync</Text>
                    <StatLine label="Pushed (created)" value={lastResult.pushedCreated} />
                    <StatLine label="Pushed (updated)" value={lastResult.pushedUpdated} />
                    <StatLine label="Pushed (deleted)" value={lastResult.pushedDeleted} />
                    <StatLine label="Pulled (created)" value={lastResult.pulledCreated} />
                    <StatLine label="Pulled (updated)" value={lastResult.pulledUpdated} />
                    <StatLine label="Pulled (deleted)" value={lastResult.pulledDeleted} />
                  </View>
                )}

                {error && (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>How sync works</Text>
                <Text style={styles.bulletText}>
                  • Tasks you create in the app appear on your &quot;Twenty-Four&quot; Google
                  Calendar.{'\n'}
                  • Events you add to that Google Calendar appear in your schedule
                  under the Work pillar.{'\n'}
                  • Repeating tasks are not synced in this version.{'\n'}
                  • Sync runs when you open the app or tap &quot;Sync now&quot;.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.disconnectBtn}
                onPress={handleDisconnect}
                activeOpacity={0.75}
              >
                <Text style={styles.disconnectText}>Disconnect Google Calendar</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── GoogleSignInFlow ─────────────────────────────────────────────────────────
// This component is mounted only when the user taps "Connect Google Calendar".
// Mounting it is the first time Google.useAuthRequest is ever called.
// It immediately opens the system browser for the OAuth flow.
function GoogleSignInFlow({
  onComplete,
  onCancel,
}: {
  onComplete: (tokens: GoogleTokens, email: string) => void;
  onCancel: () => void;
}) {
  const { request, promptAsync } = useGoogleSignIn(onComplete);
  const prompted = useRef(false);

  useEffect(() => {
    if (!request || prompted.current) return;
    prompted.current = true;
    promptAsync()
      .then((result) => {
        // onComplete fires through useGoogleSignIn's internal effect on success.
        // Handle any non-success outcome (cancel, dismiss, error) by resetting.
        if (!result || result.type !== 'success') onCancel();
      })
      .catch(() => onCancel());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  return (
    <View style={styles.busyRow}>
      <ActivityIndicator color="#3C3489" />
      <Text style={styles.busyText}>Opening sign-in…</Text>
    </View>
  );
}

// ─── Small UI helpers ─────────────────────────────────────────────────────────
function StatLine({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

// Shim: useAppStore exposes loadSettings; we expose it as refreshSettings here.
function useAppStoreShim() {
  const settings     = useAppStore((s) => s.settings);
  const loadSettings = useAppStore((s) => s.loadSettings);
  return { settings, refreshSettings: loadSettings };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 20, paddingHorizontal: 20, paddingBottom: 16,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  closeBtn:     { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 18, color: '#6B7280' },
  title:        { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  content:      { padding: 20, paddingBottom: 60 },
  section: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05,
    shadowRadius: 4, elevation: 1,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 6 },
  sectionSub:   { fontSize: 13, color: '#6B7280', marginBottom: 16, lineHeight: 19 },
  accountEmail: { fontSize: 15, fontWeight: '600', color: '#1F2937', marginBottom: 4 },
  metaLine:     { fontSize: 12, color: '#6B7280', marginBottom: 14 },
  primaryBtn: {
    backgroundColor:   '#3C3489',
    borderRadius:      12,
    paddingVertical:   13,
    paddingHorizontal: 20,
    alignItems:        'center',
    marginTop:         4,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  busyRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14,
  },
  busyText: { marginLeft: 8, color: '#3C3489', fontWeight: '600' },
  statsCard: {
    backgroundColor: '#F9FAFB',
    borderRadius:    10,
    padding:         12,
    marginTop:       14,
  },
  statsHeading: { fontSize: 12, fontWeight: '700', color: '#6B7280', marginBottom: 8 },
  statRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  statLabel: { fontSize: 13, color: '#374151' },
  statValue: { fontSize: 13, fontWeight: '700', color: '#1F2937' },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 3,
    borderLeftColor: '#DC2626',
    padding:         12,
    borderRadius:    8,
    marginTop:       14,
  },
  errorText:  { color: '#991B1B', fontSize: 13 },
  smallNote:  { color: '#9CA3AF', fontSize: 12, marginTop: 12, textAlign: 'center' },
  bulletText: { fontSize: 13, color: '#374151', lineHeight: 20 },
  disconnectBtn: {
    alignItems: 'center', paddingVertical: 12,
  },
  disconnectText: { color: '#DC2626', fontSize: 14, fontWeight: '600' },
  expoGoNotice: {
    backgroundColor: '#FFF7ED',
    borderLeftWidth: 3,
    borderLeftColor: '#F97316',
    borderRadius:    8,
    padding:         12,
    marginTop:       4,
  },
  expoGoText: { color: '#9A3412', fontSize: 13, lineHeight: 18 },
});
