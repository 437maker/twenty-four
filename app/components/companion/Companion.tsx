// Companion.tsx — the animated companion. This is the only file screens import.
//
//   <Companion state="idle" size={150} reduceMotion={false}
//              breed="corgi" equipped={{ head: 'acc_party_hat' }} onPress={...} />
//
// How she is built: about a dozen see-through layers stacked on top of each
// other, one per moving part (tail, body, each ear, eyelids...). Every layer
// is an Animated.View holding one small SVG drawing. The rig
// (useCompanionRig) produces a pose on the UI thread each frame, and each
// layer turns its slice of that pose into a transform around its own pivot
// (ear base, tail base, neck, eyelid hinge).
//
// What she wears: scene.ts decides which drawings go on which layer. A hat is
// drawn on the layer that follows the top of her head, a staff on the layer
// that follows her paw, wings on a layer that follows her body. Because an
// item lives on the layer of the part it is attached to, it cannot drift off
// that part, whatever the animation does.
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
import { getBreed } from './breeds';
import { LayerSvg } from './CompanionSvg';
import type { Equipped } from './items/itemSlots';
import { PALETTE } from './palette';
import { REST_POSE, VIEWBOX, outlineScaleForSize, partTransform } from './poses';
import type { PartName, Pose, RigPivots } from './poses';
import { buildScene, sceneKey } from './scene';
import { HEART, ZEE, sparkle } from './shapes';
import type { Drawable } from './shapes';
import { PET_HOLD_MS, useCompanionRig } from './useCompanionRig';
import { lightTap } from './haptics';

export interface CompanionProps {
  state: NovaState;
  size: number;
  onPress?: () => void;
  /** Called after a press-and-hold of about 0.6s (Home uses it to open the breed picker). */
  onLongPress?: () => void;
  /** Which dog. A breed id from breeds/index.ts; unknown or missing = Maltese. */
  breed?: string | null;
  /** What she is wearing: one shop item id per slot. */
  equipped?: Equipped;
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
const NOTHING: Equipped = {};
const fill = StyleSheet.absoluteFill;

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
  part, pose, k, pv, children,
}: {
  part: PartName; pose: DerivedValue<Pose>; k: number; pv: RigPivots; children: React.ReactNode;
}) {
  // The pivot never changes for a breed, so it is read once from the rest pose.
  const pivot = useMemo(() => partTransform(part, REST_POSE, pv), [part, pv]);
  const style = useAnimatedStyle(() => {
    const t = partTransform(part, pose.value, pv);
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
      style={[fill, { transformOrigin: [pivot.px * k, pivot.py * k, 0] }, style]}
    >
      {children}
    </Animated.View>
  );
}

// A layer that only fades (party hat in, topknot tuft out).
function FadeLayer({ amount, invert, children }: { amount: SharedValue<number>; invert?: boolean; children: React.ReactNode }) {
  const style = useAnimatedStyle(() => ({ opacity: invert ? 1 - amount.value : amount.value }));
  return (
    <Animated.View pointerEvents="none" style={[fill, style]}>
      {children}
    </Animated.View>
  );
}

// An item with a looping effect (a glow that pulses, a halo that bobs, a rune
// circle that turns). `fx` runs 0..1 over six seconds while motion is allowed
// and sits at 0 under Reduce Motion, which leaves the item perfectly still.
function FxLayer({ dr, fx, k, children }: { dr: Drawable; fx: SharedValue<number>; k: number; children: React.ReactNode }) {
  const kind = dr.fx;
  const style = useAnimatedStyle(() => {
    const v = fx.value;
    const wave = Math.sin(v * Math.PI * 4); // two gentle waves per loop
    if (kind === 'pulse') return { opacity: 0.86 + 0.14 * wave, transform: [{ translateY: 0 }, { rotate: '0deg' }, { scale: 1 + 0.04 * wave }] };
    if (kind === 'bob') return { opacity: 1, transform: [{ translateY: wave * 2.2 * k }, { rotate: '0deg' }, { scale: 1 }] };
    // A sheen: only the opacity changes, so a clipped layer stays put.
    if (kind === 'shimmer') return { opacity: 0.55 + 0.45 * wave, transform: [{ translateY: 0 }, { rotate: '0deg' }, { scale: 1 }] };
    return { opacity: 1, transform: [{ translateY: 0 }, { rotate: `${v * 360}deg` }, { scale: 1 }] };
  });
  const origin = dr.at ? [dr.at.x * k, dr.at.y * k, 0] : [100 * k, 100 * k, 0];
  return (
    <Animated.View pointerEvents="none" style={[fill, { transformOrigin: origin }, style]}>
      {children}
    </Animated.View>
  );
}

// Draws a list of Drawables as stacked SVG layers. Plain drawables that sit
// next to each other share one SVG; a drawable with an effect gets its own
// animated layer.
function Layers({
  list, size, k, o, fx, id,
}: {
  list: readonly Drawable[]; size: number; k: number; o: number; fx: SharedValue<number>; id: string;
}) {
  if (list.length === 0) return null;
  const groups: Drawable[][] = [];
  for (const dr of list) {
    const last = groups[groups.length - 1];
    if (!dr.fx && last && !last[0].fx) last.push(dr);
    else groups.push([dr]);
  }
  return (
    <>
      {groups.map((group) => {
        const svg = <LayerSvg drawables={group} size={size} outlineScale={o} idPrefix={id} />;
        return group[0].fx ? (
          <FxLayer key={group[0].key} dr={group[0]} fx={fx} k={k}>{svg}</FxLayer>
        ) : (
          <View key={group[0].key} pointerEvents="none" style={fill}>{svg}</View>
        );
      })}
    </>
  );
}

// ─── Effects ──────────────────────────────────────────────────────────────────
// Each effect is a small square drawn around its own centre (a 24-unit box),
// placed with a transform. `k` converts drawing units to pixels.
const FX_BOX = 24;
const FX_VIEWBOX = `${-FX_BOX / 2} ${-FX_BOX / 2} ${FX_BOX} ${FX_BOX}`;

const ZEE_LAYER: Drawable[] = [{ key: 'zee', shapes: ZEE }];
const HEART_LAYER: Drawable[] = [{ key: 'heart', shapes: HEART }];

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
      <LayerSvg drawables={ZEE_LAYER} size={FX_BOX * k} viewBox={FX_VIEWBOX} />
    </Animated.View>
  );
}

// One celebration sparkle: pops out from her, grows, and fades.
function Sparkle({ index, sparks, k }: { index: number; sparks: SharedValue<number>; k: number }) {
  const layer = useMemo<Drawable[]>(() => [{ key: 'sparkle', shapes: sparkle(PALETTE.sparkles[index % PALETTE.sparkles.length]) }], [index]);
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
      <LayerSvg drawables={layer} size={FX_BOX * k} viewBox={FX_VIEWBOX} />
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
      <LayerSvg drawables={HEART_LAYER} size={FX_BOX * k} viewBox={FX_VIEWBOX} />
    </Animated.View>
  );
}

// ─── The component ────────────────────────────────────────────────────────────
export default function Companion({
  state, size, onPress, onLongPress, breed, equipped = NOTHING, reduceMotion, interactive = true, label, testID,
}: CompanionProps) {
  const focused = useScreenFocused();
  const def = getBreed(breed);
  const pv = def.pivots;
  const key = sceneKey(def.id, state, equipped);
  // What goes on each layer. Rebuilt only when the breed, the state, or the
  // outfit changes — never per frame.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const scene = useMemo(() => buildScene(def, state, equipped), [key]);
  const hasFx = useMemo(
    () => [scene.aura, scene.back, scene.body, scene.face, scene.headItem, scene.held].some((l) => l.some((d) => !!d.fx)),
    [scene],
  );
  const rig = useCompanionRig({ state, reduceMotion, paused: !focused, hatOn: scene.celebrationHat, hasFx });

  const k = size / VIEWBOX;                // drawing units → pixels
  const o = outlineScaleForSize(size);     // thicker outline when small
  const id = `c-${def.id}`;

  const fadeStyle = useAnimatedStyle(() => ({ opacity: rig.fade.value }));

  // Latest onPress without rebuilding the gesture.
  const onPressRef = useRef(onPress);
  onPressRef.current = onPress;
  const onLongPressRef = useRef(onLongPress);
  onLongPressRef.current = onLongPress;

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
    // Press and hold. A tap gives up at 400ms, so the two never both fire.
    const hold = Gesture.LongPress()
      .runOnJS(true)
      .minDuration(600)
      .onStart(() => {
        if (!onLongPressRef.current) return;
        lightTap();
        onLongPressRef.current();
      });
    return Gesture.Simultaneous(tap, stroke, hold);
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
      <Animated.View pointerEvents="none" style={[fill, fadeStyle]}>
        <RigLayer part="shadow" pose={rig.pose} k={k} pv={pv}><Layers list={scene.shadow} size={size} k={k} o={o} fx={rig.fx} id={id} /></RigLayer>

        <RigLayer part="root" pose={rig.pose} k={k} pv={pv}>
          {/* Behind everything: aura, then things worn on the back */}
          <Layers list={scene.aura} size={size} k={k} o={o} fx={rig.fx} id={id} />
          {scene.back.length > 0 && <RigLayer part="body" pose={rig.pose} k={k} pv={pv}><Layers list={scene.back} size={size} k={k} o={o} fx={rig.fx} id={id} /></RigLayer>}
          <RigLayer part="tail" pose={rig.pose} k={k} pv={pv}><Layers list={scene.tail} size={size} k={k} o={o} fx={rig.fx} id={id} /></RigLayer>
          {/* Body: fur, markings, outfit (clipped to the body), outline, neck items */}
          <RigLayer part="body" pose={rig.pose} k={k} pv={pv}><Layers list={scene.body} size={size} k={k} o={o} fx={rig.fx} id={id} /></RigLayer>
          <RigLayer part="pawL" pose={rig.pose} k={k} pv={pv}><Layers list={scene.pawL} size={size} k={k} o={o} fx={rig.fx} id={id} /></RigLayer>
          <RigLayer part="pawR" pose={rig.pose} k={k} pv={pv}><Layers list={scene.pawR} size={size} k={k} o={o} fx={rig.fx} id={id} /></RigLayer>

          {/* Everything on the head moves with the head, then on its own. */}
          <RigLayer part="head" pose={rig.pose} k={k} pv={pv}>
            <Layers list={scene.head} size={size} k={k} o={o} fx={rig.fx} id={id} />
            <RigLayer part="eyesOpen" pose={rig.pose} k={k} pv={pv}><Layers list={scene.eyesOpen} size={size} k={k} o={o} fx={rig.fx} id={id} /></RigLayer>
            <RigLayer part="lids" pose={rig.pose} k={k} pv={pv}><Layers list={scene.lids} size={size} k={k} o={o} fx={rig.fx} id={id} /></RigLayer>
            <RigLayer part="eyesHappy" pose={rig.pose} k={k} pv={pv}><Layers list={scene.eyesHappy} size={size} k={k} o={o} fx={rig.fx} id={id} /></RigLayer>
            <RigLayer part="mouthClosed" pose={rig.pose} k={k} pv={pv}><Layers list={scene.mouthClosed} size={size} k={k} o={o} fx={rig.fx} id={id} /></RigLayer>
            <RigLayer part="mouthOpen" pose={rig.pose} k={k} pv={pv}><Layers list={scene.mouthOpen} size={size} k={k} o={o} fx={rig.fx} id={id} /></RigLayer>
            {/* Face items sit under the ears, so sunglasses arms tuck behind them */}
            <Layers list={scene.face} size={size} k={k} o={o} fx={rig.fx} id={id} />
            <RigLayer part="earL" pose={rig.pose} k={k} pv={pv}><Layers list={scene.earL} size={size} k={k} o={o} fx={rig.fx} id={id} /></RigLayer>
            <RigLayer part="earR" pose={rig.pose} k={k} pv={pv}><Layers list={scene.earR} size={size} k={k} o={o} fx={rig.fx} id={id} /></RigLayer>
            <RigLayer part="knot" pose={rig.pose} k={k} pv={pv}>
              {!scene.tuftHidden && scene.knotTuft.length > 0 && (
                <FadeLayer amount={rig.hat} invert><Layers list={scene.knotTuft} size={size} k={k} o={o} fx={rig.fx} id={id} /></FadeLayer>
              )}
              <Layers list={scene.knotBase} size={size} k={k} o={o} fx={rig.fx} id={id} />
              <Layers list={scene.headItem} size={size} k={k} o={o} fx={rig.fx} id={id} />
              {scene.partyHat.length > 0 && (
                <FadeLayer amount={rig.hat}><Layers list={scene.partyHat} size={size} k={k} o={o} fx={rig.fx} id={id} /></FadeLayer>
              )}
            </RigLayer>
          </RigLayer>

          {/* Held items ride on the right paw and are drawn in front of everything */}
          {scene.held.length > 0 && <RigLayer part="pawR" pose={rig.pose} k={k} pv={pv}><Layers list={scene.held} size={size} k={k} o={o} fx={rig.fx} id={id} /></RigLayer>}
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
