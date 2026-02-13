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
 *  - north: viewer looks from +Y toward -Y. Walls whose normal points toward +Y face the viewer.
 *           Horizontal axis = X.
 *  - south: viewer looks from -Y toward +Y. Normal toward -Y faces viewer.
 *           Horizontal axis = X (mirrored).
 *  - east:  viewer looks from +X toward -X. Normal toward +X faces viewer.
 *           Horizontal axis = Y.
 *  - west:  viewer looks from -X toward +X. Normal toward -X faces viewer.
 *           Horizontal axis = Y (mirrored).
 */
function getDirectionConfig(direction: FacadeDirection) {
  switch (direction) {
    case 'north':
      return { normalAxis: 'y' as const, normalSign: 1, horizAxis: 'x' as const, horizSign: 1 };
    case 'south':
      return { normalAxis: 'y' as const, normalSign: -1, horizAxis: 'x' as const, horizSign: -1 };
    case 'east':
      return { normalAxis: 'x' as const, normalSign: 1, horizAxis: 'y' as const, horizSign: -1 };
    case 'west':
      return { normalAxis: 'x' as const, normalSign: -1, horizAxis: 'y' as const, horizSign: 1 };
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

  for (const wall of walls) {
    // Check if this wall faces the viewer
    const normal = wallNormal(wall);
    const normalComponent = cfg.normalAxis === 'x' ? normal.x : normal.y;

    if (normalComponent * cfg.normalSign < FACING_THRESHOLD) continue;

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
    const wallDoors = doorsByWall.get(wall.id) ?? [];
    for (const door of wallDoors) {
      const halfDoorParam = (door.width / wallLen) / 2;
      const doorStartParam = door.position - halfDoorParam;
      const doorXStart = facadeX + doorStartParam * facadeWidth;

      elements.push({
        type: 'door-opening',
        x: doorXStart,
        y: 0,
        width: door.width,
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

      elements.push({
        type: 'window-opening',
        x: winXStart,
        y: win.sillHeight,
        width: win.width,
        height: win.height,
        color: '#87CEEB',
        filled: false,
      });
    }
  }

  // --- Furniture / people / trees / cars silhouettes ---
  if (furniture && furniture.length > 0) {
    for (const item of furniture) {
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
        color: '#555555',
        filled: true,
        silhouetteType: silType,
        stampId: item.stampId,
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
