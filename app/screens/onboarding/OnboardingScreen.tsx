// OnboardingScreen.tsx — Six-step first-launch setup flow.
//
// This is a single screen that shows different content based on which step
// the user is on. A "step" counter (1–6) controls what's visible.
//
// When onboarding finishes, the store's "isOnboarded" flag flips to true,
// and App.tsx automatically switches to the main tab navigator.

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useAppStore } from '../../store/useAppStore';
import { insertSampleTasks } from '../../db/queries';
import { getTomorrowString, dateToTimeString } from '../../utils/dateHelpers';
import { scheduleDailyNotification } from '../../utils/notifications';
import { NewTaskInput } from '../../types';

const TOTAL_STEPS = 6;

export default function OnboardingScreen() {
  const { completeOnboarding } = useAppStore();

  // "step" tracks which screen we're on. useState(1) means it starts at step 1.
  // Calling setStep() causes the component to re-render with the new step value.
  const [step, setStep] = useState(1);

  // Step 2 data
  const [companionName, setCompanionName] = useState('Nova');

  // Step 3 data — hour targets for each pillar
  const [workHours, setWorkHours] = useState(8);
  const [personalHours, setPersonalHours] = useState(6);
  const [sleepHours, setSleepHours] = useState(8);

  // Step 5 data — notification time
  const [notifTime, setNotifTime] = useState<Date>(() => {
    // Default to 8:00 AM
    const d = new Date();
    d.setHours(8, 0, 0, 0);
    return d;
  });
  const [showTimePicker, setShowTimePicker] = useState(false);

  const totalHours = workHours + personalHours + sleepHours;

  // Move forward to the next step
  function goNext() {
    if (step === 3 && totalHours > 24) {
      Alert.alert(
        'Over 24 hours',
        `Your targets add up to ${totalHours}h, which is more than a day. Please reduce them.`
      );
      return;
    }
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 1));
  }

  // Called on the last step — saves everything and unlocks the main app.
  async function finishOnboarding() {
    const name = companionName.trim() || 'Nova';

    // Insert 3 sample tasks for tomorrow so the Schedule screen isn't empty
    const tomorrow = getTomorrowString();
    const samples: NewTaskInput[] = [
      { date: tomorrow, name: 'Morning deep work', start_time: '09:00', duration_hours: 2, pillar: 'work' },
      { date: tomorrow, name: 'Evening walk', start_time: '18:00', duration_hours: 1, pillar: 'personal' },
      { date: tomorrow, name: 'Sleep', start_time: '22:00', duration_hours: 8, pillar: 'sleep' },
    ];
    await insertSampleTasks(samples);

    // Schedule the daily notification
    await scheduleDailyNotification(notifTime, name);

    // Save settings and flip the "onboarded" flag.
    // This causes App.tsx to re-render and show the main tabs.
    await completeOnboarding({
      companion_name: name,
      work_target_hours: workHours,
      personal_target_hours: personalHours,
      sleep_target_hours: sleepHours,
      notification_time: dateToTimeString(notifTime),
    });
  }

  // Render the content for the current step number
  function renderStepContent() {
    switch (step) {
      case 1:
        return <StepWelcome />;
      case 2:
        return <StepName name={companionName} onChange={setCompanionName} />;
      case 3:
        return (
          <StepTargets
            work={workHours}
            personal={personalHours}
            sleep={sleepHours}
            total={totalHours}
            onWorkChange={setWorkHours}
            onPersonalChange={setPersonalHours}
            onSleepChange={setSleepHours}
          />
        );
      case 4:
        return <StepPlan companionName={companionName.trim() || 'Nova'} />;
      case 5:
        return (
          <StepNotification
            time={notifTime}
            showPicker={showTimePicker}
            companionName={companionName.trim() || 'Nova'}
            onRequestPicker={() => {
              setShowTimePicker(true);
            }}
            onTimeChange={(date) => {
              setShowTimePicker(false);
              if (date) setNotifTime(date);
            }}
          />
        );
      case 6:
        return (
          <StepReveal
            companionName={companionName.trim() || 'Nova'}
            onFinish={finishOnboarding}
          />
        );
      default:
        return null;
    }
  }

  return (
    // KeyboardAvoidingView pushes content up when the keyboard appears on iOS
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Progress dots at the top */}
      <View style={styles.dots}>
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <View key={i} style={[styles.dot, i + 1 === step && styles.dotActive]} />
        ))}
      </View>

      {/* Step content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {renderStepContent()}
      </ScrollView>

      {/* Back / Next buttons — hidden on step 6, which has its own CTA */}
      {step < 6 && (
        <View style={styles.navRow}>
          {step > 1 && (
            <TouchableOpacity style={styles.backBtn} onPress={goBack}>
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.nextBtn, step === 1 && { flex: 1 }]}
            onPress={goNext}
          >
            <Text style={styles.nextBtnText}>
              {step === 5 ? 'Continue' : 'Next →'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* DateTimePicker rendered at this level so it works on Android too */}
      {showTimePicker && (
        <DateTimePicker
          value={notifTime}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, date) => {
            setShowTimePicker(false);
            if (date) setNotifTime(date);
          }}
        />
      )}
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────────────────────────
// STEP SUB-COMPONENTS
// Each of these is a small React component used inside renderStepContent().
// They're defined here (in the same file) to keep everything together.
// ─────────────────────────────────────────────────────────────

function StepWelcome() {
  return (
    <View style={step.container}>
      <Text style={step.emoji}>🐕</Text>
      <Text style={step.title}>Welcome to 24</Text>
      <Text style={step.tagline}>Plan your 24 hours</Text>
      <Text style={step.body}>
        Meet Nova, your daily German Shepherd companion. Together you'll plan
        each day, track three life pillars — Work, Personal, and Sleep — and
        build the habit of living intentionally.
      </Text>
    </View>
  );
}

function StepName({ name, onChange }: { name: string; onChange: (v: string) => void }) {
  return (
    <View style={step.container}>
      <Text style={step.emoji}>🐾</Text>
      <Text style={step.title}>Name your companion</Text>
      <Text style={step.body}>
        Your companion is ready to help. What will you call them?
      </Text>
      <TextInput
        style={step.input}
        value={name}
        onChangeText={onChange}
        placeholder="Nova"
        maxLength={20}
        autoFocus
        returnKeyType="done"
        selectionColor="#3C3489"
      />
    </View>
  );
}

interface TargetsProps {
  work: number; personal: number; sleep: number; total: number;
  onWorkChange: (v: number) => void;
  onPersonalChange: (v: number) => void;
  onSleepChange: (v: number) => void;
}

function StepTargets({ work, personal, sleep, total, onWorkChange, onPersonalChange, onSleepChange }: TargetsProps) {
  const over = total > 24;
  return (
    <View style={step.container}>
      <Text style={step.title}>Set your daily targets</Text>
      <Text style={step.body}>
        How many hours per day do you want for each pillar? Must total 24 or less.
      </Text>

      {/* Running total badge */}
      <View style={[step.totalBadge, over && step.totalBadgeOver]}>
        <Text style={[step.totalText, over && step.totalTextOver]}>
          {total}h / 24h  {over ? '⚠️ Reduce your targets' : '✓'}
        </Text>
      </View>

      <HourStepper label="Work"     value={work}     color="#3C3489" onChange={onWorkChange} />
      <HourStepper label="Personal" value={personal} color="#1D9E75" onChange={onPersonalChange} />
      <HourStepper label="Sleep"    value={sleep}    color="#185FA5" onChange={onSleepChange} />
    </View>
  );
}

// A +/- stepper row used instead of a native Slider (avoids native module issues in Expo Go)
function HourStepper({
  label, value, color, onChange,
}: {
  label: string; value: number; color: string; onChange: (v: number) => void;
}) {
  return (
    <View style={step.stepperRow}>
      <View style={step.stepperHeader}>
        <Text style={step.stepperLabel}>{label}</Text>
        <Text style={[step.stepperValue, { color }]}>{value}h</Text>
      </View>
      <View style={step.stepperControls}>
        <TouchableOpacity
          style={step.stepBtn}
          onPress={() => onChange(Math.max(0, parseFloat((value - 0.5).toFixed(1))))}
        >
          <Text style={step.stepBtnText}>−</Text>
        </TouchableOpacity>

        {/* Visual mini-bar */}
        <View style={[step.miniTrack, { backgroundColor: color + '30' }]}>
          <View
            style={[
              step.miniFill,
              { backgroundColor: color, width: `${Math.min(100, (value / 12) * 100)}%` },
            ]}
          />
        </View>

        <TouchableOpacity
          style={step.stepBtn}
          onPress={() => onChange(Math.min(24, parseFloat((value + 0.5).toFixed(1))))}
        >
          <Text style={step.stepBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function StepPlan({ companionName }: { companionName: string }) {
  const samples = [
    { name: 'Morning deep work', hours: 2, pillar: 'Work',     color: '#3C3489' },
    { name: 'Evening walk',       hours: 1, pillar: 'Personal', color: '#1D9E75' },
    { name: 'Sleep',              hours: 8, pillar: 'Sleep',    color: '#185FA5' },
  ];
  return (
    <View style={step.container}>
      <Text style={step.emoji}>📋</Text>
      <Text style={step.title}>Tomorrow is pre-planned</Text>
      <Text style={step.body}>
        {companionName} has added three starter tasks for tomorrow. You can
        edit or delete them on the Schedule screen.
      </Text>
      {samples.map((t) => (
        <View key={t.name} style={step.sampleCard}>
          <View style={[step.sampleDot, { backgroundColor: t.color }]} />
          <Text style={step.sampleName}>{t.name}</Text>
          <Text style={step.sampleMeta}>{t.hours}h · {t.pillar}</Text>
        </View>
      ))}
    </View>
  );
}

interface NotifProps {
  time: Date; showPicker: boolean; companionName: string;
  onRequestPicker: () => void;
  onTimeChange: (date?: Date) => void;

}
function StepNotification({ time, companionName, onRequestPicker }: NotifProps) {
  const h = time.getHours();
  const m = time.getMinutes().toString().padStart(2, '0');
  const period = h >= 12 ? 'PM' : 'AM';
  const display = `${h % 12 || 12}:${m} ${period}`;

  return (
    <View style={step.container}>
      <Text style={step.emoji}>🔔</Text>
      <Text style={step.title}>Daily reminder</Text>
      <Text style={step.body}>
        {companionName} will check in once a day to remind you to plan.
        When should they nudge you?
      </Text>
      {/* [USER ACTION NEEDED] Tapping this button will show the iOS
          notification permission dialog and then the time picker. */}
      <TouchableOpacity style={step.timeCard} onPress={onRequestPicker}>
        <Text style={step.timeDisplay}>{display}</Text>
        <Text style={step.timeSub}>Tap to change · Tap Allow when iOS asks for permission</Text>
      </TouchableOpacity>
    </View>
  );
}

function StepReveal({ companionName, onFinish }: { companionName: string; onFinish: () => Promise<void> }) {
  const [loading, setLoading] = useState(false);

  async function handlePress() {
    setLoading(true);
    await onFinish();
    // No explicit navigation needed — the store change causes App.tsx to switch screens
  }

  return (
    <View style={step.container}>
      <Text style={[step.emoji, { fontSize: 80 }]}>🐕</Text>
      <Text style={step.title}>Meet {companionName}!</Text>
      <Text style={step.body}>
        You're all set. {companionName} is ready to help you take back
        your 24 hours. Let's start today.
      </Text>
      <TouchableOpacity style={step.startBtn} onPress={handlePress} disabled={loading}>
        <Text style={step.startBtnText}>
          {loading ? 'Setting up…' : `Start with ${companionName} →`}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FAFDF7',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: 60,
    paddingBottom: 12,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
  },
  dotActive: {
    width: 24,
    backgroundColor: '#3C3489',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  navRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 48,
    paddingTop: 12,
    gap: 12,
  },
  backBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  backBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  nextBtn: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#3C3489',
    alignItems: 'center',
  },
  nextBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

// Styles shared across step sub-components.
// Named "step" (not "styles") so it's clear which StyleSheet it belongs to.
const step = StyleSheet.create({
  container: {
    paddingTop: 24,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  tagline: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3C3489',
    marginBottom: 8,
  },
  body: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
  },
  input: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
  },
  // Targets step
  totalBadge: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24,
    width: '100%',
    alignItems: 'center',
  },
  totalBadgeOver: {
    backgroundColor: '#FEF2F2',
  },
  totalText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#16A34A',
  },
  totalTextOver: {
    color: '#DC2626',
  },
  stepperRow: {
    width: '100%',
    marginBottom: 20,
  },
  stepperHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  stepperLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  stepperValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#374151',
    lineHeight: 26,
  },
  miniTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  miniFill: {
    height: '100%',
    borderRadius: 5,
  },
  // Plan step
  sampleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    width: '100%',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sampleDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  sampleName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  sampleMeta: {
    fontSize: 13,
    color: '#6B7280',
  },
  // Notification step
  timeCard: {
    backgroundColor: '#3C3489',
    borderRadius: 18,
    paddingVertical: 24,
    paddingHorizontal: 32,
    alignItems: 'center',
    width: '100%',
  },
  timeDisplay: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  timeSub: {
    fontSize: 12,
    color: '#A5B4FC',
    marginTop: 6,
    textAlign: 'center',
  },
  // Reveal step
  startBtn: {
    backgroundColor: '#3C3489',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  startBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
