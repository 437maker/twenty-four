// NovaCompanion.tsx — the companion with her name underneath, for cards and
// modals (streak milestone, weekly box).
//
// Until the Maltese redesign this file showed one of four German Shepherd
// PNGs with a bounce. It now wraps the animated <Companion>, showing the
// breed and the items the user has chosen. The old PNGs are still in
// assets/images/ for rollback (see docs/DECISIONS.md, D15).

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { NovaState } from '../types';
import Companion from './companion/Companion';
import { useCompanionLook } from './companion/useCompanionLook';
import { useReduceMotion } from './companion/useReduceMotion';

interface Props {
  state: NovaState;
  name: string;
  size?: number;              // width and height in pixels (default 200)
  reduceMotion?: boolean;     // defaults to the phone's Reduce Motion setting
}

export default function NovaCompanion({ state, name, size = 200, reduceMotion }: Props) {
  const systemReduceMotion = useReduceMotion();
  const look = useCompanionLook();
  return (
    <View style={styles.wrapper}>
      {/* Not interactive: this component is shown inside React Native modals,
          where the app's gesture root is not available. */}
      <Companion
        state={state}
        size={size}
        breed={look.breed}
        equipped={look.equipped}
        reduceMotion={reduceMotion ?? systemReduceMotion}
        interactive={false}
        label={`${name} is ${state}`}
      />
      <Text style={styles.name}>{name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#5D4037', // warm brown
    marginTop: 4,
    letterSpacing: 0.3,
  },
});
