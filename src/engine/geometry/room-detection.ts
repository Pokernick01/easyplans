import type { Point } from '@/types/geometry';
import * as vec from '@/engine/math/vector';

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

/** A node in the planar graph (merged endpoint). */
interface GraphNode {
  id: number;
  position: Point;
  /** Indices of adjacent nodes sorted by edge angle. */
  neighbors: number[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Distance within which two endpoints are considered the same node. */
const MERGE_EPSILON = 0.05; // meters

// ---------------------------------------------------------------------------
// Graph construction helpers
// ---------------------------------------------------------------------------

/**
 * Merge nearby endpoints into unique graph nodes.
 * Returns the list of unique nodes and a mapping from each wall endpoint
 * to its node id.
 */
function buildNodes(
  walls: Array<{ id: string; start: Point; end: Point }>,
): { nodes: GraphNode[]; wallNodePairs: Array<[number, number]> } {
  const positions: Point[] = [];
  const nodes: GraphNode[] = [];

  function getOrCreateNode(p: Point): number {
    for (let i = 0; i < positions.length; i++) {
      if (vec.distance(p, positions[i]) < MERGE_EPSILON) {
        return i;
      }
    }
    const id = positions.length;
    positions.push({ x: p.x, y: p.y });
    nodes.push({ id, position: { x: p.x, y: p.y }, neighbors: [] });
    return id;
  }

  const wallNodePairs: Array<[number, number]> = [];

  for (const wall of walls) {
    const a = getOrCreateNode(wall.start);
    const b = getOrCreateNode(wall.end);
    if (a === b) {
      wallNodePairs.push([a, b]);
      continue; // degenerate wall
    }

    // Add adjacency (avoid duplicates)
    if (!nodes[a].neighbors.includes(b)) nodes[a].neighbors.push(b);
    if (!nodes[b].neighbors.includes(a)) nodes[b].neighbors.push(a);

    wallNodePairs.push([a, b]);
  }

  return { nodes, wallNodePairs };
}

/**
 * Sort each node's neighbor list by the angle of the outgoing edge,
 * measured from the positive x-axis. This ordering is essential for the
 * planar face traversal algorithm.
 */
function sortNeighborsByAngle(nodes: GraphNode[]): void {
  for (const node of nodes) {
    node.neighbors.sort((a, b) => {
      const dirA = vec.sub(nodes[a].position, node.position);
      const dirB = vec.sub(nodes[b].position, node.position);
      return vec.angle(dirA) - vec.angle(dirB);
    });
  }
}

// ---------------------------------------------------------------------------
// Planar face traversal
// ---------------------------------------------------------------------------

/**
 * Given that we arrived at `current` from `prev`, find the *next*
 * neighbor by choosing the first edge clockwise from the reverse of
 * the incoming direction.
 *
 * In a sorted-by-angle neighbor list this is the neighbor immediately
 * after the reverse incoming edge when scanning counter-clockwise,
 * which in practice means the neighbor whose angle is the next *smaller*
 * (i.e. next clockwise) from the incoming reverse angle.
 */
function nextEdgeCW(
  nodes: GraphNode[],
  prev: number,
  current: number,
): number {
  const currentNode = nodes[current];
  const neighbors = currentNode.neighbors;

  if (neighbors.length === 0) return -1;
  if (neighbors.length === 1) return neighbors[0];

  // Find `prev` in the sorted neighbor list of `current`
  const idx = neighbors.indexOf(prev);
  if (idx === -1) return neighbors[0];

  // The next clockwise edge from "incoming from prev" is the neighbor
  // just *before* prev in the CCW-sorted list (which is the CW-next).
  const nextIdx = (idx - 1 + neighbors.length) % neighbors.length;
  return neighbors[nextIdx];
}

/**
 * Trace one minimal face starting from the directed edge (from -> to).
 * Returns the ordered list of node ids forming the face.
 */
function traceFace(
  nodes: GraphNode[],
  startFrom: number,
  startTo: number,
): number[] {
  const face: number[] = [startFrom];
  let prev = startFrom;
  let current = startTo;

  const MAX_ITERS = 10000; // safety limit
  let iters = 0;

  while (iters < MAX_ITERS) {
    face.push(current);

    if (current === startFrom && prev === face[face.length - 2] && face.length > 2) {
      // Completed the cycle back to the starting directed edge
      break;
    }

    const next = nextEdgeCW(nodes, prev, current);
    if (next === -1) break; // dead end

    prev = current;
    current = next;

    // Also check simple cycle closure
    if (current === startFrom && face.length > 2) {
      face.push(current);
      break;
    }

    iters++;
  }

  return face;
}

// ---------------------------------------------------------------------------
// Cycle filtering
// ---------------------------------------------------------------------------

/**
 * Compute the signed area of a polygon defined by node indices.
 * Positive = CCW, Negative = CW.
 */
function signedArea(nodes: GraphNode[], face: number[]): number {
  let area = 0;
  const n = face.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const a = nodes[face[i]].position;
    const b = nodes[face[j]].position;
    area += a.x * b.y - b.x * a.y;
  }
  return area / 2;
}

/**
 * Convert a face (list of node ids, possibly with repeated start/end)
 * to a canonical key for deduplication.
 */
function faceKey(face: number[]): string {
  // Remove trailing duplicate of the first node if present
  let cleaned = face;
  if (cleaned.length > 1 && cleaned[cleaned.length - 1] === cleaned[0]) {
    cleaned = cleaned.slice(0, -1);
  }

  // Rotate to start at the smallest node id for canonical form
  const minVal = Math.min(...cleaned);
  const minIdx = cleaned.indexOf(minVal);
  const rotated = [...cleaned.slice(minIdx), ...cleaned.slice(0, minIdx)];

  return rotated.join(',');
}

// ---------------------------------------------------------------------------
// Wall id lookup
// ---------------------------------------------------------------------------

/**
 * Given a face (cycle of node indices) and the original wall-to-node mapping,
 * find which wall ids form the boundary of that face.
 */
function faceWallIds(
  face: number[],
  wallNodePairs: Array<[number, number]>,
  walls: Array<{ id: string }>,
): string[] {
  const ids: string[] = [];
  const cleaned =
    face.length > 1 && face[face.length - 1] === face[0]
      ? face.slice(0, -1)
      : face;

  for (let i = 0; i < cleaned.length; i++) {
    const a = cleaned[i];
    const b = cleaned[(i + 1) % cleaned.length];

    for (let w = 0; w < wallNodePairs.length; w++) {
      const [na, nb] = wallNodePairs[w];
      if ((na === a && nb === b) || (na === b && nb === a)) {
        if (!ids.includes(walls[w].id)) {
          ids.push(walls[w].id);
        }
        break;
      }
    }
  }

  return ids;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Detect enclosed rooms formed by walls.
 *
 * Algorithm overview:
 *   1. Build a planar graph by merging nearby wall endpoints.
 *   2. Sort each node's adjacency list by outgoing edge angle.
 *   3. For every directed edge, trace the minimal clockwise face.
 *   4. Deduplicate and filter faces (discard the outer boundary which
 *      has negative signed area, and degenerate faces with < 3 edges).
 *
 * @param walls Array of walls defined by id and centerline endpoints.
 * @returns Detected rooms, each with the list of contributing wall ids,
 *          the room polygon, and its area.
 */
export function detectRooms(
  walls: Array<{ id: string; start: Point; end: Point }>,
): Array<{ wallIds: string[]; polygon: Point[]; area: number }> {
  if (walls.length === 0) return [];

  // 1. Build the planar graph
  const { nodes, wallNodePairs } = buildNodes(walls);

  // Only nodes with degree >= 2 can participate in cycles
  // (but we still need the full graph for traversal, so we don't prune).

  // 2. Sort neighbors by angle
  sortNeighborsByAngle(nodes);

  // 3. Trace all minimal faces
  const visitedEdges = new Set<string>();
  const uniqueFaces = new Map<string, number[]>();

  for (const node of nodes) {
    for (const neighbor of node.neighbors) {
      const edgeKey = `${node.id}->${neighbor}`;
      if (visitedEdges.has(edgeKey)) continue;

      const face = traceFace(nodes, node.id, neighbor);

      // Mark all directed edges in this face as visited
      for (let i = 0; i < face.length - 1; i++) {
        visitedEdges.add(`${face[i]}->${face[i + 1]}`);
      }

      // Clean the face: remove the trailing duplicate start node
      let cleaned = face;
      if (cleaned.length > 1 && cleaned[cleaned.length - 1] === cleaned[0]) {
        cleaned = cleaned.slice(0, -1);
      }

      // Must be at least a triangle
      if (cleaned.length < 3) continue;

      const key = faceKey(cleaned);
      if (!uniqueFaces.has(key)) {
        uniqueFaces.set(key, cleaned);
      }
    }
  }

  // 4. Filter faces
  const rooms: Array<{ wallIds: string[]; polygon: Point[]; area: number }> =
    [];

  for (const [, face] of uniqueFaces) {
    const sa = signedArea(nodes, face);

    // Discard the outer boundary (largest CW face = most negative area)
    // and degenerate zero-area faces.
    if (sa >= 0) continue; // CCW faces are outer boundaries in our CW tracing
    // CW faces (negative signed area) are the interior rooms.

    const area = Math.abs(sa);

    // Discard tiny faces likely caused by floating-point noise
    if (area < 0.01) continue;

    const polygon = face.map((idx) => ({
      x: nodes[idx].position.x,
      y: nodes[idx].position.y,
    }));

    const wallIds = faceWallIds(face, wallNodePairs, walls);

    rooms.push({ wallIds, polygon, area });
  }

  // Sort by area ascending (smallest rooms first) for deterministic output
  rooms.sort((a, b) => a.area - b.area);

  return rooms;
}
