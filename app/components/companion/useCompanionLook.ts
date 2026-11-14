// useCompanionLook.ts — "what does the companion look like right now?"
//
// Reads the breed, the equipped items, and the name from the settings in the
// app store. Every screen that shows the dog uses this, so they always agree.

import { useMemo } from 'react';

import { useAppStore } from '../../store/useAppStore';
import { DEFAULT_BREED, isBreedAvailable } from './breeds';
import type { BreedId } from './breeds';
import { parseEquipped } from './items/itemSlots';
import type { Equipped } from './items/itemSlots';

export interface CompanionLook {
  name: string;
  breed: BreedId;
  equipped: Equipped;
}

export function useCompanionLook(): CompanionLook {
  const name = useAppStore((s) => s.settings?.companion_name ?? 'Nova');
  const breedRaw = useAppStore((s) => s.settings?.breed ?? DEFAULT_BREED);
  const equippedJson = useAppStore((s) => s.settings?.equipped_items ?? '{}');

  const breed: BreedId = isBreedAvailable(breedRaw) ? breedRaw : DEFAULT_BREED;
  // Parsed once per change, so the object keeps its identity between renders
  // and the companion's layers are not rebuilt for nothing.
  const equipped = useMemo(() => parseEquipped(equippedJson), [equippedJson]);

  return useMemo(() => ({ name, breed, equipped }), [name, breed, equipped]);
}
