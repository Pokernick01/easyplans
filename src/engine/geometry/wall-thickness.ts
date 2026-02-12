import type { Point } from '@/types/geometry';
import * as vec from '@/engine/math/vector';
import { lineIntersection } from '@/engine/math/line';

/**
 * Convert a wall centerline + thickness into its 4-corner outline polygon.
 *
 * The wall rectangle is formed by offsetting the centerline perpendicular
 * to both sides by `thickness / 2`.
 *
 * Returned corners are in order:
 *   [startLeft, endLeft, endRight, startRight]
 * forming a CCW polygon when the wall runs left-to-right.
 */
export function wallToPolygon(wall: {
  start: Point;
  end: Point;
  thickness: number;
}): Point[] {
  const dir = vec.sub(wall.end, wall.start);
  const perp = vec.normalize(vec.perpendicular(dir));
  const halfThick = wall.thickness / 2;
  const offset = vec.scale(perp, halfThick);

  return [
    vec.add(wall.start, offset), // start-left
    vec.add(wall.end, offset), // end-left
    vec.sub(wall.end, offset), // end-right
    vec.sub(wall.start, offset), // start-right
  ];
}

/**
 * Generate wall outline polygons with mitered joints where walls share
 * endpoints (within a small epsilon).
 *
 * For each wall, the left and right offset lines are computed. When two
 * walls share an endpoint, their offset lines are extended/trimmed to
 * meet at a miter point instead of overlapping.
 *
 * @param walls Array of wall definitions.
 * @returns One polygon (4+ corners) per wall.
 */
export function wallsToMiteredPolygons(
  walls: Array<{ start: Point; end: Point; thickness: number }>,
): Point[][] {
  const EPSILON = 0.05; // meters -- endpoint merge tolerance

  /**
   * For a given wall, compute its left and right offset lines.
   */
  function getOffsetLines(wall: {
    start: Point;
    end: Point;
    thickness: number;
  }) {
    const dir = vec.sub(wall.end, wall.start);
    const perp = vec.normalize(vec.perpendicular(dir));
    const halfThick = wall.thickness / 2;
    const offset = vec.scale(perp, halfThick);

    return {
      left: {
        start: vec.add(wall.start, offset),
        end: vec.add(wall.end, offset),
      },
      right: {
        start: vec.sub(wall.start, offset),
        end: vec.sub(wall.end, offset),
      },
    };
  }

  /**
   * Find another wall that shares the given endpoint.
   * Returns the index of the connected wall or -1.
   */
  function findConnected(
    wallIdx: number,
    endpoint: Point,
  ): { wallIdx: number; atStart: boolean } | null {
    for (let i = 0; i < walls.length; i++) {
      if (i === wallIdx) continue;
      if (vec.distance(endpoint, walls[i].start) < EPSILON) {
        return { wallIdx: i, atStart: true };
      }
      if (vec.distance(endpoint, walls[i].end) < EPSILON) {
        return { wallIdx: i, atStart: false };
      }
    }
    return null;
  }

  const result: Point[][] = [];

  for (let i = 0; i < walls.length; i++) {
    const wall = walls[i];
    const { left, right } = getOffsetLines(wall);

    // Default corners (un-mitered)
    let startLeft = left.start;
    let startRight = right.start;
    let endLeft = left.end;
    let endRight = right.end;

    // --- Miter at the START endpoint ---
    const connStart = findConnected(i, wall.start);
    if (connStart !== null) {
      const other = walls[connStart.wallIdx];
      const otherLines = getOffsetLines(other);

      // Determine which end of the other wall connects to this wall's start
      // and orient the other wall's offset lines accordingly.
      const otherLeft = connStart.atStart ? otherLines.left : {
        start: otherLines.left.end,
        end: otherLines.left.start,
      };
      const otherRight = connStart.atStart ? otherLines.right : {
        start: otherLines.right.end,
        end: otherLines.right.start,
      };

      // Miter left side
      const miterL = lineIntersection(left, otherLeft);
      if (miterL !== null) startLeft = miterL;

      // Miter right side
      const miterR = lineIntersection(right, otherRight);
      if (miterR !== null) startRight = miterR;
    }

    // --- Miter at the END endpoint ---
    const connEnd = findConnected(i, wall.end);
    if (connEnd !== null) {
      const other = walls[connEnd.wallIdx];
      const otherLines = getOffsetLines(other);

      const otherLeft = connEnd.atStart ? otherLines.left : {
        start: otherLines.left.end,
        end: otherLines.left.start,
      };
      const otherRight = connEnd.atStart ? otherLines.right : {
        start: otherLines.right.end,
        end: otherLines.right.start,
      };

      const miterL = lineIntersection(left, otherLeft);
      if (miterL !== null) endLeft = miterL;

      const miterR = lineIntersection(right, otherRight);
      if (miterR !== null) endRight = miterR;
    }

    result.push([startLeft, endLeft, endRight, startRight]);
  }

  return result;
}
