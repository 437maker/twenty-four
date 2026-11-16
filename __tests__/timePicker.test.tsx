// timePicker.test.tsx — the smooth wheel and the faster ways to set a time.
//
//   1. Typed times: what "9", "930", "9:30p", "21:30" mean, and what is refused.
//   2. Chips: the math, including wrapping past midnight.
//   3. Durations: the chips, and remembering the last one used for each pillar.
//   4. The wheel: React is only told once it has settled; the haptic tick
//      rule (once per row, throttled).
//   5. The two form fields, driven the way a finger would drive them.
//
// What these tests cannot see: smoothness. That is checked on the phone
// (docs/MANUAL_CHECKS.md).

import React from 'react';
import { act, create } from 'react-test-renderer';
import type { ReactTestInstance, ReactTestRenderer } from 'react-test-renderer';

import { DurationField, StartTimeField, indicesToTime, timeToIndices } from '../app/components/TimeFields';
import WheelPicker, { ITEM_H, SETTLE_WAIT_MS, TICK_MIN_MS, indexForOffset, shouldTick } from '../app/components/WheelPicker';
import {
  DEFAULT_DURATION, DURATION_CHIPS, DURATION_VALUES, QUICK_CHIPS,
  addMinutes, applyQuickChip, durationForPillar, durationToIdx, formatClock, formatDurationLabel,
  formatTime12, parseLastDurations, parseTypedTime, rememberDuration, snapDuration, snapTime,
} from '../app/utils/timeInput';

const typed = (text: string, pm = false) => {
  const c = parseTypedTime(text, pm);
  return c ? formatClock(c) : null;
};
const chip = (label: string) => QUICK_CHIPS.find((c) => c.label === label)!;

// ─────────────────────────────────────────────────────────────────────────────
// 1. Typed times
// ─────────────────────────────────────────────────────────────────────────────
describe('typed times', () => {
  test.each([
    ['9', '09:00'],
    ['930', '09:30'],
    ['0930', '09:30'],
    ['9:30', '09:30'],
    ['9.30', '09:30'],
    ['12', '00:00'],        // with the wheel on AM, 12 is midnight
    ['1230', '00:30'],
    ['9:30p', '21:30'],
    ['930p', '21:30'],
    ['9pm', '21:00'],
    ['9 PM', '21:00'],
    [' 9:30 pm ', '21:30'],
    ['9a', '09:00'],
    ['12a', '00:00'],
    ['12p', '12:00'],
    ['12:45am', '00:45'],
    ['21:30', '21:30'],
    ['2130', '21:30'],
    ['13', '13:00'],
    ['0', '00:00'],
    ['00:15', '00:15'],
    ['23:59', '23:59'],
  ])('"%s" is read as %s', (text, expected) => {
    expect(typed(text)).toBe(expected);
  });

  test('a bare 1 to 12 follows the AM/PM wheel', () => {
    expect(typed('9', false)).toBe('09:00');
    expect(typed('9', true)).toBe('21:00');
    expect(typed('930', true)).toBe('21:30');
    expect(typed('12', true)).toBe('12:00');
    // An explicit "a" or "p", or a 24-hour time, ignores the wheel.
    expect(typed('9a', true)).toBe('09:00');
    expect(typed('21:30', false)).toBe('21:30');
    expect(typed('13', true)).toBe('13:00');
  });

  test.each(['', '   ', 'abc', '25', '24', '9:75', '960', '13p', '0a', '9:3', '12345', '9::30', '-9', '9:30x', 'p', '9 30 30'])(
    '"%s" is refused',
    (text) => {
      expect(parseTypedTime(text)).toBeNull();
      expect(parseTypedTime(text, true)).toBeNull();
    },
  );

  test('times are shown on a 12-hour clock', () => {
    expect(formatTime12('00:00')).toBe('12:00 AM');
    expect(formatTime12('09:05')).toBe('9:05 AM');
    expect(formatTime12('12:00')).toBe('12:00 PM');
    expect(formatTime12('21:30')).toBe('9:30 PM');
  });

  test('a typed time is rounded to the quarter hour the wheels can show', () => {
    expect(snapTime('09:07')).toBe('09:00');
    expect(snapTime('09:08')).toBe('09:15');
    expect(snapTime('09:52')).toBe('09:45');
    expect(snapTime('23:53')).toBe('00:00'); // rounds up, past midnight
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Chips
// ─────────────────────────────────────────────────────────────────────────────
describe('quick chips', () => {
  test('there are four: Now, +15m, +30m, +1h', () => {
    expect(QUICK_CHIPS.map((c) => c.label)).toEqual(['Now', '+15m', '+30m', '+1h']);
  });

  test('the + chips push the time in the form later', () => {
    expect(applyQuickChip('09:00', chip('+15m'))).toBe('09:15');
    expect(applyQuickChip('09:00', chip('+30m'))).toBe('09:30');
    expect(applyQuickChip('09:00', chip('+1h'))).toBe('10:00');
    expect(applyQuickChip('09:45', chip('+15m'))).toBe('10:00');
    expect(applyQuickChip('11:30', chip('+1h'))).toBe('12:30'); // AM to PM
    // +15m twice is +30m
    expect(applyQuickChip(applyQuickChip('14:00', chip('+15m')), chip('+15m'))).toBe(applyQuickChip('14:00', chip('+30m')));
  });

  test('they wrap past midnight', () => {
    expect(applyQuickChip('23:45', chip('+15m'))).toBe('00:00');
    expect(applyQuickChip('23:45', chip('+30m'))).toBe('00:15');
    expect(applyQuickChip('23:30', chip('+1h'))).toBe('00:30');
    expect(applyQuickChip('23:00', chip('+1h'))).toBe('00:00');
    expect(addMinutes('00:10', -30)).toBe('23:40');
    expect(addMinutes('12:00', 24 * 60)).toBe('12:00');
  });

  test('Now is the current quarter hour, whatever the form showed', () => {
    expect(applyQuickChip('03:00', chip('Now'), new Date(2026, 10, 16, 14, 7))).toBe('14:00');
    expect(applyQuickChip('03:00', chip('Now'), new Date(2026, 10, 16, 14, 8))).toBe('14:15');
    expect(applyQuickChip('03:00', chip('Now'), new Date(2026, 10, 16, 23, 55))).toBe('00:00');
  });

  test('Now then +30m is half an hour from now', () => {
    const now = new Date(2026, 10, 16, 23, 40);
    expect(applyQuickChip(applyQuickChip('08:00', chip('Now'), now), chip('+30m'), now)).toBe('00:15');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Durations
// ─────────────────────────────────────────────────────────────────────────────
describe('durations', () => {
  test('the chips are 15m, 30m, 45m, 1h, 1.5h, 2h, and each is a row of the wheel', () => {
    expect(DURATION_CHIPS.map((c) => c.label)).toEqual(['15m', '30m', '45m', '1h', '1.5h', '2h']);
    expect(DURATION_CHIPS.map((c) => c.hours)).toEqual([0.25, 0.5, 0.75, 1, 1.5, 2]);
    for (const c of DURATION_CHIPS) expect(DURATION_VALUES[durationToIdx(c.hours)]).toBe(c.hours);
  });

  test('the wheel runs from 15 minutes to 12 hours', () => {
    expect(DURATION_VALUES).toHaveLength(48);
    expect(DURATION_VALUES[0]).toBe(0.25);
    expect(DURATION_VALUES[47]).toBe(12);
    expect(formatDurationLabel(0.25)).toBe('15 min');
    expect(formatDurationLabel(1)).toBe('1 hr');
    expect(formatDurationLabel(1.5)).toBe('1 hr 30 min');
    expect(snapDuration(1.1)).toBe(1);
    expect(snapDuration(0)).toBe(0.25);
    expect(snapDuration(99)).toBe(12);
  });

  test('the last duration is remembered for each pillar on its own', () => {
    let saved = '{}';
    expect(durationForPillar(saved, 'work')).toBe(DEFAULT_DURATION);
    saved = rememberDuration(saved, 'work', 1.5);
    saved = rememberDuration(saved, 'sleep', 8);
    expect(durationForPillar(saved, 'work')).toBe(1.5);
    expect(durationForPillar(saved, 'sleep')).toBe(8);
    expect(durationForPillar(saved, 'personal')).toBe(DEFAULT_DURATION);
    saved = rememberDuration(saved, 'work', 0.5);
    expect(parseLastDurations(saved)).toEqual({ work: 0.5, sleep: 8 });
  });

  test('a damaged setting falls back to the default', () => {
    for (const bad of [null, undefined, '', 'not json', '[]', '{"work":"long"}', '{"work":-1}', '{"work":40}']) {
      expect(durationForPillar(bad, 'work')).toBe(DEFAULT_DURATION);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. The wheel
// ─────────────────────────────────────────────────────────────────────────────
let tree: ReactTestRenderer | null = null;
function render(el: React.ReactElement): ReactTestRenderer {
  act(() => {
    tree = create(el);
  });
  return tree!;
}
// The native scroll view of a wheel: the node that carries its scroll handlers.
function scroller(root: ReactTestInstance, testID: string): ReactTestInstance {
  return root.findAll((n) => n.props.testID === testID && typeof n.props.onMomentumScrollEnd === 'function')[0];
}
const at = (y: number) => ({ nativeEvent: { contentOffset: { x: 0, y } } });

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  act(() => tree?.unmount());
  tree = null;
  jest.useRealTimers();
});

describe('the wheel', () => {
  const ITEMS = ['a', 'b', 'c', 'd', 'e', 'f'];

  test('offset to row, clamped to the list', () => {
    expect(indexForOffset(0, 6)).toBe(0);
    expect(indexForOffset(ITEM_H * 2, 6)).toBe(2);
    expect(indexForOffset(ITEM_H * 2 + ITEM_H * 0.49, 6)).toBe(2);
    expect(indexForOffset(ITEM_H * 2 + ITEM_H * 0.51, 6)).toBe(3);
    expect(indexForOffset(-40, 6)).toBe(0);
    expect(indexForOffset(ITEM_H * 99, 6)).toBe(5);
  });

  test('the committed value only changes when the wheel settles after a fling', () => {
    const onChange = jest.fn();
    const t = render(<WheelPicker items={ITEMS} selectedIndex={0} onChange={onChange} testID="w" />);
    const s = scroller(t.root, 'w');
    act(() => {
      s.props.onScrollBeginDrag(at(0));
    });
    // The finger lifts mid-way and a fling starts: nothing is committed...
    act(() => {
      s.props.onScrollEndDrag(at(ITEM_H * 1.4));
      s.props.onMomentumScrollBegin(at(ITEM_H * 1.4));
    });
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(onChange).not.toHaveBeenCalled();
    // ...until the momentum ends on a row.
    act(() => {
      s.props.onMomentumScrollEnd(at(ITEM_H * 3));
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(3);
  });

  test('a slow drag with no fling commits shortly after the finger lifts, once', () => {
    const onChange = jest.fn();
    const t = render(<WheelPicker items={ITEMS} selectedIndex={0} onChange={onChange} testID="w" />);
    const s = scroller(t.root, 'w');
    act(() => {
      s.props.onScrollBeginDrag(at(0));
      s.props.onScrollEndDrag(at(ITEM_H * 2));
    });
    expect(onChange).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(SETTLE_WAIT_MS + 5);
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(2);
  });

  test('picking the finger back up before it settles commits nothing', () => {
    const onChange = jest.fn();
    const t = render(<WheelPicker items={ITEMS} selectedIndex={0} onChange={onChange} testID="w" />);
    const s = scroller(t.root, 'w');
    act(() => {
      s.props.onScrollBeginDrag(at(0));
      s.props.onScrollEndDrag(at(ITEM_H * 2));
      s.props.onScrollBeginDrag(at(ITEM_H * 2)); // caught it again
    });
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  test('settling on the row it was already on is not a change', () => {
    const onChange = jest.fn();
    const t = render(<WheelPicker items={ITEMS} selectedIndex={2} onChange={onChange} testID="w" />);
    const s = scroller(t.root, 'w');
    act(() => {
      s.props.onScrollBeginDrag(at(ITEM_H * 2));
      s.props.onMomentumScrollBegin(at(ITEM_H * 2.3));
      s.props.onMomentumScrollEnd(at(ITEM_H * 2));
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  test('the scroll handler is not a React callback, and the wheel snaps natively', () => {
    const t = render(<WheelPicker items={ITEMS} selectedIndex={0} onChange={jest.fn()} testID="w" />);
    const s = scroller(t.root, 'w');
    expect(s.props.snapToInterval).toBe(ITEM_H);
    expect(s.props.decelerationRate).toBe('fast');
    expect(s.props.bounces).toBe(false);
  });

  test('the haptic tick: once per row, and not more often than the throttle', () => {
    expect(shouldTick(3, 3, 0, 1000)).toBe(false);                       // same row
    expect(shouldTick(3, 4, 0, 1000)).toBe(true);                        // a new row
    expect(shouldTick(4, 5, 1000, 1000 + TICK_MIN_MS - 1)).toBe(false);  // too soon after the last tick
    expect(shouldTick(4, 5, 1000, 1000 + TICK_MIN_MS)).toBe(true);
  });

  test('a screen reader steps it one row at a time', () => {
    const onChange = jest.fn();
    const t = render(<WheelPicker items={ITEMS} selectedIndex={2} onChange={onChange} accessibilityLabel="Letter" />);
    const wheel = t.root.findAll((n) => n.props.accessibilityRole === 'adjustable')[0];
    expect(wheel.props.accessibilityValue).toEqual({ text: 'c' });
    act(() => wheel.props.onAccessibilityAction({ nativeEvent: { actionName: 'increment' } }));
    expect(onChange).toHaveBeenLastCalledWith(3);
    act(() => wheel.props.onAccessibilityAction({ nativeEvent: { actionName: 'decrement' } }));
    expect(onChange).toHaveBeenLastCalledWith(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. The form fields
// ─────────────────────────────────────────────────────────────────────────────
const byTestID = (root: ReactTestInstance, id: string) =>
  root.findAll((n) => n.props.testID === id && typeof n.props.onPress === 'function')[0];
const input = (root: ReactTestInstance) =>
  root.findAll((n) => n.props.testID === 'start-time-input' && typeof n.props.onChangeText === 'function')[0];

describe('start time field', () => {
  test('wheel rows and times convert both ways', () => {
    for (const time of ['00:00', '00:15', '09:30', '11:45', '12:00', '12:30', '21:30', '23:45']) {
      const { hourIdx, minIdx, ampmIdx } = timeToIndices(time);
      expect(indicesToTime(hourIdx, minIdx, ampmIdx)).toBe(time);
    }
    expect(timeToIndices('00:00')).toEqual({ hourIdx: 11, minIdx: 0, ampmIdx: 0 }); // 12 AM
    expect(timeToIndices('13:15')).toEqual({ hourIdx: 0, minIdx: 1, ampmIdx: 1 });  // 1:15 PM
  });

  test('shows the time, and tapping it opens a field to type in', () => {
    const onChange = jest.fn();
    const t = render(<StartTimeField time="09:30" onChange={onChange} />);
    expect(JSON.stringify(t.toJSON())).toContain('9:30 AM');
    expect(input(t.root)).toBeUndefined();
    act(() => byTestID(t.root, 'start-time-value').props.onPress());
    expect(input(t.root)).toBeDefined();
  });

  test('typing 930p and pressing Done sets 9:30 PM', () => {
    const onChange = jest.fn();
    const t = render(<StartTimeField time="09:30" onChange={onChange} />);
    act(() => byTestID(t.root, 'start-time-value').props.onPress());
    act(() => input(t.root).props.onChangeText('930p'));
    act(() => input(t.root).props.onSubmitEditing());
    expect(onChange).toHaveBeenCalledWith('21:30');
    expect(input(t.root)).toBeUndefined(); // the field closed
  });

  test('a bare hour follows the AM/PM the form is on', () => {
    const onChange = jest.fn();
    const t = render(<StartTimeField time="15:00" onChange={onChange} />); // 3 PM
    act(() => byTestID(t.root, 'start-time-value').props.onPress());
    act(() => input(t.root).props.onChangeText('9'));
    act(() => input(t.root).props.onSubmitEditing());
    expect(onChange).toHaveBeenCalledWith('21:00');
  });

  test('something that is not a time is refused, says so, and changes nothing', () => {
    const onChange = jest.fn();
    const t = render(<StartTimeField time="09:30" onChange={onChange} />);
    act(() => byTestID(t.root, 'start-time-value').props.onPress());
    act(() => input(t.root).props.onChangeText('9:75'));
    act(() => input(t.root).props.onSubmitEditing());
    expect(onChange).not.toHaveBeenCalled();
    expect(input(t.root)).toBeDefined(); // still open, to fix it
    expect(JSON.stringify(t.toJSON())).toContain('That is not a time');
    // Tapping away gives up and keeps the old time.
    act(() => input(t.root).props.onBlur());
    expect(onChange).not.toHaveBeenCalled();
    expect(JSON.stringify(t.toJSON())).toContain('9:30 AM');
  });

  test('the chips change the time, wrapping past midnight', () => {
    const onChange = jest.fn();
    const t = render(<StartTimeField time="23:45" onChange={onChange} />);
    act(() => byTestID(t.root, 'start-chip-+30m').props.onPress());
    expect(onChange).toHaveBeenLastCalledWith('00:15');
    act(() => byTestID(t.root, 'start-chip-+1h').props.onPress());
    expect(onChange).toHaveBeenLastCalledWith('00:45');
    jest.setSystemTime(new Date(2026, 10, 16, 14, 7));
    act(() => byTestID(t.root, 'start-chip-Now').props.onPress());
    expect(onChange).toHaveBeenLastCalledWith('14:00');
  });

  test('turning a wheel changes only its own part of the time, on settle', () => {
    const onChange = jest.fn();
    const t = render(<StartTimeField time="09:30" onChange={onChange} />);
    const minute = scroller(t.root, 'wheel-minute');
    act(() => {
      minute.props.onScrollBeginDrag(at(ITEM_H * 2));
      minute.props.onMomentumScrollBegin(at(ITEM_H * 2.5));
    });
    expect(onChange).not.toHaveBeenCalled();
    act(() => {
      minute.props.onMomentumScrollEnd(at(ITEM_H * 3));
    });
    expect(onChange).toHaveBeenCalledWith('09:45');
    const ampm = scroller(t.root, 'wheel-ampm');
    act(() => {
      ampm.props.onScrollBeginDrag(at(0));
      ampm.props.onMomentumScrollEnd(at(ITEM_H));
    });
    expect(onChange).toHaveBeenLastCalledWith('21:30');
  });
});

describe('duration field', () => {
  test('a chip sets the duration, and the chip for the current duration is marked', () => {
    const onChange = jest.fn();
    const t = render(<DurationField hours={1} onChange={onChange} />);
    const marked = (id: string) =>
      t.root.findAll((n) => n.props.testID === id && n.props.accessibilityState !== undefined)[0].props.accessibilityState.selected;
    expect(marked('duration-chip-1h')).toBe(true);
    expect(marked('duration-chip-2h')).toBe(false);
    act(() => byTestID(t.root, 'duration-chip-1.5h').props.onPress());
    expect(onChange).toHaveBeenCalledWith(1.5);
    act(() => byTestID(t.root, 'duration-chip-15m').props.onPress());
    expect(onChange).toHaveBeenLastCalledWith(0.25);
  });

  test('the wheel commits on settle', () => {
    const onChange = jest.fn();
    const t = render(<DurationField hours={1} onChange={onChange} />);
    const wheel = scroller(t.root, 'wheel-duration');
    act(() => {
      wheel.props.onScrollBeginDrag(at(ITEM_H * 3));
      wheel.props.onMomentumScrollBegin(at(ITEM_H * 5));
    });
    expect(onChange).not.toHaveBeenCalled();
    act(() => {
      wheel.props.onMomentumScrollEnd(at(ITEM_H * 11)); // row 11 = 3 hours
    });
    expect(onChange).toHaveBeenCalledWith(3);
  });
});
