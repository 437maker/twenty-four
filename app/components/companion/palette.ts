// palette.ts — every color the companion uses, in one place.
//
// The dog is flat color: one base tone and one shade tone per area. The soft
// outline (not black) is what keeps a white dog visible on a warm white screen.

export const PALETTE = {
  // Coat
  fur: '#FFFDF8',
  furShade: '#EDE4D6',
  outline: '#CBBFAE',

  // Face
  ink: '#2B2420', // eyes, nose, mouth line
  highlight: '#FFFFFF',
  tongue: '#F28C9B',
  mouth: '#5B2B33', // inside of the open mouth
  blush: '#F7C9C9', // cheeks and inner ear

  // Topknot bow (brand purple). Shop items can recolor it.
  bow: '#3C3489',
  bowLight: '#7A72D6', // thin edge so the bow still reads on the night sky

  // Ground shadow under the dog
  shadow: '#2B2420',
  shadowOpacity: 0.16,

  // Accessories
  hat: '#F6B93B',
  hatStripe: '#3C3489',
  hatPom: '#F28C9B',
  scarf: '#D9534F',
  scarfShade: '#B8423F',
  bowTie: '#E11D48',
  gold: '#E0A82E',
  goldShade: '#B9861C',

  // Effects
  heart: '#F2607A',
  zzz: '#FFFFFF',
  zzzOutline: '#8FA6CC',
  sparkles: ['#F6B93B', '#F28C9B', '#7A72D6', '#1D9E75', '#FFFFFF'],
} as const;

// The three places the companion appears. Used by the render script and the
// Gallery so the dog can be checked against each one.
export const BACKDROPS = {
  warmWhite: { sky: '#FFFBF5', ground: '#FFFBF5' },
  day: { sky: '#B5D4F4', ground: '#8BC98A' },
  night: { sky: '#2D4A7A', ground: '#3E6B4C' },
} as const;

export type BackdropName = keyof typeof BACKDROPS;
