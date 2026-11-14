// companionName.ts — the one rule for what counts as a valid companion name.
//
// Used by every place a name can be typed (Home, Settings, the Gallery) and by
// the database query that saves it, so they cannot disagree.

export const MAX_NAME_LENGTH = 20;

// Returns the cleaned name (spaces trimmed from both ends), or null if the
// name is not allowed: empty after trimming, or longer than MAX_NAME_LENGTH.
export function cleanCompanionName(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null;
  const name = raw.trim();
  if (name.length === 0) return null;
  // Count characters the way a person would: an emoji is one, not two.
  if (Array.from(name).length > MAX_NAME_LENGTH) return null;
  return name;
}

// A short reason to show under the text field, or null when the name is fine.
export function companionNameError(raw: string): string | null {
  const name = raw.trim();
  if (name.length === 0) return 'Please enter a name.';
  if (Array.from(name).length > MAX_NAME_LENGTH) return `Names can be up to ${MAX_NAME_LENGTH} characters.`;
  return null;
}
