import type { Point } from '@/types/geometry';
import * as vec from '@/engine/math/vector';
import { nearestPointOnSegment, segmentIntersection } from '@/engine/math/line';

// ---------------------------------------------------------------------------
// Inline wall shape used across wall-ops. We do NOT import the full Wall
// interface because callers may pass lightweight objects.
// ---------------------------------------------------------------------------

interface WallLike {
  id: string;
  start: Point;
  end: Point;
  thickness: number;
}

interface FullWall extends WallLike {
  height: number;
  openings: string[];
  color: string;
  fillColor: string;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Find the wall closest to `point` (within `threshold`).
 *
 * Returns the wall id, the parametric position `t` (0..1) along the
 * centerline, and the perpendicular distance.  Returns `null` if no wall
 * is close enough.
 */
export function findWallAtPoint(
  point: Point,
  walls: WallLike[],
  threshold: number,
): { wallId: string; t: number; distance: number } | null {
  let best: { wallId: string; t: number; distance: number } | null = null;

  for (const wall of walls) {
    const nearest = nearestPointOnSegment(point, {
      start: wall.start,
      end: wall.end,
    });

    // Use half-thickness + threshold so clicks on the rendered wall body
    // still register even if the centerline is farther away.
    const effectiveThreshold = threshold + wall.thickness / 2;

    if (nearest.distance <= effectiveThreshold) {
      if (best === null || nearest.distance < best.distance) {
        best = {
          wallId: wall.id,
          t: nearest.t,
          distance: nearest.distance,
        };
      }
    }
  }

  return best;
}

/**
 * Split a wall into two new walls at a given point on its centerline.
 *
 * Both resulting walls inherit all properties from the original wall
 * except for `id` (which is deterministically derived) and `openings`
 * (cleared, since opening assignment must be recalculated).
 *
 * @returns A tuple `[wallA, wallB]` where wallA runs from the original
 *          start to `point`, and wallB from `point` to the original end.
 */
export function splitWallAtPoint(
  wall: FullWall,
  point: Point,
): [FullWall, FullWall] {
  const wallA: FullWall = {
    id: `${wall.id}_a`,
    start: { ...wall.start },
    end: { x: point.x, y: point.y },
    thickness: wall.thickness,
    height: wall.height,
    openings: [],
    color: wall.color,
    fillColor: wall.fillColor,
  };

  const wallB: FullWall = {
    id: `${wall.id}_b`,
    start: { x: point.x, y: point.y },
    end: { ...wall.end },
    thickness: wall.thickness,
    height: wall.height,
    openings: [],
    color: wall.color,
    fillColor: wall.fillColor,
  };

  return [wallA, wallB];
}

/**
 * Find all intersection points between a new wall segment and a set of
 * existing walls.
 *
 * @param newWall       The wall being drawn (centerline only).
 * @param existingWalls Existing walls to test against.
 * @returns An array of intersection records sorted by `t1` (parametric
 *          position on `newWall`).
 *
 *   - `wallId` -- id of the intersected existing wall
 *   - `point`  -- intersection point in world space
 *   - `t1`     -- parametric position on `newWall` (0..1)
 *   - `t2`     -- parametric position on the existing wall (0..1)
 */
export function findWallIntersections(
  newWall: { start: Point; end: Point },
  existingWalls: Array<{ id: string; start: Point; end: Point }>,
): Array<{ wallId: string; point: Point; t1: number; t2: number }> {
  const results: Array<{
    wallId: string;
    point: Point;
    t1: number;
    t2: number;
  }> = [];

  const d1 = vec.sub(newWall.end, newWall.start);
  const lenSq1 = vec.dot(d1, d1);

  for (const wall of existingWalls) {
    const pt = segmentIntersection(
      { start: newWall.start, end: newWall.end },
      { start: wall.start, end: wall.end },
    );

    if (pt === null) continue;

    // Compute parametric positions
    const t1 =
      lenSq1 > 0
        ? vec.dot(vec.sub(pt, newWall.start), d1) / lenSq1
        : 0;

    const d2 = vec.sub(wall.end, wall.start);
    const lenSq2 = vec.dot(d2, d2);
    const t2 =
      lenSq2 > 0
        ? vec.dot(vec.sub(pt, wall.start), d2) / lenSq2
        : 0;

    results.push({ wallId: wall.id, point: pt, t1, t2 });
  }

  // Sort by parametric position on the new wall
  results.sort((a, b) => a.t1 - b.t1);

  return results;
}
