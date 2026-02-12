import type { Line } from '@/types/geometry';
import type { Wall, Door, Window } from '@/types/elements';
import { segmentIntersection } from '@/engine/math/line';
import { distance, sub, normalize, dot } from '@/engine/math/vector';

// ---------------------------------------------------------------------------
// Section element -- a single rendered element in the cross-section view
// ---------------------------------------------------------------------------

export interface SectionElement {
  type: 'wall' | 'door-opening' | 'window-opening' | 'floor-slab' | 'ground';
  /** Position along the cut line in meters. */
  x: number;
  /** Vertical position in meters from ground level. */
  y: number;
  /** Horizontal extent in meters. */
  width: number;
  /** Vertical extent in meters. */
  height: number;
  /** Display color. */
  color: string;
  /** Whether this element should be drawn filled (solid). */
  filled: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FLOOR_SLAB_THICKNESS = 0.2; // meters
const GROUND_LINE_THICKNESS = 0.05; // meters (visual only)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute the parametric `t` along the cut line where the intersection
 * occurred, then convert that to a distance in meters.
 */
function distanceAlongCutLine(cutLine: Line, point: { x: number; y: number }): number {
  return distance(cutLine.start, point);
}

/**
 * Determine whether a door or window (by parametric position and width)
 * lies on the portion of its parent wall that the cut line intersects.
 */
function openingIntersectsCut(
  wall: Wall,
  openingPosition: number,
  openingWidth: number,
  cutLine: Line,
): boolean {
  const wallDir = sub(wall.end, wall.start);
  const wallLen = distance(wall.start, wall.end);
  if (wallLen === 0) return false;

  // Parametric range the opening occupies along the wall centerline
  const halfW = (openingWidth / wallLen) / 2;
  const openStart = openingPosition - halfW;
  const openEnd = openingPosition + halfW;

  // Find where the cut line crosses the wall centerline
  const wallLine: Line = { start: wall.start, end: wall.end };
  const hit = segmentIntersection(cutLine, wallLine);
  if (!hit) return false;

  // Parametric position of the hit along the wall
  const tHit = dot(sub(hit, wall.start), normalize(wallDir)) / wallLen;

  return tHit >= openStart && tHit <= openEnd;
}

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------

/**
 * Generate cross-section data by casting a cut line across the plan and
 * computing which walls, doors, and windows are intersected.
 *
 * @param cutLine       The cut line in plan-view (meters).
 * @param walls         All walls to test.
 * @param doors         All doors to test.
 * @param windows       All windows to test.
 * @param floorHeight   Floor-to-floor height in meters.
 * @returns Array of SectionElement objects describing the cross-section.
 */
export function generateCrossSection(
  cutLine: Line,
  walls: Wall[],
  doors: Door[],
  windows: Window[],
  floorHeight: number,
): SectionElement[] {
  const elements: SectionElement[] = [];

  // Build lookup maps for doors and windows keyed by wall ID
  const doorsByWall = new Map<string, Door[]>();
  for (const door of doors) {
    const list = doorsByWall.get(door.wallId) ?? [];
    list.push(door);
    doorsByWall.set(door.wallId, list);
  }

  const windowsByWall = new Map<string, Window[]>();
  for (const win of windows) {
    const list = windowsByWall.get(win.wallId) ?? [];
    list.push(win);
    windowsByWall.set(win.wallId, list);
  }

  // Track the overall horizontal extent for ground / slab
  let minX = Infinity;
  let maxX = -Infinity;

  for (const wall of walls) {
    const wallLine: Line = { start: wall.start, end: wall.end };
    const hit = segmentIntersection(cutLine, wallLine);
    if (!hit) continue;

    const x = distanceAlongCutLine(cutLine, hit);
    const halfThick = wall.thickness / 2;

    // Update bounds
    if (x - halfThick < minX) minX = x - halfThick;
    if (x + halfThick > maxX) maxX = x + halfThick;

    // --- Wall section (full height by default) ---
    elements.push({
      type: 'wall',
      x: x - halfThick,
      y: 0,
      width: wall.thickness,
      height: wall.height,
      color: wall.fillColor ?? '#d3d3d3',
      filled: true,
    });

    // --- Door openings ---
    const wallDoors = doorsByWall.get(wall.id) ?? [];
    for (const door of wallDoors) {
      if (!openingIntersectsCut(wall, door.position, door.width, cutLine)) continue;

      // Door opening: gap from floor to door height
      elements.push({
        type: 'door-opening',
        x: x - halfThick,
        y: 0,
        width: wall.thickness,
        height: door.height,
        color: '#ffffff',
        filled: false,
      });
    }

    // --- Window openings ---
    const wallWindows = windowsByWall.get(wall.id) ?? [];
    for (const win of wallWindows) {
      if (!openingIntersectsCut(wall, win.position, win.width, cutLine)) continue;

      // Window opening: gap from sill height to sill + window height
      elements.push({
        type: 'window-opening',
        x: x - halfThick,
        y: win.sillHeight,
        width: wall.thickness,
        height: win.height,
        color: '#87CEEB',
        filled: false,
      });
    }
  }

  // --- Ground line ---
  const groundPadding = 1.0; // extra meters on each side
  const groundMinX = minX === Infinity ? 0 : minX - groundPadding;
  const groundMaxX = maxX === -Infinity ? 10 : maxX + groundPadding;

  elements.push({
    type: 'ground',
    x: groundMinX,
    y: -GROUND_LINE_THICKNESS,
    width: groundMaxX - groundMinX,
    height: GROUND_LINE_THICKNESS,
    color: '#8B4513',
    filled: true,
  });

  // --- Floor slab ---
  elements.push({
    type: 'floor-slab',
    x: groundMinX,
    y: -FLOOR_SLAB_THICKNESS,
    width: groundMaxX - groundMinX,
    height: FLOOR_SLAB_THICKNESS,
    color: '#666666',
    filled: true,
  });

  // --- Upper floor slab (at floorHeight) ---
  elements.push({
    type: 'floor-slab',
    x: groundMinX,
    y: floorHeight - FLOOR_SLAB_THICKNESS,
    width: groundMaxX - groundMinX,
    height: FLOOR_SLAB_THICKNESS,
    color: '#666666',
    filled: true,
  });

  return elements;
}
