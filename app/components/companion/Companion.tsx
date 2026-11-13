// Companion.tsx — the animated Maltese. This is the only file screens import.
//
//   <Companion state="idle" size={150} reduceMotion={false} onPress={...} />
//
// How she is built: about a dozen see-through layers stacked on top of each
// other, one per moving part (tail, body, each ear, eyelids...). Every layer
// is an Animated.View holding one small SVG drawing. The rig
// (useCompanionRig) produces a pose on the UI thread each frame, and each
// layer turns its slice of that pose into a transform around its own pivot
// (ear base, tail base, neck, eyelid hinge).
//
// Why layers of views instead of animating inside one SVG: moving a view with
// a transform is the path Reanimated is built for. It runs on the UI thread
// and never redraws the vector shapes, so it stays smooth.

import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import type { DerivedValue, SharedValue } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { NavigationContext } from '@react-navigation/native';

import type { NovaState } from '../../types';
import { PALETTE } from './palette';
import { HEART, PARTS, ZEE, sparkle } from './parts';
import { PartLayer, neckShapes } from './MalteseSvg';
import { REST_POSE, VIEWBOX, accessoryLook, outlineScaleForSize, partTransform } from './poses';
import type { PartName, Pose } from './poses';
import { PET_HOLD_MS, useCompanionRig } from './useCompanionRig';
import { lightTap } from './haptics';

export interface CompanionProps {
  state: NovaState;
  size: number;
  onPress?: () => void;
  accessory?: string | null;  // a shop item id, e.g. "acc_party_hat"
  reduceMotion: boolean;
  /** false = no tap or petting (use inside React Native <Modal>s). Default true. */
  interactive?: boolean;
  /** Screen-reader label, e.g. "Nova is happy". */
  label?: string;
  testID?: string;
}

// The share of her height (from the top) that counts as "her head" for petting.
const HEAD_ZONE = 0.68;
const SPARKLE_COUNT = 8;

// True while the screen this component sits on is the focused one. Outside a
// navigator (a test, a plain modal) there is nothing to ask, so it is true.
function useScreenFocused(): boolean {
  const navigation = useContext(NavigationContext);
  const [focused, setFocused] = useState(() => (navigation ? navigation.isFocused() : true));
  useEffect(() => {
    if (!navigation) return undefined;
    setFocused(navigation.isFocused());
    const offFocus = navigation.addListener('focus', () => setFocused(true));
    const offBlur = navigation.addListener('blur', () => setFocused(false));
    return () => {
      offFocus();
      offBlur();
    };
  }, [navigation]);
  return focused;
}

// ─── One animated layer of the rig ────────────────────────────────────────────
function RigLayer({
  part, pose, k, children,
}: {
  part: PartName; pose: DerivedValue<Pose>; k: number; children: React.ReactNode;
}) {
  // The pivot never changes, so it is read once from the rest pose.
  const pivot = useMemo(() => partTransform(part, REST_POSE), [part]);
  const style = useAnimatedStyle(() => {
    const t = partTransform(part, pose.value);
    return {
      opacity: t.opacity,
      transform: [
        { translateX: t.tx * k },
        { translateY: t.ty * k },
        { rotate: `${t.rot}deg` },
        { scaleX: Math.max(0.001, t.sx) },
        { scaleY: Math.max(0.001, t.sy) },
      ],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { transformOrigin: [pivot.px * k, pivot.py * k, 0] }, style]}
    >
      {children}
    </Animated.View>
  );
}

// A layer that only fades (party hat in, topknot tuft out).
function FadeLayer({ amount, invert, children }: { amount: SharedValue<number>; invert?: boolean; children: React.ReactNode }) {
  const style = useAnimatedStyle(() => ({ opacity: invert ? 1 - amount.value : amount.value }));
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      {children}
    </Animated.View>
  );
}

// ─── Effects ──────────────────────────────────────────────────────────────────
// Each effect is a small square drawn around its own centre (a 24-unit box),
// placed with a transform. `k` converts drawing units to pixels.
const FX_BOX = 24;
const FX_VIEWBOX = `${-FX_BOX / 2} ${-FX_BOX / 2} ${FX_BOX} ${FX_BOX}`;

function fxFrame(k: number) {
  return { position: 'absolute' as const, left: 0, top: 0, width: FX_BOX * k, height: FX_BOX * k };
}

// One sleeping "z": drifts up and to the right, growing, then fades.
function Zee({ index, zzz, k, still }: { index: number; zzz: SharedValue<number>; k: number; still: boolean }) {
  const style = useAnimatedStyle(() => {
    const ph = still ? [0.2, 0.5, 0.8][index] : (zzz.value + index / 3) % 1;
    const x = 146 + 34 * ph;
    const y = 80 - 54 * ph;
    const opacity = ph < 0.15 ? ph / 0.15 : ph > 0.7 ? (1 - ph) / 0.3 : 1;
    return {
      opacity,
      transform: [
        { translateX: (x - FX_BOX / 2) * k },
        { translateY: (y - FX_BOX / 2) * k },
        { scale: 0.7 + 0.75 * ph },
      ],
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[fxFrame(k), style]}>
      <PartLayer shapes={ZEE} size={FX_BOX * k} viewBox={FX_VIEWBOX} />
    </Animated.View>
  );
}

// One celebration sparkle: pops out from her, grows, and fades.
function Sparkle({ index, sparks, k }: { index: number; sparks: SharedValue<number>; k: number }) {
  const shapes = useMemo(() => sparkle(PALETTE.sparkles[index % PALETTE.sparkles.length]), [index]);
  const style = useAnimatedStyle(() => {
    const ph = (sparks.value + index * 0.371) % 1;
    const angle = (index / SPARKLE_COUNT) * Math.PI * 2 + 0.4;
    const radius = 58 + 38 * ph;
    const x = 100 + Math.cos(angle) * radius;
    const y = 92 + Math.sin(angle) * radius * 0.85;
    const pop = Math.sin(Math.PI * ph);
    return {
      opacity: pop,
      transform: [
        { translateX: (x - FX_BOX / 2) * k },
        { translateY: (y - FX_BOX / 2) * k },
        { scale: 0.4 + pop * (0.9 + (index % 3) * 0.25) },
        { rotate: `${ph * 90}deg` },
      ],
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[fxFrame(k), style]}>
      <PartLayer shapes={shapes} size={FX_BOX * k} viewBox={FX_VIEWBOX} />
    </Animated.View>
  );
}

// The heart that pops up when she is tapped.
function Heart({ heart, k, still }: { heart: SharedValue<number>; k: number; still: boolean }) {
  const style = useAnimatedStyle(() => {
    const ph = heart.value;
    if (ph <= 0 || ph >= 1) return { opacity: 0, transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }] };
    const rise = still ? 0 : 30 * ph;
    const scale = still ? 1.3 : ph < 0.2 ? (ph / 0.2) * 1.6 : 1.6 - 0.3 * Math.min(1, (ph - 0.2) / 0.2);
    const opacity = ph < 0.1 ? ph / 0.1 : ph > 0.65 ? (1 - ph) / 0.35 : 1;
    return {
      opacity,
      transform: [
        { translateX: (100 - FX_BOX / 2) * k },
        { translateY: (30 - rise - FX_BOX / 2) * k },
        { scale },
      ],
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[fxFrame(k), style]}>
      <PartLayer shapes={HEART} size={FX_BOX * k} viewBox={FX_VIEWBOX} />
    </Animated.View>
  );
}

// ─── The component ────────────────────────────────────────────────────────────
export default function Companion({
  state, size, onPress, accessory = null, reduceMotion, interactive = true, label, testID,
}: CompanionProps) {
  const focused = useScreenFocused();
  const look = accessoryLook(accessory, state);
  const rig = useCompanionRig({ state, reduceMotion, paused: !focused, hatOn: look.hat });

  const k = size / VIEWBOX;                // drawing units → pixels
  const o = outlineScaleForSize(size);     // thicker outline when small
  const neck = useMemo(() => neckShapes(look.neck), [look.neck]);
  const bodyShapes = useMemo(() => [...PARTS.body, ...neck], [neck]);
  const headShapes = useMemo(() => [...PARTS.head, ...PARTS.face], []);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: rig.fade.value }));

  // Latest onPress without rebuilding the gesture.
  const onPressRef = useRef(onPress);
  onPressRef.current = onPress;

  // Tap, and a horizontal stroke across her head ("petting"). Callbacks run
  // on the JS thread (runOnJS): they only *start* animations, which then play
  // on the UI thread.
  const gesture = useMemo(() => {
    const pet = { startedAt: 0, active: false };
    const tap = Gesture.Tap()
      .runOnJS(true)
      .maxDuration(400)
      .onEnd((_e, success) => {
        if (!success) return;
        lightTap();
        rig.tap();
        onPressRef.current?.();
      });
    const stroke = Gesture.Pan()
      .runOnJS(true)
      .activeOffsetX([-8, 8])   // sideways strokes pet her...
      .failOffsetY([-16, 16])   // ...up-and-down drags still scroll the page
      .onStart(() => {
        pet.startedAt = Date.now();
        pet.active = false;
      })
      .onUpdate((e) => {
        const onHead = e.y >= 0 && e.y <= size * HEAD_ZONE && e.x >= 0 && e.x <= size;
        if (!onHead) {
          // Finger left her head: the stroke has to start over.
          pet.startedAt = Date.now();
          if (pet.active) {
            pet.active = false;
            rig.petEnd();
          }
          return;
        }
        if (!pet.active && Date.now() - pet.startedAt >= PET_HOLD_MS) {
          pet.active = true;
          lightTap();
          rig.petStart();
        }
        if (pet.active) rig.petMove((e.x / size) * 2 - 1);
      })
      .onFinalize(() => {
        if (pet.active) rig.petEnd();
        pet.active = false;
      });
    return Gesture.Simultaneous(tap, stroke);
  }, [rig, size]);

  const dog = (
    <View
      testID={testID}
      collapsable={false}
      style={{ width: size, height: size }}
      accessible
      accessibilityRole={onPress ? 'button' : 'image'}
      accessibilityLabel={label ?? `Companion is ${state}`}
    >
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, fadeStyle]}>
        <RigLayer part="shadow" pose={rig.pose} k={k}>
          <PartLayer shapes={PARTS.shadow} size={size} />
        </RigLayer>

        <RigLayer part="root" pose={rig.pose} k={k}>
          <RigLayer part="tail" pose={rig.pose} k={k}>
            <PartLayer shapes={PARTS.tail} size={size} outlineScale={o} />
          </RigLayer>
          <RigLayer part="body" pose={rig.pose} k={k}>
            <PartLayer shapes={bodyShapes} size={size} outlineScale={o} />
          </RigLayer>
          <RigLayer part="pawL" pose={rig.pose} k={k}>
            <PartLayer shapes={PARTS.pawL} size={size} outlineScale={o} />
          </RigLayer>
          <RigLayer part="pawR" pose={rig.pose} k={k}>
            <PartLayer shapes={PARTS.pawR} size={size} outlineScale={o} />
          </RigLayer>

          {/* Everything on the head moves with the head, then on its own. */}
          <RigLayer part="head" pose={rig.pose} k={k}>
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <PartLayer shapes={headShapes} size={size} outlineScale={o} />
            </View>
            <RigLayer part="eyesOpen" pose={rig.pose} k={k}>
              <PartLayer shapes={PARTS.eyesOpen} size={size} />
            </RigLayer>
            <RigLayer part="lids" pose={rig.pose} k={k}>
              <PartLayer shapes={PARTS.lids} size={size} />
            </RigLayer>
            <RigLayer part="eyesHappy" pose={rig.pose} k={k}>
              <PartLayer shapes={PARTS.eyesHappy} size={size} />
            </RigLayer>
            <RigLayer part="mouthClosed" pose={rig.pose} k={k}>
              <PartLayer shapes={PARTS.mouthClosed} size={size} />
            </RigLayer>
            <RigLayer part="mouthOpen" pose={rig.pose} k={k}>
              <PartLayer shapes={PARTS.mouthOpen} size={size} />
            </RigLayer>
            <RigLayer part="earL" pose={rig.pose} k={k}>
              <PartLayer shapes={PARTS.earL} size={size} outlineScale={o} />
            </RigLayer>
            <RigLayer part="earR" pose={rig.pose} k={k}>
              <PartLayer shapes={PARTS.earR} size={size} outlineScale={o} />
            </RigLayer>
            <RigLayer part="knot" pose={rig.pose} k={k}>
              <FadeLayer amount={rig.hat} invert>
                <PartLayer shapes={PARTS.knotTuft} size={size} outlineScale={o} />
              </FadeLayer>
              <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                <PartLayer shapes={PARTS.bow} size={size} />
              </View>
              <FadeLayer amount={rig.hat}>
                <PartLayer shapes={PARTS.hat} size={size} />
              </FadeLayer>
            </RigLayer>
          </RigLayer>
        </RigLayer>

        {state === 'sleeping' &&
          [0, 1, 2].map((i) => <Zee key={i} index={i} zzz={rig.zzz} k={k} still={reduceMotion} />)}
        {state === 'celebrating' && !reduceMotion &&
          Array.from({ length: SPARKLE_COUNT }, (_, i) => <Sparkle key={i} index={i} sparks={rig.sparks} k={k} />)}
        <Heart heart={rig.heart} k={k} still={reduceMotion} />
      </Animated.View>
    </View>
  );

  if (!interactive) return dog;
  return <GestureDetector gesture={gesture}>{dog}</GestureDetector>;
}
