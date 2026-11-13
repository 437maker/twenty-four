// NovaCompanion.tsx — Displays the correct Nova image with a bounce animation
// when her state changes. Uses React Native's built-in Animated API (not Reanimated),
// so it works in Expo Go.

import React, { useEffect, useRef } from 'react';
import { View, Image, Text, Animated, StyleSheet } from 'react-native';
import { NovaState } from '../types';

// Map each state to its image file.
// "require" loads the image at build time so it's always available offline.
const IMAGES: Record<NovaState, any> = {
  idle:        require('../../assets/images/nova-default.png'),
  happy:       require('../../assets/images/nova-happy.png'),
  sleeping:    require('../../assets/images/nova-sleep.png'),
  celebrating: require('../../assets/images/nova-celebrate.png'),
};

interface Props {
  state: NovaState;
  name: string;
  size?: number; // image width/height in pixels (default 200)
}

export default function NovaCompanion({ state, name, size = 200 }: Props) {
  // Animated.Value holds a number that React Native can animate smoothly.
  // Starting at 1 = normal (100%) scale.
  const scale = useRef(new Animated.Value(1)).current;

  // Every time "state" changes, run a quick bounce: scale up then spring back.
  useEffect(() => {
    Animated.sequence([
      // Scale up to 115% in 150ms
      Animated.timing(scale, {
        toValue: 1.15,
        duration: 150,
        useNativeDriver: true, // runs on the GPU — smoother animation
      }),
      // Spring back to 100% with a natural bounce feel
      Animated.spring(scale, {
        toValue: 1,
        friction: 4,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [state]);

  // The sleeping image has a dark blue background baked in.
  // We show a grass area behind Nova for all other states.
  const isSleeping = state === 'sleeping';

  return (
    <View style={styles.wrapper}>
      {/* Soft green "grass" pad — hidden when sleeping because the blue bg would clash */}
      {!isSleeping && (
        <View style={[styles.grassPad, { width: size * 0.85 }]} />
      )}

      {/* Animated.Image scales with the bounce animation */}
      <Animated.Image
        source={IMAGES[state]}
        style={[
          styles.image,
          { width: size, height: size, transform: [{ scale }] },
        ]}
        resizeMode="contain"
      />

      {/* Companion name */}
      <Text style={styles.name}>{name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    // Position relative so the grass pad can sit behind Nova
  },
  grassPad: {
    position: 'absolute',
    bottom: 36, // sits just under Nova's feet
    height: 28,
    backgroundColor: 'rgba(143, 188, 143, 0.25)', // soft green, 25% opacity
    borderRadius: 50,
  },
  image: {
    // Explicit width/height set via props
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#5D4037', // warm brown
    marginTop: 4,
    letterSpacing: 0.3,
  },
});
