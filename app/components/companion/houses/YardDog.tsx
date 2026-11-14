// YardDog.tsx — the dog in front of her house, and going inside it.
//
// One animated <Companion> for the whole trip: she walks from her spot to
// the door, shrinks and fades through it, and fades back in at the rest spot
// (a doorway or a window) in the sleeping pose, with her "z"s. Whatever she
// is wearing stays on, because it is the same dog the whole time; only the
// view she lives in moves.
//
// The rules (who may send her in, what a tap does) are in restMachine.ts.
// This file only plays the walk for whichever phase the rules give.

import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import type { NovaState } from '../../../types';
import Companion from '../Companion';
import type { Equipped } from '../items/itemSlots';
import { DOOR_FADE_MS, REST_START, WALK_MS, isInsideOrGoing, restReducer, walkPose } from './restMachine';
import type { RestPhase, WalkPoints } from './restMachine';
import { dogFrame } from './HouseScene';
import { scenePoint } from './types';
import type { HouseDef, SceneFit } from './types';

export interface YardDogProps {
  house: HouseDef;
  fit: SceneFit;
  outsideState: NovaState;   // what she is doing when she is not resting
  name: string;
  breed: string;
  equipped: Equipped;
  reduceMotion: boolean;
  inSleepBlock: boolean;     // the schedule is in a Sleep block right now
  onLongPress?: () => void;
  onPhase?: (phase: RestPhase) => void;
}

const walkEase = Easing.inOut(Easing.quad);

export default function YardDog({
  house, fit, outsideState, name, breed, equipped, reduceMotion, inSleepBlock, onLongPress, onPhase,
}: YardDogProps) {
  const [rest, dispatch] = useReducer(restReducer, REST_START);
  // True once she is through the door: from then on she shows the sleeping pose.
  const [insidePose, setInsidePose] = useState(false);

  const p = useSharedValue(0);      // where she is on the walk (see restMachine.ts)
  const fade = useSharedValue(1);   // Reduce Motion: a plain fade instead of a walk

  const box = useMemo(() => dogFrame(fit, house.dog), [fit, house]);
  const points = useMemo<WalkPoints>(() => {
    const a = scenePoint(fit, house.dog.x, house.dog.y);
    const d = scenePoint(fit, house.door.x, house.door.y);
    const r = scenePoint(fit, house.rest.x, house.rest.y);
    return { ax: a.x, ay: a.y, dx: d.x, dy: d.y, rx: r.x, ry: r.y, restScale: house.rest.size / house.dog.size };
  }, [fit, house]);

  // ── The schedule sends her in and lets her out ──
  useEffect(() => {
    dispatch(inSleepBlock ? 'sleepStart' : 'sleepEnd');
  }, [inSleepBlock]);

  // ── Play the walk for the current phase ──
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const live = useRef({ reduceMotion });
  live.current = { reduceMotion };
  useEffect(() => {
    const later = (ms: number, fn: () => void) => {
      timers.current.push(setTimeout(fn, ms));
    };
    const clear = () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
    clear();
    onPhase?.(rest.phase);

    if (rest.phase === 'entering' || rest.phase === 'exiting') {
      const goingIn = rest.phase === 'entering';
      if (live.current.reduceMotion) {
        // Reduce Motion: no walk. She fades out where she is and fades in where she is going.
        fade.value = withTiming(0, { duration: 150 });
        later(160, () => {
          p.value = goingIn ? 2 : 0;
          setInsidePose(goingIn);
          fade.value = withTiming(1, { duration: 200 });
        });
        later(380, () => dispatch('arrived'));
      } else if (goingIn) {
        const from = Math.min(2, Math.max(0, p.value));
        if (from >= 1) {
          // Already through the door (a tap turned her around mid-way out).
          const ms = DOOR_FADE_MS * (2 - from);
          p.value = withTiming(2, { duration: ms });
          setInsidePose(true);
          later(ms, () => dispatch('arrived'));
        } else {
          const walk = WALK_MS * (1 - from);
          p.value = withSequence(
            withTiming(1, { duration: walk, easing: walkEase }),
            withTiming(2, { duration: DOOR_FADE_MS }),
          );
          later(walk, () => setInsidePose(true));
          later(walk + DOOR_FADE_MS, () => dispatch('arrived'));
        }
      } else {
        const from = Math.min(2, Math.max(0, p.value));
        if (from > 1) {
          const out = DOOR_FADE_MS * (from - 1);
          p.value = withSequence(
            withTiming(1, { duration: out }),
            withTiming(0, { duration: WALK_MS, easing: walkEase }),
          );
          later(out, () => setInsidePose(false));
          later(out + WALK_MS, () => dispatch('arrived'));
        } else {
          const walk = WALK_MS * from;
          p.value = withTiming(0, { duration: walk, easing: walkEase });
          setInsidePose(false);
          later(walk, () => dispatch('arrived'));
        }
      }
    }
    return clear;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rest.phase]);

  const style = useAnimatedStyle(() => {
    const w = walkPose(p.value, points);
    return {
      opacity: w.opacity * fade.value,
      transform: [
        { translateX: w.x - points.ax },
        { translateY: w.y - points.ay },
        { scale: w.scale },
      ],
    };
  });

  const going = isInsideOrGoing(rest.phase);
  // Asleep once she is inside; trotting (the happy hop) while she walks.
  const state: NovaState = insidePose ? 'sleeping' : rest.phase === 'outside' ? outsideState : 'happy';
  const tap = () => dispatch('tap');

  const hit = useMemo(() => {
    const tl = scenePoint(fit, house.hit.x, house.hit.y);
    return { left: tl.x, top: tl.y, width: house.hit.w * fit.k, height: house.hit.h * fit.k };
  }, [fit, house]);

  return (
    <>
      {/* The house itself is the button */}
      <Pressable
        style={[styles.hit, hit]}
        onPress={tap}
        accessibilityRole="button"
        accessibilityLabel={going ? `Wake ${name} and bring her outside` : `Send ${name} inside to rest`}
        testID="yard-house"
      />

      <Animated.View
        style={[
          styles.dog,
          { left: box.left, top: box.top, width: box.size, height: box.size, transformOrigin: [box.size / 2, box.size, 0] },
          style,
        ]}
      >
        <Companion
          state={state}
          size={box.size}
          reduceMotion={reduceMotion}
          breed={breed}
          equipped={equipped}
          label={
            insidePose
              ? `${name} is resting inside. Tap to wake her.`
              : `${name} is ${state}. Tap to pet. Press and hold to choose a different dog.`
          }
          onPress={insidePose ? tap : noop}
          onLongPress={onLongPress}
          testID="yard-dog"
        />
      </Animated.View>

      {/* A small button, for anyone who does not think to tap the house */}
      <Pressable
        style={styles.pill}
        onPress={tap}
        accessibilityRole="button"
        accessibilityLabel={going ? `Wake ${name}` : `Send ${name} inside to rest`}
        testID="yard-rest-button"
        hitSlop={8}
      >
        <Text style={styles.pillText}>{going ? '☀️ Wake' : '💤 Rest'}</Text>
      </Pressable>
    </>
  );
}

function noop() {}

const styles = StyleSheet.create({
  hit: { position: 'absolute' },
  dog: { position: 'absolute' },
  pill: {
    position: 'absolute', right: 10, bottom: 8,
    backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 14,
    paddingVertical: 5, paddingHorizontal: 10,
  },
  pillText: { fontSize: 12, fontWeight: '800', color: '#3C3489' },
});
