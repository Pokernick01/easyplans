import type { Point } from '@/types/geometry';

/**
 * Add two vectors component-wise.
 */
export function add(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y };
}

/**
 * Subtract vector `b` from vector `a`.
 */
export function sub(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}

/**
 * Scale a vector by a scalar.
 */
export function scale(v: Point, s: number): Point {
  return { x: v.x * s, y: v.y * s };
}

/**
 * Dot product of two 2D vectors.
 */
export function dot(a: Point, b: Point): number {
  return a.x * b.x + a.y * b.y;
}

/**
 * 2D cross product (returns the z-component scalar).
 * Positive when `b` is counter-clockwise from `a`.
 */
export function cross(a: Point, b: Point): number {
  return a.x * b.y - a.y * b.x;
}

/**
 * Euclidean length of a vector.
 */
export function length(v: Point): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

/**
 * Euclidean distance between two points.
 */
export function distance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Return a unit vector in the same direction as `v`.
 * Returns {x:0, y:0} for zero-length input.
 */
export function normalize(v: Point): Point {
  const len = length(v);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

/**
 * Linearly interpolate between two points.
 * `t = 0` returns `a`, `t = 1` returns `b`.
 */
export function lerp(a: Point, b: Point, t: number): Point {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

/**
 * Rotate a vector by `angleRad` radians around the origin.
 */
export function rotate(v: Point, angleRad: number): Point {
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);
  return {
    x: v.x * c - v.y * s,
    y: v.x * s + v.y * c,
  };
}

/**
 * Angle of a vector relative to the positive x-axis (atan2).
 * Returns radians in (-PI, PI].
 */
export function angle(v: Point): number {
  return Math.atan2(v.y, v.x);
}

/**
 * Unsigned angle between two vectors, in radians [0, PI].
 */
export function angleBetween(a: Point, b: Point): number {
  const lenA = length(a);
  const lenB = length(b);
  if (lenA === 0 || lenB === 0) return 0;
  const cosTheta = dot(a, b) / (lenA * lenB);
  // Clamp to avoid NaN from floating-point drift
  return Math.acos(Math.max(-1, Math.min(1, cosTheta)));
}

/**
 * Return the vector perpendicular to `v`, rotated 90 degrees counter-clockwise.
 */
export function perpendicular(v: Point): Point {
  return { x: -v.y, y: v.x };
}

/**
 * Midpoint between two points.
 */
export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/**
 * Check if two points are equal within a tolerance.
 * @param epsilon Comparison tolerance (default 1e-10).
 */
export function equals(a: Point, b: Point, epsilon: number = 1e-10): boolean {
  return Math.abs(a.x - b.x) <= epsilon && Math.abs(a.y - b.y) <= epsilon;
}
