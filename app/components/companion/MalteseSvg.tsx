// MalteseSvg.tsx — draws the Maltese with react-native-svg.
//
// Two things live here:
//
//   • <PartLayer>   one part of the dog (an ear, the tail, the eyelids...) in
//                   its own <Svg>, with its shapes inside a <G>. The animated
//                   <Companion> stacks these layers and moves each one.
//
//   • <MalteseSvg>  the whole dog in a single <Svg>, standing still in one
//                   pose. Every moving part is its own <G> with a transform
//                   around its pivot. Use it where nothing needs to move.
//
// Both read the same shape data (parts.ts) and the same pose math (poses.ts).

import React from 'react';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';

import type { NovaState } from '../../types';
import { PALETTE } from './palette';
import { PARTS } from './parts';
import type { Shape } from './parts';
import { POSES, VIEWBOX, accessoryLook, outlineScaleForSize, partTransform } from './poses';
import type { NeckItem, PartName, Pose } from './poses';

const BOX = `0 0 ${VIEWBOX} ${VIEWBOX}`;

function ShapeEl({ s, outlineScale }: { s: Shape; outlineScale: number }) {
  const strokeWidth = s.stroke ? (s.sw ?? 1) * (s.stroke === PALETTE.outline ? outlineScale : 1) : undefined;
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

export function neckShapes(neck: NeckItem | null): readonly Shape[] {
  if (neck === 'scarf') return PARTS.scarf;
  if (neck === 'bowTie') return PARTS.bowTie;
  if (neck === 'collar') return PARTS.collar;
  return [];
}

// One layer of the rig: a full-size, see-through <Svg> holding one part.
// Because every layer uses the same 200 x 200 box, they line up exactly when
// stacked, with no layout math.
export const PartLayer = React.memo(function PartLayer({
  shapes, size, outlineScale = 1, viewBox = BOX,
}: {
  shapes: readonly Shape[]; size: number; outlineScale?: number; viewBox?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox={viewBox}>
      <G>
        <Shapes list={shapes} outlineScale={outlineScale} />
      </G>
    </Svg>
  );
});

// The SVG transform string for one part in one pose.
function tf(part: PartName, pose: Pose): { transform: string; opacity: number } {
  const t = partTransform(part, pose);
  return {
    transform:
      `translate(${t.tx} ${t.ty}) rotate(${t.rot} ${t.px} ${t.py}) ` +
      `translate(${t.px} ${t.py}) scale(${t.sx} ${t.sy}) translate(${-t.px} ${-t.py})`,
    opacity: t.opacity,
  };
}

interface MalteseSvgProps {
  state: NovaState;
  size: number;
  accessory?: string | null;
  pose?: Pose; // defaults to the state's key pose
}

// The whole dog, not animated.
export default function MalteseSvg({ state, size, accessory = null, pose }: MalteseSvgProps) {
  const p = pose ?? POSES[state];
  const look = accessoryLook(accessory, state);
  const o = outlineScaleForSize(size);
  const g = (part: PartName) => tf(part, p);

  return (
    <Svg width={size} height={size} viewBox={BOX}>
      <G {...g('shadow')}><Shapes list={PARTS.shadow} /></G>
      <G {...g('root')}>
        <G {...g('tail')}><Shapes list={PARTS.tail} outlineScale={o} /></G>
        <G {...g('body')}>
          <Shapes list={PARTS.body} outlineScale={o} />
          <Shapes list={neckShapes(look.neck)} />
        </G>
        <G {...g('pawL')}><Shapes list={PARTS.pawL} outlineScale={o} /></G>
        <G {...g('pawR')}><Shapes list={PARTS.pawR} outlineScale={o} /></G>
        <G {...g('head')}>
          <Shapes list={PARTS.head} outlineScale={o} />
          <Shapes list={PARTS.face} />
          <G {...g('eyesOpen')}><Shapes list={PARTS.eyesOpen} /></G>
          <G {...g('lids')}><Shapes list={PARTS.lids} /></G>
          <G {...g('eyesHappy')}><Shapes list={PARTS.eyesHappy} /></G>
          <G {...g('mouthClosed')}><Shapes list={PARTS.mouthClosed} /></G>
          <G {...g('mouthOpen')}><Shapes list={PARTS.mouthOpen} /></G>
          <G {...g('earL')}><Shapes list={PARTS.earL} outlineScale={o} /></G>
          <G {...g('earR')}><Shapes list={PARTS.earR} outlineScale={o} /></G>
          <G {...g('knot')}>
            {!look.hat && <Shapes list={PARTS.knotTuft} outlineScale={o} />}
            <Shapes list={PARTS.bow} />
            {look.hat && <Shapes list={PARTS.hat} />}
          </G>
        </G>
      </G>
    </Svg>
  );
}
