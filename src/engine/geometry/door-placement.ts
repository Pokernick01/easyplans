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
 * for placing a door of the given width.
 *
 * The position is clamped so the door fits entirely within the wall segment
 * (half the door width from each end). Returns `null` if no wall is close
 * enough or the wall is too short for the door.
 *
 * @param cursorPos World-space cursor position.
 * @param walls     Available walls.
 * @param doorWidth Door width in meters.
 */
export function snapDoorToWall(
  cursorPos: Point,
  walls: WallLike[],
  doorWidth: number,
): { wallId: string; position: number } | null {
  let bestWallId: string | null = null;
  let bestT = 0;
  let bestDist = Infinity;

  for (const wall of walls) {
    const nearest = nearestPointOnSegment(cursorPos, {
      start: wall.start,
      end: wall.end,
    });

    // Use the wall thickness as the max snap distance so the cursor
    // only snaps when it is reasonably close to the wall body.
    const snapThreshold = Math.max(wall.thickness * 2, 0.5);

    if (nearest.distance < bestDist && nearest.distance <= snapThreshold) {
      const len = segmentLength({ start: wall.start, end: wall.end });
      if (len < doorWidth) continue; // wall too short

      bestWallId = wall.id;
      bestDist = nearest.distance;

      // Clamp t so the door fits within the wall
      const halfDoorT = len > 0 ? (doorWidth / 2) / len : 0;
      bestT = Math.max(halfDoorT, Math.min(1 - halfDoorT, nearest.t));
    }
  }

  if (bestWallId === null) return null;

  return { wallId: bestWallId, position: bestT };
}

/**
 * Given a wall and a parametric position, compute the door's world-space
 * center and rotation angle (in radians).
 *
 * The angle is measured from the positive x-axis and matches the wall's
 * direction from start to end.
 */
export function getDoorWorldPosition(
  wall: { start: Point; end: Point },
  position: number,
): { center: Point; angle: number } {
  const center = vec.lerp(wall.start, wall.end, position);
  const dir = vec.sub(wall.end, wall.start);
  const angle = vec.angle(dir);

  return { center, angle };
}

/**
 * Compute the swing arc parameters for a door.
 *
 * The arc describes the path traced by the door edge as it opens,
 * suitable for rendering a quarter-circle (or other angle) arc.
 *
 * @param center    Door hinge point (world space).
 * @param angle     Wall angle in radians (direction from wall start to end).
 * @param width     Door width (= arc radius).
 * @param swing     Swing direction: 'left' opens to the left side of the
 *                  wall (relative to its direction), 'right' to the right.
 * @param openAngle Opening angle in degrees (e.g. 90).
 * @returns Arc start/end angles (radians, standard math convention) and radius.
 */
export function getDoorSwingArc(
  center: Point,
  angle: number,
  width: number,
  swing: 'left' | 'right',
  openAngle: number,
): { arcStart: number; arcEnd: number; radius: number } {
  const openRad = (openAngle * Math.PI) / 180;

  // The closed position is along the wall direction
  const closedAngle = angle;

  if (swing === 'left') {
    // Door swings to the left side (CCW from wall direction)
    return {
      arcStart: closedAngle,
      arcEnd: closedAngle + openRad,
      radius: width,
    };
  } else {
    // Door swings to the right side (CW from wall direction)
    return {
      arcStart: closedAngle - openRad,
      arcEnd: closedAngle,
      radius: width,
    };
  }
}
