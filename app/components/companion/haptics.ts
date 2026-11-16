// haptics.ts — the small "tick" you feel when you tap the companion.
//
// expo-haptics is loaded lazily inside try/catch. If the native module were
// ever missing (an Expo Go build without it, or a simulator), a top-level
// import would crash the whole app at startup. This way the worst case is
// simply no vibration.

// A heavier beat, for the moment a chest's lid pops open.
export function thump(): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Haptics = require('expo-haptics');
    const done = Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (done && typeof done.catch === 'function') done.catch(() => {});
  } catch {
    // No haptics available. Nothing to do.
  }
}

// The faint tick of a picker wheel passing a row. iOS has a haptic made for
// exactly this ("selection"); if it is missing, a light tap stands in.
export function selectionTick(): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Haptics = require('expo-haptics');
    const done = typeof Haptics.selectionAsync === 'function'
      ? Haptics.selectionAsync()
      : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (done && typeof done.catch === 'function') done.catch(() => {});
  } catch {
    // No haptics available. Nothing to do.
  }
}

export function lightTap(): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Haptics = require('expo-haptics');
    const done = Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (done && typeof done.catch === 'function') done.catch(() => {});
  } catch {
    // No haptics available. Nothing to do.
  }
}
