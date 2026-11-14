// Runs before each test file, after jest itself is ready
// (see "setupFilesAfterEnv" in package.json).
//
// The animated companion uses libraries with native code. Jest runs in Node,
// where that native code does not exist, so each one is replaced or set up:
//
//   • react-native-reanimated: setUpTests() plus the "resolver" line in
//     package.json, which is the setup its documentation gives. Jest loads
//     Reanimated's JavaScript-only build and animations advance with jest's
//     fake timers.
//
//   • react-native-gesture-handler: a small hand-written mock (below). The
//     library's own jest setup tries to reach the UI thread through
//     react-native-worklets, which does not exist in Node. The mock renders
//     children as-is and remembers every gesture that was built, so a test
//     can fire "the tap ended" by hand: see global.__gestures.
//
//   • expo-haptics: a mock function that records it was called.

require('react-native-reanimated').setUpTests();

// Every Gesture.Tap() / Gesture.Pan() built during a test, newest last.
// Each entry: { type: 'tap' | 'pan' | 'longPress', handlers: { onEnd, onStart, onUpdate, ... } }
global.__gestures = [];
beforeEach(() => {
  global.__gestures.length = 0;
});

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');

  // A gesture whose every config method (maxDuration, runOnJS...) returns the
  // gesture itself, and whose callback methods (onEnd, onUpdate...) are stored.
  function makeGesture(type) {
    const record = { type, handlers: {} };
    global.__gestures.push(record);
    const gesture = new Proxy(record, {
      get(target, prop) {
        if (prop in target) return target[prop];
        if (typeof prop === 'string' && prop.startsWith('on')) {
          return (fn) => {
            target.handlers[prop] = fn;
            return gesture;
          };
        }
        return () => gesture;
      },
    });
    return gesture;
  }

  return {
    GestureHandlerRootView: ({ children, ...props }) => React.createElement(View, props, children),
    GestureDetector: ({ children }) => children,
    Gesture: {
      Tap: () => makeGesture('tap'),
      Pan: () => makeGesture('pan'),
      LongPress: () => makeGesture('longPress'),
      Simultaneous: (...gestures) => ({ type: 'simultaneous', gestures }),
      Exclusive: (...gestures) => ({ type: 'exclusive', gestures }),
      Race: (...gestures) => ({ type: 'race', gestures }),
    },
  };
});

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));
