import type { Point } from '@/types/geometry';
import * as vec from '@/engine/math/vector';
import { nearestPointOnSegment, segmentLength } from '@/engine/math/line';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WallLike {
  id: string;
  start: Point;
  end: Point;
  thickness: number;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Snap the cursor to the nearest wall and compute the parametric position
 * for placing a window of the given width.
 *
 * The position is clamped so the window fits entirely within the wall
 * segment (half the window width from each end). Returns `null` if no wall
 * is close enough or the wall is too short for the window.
 *
 * @param cursorPos   World-space cursor position.
 * @param walls       Available walls.
 * @param windowWidth Window width in meters.
 */
export function snapWindowToWall(
  cursorPos: Point,
  walls: WallLike[],
  windowWidth: number,
): { wallId: string; position: number } | null {
  let bestWallId: string | null = null;
  let bestT = 0;
  let bestDist = Infinity;

  for (const wall of walls) {
    const nearest = nearestPointOnSegment(cursorPos, {
      start: wall.start,
      end: wall.end,
    });

    // Use wall thickness as the basis for the snap threshold
    const snapThreshold = Math.max(wall.thickness * 2, 0.5);

    if (nearest.distance < bestDist && nearest.distance <= snapThreshold) {
      const len = segmentLength({ start: wall.start, end: wall.end });
      if (len < windowWidth) continue; // wall too short

      bestWallId = wall.id;
      bestDist = nearest.distance;

      // Clamp t so the window fits within the wall
      const halfWindowT = len > 0 ? (windowWidth / 2) / len : 0;
      bestT = Math.max(halfWindowT, Math.min(1 - halfWindowT, nearest.t));
    }
  }

  if (bestWallId === null) return null;

  return { wallId: bestWallId, position: bestT };
}

/**
 * Given a wall and a parametric position, compute the window's world-space
 * center and rotation angle (in radians).
 *
 * The angle is measured from the positive x-axis and matches the wall's
 * direction from start to end.
 */
export function getWindowWorldPosition(
  wall: { start: Point; end: Point },
  position: number,
): { center: Point; angle: number } {
  const center = vec.lerp(wall.start, wall.end, position);
  const dir = vec.sub(wall.end, wall.start);
  const angle = vec.angle(dir);

  return { center, angle };
}
