import type { Wall, Door, Window, FurnitureItem } from '@/types/elements';
import { sub, normalize, perpendicular, distance } from '@/engine/math/vector';
import { classifyStamp, elevationHeight, elevationWidth } from '@/engine/views/neufert-elevation';

// ---------------------------------------------------------------------------
// Facade element -- a single rendered element in the elevation view
// ---------------------------------------------------------------------------

export interface FacadeElement {
  type: 'wall-face' | 'door-opening' | 'window-opening' | 'roof-line' | 'ground' | 'silhouette';
  /** Horizontal position in meters. */
  x: number;
  /** Vertical position in meters from ground. */
  y: number;
  /** Horizontal extent in meters. */
  width: number;
  /** Vertical extent in meters. */
  height: number;
  /** Display color. */
  color: string;
  /** Whether this element should be drawn filled. */
  filled: boolean;
  /** Optional: silhouette shape type for special rendering. */
  silhouetteType?: 'person' | 'tree' | 'car' | 'furniture';
  /** Original stampId for Neufert elevation draws. */
  stampId?: string;
  /**
   * Relative depth from the facade plane (meters). `0` means the item is on
   * or in front of the facade plane; higher values are further behind.
   */
  depth?: number;
}

// ---------------------------------------------------------------------------
// Direction helpers
// ---------------------------------------------------------------------------

type FacadeDirection = 'north' | 'south' | 'east' | 'west';

/**
 * Return the viewing-direction unit vector and the projection axis
 * for extracting the horizontal coordinate of a wall in the facade.
 *
 * Convention:
 *  - north/south facades project along the X axis.
 *  - east/west facades project along the Y axis.
 *  - south/east are mirrored for consistent viewer-facing orientation.
 */
function getDirectionConfig(direction: FacadeDirection) {
  switch (direction) {
    case 'north':
      return { normalAxis: 'y' as const, horizAxis: 'x' as const, horizSign: 1 };
    case 'south':
      return { normalAxis: 'y' as const, horizAxis: 'x' as const, horizSign: -1 };
    case 'east':
      return { normalAxis: 'x' as const, horizAxis: 'y' as const, horizSign: -1 };
    case 'west':
      return { normalAxis: 'x' as const, horizAxis: 'y' as const, horizSign: 1 };
  }
}

/**
 * Compute the wall's outward-facing normal (perpendicular to centerline, CCW).
 */
function wallNormal(wall: Wall): { x: number; y: number } {
  const dir = sub(wall.end, wall.start);
  return normalize(perpendicular(dir));
}

// ---------------------------------------------------------------------------
// Tolerance for "roughly perpendicular" check
// ---------------------------------------------------------------------------

const FACING_THRESHOLD = 0.3; // dot-product threshold: cos(~73 deg)
const FRONT_WALL_DEPTH_TOLERANCE = 0.35; // meters
const FACADE_INTERIOR_DEPTH_PADDING = 0.25; // meters behind facade plane
const FACADE_EXTERIOR_DEPTH_BAND = 3.5; // meters in front of facade plane
const FACADE_FURNITURE_EPSILON = 0.12; // rotated-footprint slack

function halfExtentAlongAxis(item: FurnitureItem, axis: 'x' | 'y'): number {
  const scaledW = Math.max(0.05, item.width * item.scale);
  const scaledD = Math.max(0.05, item.depth * item.scale);
  const rotRad = ((item.rotation ?? 0) * Math.PI) / 180;
  const absCos = Math.abs(Math.cos(rotRad));
  const absSin = Math.abs(Math.sin(rotRad));
  return axis === 'x'
    ? (scaledW * absCos + scaledD * absSin) / 2
    : (scaledW * absSin + scaledD * absCos) / 2;
}

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------

/**
 * Generate facade (elevation) data by projecting walls that face a given
 * compass direction onto a vertical plane.
 *
 * @param direction   Viewing direction (north / south / east / west).
 * @param walls       All walls in the floor plan.
 * @param doors       All doors to test.
 * @param windows     All windows to test.
 * @param floorHeight Floor-to-floor height in meters.
 * @returns Array of FacadeElement objects describing the elevation.
 */
export function generateFacade(
  direction: FacadeDirection,
  walls: Wall[],
  doors: Door[],
  windows: Window[],
  floorHeight: number,
  furniture?: FurnitureItem[],
): FacadeElement[] {
  const elements: FacadeElement[] = [];
  const cfg = getDirectionConfig(direction);
  const candidateWalls = walls.filter((wall) => {
    const normal = wallNormal(wall);
    const normalComponent = cfg.normalAxis === 'x' ? normal.x : normal.y;
    return Math.abs(normalComponent) >= FACING_THRESHOLD;
  });

  const wallDepth = (wall: Wall): number => {
    const midX = (wall.start.x + wall.end.x) / 2;
    const midY = (wall.start.y + wall.end.y) / 2;
    return cfg.normalAxis === 'x' ? midX : midY;
  };

  let frontDepth: number | null = null;
  if (candidateWalls.length > 0) {
    const depths = candidateWalls.map(wallDepth);
    if (direction === 'north' || direction === 'east') {
      frontDepth = Math.max(...depths);
    } else {
      frontDepth = Math.min(...depths);
    }
  }

  const facadeWalls = candidateWalls.length === 0 || frontDepth === null
    ? candidateWalls
    : candidateWalls.filter((wall) => Math.abs(wallDepth(wall) - frontDepth!) <= FRONT_WALL_DEPTH_TOLERANCE);

  const wallsToRender = facadeWalls.length > 0 ? facadeWalls : candidateWalls;

  // Build lookup maps
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

  let minX = Infinity;
  let maxX = -Infinity;

  for (const wall of wallsToRender) {
    // Project wall endpoints onto the horizontal facade axis
    const startH = cfg.horizAxis === 'x' ? wall.start.x : wall.start.y;
    const endH = cfg.horizAxis === 'x' ? wall.end.x : wall.end.y;

    const projStart = startH * cfg.horizSign;
    const projEnd = endH * cfg.horizSign;

    const facadeX = Math.min(projStart, projEnd);
    const facadeWidth = Math.abs(projEnd - projStart);

    // Update bounds
    if (facadeX < minX) minX = facadeX;
    if (facadeX + facadeWidth > maxX) maxX = facadeX + facadeWidth;

    // --- Wall face ---
    elements.push({
      type: 'wall-face',
      x: facadeX,
      y: 0,
      width: facadeWidth,
      height: wall.height,
      color: wall.fillColor ?? '#d3d3d3',
      filled: true,
    });

    // --- Door openings ---
    const wallLen = distance(wall.start, wall.end);
    if (wallLen <= 0) continue;
    const projectedScale = facadeWidth / wallLen;
    const wallDoors = doorsByWall.get(wall.id) ?? [];
    for (const door of wallDoors) {
      const halfDoorParam = (door.width / wallLen) / 2;
      const doorStartParam = door.position - halfDoorParam;
      const doorXStart = facadeX + doorStartParam * facadeWidth;
      const projectedDoorWidth = door.width * projectedScale;

      elements.push({
        type: 'door-opening',
        x: doorXStart,
        y: 0,
        width: projectedDoorWidth,
        height: door.height,
        color: '#ffffff',
        filled: false,
      });
    }

    // --- Window openings ---
    const wallWindows = windowsByWall.get(wall.id) ?? [];
    for (const win of wallWindows) {
      const halfWinParam = (win.width / wallLen) / 2;
      const winStartParam = win.position - halfWinParam;
      const winXStart = facadeX + winStartParam * facadeWidth;
      const projectedWindowWidth = win.width * projectedScale;

      elements.push({
        type: 'window-opening',
        x: winXStart,
        y: win.sillHeight,
        width: projectedWindowWidth,
        height: win.height,
        color: '#87CEEB',
        filled: false,
      });
    }
  }

  // --- Furniture / people / trees / cars silhouettes ---
  if (furniture && furniture.length > 0) {
    for (const item of furniture) {
      if (!item.visible) continue;

      const normalCoord = cfg.normalAxis === 'x' ? item.position.x : item.position.y;
      let depthFromFacade = 0;
      if (frontDepth !== null) {
        const halfExtentNormal = halfExtentAlongAxis(item, cfg.normalAxis);
        const paddedHalfExtent = halfExtentNormal + FACADE_FURNITURE_EPSILON;

        // Positive distance means object is in front of the facade.
        // Negative distance means object is behind the facade (inside).
        const signedFrontDistance = (direction === 'north' || direction === 'east')
          ? normalCoord - frontDepth
          : frontDepth - normalCoord;

        const maxInteriorDistance = paddedHalfExtent + FACADE_INTERIOR_DEPTH_PADDING;
        const maxExteriorDistance = paddedHalfExtent + FACADE_EXTERIOR_DEPTH_BAND;
        if (signedFrontDistance < -maxInteriorDistance || signedFrontDistance > maxExteriorDistance) {
          continue;
        }

        depthFromFacade = signedFrontDistance >= 0 ? 0 : -signedFrontDistance;
      }

      // Project furniture position onto the facade horizontal axis
      const posH = cfg.horizAxis === 'x' ? item.position.x : item.position.y;
      const projX = posH * cfg.horizSign;

      // Use Neufert classification for proper heights/widths
      const stampType = classifyStamp(item.stampId);
      const silHeight = elevationHeight(stampType);
      const silWidth = elevationWidth(stampType);

      // Determine silhouette category for the renderer
      let silType: 'person' | 'tree' | 'car' | 'furniture' = 'furniture';
      if (stampType === 'person' || stampType === 'child') silType = 'person';
      else if (stampType === 'tree' || stampType === 'bush') silType = 'tree';
      else if (stampType === 'car') silType = 'car';

      elements.push({
        type: 'silhouette',
        x: projX - silWidth / 2,
        y: 0,
        width: silWidth,
        height: silHeight,
        color: item.color ?? '#555555',
        filled: true,
        silhouetteType: silType,
        stampId: item.stampId,
        depth: depthFromFacade,
      });
    }
  }

  // --- Ground line ---
  const groundPadding = 1.0;
  const groundMinX = minX === Infinity ? 0 : minX - groundPadding;
  const groundMaxX = maxX === -Infinity ? 10 : maxX + groundPadding;

  elements.push({
    type: 'ground',
    x: groundMinX,
    y: -0.05,
    width: groundMaxX - groundMinX,
    height: 0.05,
    color: '#8B4513',
    filled: true,
  });

  // --- Roof line ---
  elements.push({
    type: 'roof-line',
    x: groundMinX,
    y: floorHeight,
    width: groundMaxX - groundMinX,
    height: 0.05,
    color: '#444444',
    filled: true,
  });

  return elements;
}
