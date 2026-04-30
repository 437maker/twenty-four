import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ShopPlaceholder() {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🛍️</Text>
      <Text style={styles.title}>Shop</Text>
      <Text style={styles.subtitle}>Coming in Phase 2.0</Text>
      <Text style={styles.body}>
        This screen will let you spend earned coins on Nova accessories and themes.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center', padding: 32 },
  emoji:    { fontSize: 56, marginBottom: 16 },
  title:    { fontSize: 22, fontWeight: '800', color: '#1F2937', marginBottom: 6 },
  subtitle: { fontSize: 14, fontWeight: '600', color: '#3C3489', marginBottom: 12 },
  body:     { fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 22 },
});
