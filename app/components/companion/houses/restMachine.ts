// houses/restMachine.ts — the rules for the dog going into her house.
//
// Pure functions, no React: the yard feeds events in and draws whatever
// phase comes out, and the tests drive the same functions directly.
//
//   outside ──tap / Sleep block starts──▶ entering ──arrived──▶ inside
//   inside  ──tap / Sleep block ends────▶ exiting  ──arrived──▶ outside
//
// A tap during a walk turns her around.

export type RestPhase = 'outside' | 'entering' | 'inside' | 'exiting';

export interface RestState {
  phase: RestPhase;
  auto: boolean;        // she went in by herself, because a Sleep block started
  inSleep: boolean;     // a Sleep block is running right now
  dismissed: boolean;   // the user brought her out during this Sleep block: do not send her back in until it ends
}

export type RestEvent =
  | 'tap'          // the user tapped the house, the Rest button, or the resting dog
  | 'arrived'      // the walk in or out finished
  | 'sleepStart'   // the schedule entered a Sleep block
  | 'sleepEnd';    // the Sleep block ended

export const REST_START: RestState = { phase: 'outside', auto: false, inSleep: false, dismissed: false };

export function restReducer(s: RestState, event: RestEvent): RestState {
  switch (event) {
    case 'tap':
      // Going in (or already in): come out, and stay out for the rest of this Sleep block.
      if (s.phase === 'inside' || s.phase === 'entering') {
        return { ...s, phase: 'exiting', auto: false, dismissed: s.inSleep };
      }
      // Outside (or on her way out): go in because the user asked.
      return { ...s, phase: 'entering', auto: false, dismissed: false };

    case 'arrived':
      if (s.phase === 'entering') return { ...s, phase: 'inside' };
      if (s.phase === 'exiting') return { ...s, phase: 'outside' };
      return s;

    case 'sleepStart':
      if (s.inSleep) return s;
      // She goes in on her own, unless she is already in or on her way.
      if (s.phase === 'outside' || s.phase === 'exiting') {
        return { phase: 'entering', auto: true, inSleep: true, dismissed: false };
      }
      return { ...s, inSleep: true, dismissed: false };

    case 'sleepEnd': {
      if (!s.inSleep) return s;
      const next = { ...s, inSleep: false, dismissed: false };
      // She only comes out by herself if she went in by herself.
      if (s.auto && (s.phase === 'inside' || s.phase === 'entering')) {
        return { ...next, phase: 'exiting', auto: false };
      }
      return next;
    }
  }
  return s;
}

// What the dog looks like in each phase, given what she would be doing outside.
export function isInsideOrGoing(phase: RestPhase): boolean {
  return phase === 'inside' || phase === 'entering';
}

// ─── Sleep blocks ─────────────────────────────────────────────────────────────
export interface BlockTask {
  date: string;            // "YYYY-MM-DD"
  start_time: string;      // "HH:MM"
  duration_hours: number;
  pillar: string;
}

// The Sleep block that contains `now`, if there is one. Pass today's tasks
// and yesterday's: a block that starts at 11pm runs past midnight.
// Returns when it ends (the latest end, if blocks overlap).
export function currentSleepBlock(tasks: readonly BlockTask[], now: Date): { endsAt: Date } | null {
  let latest: Date | null = null;
  for (const t of tasks) {
    if (t.pillar !== 'sleep') continue;
    const start = new Date(`${t.date}T${t.start_time}:00`);
    if (Number.isNaN(start.getTime()) || !(t.duration_hours > 0)) continue;
    const end = new Date(start.getTime() + t.duration_hours * 3_600_000);
    if (now >= start && now < end && (!latest || end > latest)) latest = end;
  }
  return latest ? { endsAt: latest } : null;
}

// ─── The walk ─────────────────────────────────────────────────────────────────
// One number, `p`, says where she is:
//   0      standing at her spot outside
//   0..1   walking to the door, shrinking and fading as she reaches it
//   1      at the door, not visible
//   1..2   fading in at the rest spot, already small
//   2      resting inside
export const WALK_MS = 900;
export const DOOR_FADE_MS = 350;

export interface WalkPoints {
  ax: number; ay: number;   // her spot outside (bottom-centre), in pixels
  dx: number; dy: number;   // the door
  rx: number; ry: number;   // the rest spot
  restScale: number;        // her size inside / her size outside
}

export interface WalkPose { x: number; y: number; scale: number; opacity: number }

export function walkPose(p: number, w: WalkPoints): WalkPose {
  'worklet';
  if (p <= 1) {
    const v = Math.max(0, p);
    const e = v * v * (3 - 2 * v); // ease in and out
    const shrink = Math.min(1, Math.max(0, (v - 0.45) / 0.55));
    const fade = Math.min(1, Math.max(0, (v - 0.7) / 0.3));
    return {
      x: w.ax + (w.dx - w.ax) * e,
      y: w.ay + (w.dy - w.ay) * e,
      scale: 1 + (w.restScale - 1) * shrink,
      opacity: 1 - fade,
    };
  }
  return { x: w.rx, y: w.ry, scale: w.restScale, opacity: Math.min(1, p - 1) };
}
