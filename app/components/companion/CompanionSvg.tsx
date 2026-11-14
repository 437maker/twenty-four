// CompanionSvg.tsx — draws the companion with react-native-svg.
//
// Two things live here:
//
//   • <LayerSvg>      one layer of the dog (a list of Drawables from scene.ts)
//                     in its own see-through <Svg>. The animated <Companion>
//                     stacks these layers and moves each one.
//
//   • <CompanionSvg>  the whole dog in a single <Svg>, standing still in one
//                     pose, wearing whatever is equipped. Every moving part is
//                     its own <G> with a transform around its pivot. Used
//                     where nothing needs to move, such as the Shop's try-on
//                     previews (one view per card instead of fifteen).
//
// Both read the same scene (scene.ts) and the same pose math (poses.ts).

import React, { useMemo } from 'react';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Path } from 'react-native-svg';

import type { NovaState } from '../../types';
import { getBreed } from './breeds';
import type { Equipped } from './items/itemSlots';
import { POSES, VIEWBOX, outlineScaleForSize, partTransform } from './poses';
import type { PartName, Pose, RigPivots } from './poses';
import { buildScene, sceneKey } from './scene';
import type { Drawable, Shape } from './shapes';

const BOX = `0 0 ${VIEWBOX} ${VIEWBOX}`;

function ShapeEl({ s, outlineScale }: { s: Shape; outlineScale: number }) {
  const strokeWidth = s.stroke ? (s.sw ?? 1) * (s.ol ? outlineScale : 1) : undefined;
  const paint = {
    fill: s.fill ?? 'none',
    stroke: s.stroke,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    opacity: s.op,
  };
  if (s.t === 'path') return <Path d={s.d} {...paint} />;
  if (s.t === 'ellipse') return <Ellipse cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} {...paint} />;
  return <Circle cx={s.cx} cy={s.cy} r={s.r} {...paint} />;
}

export function Shapes({ list, outlineScale = 1 }: { list: readonly Shape[]; outlineScale?: number }) {
  return (
    <>
      {list.map((s, i) => (
        <ShapeEl key={i} s={s} outlineScale={outlineScale} />
      ))}
    </>
  );
}

// One Drawable: its shapes, clipped to a silhouette if it asks for that
// (outfits are clipped to the body; coat markings to the head or body).
function DrawableEl({ dr, outlineScale, clipId }: { dr: Drawable; outlineScale: number; clipId: string }) {
  if (!dr.clip) return <Shapes list={dr.shapes} outlineScale={outlineScale} />;
  return (
    <>
      <Defs>
        <ClipPath id={clipId}>
          <Path d={dr.clip} />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${clipId})`}>
        <Shapes list={dr.shapes} outlineScale={outlineScale} />
      </G>
    </>
  );
}

export function Drawables({
  list, outlineScale = 1, idPrefix,
}: {
  list: readonly Drawable[]; outlineScale?: number; idPrefix: string;
}) {
  return (
    <>
      {list.map((dr) => (
        <DrawableEl key={dr.key} dr={dr} outlineScale={outlineScale} clipId={`${idPrefix}-${dr.key}`} />
      ))}
    </>
  );
}

// One layer of the rig: a full-size, see-through <Svg>. Because every layer
// uses the same 200 x 200 box, layers line up exactly when stacked, with no
// layout math. Memoized: a layer only redraws when what it shows changes,
// never while it is merely being moved.
export const LayerSvg = React.memo(function LayerSvg({
  drawables, size, outlineScale = 1, viewBox = BOX, idPrefix = 'l',
}: {
  drawables: readonly Drawable[]; size: number; outlineScale?: number; viewBox?: string; idPrefix?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox={viewBox}>
      <G>
        <Drawables list={drawables} outlineScale={outlineScale} idPrefix={idPrefix} />
      </G>
    </Svg>
  );
});

// The SVG transform for one part in one pose.
function tf(part: PartName, pose: Pose, pivots: RigPivots): { transform: string; opacity: number } {
  const t = partTransform(part, pose, pivots);
  return {
    transform:
      `translate(${t.tx} ${t.ty}) rotate(${t.rot} ${t.px} ${t.py}) ` +
      `translate(${t.px} ${t.py}) scale(${t.sx} ${t.sy}) translate(${-t.px} ${-t.py})`,
    opacity: t.opacity,
  };
}

interface CompanionSvgProps {
  state: NovaState;
  size: number;
  breed?: string | null;
  equipped?: Equipped;
  pose?: Pose; // defaults to the state's key pose
}

// The whole dog, not animated.
function CompanionSvg({ state, size, breed, equipped, pose }: CompanionSvgProps) {
  const def = getBreed(breed);
  const key = sceneKey(def.id, state, equipped ?? {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const scene = useMemo(() => buildScene(def, state, equipped ?? {}), [key]);
  const p = pose ?? POSES[state];
  const o = outlineScaleForSize(size);
  const D = (list: readonly Drawable[]) => <Drawables list={list} outlineScale={o} idPrefix={`s-${def.id}`} />;
  // A part in its pose. Parts that the pose hides completely (open mouth while
  // the mouth is closed, eyelids while the eyes are open) are not drawn at all.
  const part = (name: PartName, children: React.ReactNode) => {
    const t = tf(name, p, def.pivots);
    if (t.opacity <= 0.001) return null;
    return <G transform={t.transform} opacity={t.opacity}>{children}</G>;
  };
  const showTuft = !scene.tuftHidden && !scene.celebrationHat;

  return (
    <Svg width={size} height={size} viewBox={BOX}>
      {part('shadow', D(scene.shadow))}
      {part('root', (
        <>
          {D(scene.aura)}
          {part('body', D(scene.back))}
          {part('tail', D(scene.tail))}
          {part('body', D(scene.body))}
          {part('pawL', D(scene.pawL))}
          {part('pawR', D(scene.pawR))}
          {part('head', (
            <>
              {D(scene.head)}
              {part('eyesOpen', D(scene.eyesOpen))}
              {part('lids', D(scene.lids))}
              {part('eyesHappy', D(scene.eyesHappy))}
              {part('mouthClosed', D(scene.mouthClosed))}
              {part('mouthOpen', D(scene.mouthOpen))}
              {D(scene.face)}
              {part('earL', D(scene.earL))}
              {part('earR', D(scene.earR))}
              {part('knot', (
                <>
                  {showTuft && D(scene.knotTuft)}
                  {D(scene.knotBase)}
                  {D(scene.headItem)}
                  {scene.celebrationHat && D(scene.partyHat)}
                </>
              ))}
            </>
          ))}
          {part('pawR', D(scene.held))}
        </>
      ))}
    </Svg>
  );
}

export default React.memo(CompanionSvg);
