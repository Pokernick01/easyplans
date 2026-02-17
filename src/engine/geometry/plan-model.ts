import type { DisplayUnit } from '@/utils/units.ts';
import type { PaperSize } from '@/types/project.ts';
import type {
  ArchLine,
  DimensionLine,
  Door,
  FurnitureItem,
  Room,
  Shape,
  Stair,
  TextLabel,
  Wall,
  Window,
} from '@/types/elements.ts';
import type { useProjectStore } from '@/store/project-store.ts';
import {
  getActiveFloor,
  getArchLines,
  getDimensions,
  getDoors,
  getFurniture,
  getRooms,
  getShapes,
  getStairs,
  getTexts,
  getWalls,
  getWindows,
} from '@/store/selectors.ts';

// ---------------------------------------------------------------------------
// Plan model (canonical geometry state consumed by all render paths)
// ---------------------------------------------------------------------------

type ProjectStoreState = ReturnType<typeof useProjectStore.getState>;

export interface PlanModel {
  id: string;
  name: string;
  units: 'meters';
  displayUnit: DisplayUnit;
  scale: string;
  paperSize: PaperSize;
  activeFloorIndex: number;
  floor: {
    id: string;
    name: string;
    level: number;
    height: number;
  };
  walls: Wall[];
  doors: Door[];
  windows: Window[];
  rooms: Room[];
  furniture: FurnitureItem[];
  texts: TextLabel[];
  dimensions: DimensionLine[];
  archLines: ArchLine[];
  stairs: Stair[];
  shapes: Shape[];
}

/**
 * Build a deterministic `PlanModel` snapshot from project store state.
 *
 * All renderers (2D, facade, 3D, export) should consume this object rather
 * than reaching directly into store slices with ad-hoc selectors.
 */
export function buildPlanModelFromState(state: ProjectStoreState): PlanModel {
  const floor = getActiveFloor(state);

  return {
    id: state.project.id,
    name: state.project.name,
    units: state.project.units,
    displayUnit: state.project.displayUnit || 'm',
    scale: state.project.scale,
    paperSize: state.project.paperSize,
    activeFloorIndex: state.project.activeFloorIndex,
    floor: {
      id: floor.id,
      name: floor.name,
      level: floor.level,
      height: floor.height,
    },
    walls: getWalls(state),
    doors: getDoors(state),
    windows: getWindows(state),
    rooms: getRooms(state),
    furniture: getFurniture(state),
    texts: getTexts(state),
    dimensions: getDimensions(state),
    archLines: getArchLines(state),
    stairs: getStairs(state),
    shapes: getShapes(state),
  };
}

