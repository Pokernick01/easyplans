import type { Point, Rect } from '@/types/geometry';
import * as vec from '@/engine/math/vector';

/**
 * Compute the area of a simple polygon using the shoelace formula.
 * Always returns a positive value regardless of winding order.
 * @param points Ordered vertices of the polygon.
 */
export function polygonArea(points: Point[]): number {
  const n = points.length;
  if (n < 3) return 0;

  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }

  return Math.abs(area) / 2;
}

/**
 * Compute the perimeter (total edge length) of a polygon.
 * The polygon is treated as closed (last point connects to first).
 * @param points Ordered vertices of the polygon.
 */
export function polygonPerimeter(points: Point[]): number {
  const n = points.length;
  if (n < 2) return 0;

  let perimeter = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    perimeter += vec.distance(points[i], points[j]);
  }

  return perimeter;
}

/**
 * Compute the centroid (geometric center) of a simple polygon.
 * @param points Ordered vertices of the polygon.
 */
export function polygonCentroid(points: Point[]): Point {
  const n = points.length;
  if (n === 0) return { x: 0, y: 0 };
  if (n === 1) return { ...points[0] };
  if (n === 2) return vec.midpoint(points[0], points[1]);

  let cx = 0;
  let cy = 0;
  let signedArea = 0;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const a = points[i];
    const b = points[j];
    const crossVal = a.x * b.y - b.x * a.y;
    cx += (a.x + b.x) * crossVal;
    cy += (a.y + b.y) * crossVal;
    signedArea += crossVal;
  }

  signedArea /= 2;

  if (Math.abs(signedArea) < 1e-12) {
    // Degenerate polygon -- fall back to average
    let sx = 0;
    let sy = 0;
    for (const p of points) {
      sx += p.x;
      sy += p.y;
    }
    return { x: sx / n, y: sy / n };
  }

  const factor = 1 / (6 * signedArea);
  return { x: cx * factor, y: cy * factor };
}

/**
 * Test whether a point lies inside a simple polygon using ray casting.
 * Points exactly on the boundary may return either true or false.
 * @param point  The test point.
 * @param polygon Ordered vertices of the polygon.
 */
export function pointInPolygon(point: Point, polygon: Point[]): boolean {
  const n = polygon.length;
  if (n < 3) return false;

  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersects =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;

    if (intersects) inside = !inside;
  }

  return inside;
}

/**
 * Compute the axis-aligned bounding box of a set of points.
 * @param points Ordered vertices of the polygon.
 */
export function polygonBounds(points: Point[]): Rect {
  if (points.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Offset (inset or outset) a simple convex polygon by a fixed distance.
 *
 * Positive `offset` grows the polygon (outset); negative shrinks it (inset).
 * Uses the bisector at each vertex to compute the new position.
 *
 * **Note:** This simplified approach works well for convex polygons and
 * mild offsets on concave ones. For large insets on concave polygons,
 * self-intersections are not resolved.
 *
 * @param points Ordered vertices of the polygon.
 * @param offset Distance to offset (positive = outward, negative = inward).
 */
export function offsetPolygon(points: Point[], offset: number): Point[] {
  const n = points.length;
  if (n < 3) return points.map((p) => ({ ...p }));

  // Determine winding direction (positive signed area = CCW)
  let signedArea = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    signedArea += points[i].x * points[j].y - points[j].x * points[i].y;
  }
  // If CW, flip offset direction so that "outward" is consistent
  const windingSign = signedArea >= 0 ? 1 : -1;

  const result: Point[] = [];

  for (let i = 0; i < n; i++) {
    const prev = points[(i - 1 + n) % n];
    const curr = points[i];
    const next = points[(i + 1) % n];

    // Edge normals (pointing outward for CCW winding)
    const e1 = vec.sub(curr, prev);
    const e2 = vec.sub(next, curr);

    const n1 = vec.normalize(vec.perpendicular(e1));
    const n2 = vec.normalize(vec.perpendicular(e2));

    // Bisector direction
    const bisector = vec.add(
      vec.scale(n1, windingSign),
      vec.scale(n2, windingSign),
    );
    const bisectorLen = vec.length(bisector);

    if (bisectorLen < 1e-12) {
      // Edges are collinear -- just push along the normal
      result.push(vec.add(curr, vec.scale(n1, offset * windingSign)));
    } else {
      const bisectorNorm = vec.scale(bisector, 1 / bisectorLen);
      // The sine of the half-angle determines how far along the bisector
      // we need to travel to achieve the desired offset.
      const sinHalfAngle = vec.dot(bisectorNorm, vec.scale(n1, windingSign));
      const dist = sinHalfAngle !== 0 ? offset / sinHalfAngle : offset;
      result.push(vec.add(curr, vec.scale(bisectorNorm, dist)));
    }
  }

  return result;
}
