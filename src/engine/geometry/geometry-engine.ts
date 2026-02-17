import type { FacadeDirection, ViewMode } from '@/types/project.ts';
import type { Line } from '@/types/geometry.ts';
import type { Door, Window, Wall } from '@/types/elements.ts';
import { generateCrossSection, type SectionElement } from '@/engine/views/cross-section.ts';
import { generateFacade, type FacadeElement } from '@/engine/views/facade.ts';
import { generateIsometricView, type IsoFace } from '@/engine/views/isometric.ts';
import type { PlanModel } from '@/engine/geometry/plan-model.ts';

// ---------------------------------------------------------------------------
// Global unit/transform conventions
// ---------------------------------------------------------------------------

export const BASE_PIXELS_PER_METER = 100;

export function pixelsPerMeterForZoom(zoom: number): number {
  return BASE_PIXELS_PER_METER * zoom;
}

// ---------------------------------------------------------------------------
// Canonical wall orientation
// ---------------------------------------------------------------------------

/**
 * Canonicalize wall winding to avoid view-dependent behavior tied to draw
 * direction (start/end). Openings are remapped to keep world placement.
 */
function canonicalizeWallGeometry(
  walls: Wall[],
  doors: Door[],
  windows: Window[],
): { walls: Wall[]; doors: Door[]; windows: Window[] } {
  const swapByWallId = new Map<string, boolean>();

  const canonicalWalls = walls.map((wall) => {
    const swap =
      wall.start.x > wall.end.x
      || (wall.start.x === wall.end.x && wall.start.y > wall.end.y);
    swapByWallId.set(wall.id, swap);

    if (!swap) return wall;
    return {
      ...wall,
      start: { ...wall.end },
      end: { ...wall.start },
    };
  });

  const canonicalDoors = doors.map((door) => {
    if (!swapByWallId.get(door.wallId)) return door;
    const remappedPosition = Math.max(0, Math.min(1, 1 - door.position));
    return {
      ...door,
      position: remappedPosition,
    };
  });

  const canonicalWindows = windows.map((win) => {
    if (!swapByWallId.get(win.wallId)) return win;
    const remappedPosition = Math.max(0, Math.min(1, 1 - win.position));
    return {
      ...win,
      position: remappedPosition,
    };
  });

  return { walls: canonicalWalls, doors: canonicalDoors, windows: canonicalWindows };
}

// ---------------------------------------------------------------------------
// Derived scene geometry
// ---------------------------------------------------------------------------

export interface SceneViewConfig {
  mode: ViewMode;
  facadeDirection: FacadeDirection;
  sectionDirection: FacadeDirection;
  sectionOffset: number;
  isoRotation: number;
  isoElevation: number;
}

export type DerivedSceneGeometry =
  | {
      kind: 'plan';
      model: PlanModel;
    }
  | {
      kind: 'facade';
      direction: FacadeDirection;
      elements: FacadeElement[];
    }
  | {
      kind: 'section';
      direction: FacadeDirection;
      cutLine: Line;
      cutAxis: 'x' | 'y';
      cutCoordinate: number;
      elements: SectionElement[];
    }
  | {
      kind: 'isometric';
      faces: IsoFace[];
      rotation: number;
      elevation: number;
    };

/**
 * Build derived view geometry from a canonical `PlanModel`.
 *
 * This is the single place where facade/section/3D projection math is invoked,
 * keeping all downstream renderers synchronized.
 */
export function buildDerivedSceneGeometry(
  model: PlanModel,
  view: SceneViewConfig,
): DerivedSceneGeometry {
  if (view.mode === 'plan') {
    return { kind: 'plan', model };
  }

  const floorHeight = model.floor.height || 3.0;
  const visibleWalls = model.walls.filter((w) => w.visible);
  const visibleDoors = model.doors.filter((d) => d.visible);
  const visibleWindows = model.windows.filter((w) => w.visible);
  const visibleRooms = model.rooms.filter((r) => r.visible);
  const visibleFurniture = model.furniture.filter((f) => f.visible);

  const canonical = canonicalizeWallGeometry(visibleWalls, visibleDoors, visibleWindows);
  const walls = canonical.walls;
  const doors = canonical.doors;
  const windows = canonical.windows;

  if (view.mode === 'facade') {
    return {
      kind: 'facade',
      direction: view.facadeDirection,
      elements: generateFacade(
        view.facadeDirection,
        walls,
        doors,
        windows,
        floorHeight,
        visibleFurniture,
      ),
    };
  }

  if (view.mode === 'section') {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const wall of walls) {
      if (wall.start.x < minX) minX = wall.start.x;
      if (wall.end.x < minX) minX = wall.end.x;
      if (wall.start.x > maxX) maxX = wall.start.x;
      if (wall.end.x > maxX) maxX = wall.end.x;
      if (wall.start.y < minY) minY = wall.start.y;
      if (wall.end.y < minY) minY = wall.end.y;
      if (wall.start.y > maxY) maxY = wall.start.y;
      if (wall.end.y > maxY) maxY = wall.end.y;
    }

    if (minX === Infinity) {
      minX = -5;
      maxX = 5;
      minY = -5;
      maxY = 5;
    }

    const dir = view.sectionDirection;
    if (dir === 'north' || dir === 'south') {
      const cutY = (minY + maxY) / 2 + view.sectionOffset;
      const cutLine: Line = {
        start: { x: minX - 1, y: cutY },
        end: { x: maxX + 1, y: cutY },
      };
      return {
        kind: 'section',
        direction: dir,
        cutLine,
        cutAxis: 'y',
        cutCoordinate: cutY,
        elements: generateCrossSection(
          cutLine,
          walls,
          doors,
          windows,
          floorHeight,
        ),
      };
    }

    const cutX = (minX + maxX) / 2 + view.sectionOffset;
    const cutLine: Line = {
      start: { x: cutX, y: minY - 1 },
      end: { x: cutX, y: maxY + 1 },
    };
    return {
      kind: 'section',
      direction: dir,
      cutLine,
      cutAxis: 'x',
      cutCoordinate: cutX,
      elements: generateCrossSection(
        cutLine,
        walls,
        doors,
        windows,
        floorHeight,
      ),
    };
  }

  return {
    kind: 'isometric',
    faces: generateIsometricView(
      walls,
      doors,
      windows,
      visibleRooms,
      floorHeight,
      view.isoRotation,
      visibleFurniture,
      view.isoElevation,
    ),
    rotation: view.isoRotation,
    elevation: view.isoElevation,
  };
}
