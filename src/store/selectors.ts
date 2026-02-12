import type { Floor } from '@/types/project.ts';
import type {
  AnyElement,
  Wall,
  Door,
  Window,
  Room,
  FurnitureItem,
  TextLabel,
  DimensionLine,
  ArchLine,
  Stair,
} from '@/types/elements.ts';
import type { useProjectStore } from './project-store.ts';

// ---------------------------------------------------------------------------
// Type alias for the project store state
// ---------------------------------------------------------------------------

type ProjectStoreState = ReturnType<typeof useProjectStore.getState>;

// ---------------------------------------------------------------------------
// Floor selectors
// ---------------------------------------------------------------------------

/** Return the currently active floor. */
export function getActiveFloor(state: ProjectStoreState): Floor {
  const { project } = state;
  return project.floors[project.activeFloorIndex];
}

/** Return all elements on the active floor, keyed by ID. */
export function getActiveElements(
  state: ProjectStoreState,
): Record<string, AnyElement> {
  return getActiveFloor(state).elements;
}

// ---------------------------------------------------------------------------
// Element-type selectors (filter active floor elements)
// ---------------------------------------------------------------------------

/** Return all walls on the active floor. */
export function getWalls(state: ProjectStoreState): Wall[] {
  const elements = getActiveElements(state);
  return Object.values(elements).filter(
    (el): el is Wall => el.type === 'wall',
  );
}

/** Return all doors on the active floor. */
export function getDoors(state: ProjectStoreState): Door[] {
  const elements = getActiveElements(state);
  return Object.values(elements).filter(
    (el): el is Door => el.type === 'door',
  );
}

/** Return all windows on the active floor. */
export function getWindows(state: ProjectStoreState): Window[] {
  const elements = getActiveElements(state);
  return Object.values(elements).filter(
    (el): el is Window => el.type === 'window',
  );
}

/** Return all rooms on the active floor. */
export function getRooms(state: ProjectStoreState): Room[] {
  const elements = getActiveElements(state);
  return Object.values(elements).filter(
    (el): el is Room => el.type === 'room',
  );
}

/** Return all furniture items on the active floor. */
export function getFurniture(state: ProjectStoreState): FurnitureItem[] {
  const elements = getActiveElements(state);
  return Object.values(elements).filter(
    (el): el is FurnitureItem => el.type === 'furniture',
  );
}

/** Return all text labels on the active floor. */
export function getTexts(state: ProjectStoreState): TextLabel[] {
  const elements = getActiveElements(state);
  return Object.values(elements).filter(
    (el): el is TextLabel => el.type === 'text',
  );
}

/** Return all dimension lines on the active floor. */
export function getDimensions(state: ProjectStoreState): DimensionLine[] {
  const elements = getActiveElements(state);
  return Object.values(elements).filter(
    (el): el is DimensionLine => el.type === 'dimension',
  );
}

/** Return all architectural lines on the active floor. */
export function getArchLines(state: ProjectStoreState): ArchLine[] {
  const elements = getActiveElements(state);
  return Object.values(elements).filter(
    (el): el is ArchLine => el.type === 'archline',
  );
}

/** Return all stairs on the active floor. */
export function getStairs(state: ProjectStoreState): Stair[] {
  const elements = getActiveElements(state);
  return Object.values(elements).filter(
    (el): el is Stair => el.type === 'stair',
  );
}

// ---------------------------------------------------------------------------
// Single element lookup
// ---------------------------------------------------------------------------

/** Find an element by ID on the active floor, or undefined if not found. */
export function getElementById(
  state: ProjectStoreState,
  id: string,
): AnyElement | undefined {
  return getActiveElements(state)[id];
}
