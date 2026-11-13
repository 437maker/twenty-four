// Tests for the Home screen's pure helpers (balance score, yard stage, night window).
jest.mock('../app/store/useAppStore', () => ({ useAppStore: jest.fn() }));
jest.mock('../app/db/queries', () => ({}));
jest.mock('../app/screens/SettingsScreen', () => () => null);

import { calculateBalanceScore, yardStageFromHouseTier, isNightTime } from '../app/screens/HomeScreen';

describe('calculateBalanceScore', () => {
  it('is 100 when every pillar hits its target exactly', () => {
    expect(calculateBalanceScore([{ logged: 8, target: 8 }, { logged: 6, target: 6 }, { logged: 8, target: 8 }])).toBe(100);
  });
  it('is 0 with nothing logged', () => {
    expect(calculateBalanceScore([{ logged: 0, target: 8 }, { logged: 0, target: 6 }])).toBe(0);
  });
  it('penalises overwork instead of rewarding it', () => {
    // Work 12/8 → 1 - 0.5*0.5 = 0.75 ; Sleep 8/8 → 1 ; average 0.875
    expect(calculateBalanceScore([{ logged: 12, target: 8 }, { logged: 8, target: 8 }])).toBe(88);
  });
  it('caps the overflow penalty at half a point', () => {
    expect(calculateBalanceScore([{ logged: 40, target: 8 }])).toBe(50);
  });
  it('ignores pillars with a zero target', () => {
    expect(calculateBalanceScore([{ logged: 8, target: 8 }, { logged: 3, target: 0 }])).toBe(100);
  });
});

describe('yardStageFromHouseTier', () => {
  it.each([[0, 0], [1, 1], [4, 4], [5, 4], [-1, 0]])('tier %i → stage %i', (tier, stage) => {
    expect(yardStageFromHouseTier(tier)).toBe(stage);
  });
});

describe('isNightTime', () => {
  const at = (h: number) => new Date(2026, 0, 1, h, 30);
  it('is night from 10pm to 7am', () => {
    expect(isNightTime(at(22))).toBe(true);
    expect(isNightTime(at(3))).toBe(true);
    expect(isNightTime(at(6))).toBe(true);
  });
  it('is day from 7am to 10pm', () => {
    expect(isNightTime(at(7))).toBe(false);
    expect(isNightTime(at(21))).toBe(false);
  });
});
