// HouseScene.tsx — draws a house and its backdrop with react-native-svg.
//
//   <HouseScene>   the animated scene for the yard and the Shop's big preview.
//                  The backdrop and the house are two still pictures that are
//                  drawn once. Each ambient element (smoke, waves, snow...) is
//                  its own see-through layer that Reanimated moves with a
//                  transform on the UI thread. Nothing is redrawn per frame.
//
//   <HouseStill>   the whole scene in one <Svg>, not moving, with the ambient
//                  elements frozen where Reduce Motion shows them. Used for
//                  the Shop cards (one view per card).
//
// Neither draws the dog. The caller places the dog on top with dogFrame(),
// so the same animated <Companion> can walk between the yard and the door.

import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import Svg, { G } from 'react-native-svg';

import { Shapes } from '../CompanionSvg';
import type { Shape } from '../shapes';
import {
  AMBIENT_CLOCK_SECONDS, SCENE_H, SCENE_W, ambientPhase, ambientPose, defaultAmount, sceneFit, stillPhase, stillPose,
} from './types';
import type { Ambient, HouseDef, SceneFit, Spot } from './types';

const fill = StyleSheet.absoluteFill;

// The tint laid over a daytime scene after 10pm. Scenes that are already
// dark (space, the sea floor, the lair) are left alone.
export const NIGHT_TINT = 'rgba(24, 34, 78, 0.45)';

// The color at the very top of a scene, for the strip behind the status bar.
export function skyColor(def: HouseDef): string {
  return def.skyTop ?? def.backdrop[0]?.fill ?? '#B5D4F4';
}

// Where a dog box goes, in view pixels, for a spot in the scene.
export function dogFrame(fit: SceneFit, spot: Spot): { left: number; top: number; size: number } {
  const size = spot.size * fit.k;
  return { left: (spot.x - fit.vx) * fit.k - size / 2, top: (spot.y - fit.vy) * fit.k - size, size };
}

function viewBoxOf(fit: SceneFit): string {
  return `${fit.vx} ${fit.vy} ${fit.vw} ${fit.vh}`;
}

// A still picture: drawn once, redrawn only if the house or the size changes.
const StillLayer = React.memo(function StillLayer({
  shapes, width, height, viewBox,
}: {
  shapes: readonly Shape[]; width: number; height: number; viewBox: string;
}) {
  return (
    <Svg width={width} height={height} viewBox={viewBox}>
      <G>
        <Shapes list={shapes} />
      </G>
    </Svg>
  );
});

// One ambient element. `clock` runs 0..1 once a minute; the element turns
// that into its own loop. With `still` it sits at its resting phase.
function AmbientLayer({
  a, clock, still, fit, width, height, viewBox,
}: {
  a: Ambient; clock: SharedValue<number>; still: boolean; fit: SceneFit; width: number; height: number; viewBox: string;
}) {
  const { kind, period } = a;
  const phase = a.phase ?? 0;
  const dx = a.dx ?? 0;
  const dy = a.dy ?? 0;
  const amount = a.amount ?? defaultAmount(kind);
  const rest = stillPhase(a);
  const k = fit.k;

  const style = useAnimatedStyle(() => {
    const ph = still ? rest : ambientPhase(clock.value, period, phase);
    const p = ambientPose(kind, ph, dx, dy, amount);
    return {
      opacity: p.opacity,
      transform: [
        { translateX: p.tx * k },
        { translateY: p.ty * k },
        { rotate: `${p.rot}deg` },
        { scale: p.scale },
      ],
    };
  });
  const px = ((a.pivot?.x ?? SCENE_W / 2) - fit.vx) * k;
  const py = ((a.pivot?.y ?? SCENE_H / 2) - fit.vy) * k;

  return (
    <Animated.View pointerEvents="none" style={[fill, { transformOrigin: [px, py, 0] }, style]}>
      <StillLayer shapes={a.shapes} width={width} height={height} viewBox={viewBox} />
    </Animated.View>
  );
}

export interface HouseSceneProps {
  def: HouseDef;
  width: number;
  height: number;
  reduceMotion: boolean;
  paused?: boolean;   // true while the screen is not focused
  night?: boolean;    // lay the night tint over a daytime scene
}

function HouseSceneInner({ def, width, height, reduceMotion, paused = false, night = false }: HouseSceneProps) {
  const fit = useMemo(() => sceneFit(width, height), [width, height]);
  const viewBox = viewBoxOf(fit);
  const clock = useSharedValue(0);
  const still = reduceMotion || paused;

  useEffect(() => {
    if (still) {
      cancelAnimation(clock);
      return undefined;
    }
    clock.value = 0;
    clock.value = withRepeat(
      withTiming(1, { duration: AMBIENT_CLOCK_SECONDS * 1000, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(clock);
  }, [still, clock, def.id]);

  const behind = def.ambient.filter((a) => a.behind);
  const front = def.ambient.filter((a) => !a.behind);
  const layer = (a: Ambient) => (
    <AmbientLayer key={`${def.id}-${a.key}`} a={a} clock={clock} still={reduceMotion} fit={fit} width={width} height={height} viewBox={viewBox} />
  );

  return (
    <View style={{ width, height, overflow: 'hidden' }} pointerEvents="none" testID={`house-scene-${def.id}`}>
      <View style={fill}><StillLayer shapes={def.backdrop} width={width} height={height} viewBox={viewBox} /></View>
      {behind.map(layer)}
      <View style={fill}><StillLayer shapes={def.house} width={width} height={height} viewBox={viewBox} /></View>
      {front.map(layer)}
      {night && !def.dark && <View style={[fill, { backgroundColor: NIGHT_TINT }]} />}
    </View>
  );
}

export const HouseScene = React.memo(HouseSceneInner);

// ─── The still version ────────────────────────────────────────────────────────
function ambientTransform(a: Ambient): { transform: string; opacity: number } {
  const p = stillPose(a);
  const px = a.pivot?.x ?? SCENE_W / 2;
  const py = a.pivot?.y ?? SCENE_H / 2;
  return {
    transform:
      `translate(${p.tx} ${p.ty}) rotate(${p.rot} ${px} ${py}) ` +
      `translate(${px} ${py}) scale(${p.scale}) translate(${-px} ${-py})`,
    opacity: p.opacity,
  };
}

function HouseStillInner({ def, width, height }: { def: HouseDef; width: number; height: number }) {
  const fit = useMemo(() => sceneFit(width, height), [width, height]);
  const amb = (a: Ambient) => {
    const t = ambientTransform(a);
    return (
      <G key={a.key} transform={t.transform} opacity={t.opacity}>
        <Shapes list={a.shapes} />
      </G>
    );
  };
  return (
    <Svg width={width} height={height} viewBox={viewBoxOf(fit)} testID={`house-still-${def.id}`}>
      <G><Shapes list={def.backdrop} /></G>
      {def.ambient.filter((a) => a.behind).map(amb)}
      <G><Shapes list={def.house} /></G>
      {def.ambient.filter((a) => !a.behind).map(amb)}
    </Svg>
  );
}

export const HouseStill = React.memo(HouseStillInner);
