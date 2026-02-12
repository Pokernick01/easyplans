import type { Point } from '@/types/geometry';
import type { SnapResult } from '@/types/tools';
import * as vec from '@/engine/math/vector';

/**
 * Snap a point to the nearest grid intersection.
 * @param point   World-space position.
 * @param gridSize Grid cell size in the same units as point (meters).
 */
export function snapToGrid(point: Point, gridSize: number): SnapResult {
  return {
    point: {
      x: Math.round(point.x / gridSize) * gridSize,
      y: Math.round(point.y / gridSize) * gridSize,
    },
    type: 'grid',
  };
}

/**
 * Snap a line direction to the nearest angle increment.
 *
 * Given a `start` anchor and the `current` cursor position, constrains the
 * direction from `start` to `current` to the nearest multiple of `angleStep`
 * while preserving the distance.
 *
 * @param start      Anchor point (e.g. wall start).
 * @param current    Free cursor position.
 * @param angleStep  Angle increment in degrees (default 45).
 */
export function snapToAngle(
  start: Point,
  current: Point,
  angleStep: number = 45,
): SnapResult {
  const delta = vec.sub(current, start);
  const dist = vec.length(delta);

  if (dist === 0) {
    return { point: { ...current }, type: 'angle' };
  }

  const currentAngle = vec.angle(delta); // radians
  const stepRad = (angleStep * Math.PI) / 180;
  const snappedAngle = Math.round(currentAngle / stepRad) * stepRad;

  return {
    point: {
      x: start.x + Math.cos(snappedAngle) * dist,
      y: start.y + Math.sin(snappedAngle) * dist,
    },
    type: 'angle',
  };
}

/**
 * Snap to the nearest target point if it is within `threshold` distance.
 * Returns `null` if no target is close enough.
 *
 * @param point     Current cursor position.
 * @param targets   Candidate snap targets (endpoints, midpoints, etc.).
 * @param threshold Maximum snap distance.
 */
export function snapToPoint(
  point: Point,
  targets: Point[],
  threshold: number,
): SnapResult | null {
  let best: Point | null = null;
  let bestDist = Infinity;

  for (const t of targets) {
    const d = vec.distance(point, t);
    if (d < bestDist && d <= threshold) {
      bestDist = d;
      best = t;
    }
  }

  if (best === null) return null;

  return {
    point: { x: best.x, y: best.y },
    type: 'endpoint',
  };
}

/**
 * Find the best snap for a given cursor position.
 *
 * Priority order (highest to lowest):
 *   1. Endpoint / target point snap
 *   2. Angle snap (if an `angleOrigin` is provided)
 *   3. Grid snap
 *
 * @param point   Current cursor position in world space.
 * @param options Snap configuration.
 */
export function findBestSnap(
  point: Point,
  options: {
    gridSize: number;
    angleOrigin?: Point;
    targets?: Point[];
    threshold: number;
  },
): SnapResult {
  // 1. Endpoint snap (highest priority)
  if (options.targets && options.targets.length > 0) {
    const endpointSnap = snapToPoint(point, options.targets, options.threshold);
    if (endpointSnap !== null) return endpointSnap;
  }

  // 2. Angle snap
  if (options.angleOrigin) {
    const angleSnap = snapToAngle(options.angleOrigin, point);
    // Only use angle snap if the snapped point is reasonably close to the
    // original cursor position (within threshold), so we don't forcefully
    // override the user's intent when they're far from any angle line.
    const angleDist = vec.distance(point, angleSnap.point);
    if (angleDist <= options.threshold) {
      return angleSnap;
    }
    // Even when the distance to the snapped angle point is larger than
    // threshold, we still return the angle-constrained position since
    // angle snapping constrains direction rather than position.
    return angleSnap;
  }

  // 3. Grid snap (lowest priority)
  return snapToGrid(point, options.gridSize);
}
