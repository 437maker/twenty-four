// RenameCompanionModal.tsx — a small pop-up for renaming the companion.
//
// Opened by tapping her name on Home, and from the Companion Gallery. The
// rule for a valid name lives in utils/companionName.ts and is enforced again
// by the database query, so a bad name cannot be saved from anywhere.

import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';

import { renameCompanion } from '../db/queries';
import { useAppStore } from '../store/useAppStore';
import { MAX_NAME_LENGTH, companionNameError } from '../utils/companionName';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function RenameCompanionModal({ visible, onClose }: Props) {
  const currentName = useAppStore((s) => s.settings?.companion_name ?? 'Nova');
  const loadSettings = useAppStore((s) => s.loadSettings);

  const [text, setText] = useState(currentName);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Start from the current name every time the pop-up opens.
  useEffect(() => {
    if (visible) {
      setText(currentName);
      setError(null);
    }
  }, [visible, currentName]);

  async function handleSave() {
    const problem = companionNameError(text);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    try {
      const saved = await renameCompanion(text);
      if (!saved) {
        setError('That name could not be saved.');
        return;
      }
      await loadSettings(); // every screen showing the name updates
      onClose();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const remaining = MAX_NAME_LENGTH - Array.from(text.trim()).length;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.card}>
          <Text style={styles.title}>Rename your companion</Text>
          <TextInput
            testID="rename-input"
            style={[styles.input, error && styles.inputError]}
            value={text}
            onChangeText={(t) => {
              setText(t);
              if (error) setError(null);
            }}
            autoFocus
            selectTextOnFocus
            maxLength={MAX_NAME_LENGTH + 10} // let the message explain the limit rather than silently cutting
            returnKeyType="done"
            onSubmitEditing={handleSave}
            placeholder="Name"
            placeholderTextColor="#9CA3AF"
            accessibilityLabel="Companion name"
          />
          <View style={styles.underRow}>
            <Text style={styles.error} accessibilityLiveRegion="polite">{error ?? ''}</Text>
            <Text style={[styles.counter, remaining < 0 && styles.counterOver]}>{remaining}</Text>
          </View>
          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.btn, styles.cancel]}
              onPress={onClose}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="rename-save"
              style={[styles.btn, styles.save, saving && styles.disabled]}
              onPress={handleSave}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel="Save name"
            >
              <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(17,24,39,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 360, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20 },
  title: { fontSize: 18, fontWeight: '800', color: '#1F2937', marginBottom: 14 },
  input: {
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 18, fontWeight: '600', color: '#1F2937', backgroundColor: '#F9FAFB',
  },
  inputError: { borderColor: '#DC2626' },
  underRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 22, marginTop: 6 },
  error: { flex: 1, fontSize: 13, color: '#DC2626' },
  counter: { fontSize: 12, color: '#9CA3AF', marginLeft: 8 },
  counterOver: { color: '#DC2626', fontWeight: '700' },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 12 },
  btn: { flex: 1, minHeight: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cancel: { backgroundColor: '#F3F4F6' },
  cancelText: { fontSize: 16, fontWeight: '700', color: '#374151' },
  save: { backgroundColor: '#3C3489' },
  saveText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  disabled: { opacity: 0.6 },
});
