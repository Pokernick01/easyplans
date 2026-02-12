import type { Point, Line } from '@/types/geometry';
import * as vec from '@/engine/math/vector';

/**
 * Find the intersection point of two infinite lines defined by segments `l1` and `l2`.
 * Returns `null` if the lines are parallel (or coincident).
 */
export function lineIntersection(l1: Line, l2: Line): Point | null {
  const d1 = vec.sub(l1.end, l1.start);
  const d2 = vec.sub(l2.end, l2.start);

  const denom = vec.cross(d1, d2);
  if (Math.abs(denom) < 1e-12) return null; // parallel

  const diff = vec.sub(l2.start, l1.start);
  const t = vec.cross(diff, d2) / denom;

  return {
    x: l1.start.x + d1.x * t,
    y: l1.start.y + d1.y * t,
  };
}

/**
 * Find the intersection point of two finite line segments.
 * Returns `null` if the segments do not intersect.
 */
export function segmentIntersection(l1: Line, l2: Line): Point | null {
  const d1 = vec.sub(l1.end, l1.start);
  const d2 = vec.sub(l2.end, l2.start);

  const denom = vec.cross(d1, d2);
  if (Math.abs(denom) < 1e-12) return null; // parallel or collinear

  const diff = vec.sub(l2.start, l1.start);
  const t1 = vec.cross(diff, d2) / denom;
  const t2 = vec.cross(diff, d1) / denom;

  if (t1 < -1e-10 || t1 > 1 + 1e-10 || t2 < -1e-10 || t2 > 1 + 1e-10) {
    return null;
  }

  return {
    x: l1.start.x + d1.x * t1,
    y: l1.start.y + d1.y * t1,
  };
}

/**
 * Perpendicular distance from a point to an infinite line defined by a segment.
 */
export function pointToLineDistance(point: Point, line: Line): number {
  const d = vec.sub(line.end, line.start);
  const len = vec.length(d);
  if (len === 0) return vec.distance(point, line.start);

  const diff = vec.sub(point, line.start);
  return Math.abs(vec.cross(diff, d)) / len;
}

/**
 * Shortest distance from a point to a finite line segment.
 */
export function pointToSegmentDistance(point: Point, line: Line): number {
  const { distance } = nearestPointOnSegment(point, line);
  return distance;
}

/**
 * Project a point onto the infinite line defined by a segment.
 * Returns the projected point and the parametric position `t`
 * (0 = start, 1 = end; can be outside [0,1]).
 */
export function projectPointOnLine(
  point: Point,
  line: Line,
): { point: Point; t: number } {
  const d = vec.sub(line.end, line.start);
  const lenSq = vec.dot(d, d);
  if (lenSq === 0) return { point: { ...line.start }, t: 0 };

  const t = vec.dot(vec.sub(point, line.start), d) / lenSq;
  return {
    point: {
      x: line.start.x + d.x * t,
      y: line.start.y + d.y * t,
    },
    t,
  };
}

/**
 * Length of a line segment.
 */
export function segmentLength(line: Line): number {
  return vec.distance(line.start, line.end);
}

/**
 * Compute a point on the segment at parametric position `t` (lerp).
 * `t = 0` returns `start`, `t = 1` returns `end`.
 */
export function pointOnSegment(line: Line, t: number): Point {
  return vec.lerp(line.start, line.end, t);
}

/**
 * Find the nearest point on a finite segment to a given point.
 * Returns the nearest point, parametric position, and distance.
 */
export function nearestPointOnSegment(
  point: Point,
  line: Line,
): { point: Point; t: number; distance: number } {
  const d = vec.sub(line.end, line.start);
  const lenSq = vec.dot(d, d);

  if (lenSq === 0) {
    // Degenerate segment (zero length)
    const dist = vec.distance(point, line.start);
    return { point: { ...line.start }, t: 0, distance: dist };
  }

  // Clamp t to [0, 1] so we stay on the finite segment
  const t = Math.max(0, Math.min(1, vec.dot(vec.sub(point, line.start), d) / lenSq));
  const closest: Point = {
    x: line.start.x + d.x * t,
    y: line.start.y + d.y * t,
  };

  return { point: closest, t, distance: vec.distance(point, closest) };
}

/**
 * Create a line offset perpendicular to the given line.
 * Positive `offset` moves the line to the left (CCW direction).
 */
export function parallelLine(line: Line, offset: number): Line {
  const d = vec.sub(line.end, line.start);
  const perp = vec.normalize(vec.perpendicular(d));
  const shift = vec.scale(perp, offset);

  return {
    start: vec.add(line.start, shift),
    end: vec.add(line.end, shift),
  };
}
