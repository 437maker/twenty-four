// companion.test.tsx — tests for the animated Maltese companion.
//
// Three layers are tested:
//   1. The pure math: which pose each state uses, and how a pose becomes a
//      transform for each part. No React involved.
//   2. The rig's rules: Reduce Motion starts no loops; a tap calls onPress
//      and fires the haptic; petting needs a one-second stroke on her head.
//   3. The Gallery screen shows all four states.
//
// What these tests cannot see: pixels and smoothness. Those are checked with
// the PNG renders in docs/companion/ and on the phone (docs/MANUAL_CHECKS.md).

import React from 'react';
import { act, create } from 'react-test-renderer';
import type { ReactTestRenderer } from 'react-test-renderer';
import * as Haptics from 'expo-haptics';
import * as Reanimated from 'react-native-reanimated';

import Companion from '../app/components/companion/Companion';
import { mirrorPath, PARTS } from '../app/components/companion/parts';
import {
  POSES,
  REST_POSE,
  accessoryLook,
  outlineScaleForSize,
  partTransform,
  pickAccessory,
  poseForState,
} from '../app/components/companion/poses';
import type { Pose } from '../app/components/companion/poses';
import { companionSvgMarkup } from '../app/components/companion/svgMarkup';
import { PET_HOLD_MS, TRANSITION_MS } from '../app/components/companion/useCompanionRig';
import CompanionGalleryScreen, { GALLERY_STATES } from '../app/screens/CompanionGalleryScreen';
import type { NovaState } from '../app/types';

// Keep the real Reanimated, but wrap withRepeat so a test can ask
// "did any endless loop start?".
jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated');
  return { __esModule: true, ...actual, default: actual.default, withRepeat: jest.fn(actual.withRepeat) };
});

const withRepeat = Reanimated.withRepeat as unknown as jest.Mock;
const impactAsync = Haptics.impactAsync as unknown as jest.Mock;

type GestureRecord = { type: 'tap' | 'pan'; handlers: Record<string, (...args: any[]) => void> };
const gestures = (): GestureRecord[] => (globalThis as any).__gestures;
const lastGesture = (type: 'tap' | 'pan'): GestureRecord => {
  const found = gestures().filter((g) => g.type === type);
  return found[found.length - 1];
};

const STATES: NovaState[] = ['idle', 'happy', 'sleeping', 'celebrating'];

let tree: ReactTestRenderer | null = null;
function render(element: React.ReactElement): ReactTestRenderer {
  act(() => {
    tree = create(element);
  });
  return tree!;
}
// For screens that read the phone's Reduce Motion setting (a promise):
// the async form of act() waits for that promise before returning.
async function renderAsync(element: React.ReactElement): Promise<ReactTestRenderer> {
  await act(async () => {
    tree = create(element);
  });
  return tree!;
}
// The native view that carries the companion's testID (not the component itself).
function dogView(t: ReactTestRenderer, testID: string) {
  return t.root.findAll((n) => typeof n.type === 'string' && n.props.testID === testID)[0];
}

beforeEach(() => {
  jest.useFakeTimers();
  withRepeat.mockClear();
  impactAsync.mockClear();
});

afterEach(() => {
  if (tree) {
    act(() => tree!.unmount());
    tree = null;
  }
  jest.clearAllTimers();
  jest.useRealTimers();
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. State → pose
// ─────────────────────────────────────────────────────────────────────────────
describe('state to pose mapping', () => {
  test('every state has a complete pose made of finite numbers', () => {
    const keys = Object.keys(REST_POSE).sort();
    for (const state of STATES) {
      const pose = poseForState(state);
      expect(Object.keys(pose).sort()).toEqual(keys);
      for (const k of keys) expect(Number.isFinite(pose[k as keyof Pose])).toBe(true);
    }
  });

  test('idle: eyes open, mouth closed, standing on the ground', () => {
    expect(POSES.idle).toEqual(REST_POSE);
    expect(POSES.idle.lid).toBe(0);
    expect(POSES.idle.mouthOpen).toBe(0);
    expect(POSES.idle.hop).toBe(0);
  });

  test('happy: mouth open with tongue, tail lifted, eyes still open', () => {
    expect(POSES.happy.mouthOpen).toBe(1);
    expect(POSES.happy.tail).toBeLessThan(0); // negative = raised
    expect(POSES.happy.lid).toBe(0);
    expect(POSES.happy.happyEyes).toBe(0);
  });

  test('celebrating: off the ground, stretched, ears flying, smiling eyes', () => {
    expect(POSES.celebrating.hop).toBeLessThan(0);
    expect(POSES.celebrating.bodySy).toBeGreaterThan(1);
    expect(POSES.celebrating.earL).toBeGreaterThan(20);
    expect(POSES.celebrating.earR).toBeGreaterThan(20);
    expect(POSES.celebrating.happyEyes).toBe(1);
    expect(POSES.celebrating.mouthOpen).toBe(1);
  });

  test('sleeping: eyes shut, body flattened, head low, tail tucked, on the ground', () => {
    expect(POSES.sleeping.lid).toBe(1);
    expect(POSES.sleeping.bodySy).toBeLessThan(0.8);
    expect(POSES.sleeping.bodySx).toBeGreaterThan(1);
    expect(POSES.sleeping.headDy).toBeGreaterThan(0);
    expect(POSES.sleeping.tail).toBeGreaterThan(40); // positive = drooped
    expect(POSES.sleeping.mouthOpen).toBe(0);
    expect(POSES.sleeping.hop).toBe(0);
  });

  test('the four poses are all different from each other', () => {
    const seen = new Set(STATES.map((s) => JSON.stringify(POSES[s])));
    expect(seen.size).toBe(4);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Pose → transform for each part
// ─────────────────────────────────────────────────────────────────────────────
describe('partTransform', () => {
  test('the rest pose leaves every part where it was drawn', () => {
    for (const part of ['root', 'tail', 'body', 'pawL', 'pawR', 'head', 'earL', 'earR', 'knot'] as const) {
      const t = partTransform(part, REST_POSE);
      expect([t.tx, t.ty, t.rot, t.sx, t.sy, t.opacity]).toEqual([0, 0, 0, 1, 1, 1]);
    }
  });

  test('ears swing outward in opposite directions (mirror image)', () => {
    const pose = { ...REST_POSE, earL: 20, earR: 20 };
    expect(partTransform('earL', pose).rot).toBe(20);
    expect(partTransform('earR', pose).rot).toBe(-20);
  });

  test('each part turns around its own pivot', () => {
    expect(partTransform('earL', REST_POSE)).toMatchObject({ px: 58, py: 62 });
    expect(partTransform('earR', REST_POSE)).toMatchObject({ px: 142, py: 62 });
    expect(partTransform('tail', REST_POSE)).toMatchObject({ px: 132, py: 160 });
    expect(partTransform('head', REST_POSE)).toMatchObject({ px: 100, py: 128 });
    expect(partTransform('body', REST_POSE)).toMatchObject({ px: 100, py: 188 });
  });

  test('eyelids are hidden when open and fully down when asleep', () => {
    expect(partTransform('lids', POSES.idle).opacity).toBe(0);
    expect(partTransform('lids', POSES.sleeping)).toMatchObject({ sy: 1, opacity: 1 });
    // Half-way through a blink the lid is half-way down.
    expect(partTransform('lids', { ...REST_POSE, lid: 0.5 }).sy).toBe(0.5);
  });

  test('open eyes and smiling eyes crossfade', () => {
    expect(partTransform('eyesOpen', POSES.idle).opacity).toBe(1);
    expect(partTransform('eyesHappy', POSES.idle).opacity).toBe(0);
    expect(partTransform('eyesOpen', POSES.celebrating).opacity).toBe(0);
    expect(partTransform('eyesHappy', POSES.celebrating).opacity).toBe(1);
  });

  test('closed and open mouth crossfade', () => {
    expect(partTransform('mouthClosed', POSES.idle).opacity).toBe(1);
    expect(partTransform('mouthOpen', POSES.idle).opacity).toBe(0);
    expect(partTransform('mouthClosed', POSES.happy).opacity).toBe(0);
    expect(partTransform('mouthOpen', POSES.happy)).toMatchObject({ opacity: 1, sy: 1 });
  });

  test('the head rides on the body: squashing the body lowers the head', () => {
    const squashed = partTransform('head', { ...REST_POSE, bodySy: 0.9 });
    expect(squashed.ty).toBeCloseTo(6); // 10% of the 60 units between ground and neck
    const stretched = partTransform('head', { ...REST_POSE, bodySy: 1.05 });
    expect(stretched.ty).toBeCloseTo(-3);
  });

  test('the shadow shrinks and fades as she leaves the ground', () => {
    const grounded = partTransform('shadow', REST_POSE);
    const inAir = partTransform('shadow', { ...REST_POSE, hop: -20 });
    expect(grounded.opacity).toBe(1);
    expect(inAir.opacity).toBeLessThan(1);
    expect(inAir.sx).toBeLessThan(grounded.sx);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Accessories
// ─────────────────────────────────────────────────────────────────────────────
describe('accessories', () => {
  test('celebrating always wears the party hat', () => {
    expect(accessoryLook(null, 'celebrating').hat).toBe(true);
    expect(accessoryLook('acc_bow_tie', 'celebrating')).toEqual({ hat: true, neck: 'bowTie' });
  });

  test('the party hat item shows in idle and happy but comes off for sleep', () => {
    expect(accessoryLook('acc_party_hat', 'idle').hat).toBe(true);
    expect(accessoryLook('acc_party_hat', 'happy').hat).toBe(true);
    expect(accessoryLook('acc_party_hat', 'sleeping').hat).toBe(false);
  });

  test('neck items map to the right drawing', () => {
    expect(accessoryLook('outfit_cozy_sweater', 'idle').neck).toBe('scarf');
    expect(accessoryLook('acc_bow_tie', 'idle').neck).toBe('bowTie');
    expect(accessoryLook('acc_golden_collar', 'idle').neck).toBe('collar');
  });

  test('an item the rig cannot draw changes nothing', () => {
    expect(accessoryLook('outfit_space_suit', 'idle')).toEqual({ hat: false, neck: null });
    expect(accessoryLook(null, 'idle')).toEqual({ hat: false, neck: null });
  });

  test('pickAccessory chooses the newest owned item the rig can draw', () => {
    const owned = [
      { item_id: 'acc_party_hat', purchased_at: '2026-11-01T10:00:00.000Z' },
      { item_id: 'outfit_space_suit', purchased_at: '2026-11-09T10:00:00.000Z' }, // newer, not drawable
      { item_id: 'outfit_cozy_sweater', purchased_at: '2026-11-05T10:00:00.000Z' },
      { item_id: 'house_cozy_den', purchased_at: '2026-11-10T10:00:00.000Z' },
    ];
    expect(pickAccessory(owned)).toBe('outfit_cozy_sweater');
    expect(pickAccessory([{ item_id: 'house_cozy_den', purchased_at: '2026-11-10T10:00:00.000Z' }])).toBeNull();
    expect(pickAccessory([])).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Drawing helpers
// ─────────────────────────────────────────────────────────────────────────────
describe('drawing', () => {
  test('mirrorPath flips x around the centre line and leaves y alone', () => {
    expect(mirrorPath('M 10 20 L 30 40 Z')).toBe('M 190 20 L 170 40 Z');
    expect(mirrorPath('M 100 5 Q 60 7.5 0 9')).toBe('M 100 5 Q 140 7.5 200 9');
  });

  test('the right ear is the mirror image of the left ear', () => {
    const left = PARTS.earL[0];
    const right = PARTS.earR[0];
    expect(left.t === 'path' && right.t === 'path' && right.d === mirrorPath(left.d)).toBe(true);
  });

  test('small sizes get a thicker outline so a white dog stays visible', () => {
    expect(outlineScaleForSize(240)).toBe(1);
    expect(outlineScaleForSize(150)).toBe(1);
    expect(outlineScaleForSize(64)).toBeCloseTo(1.7);
    expect(outlineScaleForSize(100)).toBeGreaterThan(1);
    expect(outlineScaleForSize(100)).toBeLessThan(1.7);
  });

  test('the SVG markup for each state contains what that state should show', () => {
    const svg = (state: NovaState) => companionSvgMarkup({ state, size: 240, backdrop: 'day' });
    for (const state of STATES) {
      expect(svg(state).startsWith('<svg')).toBe(true);
      expect(svg(state)).toContain('data-part="earL"');
      expect(svg(state)).toContain('data-part="tail"');
    }
    expect(svg('idle')).toContain('data-part="mouthClosed"');
    expect(svg('idle')).not.toContain('data-part="mouthOpen"');
    expect(svg('happy')).toContain('data-part="mouthOpen"');
    expect(svg('sleeping')).toContain('data-part="lids"');
    expect(svg('idle')).not.toContain('data-part="lids"');
    expect(svg('celebrating')).toContain('data-part="eyesHappy"');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. The rig
// ─────────────────────────────────────────────────────────────────────────────
describe('reduce motion', () => {
  test.each(STATES)('%s: no loops start when reduce motion is on', (state) => {
    render(<Companion state={state} size={120} reduceMotion />);
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(withRepeat).not.toHaveBeenCalled();
  });

  test.each(STATES)('%s: loops do start when reduce motion is off', (state) => {
    render(<Companion state={state} size={120} reduceMotion={false} />);
    expect(withRepeat).toHaveBeenCalled();
  });

  test('turning reduce motion on while she is moving starts nothing new', () => {
    const t = render(<Companion state="happy" size={120} reduceMotion={false} />);
    expect(withRepeat).toHaveBeenCalled();
    withRepeat.mockClear();
    act(() => t.update(<Companion state="happy" size={120} reduceMotion />));
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(withRepeat).not.toHaveBeenCalled();
  });

  test('changing state with reduce motion on still starts no loops', () => {
    const t = render(<Companion state="idle" size={120} reduceMotion />);
    act(() => t.update(<Companion state="celebrating" size={120} reduceMotion />));
    act(() => {
      jest.advanceTimersByTime(TRANSITION_MS + 500);
    });
    expect(withRepeat).not.toHaveBeenCalled();
  });

  test('celebration sparkles are not drawn when reduce motion is on', () => {
    const moving = render(<Companion state="celebrating" size={120} reduceMotion={false} />);
    const layersMoving = moving.root.findAllByType('RNSVGSvgView' as any).length;
    act(() => moving.unmount());
    tree = null;
    const still = render(<Companion state="celebrating" size={120} reduceMotion />);
    const layersStill = still.root.findAllByType('RNSVGSvgView' as any).length;
    expect(layersMoving - layersStill).toBe(8); // the 8 sparkle layers
  });
});

describe('tap', () => {
  test('a tap calls onPress once and fires a light haptic', () => {
    const onPress = jest.fn();
    render(<Companion state="idle" size={150} reduceMotion={false} onPress={onPress} />);
    act(() => lastGesture('tap').handlers.onEnd({}, true));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(impactAsync).toHaveBeenCalledTimes(1);
    expect(impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
  });

  test('a tap that did not complete (finger slid away) does nothing', () => {
    const onPress = jest.fn();
    render(<Companion state="idle" size={150} reduceMotion={false} onPress={onPress} />);
    act(() => lastGesture('tap').handlers.onEnd({}, false));
    expect(onPress).not.toHaveBeenCalled();
    expect(impactAsync).not.toHaveBeenCalled();
  });

  test('a tap still works with reduce motion on, and without an onPress', () => {
    render(<Companion state="sleeping" size={150} reduceMotion />);
    expect(() => act(() => lastGesture('tap').handlers.onEnd({}, true))).not.toThrow();
    expect(impactAsync).toHaveBeenCalledTimes(1);
  });

  test('interactive={false} still renders her (used inside modals)', () => {
    const t = render(<Companion state="idle" size={150} reduceMotion={false} interactive={false} testID="dog" />);
    expect(dogView(t, 'dog')).toBeDefined();
    expect(impactAsync).not.toHaveBeenCalled();
  });
});

describe('petting', () => {
  const SIZE = 200;
  const onHead = { x: 100, y: 60 };  // on her forehead
  const onBody = { x: 100, y: 180 }; // below the head zone

  test('stroking her head for one second starts petting (one haptic)', () => {
    render(<Companion state="idle" size={SIZE} reduceMotion={false} />);
    const pan = lastGesture('pan').handlers;
    act(() => {
      pan.onStart({});
      pan.onUpdate(onHead);
      jest.advanceTimersByTime(PET_HOLD_MS - 100);
      pan.onUpdate({ x: 120, y: 60 });
    });
    expect(impactAsync).not.toHaveBeenCalled(); // not long enough yet
    act(() => {
      jest.advanceTimersByTime(200);
      pan.onUpdate({ x: 80, y: 60 });
      pan.onUpdate({ x: 110, y: 60 });
    });
    expect(impactAsync).toHaveBeenCalledTimes(1); // once, not once per move
    act(() => pan.onFinalize({}));
  });

  test('a stroke across her body does not count as petting', () => {
    render(<Companion state="idle" size={SIZE} reduceMotion={false} />);
    const pan = lastGesture('pan').handlers;
    act(() => {
      pan.onStart({});
      pan.onUpdate(onBody);
      jest.advanceTimersByTime(PET_HOLD_MS + 500);
      pan.onUpdate(onBody);
      pan.onFinalize({});
    });
    expect(impactAsync).not.toHaveBeenCalled();
  });

  test('leaving her head restarts the one-second count', () => {
    render(<Companion state="idle" size={SIZE} reduceMotion={false} />);
    const pan = lastGesture('pan').handlers;
    act(() => {
      pan.onStart({});
      pan.onUpdate(onHead);
      jest.advanceTimersByTime(700);
      pan.onUpdate(onBody);            // slid off
      jest.advanceTimersByTime(700);
      pan.onUpdate(onHead);            // back on: only now does the count begin
    });
    expect(impactAsync).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(PET_HOLD_MS + 50);
      pan.onUpdate(onHead);
    });
    expect(impactAsync).toHaveBeenCalledTimes(1);
    act(() => pan.onFinalize({}));
  });
});

describe('Companion rendering', () => {
  test.each(STATES)('%s renders with an accessibility label', (state) => {
    const t = render(<Companion state={state} size={150} reduceMotion={false} label={`Nova is ${state}`} testID="dog" />);
    const dog = dogView(t, 'dog');
    expect(dog.props.accessibilityLabel).toBe(`Nova is ${state}`);
    expect(dog.props.accessibilityRole).toBe('image');
  });

  test('with onPress she is announced as a button', () => {
    const t = render(<Companion state="idle" size={150} reduceMotion={false} onPress={() => {}} testID="dog" />);
    expect(dogView(t, 'dog').props.accessibilityRole).toBe('button');
  });

  test('a state change does not throw and finishes its transition', () => {
    const t = render(<Companion state="idle" size={150} reduceMotion={false} />);
    for (const next of ['happy', 'celebrating', 'sleeping', 'idle'] as NovaState[]) {
      act(() => t.update(<Companion state={next} size={150} reduceMotion={false} />));
      act(() => {
        jest.advanceTimersByTime(TRANSITION_MS + 100);
      });
    }
    expect(t.toJSON()).not.toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Gallery
// ─────────────────────────────────────────────────────────────────────────────
describe('Companion Gallery', () => {
  test('shows all four states', async () => {
    const t = await renderAsync(<CompanionGalleryScreen visible onClose={() => {}} />);
    expect(GALLERY_STATES.slice().sort()).toEqual(STATES.slice().sort());
    for (const state of STATES) {
      expect(dogView(t, `gallery-companion-${state}`)).toBeDefined();
    }
    const companions = t.root.findAllByType(Companion);
    expect(companions.map((c) => c.props.state).sort()).toEqual(STATES.slice().sort());
  });

  test('the reduce-motion switch is passed to every companion', async () => {
    const t = await renderAsync(<CompanionGalleryScreen visible onClose={() => {}} />);
    expect(t.root.findAllByType(Companion).every((c) => c.props.reduceMotion === false)).toBe(true);
    const toggle = t.root.findAllByProps({ testID: 'gallery-reduce-motion' })[0];
    act(() => toggle.props.onValueChange(true));
    expect(t.root.findAllByType(Companion).every((c) => c.props.reduceMotion === true)).toBe(true);
  });

  test('tapping a companion in the gallery counts the tap', async () => {
    const t = await renderAsync(<CompanionGalleryScreen visible onClose={() => {}} />);
    const idle = t.root.findAllByType(Companion).find((c) => c.props.state === 'idle')!;
    act(() => idle.props.onPress());
    expect(JSON.stringify(t.toJSON())).toContain('Taps: ');
    expect(impactAsync).not.toHaveBeenCalled(); // onPress alone is not a gesture
  });

  test('renders nothing when not visible', async () => {
    const t = await renderAsync(<CompanionGalleryScreen visible={false} onClose={() => {}} />);
    expect(t.root.findAllByType(Companion).length).toBe(0);
  });
});
