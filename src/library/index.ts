import type { StampDefinition } from '@/types/library';
import { furnitureStamps } from './stamps/furniture';
import { bathroomStamps } from './stamps/bathroom';
import { kitchenStamps } from './stamps/kitchen';
import { outdoorStamps } from './stamps/outdoor';
import { peopleStamps } from './stamps/people';
import { accessoriesStamps } from './stamps/accessories';
import { decorationStamps } from './stamps/decoration';
import { laundryStamps } from './stamps/laundry';

export { categories } from './categories';
export type { CategoryInfo } from './categories';

export const allStamps: StampDefinition[] = [
  ...furnitureStamps,
  ...bathroomStamps,
  ...kitchenStamps,
  ...outdoorStamps,
  ...peopleStamps,
  ...accessoriesStamps,
  ...decorationStamps,
  ...laundryStamps,
];

export const stampRegistry = new Map<string, StampDefinition>(
  allStamps.map(s => [s.id, s]),
);

export function getStampsByCategory(category: string): StampDefinition[] {
  return allStamps.filter(s => s.category === category);
}

export function getStampById(id: string): StampDefinition | undefined {
  return stampRegistry.get(id);
}
