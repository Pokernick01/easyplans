import type { Point } from '@/types/geometry';
import type { Wall, Door, Window, Room, FurnitureItem, Stair } from '@/types/elements';
import { wallToPolygon } from '@/engine/geometry/wall-thickness';
import { classifyStamp, elevationHeight } from '@/engine/views/neufert-elevation';

// ---------------------------------------------------------------------------
// Isometric face -- a single projected polygon for the 3D view
// ---------------------------------------------------------------------------

export interface IsoFace {
  /** 2D projected polygon points (screen coordinates in meters). */
  points: Point[];
  /** Fill color for this face. */
  color: string;
  /** Depth value for painter's-algorithm sorting (higher = further). */
  depth: number;
  /** Face type for styling. */
  type:
    | 'wall-front'
    | 'wall-side'
    | 'wall-top'
    | 'floor'
    | 'roof'
    | 'door-opening'
    | 'window-opening'
    | 'window-glass'
    | 'furniture-box'
    | 'stair-tread'
    | 'stair-riser'
    | 'stair-landing'
    | 'door-leaf'
    | 'window-frame';
}

const FACE_SORT_PRIORITY: Record<IsoFace['type'], number> = {
  floor: 0,
  'wall-side': 1,
  'wall-front': 2,
  'door-opening': 3,
  'window-opening': 4,
  'window-glass': 5,
  'wall-top': 6,
  roof: 7,
  'furniture-box': 8,
  'stair-riser': 9,
  'stair-landing': 10,
  'stair-tread': 11,
  'window-frame': 12,
  'door-leaf': 13,
};

function polygonArea2D(points: Point[]): number {
  if (points.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

// ---------------------------------------------------------------------------
// Isometric projection
// ---------------------------------------------------------------------------

/**
 * Project a 3D point (x, y, z) into 2D screen coordinates using
 * an orbital camera with azimuth (horizontal rotation) and elevation
 * (vertical tilt) angles.
 *
 * @param rotationDeg   Azimuth rotation in degrees around the vertical (Z) axis.
 * @param elevationDeg  Elevation angle in degrees (0 = side view, 90 = top-down).
 *                      Default 30 = standard isometric angle.
 */
export function isoProject(x: number, y: number, z: number, rotationDeg = 0, elevationDeg = 30): Point {
  // 1. Rotate around the Z axis (azimuth)
  const azRad = (rotationDeg * Math.PI) / 180;
  const cosAz = Math.cos(azRad);
  const sinAz = Math.sin(azRad);
  const rx = x * cosAz - y * sinAz;
  const ry = x * sinAz + y * cosAz;

  // 2. Apply elevation tilt (orbital camera looking down)
  const elRad = (elevationDeg * Math.PI) / 180;
  const cosEl = Math.cos(elRad);
  const sinEl = Math.sin(elRad);

  // Screen X = rotated X (horizontal)
  // Screen Y = rotated Y projected by elevation + Z projected by elevation
  return {
    x: rx,
    y: ry * sinEl - z * cosEl,
  };
}

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

/**
 * Parse a CSS hex color (#RRGGBB or #RGB) into [r, g, b].
 */
function parseHex(hex: string): [number, number, number] {
  let r = 0;
  let g = 0;
  let b = 0;
  const h = hex.replace('#', '');
  if (h.length === 3) {
    r = parseInt(h[0] + h[0], 16);
    g = parseInt(h[1] + h[1], 16);
    b = parseInt(h[2] + h[2], 16);
  } else if (h.length >= 6) {
    r = parseInt(h.substring(0, 2), 16);
    g = parseInt(h.substring(2, 4), 16);
    b = parseInt(h.substring(4, 6), 16);
  }
  return [r, g, b];
}

/**
 * Apply a brightness factor to a hex color.
 * factor > 1 = lighter, factor < 1 = darker.
 */
function adjustBrightness(hex: string, factor: number): string {
  const [r, g, b] = parseHex(hex);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `rgb(${clamp(r * factor)},${clamp(g * factor)},${clamp(b * factor)})`;
}

/**
 * Parse an rgba(...) string and return a solid hex-ish rgb string.
 * Falls back to the input if parsing fails.
 */
function solidifyColor(color: string): string {
  const match = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (match) {
    return `rgb(${match[1]},${match[2]},${match[3]})`;
  }
  return color;
}

// ---------------------------------------------------------------------------
// Average depth of a set of 3D points
// ---------------------------------------------------------------------------

function averageDepth(pts: Array<{ x: number; y: number; z: number }>, rotationDeg = 0, elevationDeg = 30): number {
  const azRad = (rotationDeg * Math.PI) / 180;
  const cosAz = Math.cos(azRad);
  const sinAz = Math.sin(azRad);
  const elRad = (elevationDeg * Math.PI) / 180;
  const cosEl = Math.cos(elRad);
  const sinEl = Math.sin(elRad);
  let sum = 0;
  for (const p of pts) {
    // Rotate around Z axis, then compute depth along the view direction
    const ry = p.x * sinAz + p.y * cosAz;
    sum += ry * cosEl + p.z * sinEl;
  }
  return sum / pts.length;
}

// ---------------------------------------------------------------------------
// Helper: interpolate a point along a wall's centerline
// ---------------------------------------------------------------------------

/**
 * Get a 2D point at parametric position `t` (0..1) along a wall centerline.
 */
function lerpWallCenter(wall: Wall, t: number): Point {
  return {
    x: wall.start.x + (wall.end.x - wall.start.x) * t,
    y: wall.start.y + (wall.end.y - wall.start.y) * t,
  };
}

/**
 * Wall centerline length in meters.
 */
function wallLength(wall: Wall): number {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Unit perpendicular vector for a wall (left-hand side).
 */
function wallPerp(wall: Wall): Point {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return { x: 0, y: 0 };
  return { x: -dy / len, y: dx / len };
}

/**
 * Generate a 3D quad (4 corners) on the wall's front face at a given
 * parametric range [tStart, tEnd] and vertical range [zBottom, zTop].
 *
 * The quad sits on the "left" offset side of the wall (front face).
 */
function wallFaceQuad(
  wall: Wall,
  tStart: number,
  tEnd: number,
  zBottom: number,
  zTop: number,
): Array<{ x: number; y: number; z: number }> {
  const perp = wallPerp(wall);
  const halfThick = wall.thickness / 2;

  const cStart = lerpWallCenter(wall, tStart);
  const cEnd = lerpWallCenter(wall, tEnd);

  // Left-side offset (front face)
  const bl = { x: cStart.x + perp.x * halfThick, y: cStart.y + perp.y * halfThick, z: zBottom };
  const br = { x: cEnd.x + perp.x * halfThick, y: cEnd.y + perp.y * halfThick, z: zBottom };
  const tr = { x: cEnd.x + perp.x * halfThick, y: cEnd.y + perp.y * halfThick, z: zTop };
  const tl = { x: cStart.x + perp.x * halfThick, y: cStart.y + perp.y * halfThick, z: zTop };

  return [bl, br, tr, tl];
}

/**
 * Same as wallFaceQuad but on the "right" offset side (back face).
 */
function wallBackFaceQuad(
  wall: Wall,
  tStart: number,
  tEnd: number,
  zBottom: number,
  zTop: number,
): Array<{ x: number; y: number; z: number }> {
  const perp = wallPerp(wall);
  const halfThick = wall.thickness / 2;

  const cStart = lerpWallCenter(wall, tStart);
  const cEnd = lerpWallCenter(wall, tEnd);

  // Right-side offset (back face)
  const bl = { x: cStart.x - perp.x * halfThick, y: cStart.y - perp.y * halfThick, z: zBottom };
  const br = { x: cEnd.x - perp.x * halfThick, y: cEnd.y - perp.y * halfThick, z: zBottom };
  const tr = { x: cEnd.x - perp.x * halfThick, y: cEnd.y - perp.y * halfThick, z: zTop };
  const tl = { x: cStart.x - perp.x * halfThick, y: cStart.y - perp.y * halfThick, z: zTop };

  return [bl, br, tr, tl];
}

// ---------------------------------------------------------------------------
// Wall pattern color tweaks
// ---------------------------------------------------------------------------

function wallPatternTint(baseColor: string, pattern?: string): string {
  if (!pattern || pattern === 'solid') return baseColor;
  const tints: Record<string, (r: number, g: number, b: number) => [number, number, number]> = {
    brick: (r, g, b) => [Math.min(255, r + 40), Math.min(255, g + 10), Math.max(0, b - 20)],
    concrete: (r, g, b) => [r + 15, g + 15, b + 15],
    stone: (r, g, b) => [r + 25, g + 20, b + 10],
    hatch: (r, g, b) => [Math.max(0, r - 20), Math.max(0, g - 20), Math.max(0, b - 20)],
    crosshatch: (r, g, b) => [Math.max(0, r - 30), Math.max(0, g - 30), Math.max(0, b - 30)],
    drywall: (r, g, b) => [r + 30, g + 28, b + 25],
    block: (r, g, b) => [r + 10, g + 8, b + 5],
    stucco: (r, g, b) => [r + 35, g + 32, b + 25],
    plaster: (r, g, b) => [r + 35, g + 33, b + 28],
  };
  const [r, g, b] = parseHex(baseColor);
  const tintFn = tints[pattern];
  if (!tintFn) return baseColor;
  const [tr, tg, tb] = tintFn(r, g, b);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `rgb(${clamp(tr)},${clamp(tg)},${clamp(tb)})`;
}

// ---------------------------------------------------------------------------
// Stair helpers
// ---------------------------------------------------------------------------

/**
 * Transform a local stair coordinate (lx, ly, lz) to world 3D coordinates,
 * respecting the stair's position, rotation, and flip axes.
 */
function stairLocalToWorld(
  stair: Stair,
  lx: number,
  ly: number,
  lz: number,
): { x: number; y: number; z: number } {
  const fx = stair.flipH ? stair.width - lx : lx;
  const fy = stair.flipV ? stair.length - ly : ly;
  const rad = (stair.rotation * Math.PI) / 180;
  const cosA = Math.cos(rad);
  const sinA = Math.sin(rad);
  return {
    x: stair.position.x + fx * cosA - fy * sinA,
    y: stair.position.y + fx * sinA + fy * cosA,
    z: lz,
  };
}

/**
 * Generate stair faces for a single straight-run segment in the stair's
 * local coordinate system.
 *
 * @param swLocalX Start X in local coords (width axis).
 * @param ewLocalX End X in local coords.
 * @param slLocalY Start Y in local coords (length/travel axis).
 * @param elLocalY End Y in local coords.
 * @param zBottom  Base height (Z) of the segment.
 * @param steps    Number of treads in this segment.
 * @param baseColor Base hex colour for the stair material.
 */
function generateStraightStairSegment(
  stair: Stair,
  swLocalX: number,
  ewLocalX: number,
  slLocalY: number,
  elLocalY: number,
  zBottom: number,
  steps: number,
  baseColor: string,
  rotationDeg: number,
  elevationDeg: number,
): IsoFace[] {
  const faces: IsoFace[] = [];
  if (steps <= 0) return faces;

  const rh = stair.riserHeight;
  const segmentLen = Math.abs(elLocalY - slLocalY);
  const treadDepth = segmentLen / steps;
  const yDir = elLocalY > slLocalY ? 1 : -1;

  for (let i = 0; i < steps; i++) {
    const zStepBottom = zBottom + i * rh;
    const zStepTop = zBottom + (i + 1) * rh;
    const yA = slLocalY + i * treadDepth * yDir;
    const yB = yDir > 0 ? Math.min(yA + treadDepth, elLocalY) : Math.max(yA + treadDepth * yDir, elLocalY);

    // 4 bottom corners (local)
    const botLocal = [
      { x: swLocalX, y: yA, z: zStepBottom },
      { x: ewLocalX, y: yA, z: zStepBottom },
      { x: ewLocalX, y: yB, z: zStepBottom },
      { x: swLocalX, y: yB, z: zStepBottom },
    ];
    const topLocal = [
      { x: swLocalX, y: yA, z: zStepTop },
      { x: ewLocalX, y: yA, z: zStepTop },
      { x: ewLocalX, y: yB, z: zStepTop },
      { x: swLocalX, y: yB, z: zStepTop },
    ];

    const toWorld = (p: { x: number; y: number; z: number }) =>
      stairLocalToWorld(stair, p.x, p.y, p.z);

    const top3D = topLocal.map(toWorld);

    // Tread (top face)
    faces.push({
      points: top3D.map((p) => isoProject(p.x, p.y, p.z, rotationDeg, elevationDeg)),
      color: adjustBrightness(baseColor, 1.25),
      depth: averageDepth(top3D, rotationDeg, elevationDeg),
      type: 'stair-tread',
    });

    // Riser faces (front/back, vertical faces along Y direction)
    // Front riser (at yA, facing +Y if yDir > 0 else -Y)
    const riserFront = yDir > 0
      ? [botLocal[1], botLocal[0], topLocal[0], topLocal[1]]
      : [botLocal[0], botLocal[1], topLocal[1], topLocal[0]];
    const rf3D = riserFront.map(toWorld);
    faces.push({
      points: rf3D.map((p) => isoProject(p.x, p.y, p.z, rotationDeg, elevationDeg)),
      color: adjustBrightness(baseColor, 0.85),
      depth: averageDepth(rf3D, rotationDeg, elevationDeg),
      type: 'stair-riser',
    });

    // Back riser (at yB)
    const riserBack = yDir > 0
      ? [botLocal[3], botLocal[2], topLocal[2], topLocal[3]]
      : [botLocal[2], botLocal[3], topLocal[3], topLocal[2]];
    const rb3D = riserBack.map(toWorld);
    faces.push({
      points: rb3D.map((p) => isoProject(p.x, p.y, p.z, rotationDeg, elevationDeg)),
      color: adjustBrightness(baseColor, 0.9),
      depth: averageDepth(rb3D, rotationDeg, elevationDeg),
      type: 'stair-riser',
    });

    // Side faces (perpendicular to travel, along X)
    if (i === 0) {
      const sQuad = [
        { x: swLocalX, y: slLocalY, z: zBottom },
        { x: swLocalX, y: elLocalY, z: zBottom },
        { x: swLocalX, y: elLocalY, z: zBottom + steps * rh },
        { x: swLocalX, y: slLocalY, z: zBottom + steps * rh },
      ].map(toWorld);
      faces.push({
        points: sQuad.map((p) => isoProject(p.x, p.y, p.z, rotationDeg, elevationDeg)),
        color: adjustBrightness(baseColor, 0.65),
        depth: averageDepth(sQuad, rotationDeg, elevationDeg),
        type: 'stair-riser',
      });
    }
    if (i === steps - 1) {
      const eQuad = [
        { x: ewLocalX, y: slLocalY, z: zBottom },
        { x: ewLocalX, y: elLocalY, z: zBottom },
        { x: ewLocalX, y: elLocalY, z: zBottom + steps * rh },
        { x: ewLocalX, y: slLocalY, z: zBottom + steps * rh },
      ].map(toWorld);
      faces.push({
        points: eQuad.map((p) => isoProject(p.x, p.y, p.z, rotationDeg, elevationDeg)),
        color: adjustBrightness(baseColor, 0.68),
        depth: averageDepth(eQuad, rotationDeg, elevationDeg),
        type: 'stair-riser',
      });
    }
  }

  return faces;
}

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------

/**
 * Generate isometric 3D view data by extruding walls upward and
 * projecting everything using the standard isometric transform.
 *
 * @param walls       Walls to extrude and project.
 * @param doors       Doors (used to cut openings in walls).
 * @param windows     Windows (used to cut openings in walls).
 * @param rooms       Rooms (drawn as floor polygons).
 * @param floorHeight Floor-to-floor height in meters.
 * @param rotationDeg  Azimuth rotation angle in degrees around the vertical axis.
 * @param furniture    Furniture items rendered as simple extruded boxes.
 * @param elevationDeg Elevation tilt angle in degrees (default 30 = isometric).
 * @returns Sorted array of IsoFace objects (back-to-front).
 */
export function generateIsometricView(
  walls: Wall[],
  doors: Door[],
  windows: Window[],
  rooms: Room[],
  floorHeight: number,
  rotationDeg = 0,
  furniture: FurnitureItem[] = [],
  elevationDeg = 30,
  stairs: Stair[] = [],
): IsoFace[] {
  const faces: IsoFace[] = [];

  // Build wall lookup by ID for opening placement
  const wallById = new Map<string, Wall>();
  for (const wall of walls) {
    wallById.set(wall.id, wall);
  }

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

  // -----------------------------------------------------------------------
  // Room floor polygons
  // -----------------------------------------------------------------------

  for (const room of rooms) {
    if (room.polygon.length < 3) continue;

    const projectedPoints = room.polygon.map((p) => isoProject(p.x, p.y, 0, rotationDeg, elevationDeg));
    const depthPts = room.polygon.map((p) => ({ x: p.x, y: p.y, z: 0 }));

    faces.push({
      points: projectedPoints,
      color: solidifyColor(room.color),
      depth: averageDepth(depthPts, rotationDeg, elevationDeg),
      type: 'floor',
    });
  }

  // -----------------------------------------------------------------------
  // Walls
  // -----------------------------------------------------------------------

  for (const wall of walls) {
    const baseFillColor = wall.fillColor ?? '#d3d3d3';
    const baseColor = wallPatternTint(baseFillColor, wall.fillPattern);

    // Get the 4-corner floor polygon from wall-thickness utility
    // Order: [startLeft, endLeft, endRight, startRight]
    const corners = wallToPolygon(wall);
    if (corners.length < 4) continue;

    const [sL, eL, eR, sR] = corners;
    const wallH = wall.height;

    // 3D corners at bottom (z = 0) and top (z = wallH)
    const bottom3D = [
      { x: sL.x, y: sL.y, z: 0 },
      { x: eL.x, y: eL.y, z: 0 },
      { x: eR.x, y: eR.y, z: 0 },
      { x: sR.x, y: sR.y, z: 0 },
    ];

    const top3D = [
      { x: sL.x, y: sL.y, z: wallH },
      { x: eL.x, y: eL.y, z: wallH },
      { x: eR.x, y: eR.y, z: wallH },
      { x: sR.x, y: sR.y, z: wallH },
    ];

    // ----- Top face -----
    const topFace: IsoFace = {
      points: top3D.map((p) => isoProject(p.x, p.y, p.z, rotationDeg, elevationDeg)),
      color: adjustBrightness(baseColor, 1.3),
      depth: averageDepth(top3D, rotationDeg, elevationDeg),
      type: 'wall-top',
    };
    faces.push(topFace);

    // ----- Front face (startLeft -> endLeft, bottom to top) -----
    const frontPts3D = [bottom3D[0], bottom3D[1], top3D[1], top3D[0]];
    faces.push({
      points: frontPts3D.map((p) => isoProject(p.x, p.y, p.z, rotationDeg, elevationDeg)),
      color: adjustBrightness(baseColor, 1.0),
      depth: averageDepth(frontPts3D, rotationDeg, elevationDeg),
      type: 'wall-front',
    });

    // ----- Back face (endRight -> startRight, bottom to top) -----
    const backPts3D = [bottom3D[2], bottom3D[3], top3D[3], top3D[2]];
    faces.push({
      points: backPts3D.map((p) => isoProject(p.x, p.y, p.z, rotationDeg, elevationDeg)),
      color: adjustBrightness(baseColor, 0.9),
      depth: averageDepth(backPts3D, rotationDeg, elevationDeg),
      type: 'wall-front',
    });

    // ----- Left side face (startRight -> startLeft, bottom to top) -----
    const leftPts3D = [bottom3D[3], bottom3D[0], top3D[0], top3D[3]];
    faces.push({
      points: leftPts3D.map((p) => isoProject(p.x, p.y, p.z, rotationDeg, elevationDeg)),
      color: adjustBrightness(baseColor, 0.7),
      depth: averageDepth(leftPts3D, rotationDeg, elevationDeg),
      type: 'wall-side',
    });

    // ----- Right side face (endLeft -> endRight, bottom to top) -----
    const rightPts3D = [bottom3D[1], bottom3D[2], top3D[2], top3D[1]];
    faces.push({
      points: rightPts3D.map((p) => isoProject(p.x, p.y, p.z, rotationDeg, elevationDeg)),
      color: adjustBrightness(baseColor, 0.7),
      depth: averageDepth(rightPts3D, rotationDeg, elevationDeg),
      type: 'wall-side',
    });
  }

  // -----------------------------------------------------------------------
  // Door openings + leaf rendering
  // -----------------------------------------------------------------------

  for (const door of doors) {
    const wall = wallById.get(door.wallId);
    if (!wall) continue;

    const wLen = wallLength(wall);
    if (wLen === 0) continue;

    const halfDoorT = (door.width / 2) / wLen;
    const tStart = Math.max(0, door.position - halfDoorT);
    const tEnd = Math.min(1, door.position + halfDoorT);

    const doorH = door.height ?? 2.1;
    const zBottom = 0;
    const zTop = Math.min(doorH, wall.height);

    // Front face opening
    const frontQuad = wallFaceQuad(wall, tStart, tEnd, zBottom, zTop);
    faces.push({
      points: frontQuad.map((p) => isoProject(p.x, p.y, p.z, rotationDeg, elevationDeg)),
      color: 'rgb(40,35,30)',
      depth: averageDepth(frontQuad, rotationDeg, elevationDeg) + 0.001,
      type: 'door-opening',
    });

    // Back face opening
    const backQuad = wallBackFaceQuad(wall, tStart, tEnd, zBottom, zTop);
    faces.push({
      points: backQuad.map((p) => isoProject(p.x, p.y, p.z, rotationDeg, elevationDeg)),
      color: 'rgb(40,35,30)',
      depth: averageDepth(backQuad, rotationDeg, elevationDeg) + 0.001,
      type: 'door-opening',
    });

    // --- Door leaf rendering ---
    const style = door.doorStyle || 'single';
    if (style === 'pocket') continue; // pocket doors hidden in wall

    const perp = wallPerp(wall);
    const halfThick = wall.thickness / 2;
    const leafThickness = 0.04;
    const leafColor = '#c8b896';

    // Hinge side (front face = left side of wall centerline, back face = right side)
    const hingeSign = door.hinge === 'start' ? 1 : -1; // +1=hinge at tStart, -1=hinge at tEnd

    const hingeT = door.hinge === 'start' ? tStart : tEnd;
    const openRad = ((door.openAngle ?? 90) * Math.PI) / 180;

    // Determine if leaf should be on front or back face
    const leafOnFront = (door.swing === 'right') !== (door.flipSide === true);
    const faceSign = leafOnFront ? 1 : -1;

    if (style === 'single' || style === 'double') {
      const leafCount = style === 'double' ? 2 : 1;
      for (let l = 0; l < leafCount; l++) {
        // Hinge is at the inner edge for double doors
        const leafHingeCenter = lerpWallCenter(wall, l === 0 ? tStart : tEnd);
        // Free edge extends along wall from hinge and swings outward
        const extendDir = l === 0 ? 1 : -1; // which way along the wall the leaf extends
        const leafFreeCenter = lerpWallCenter(wall, hingeT + extendDir * leafW / wLen);

        // Rotate free edge by openAngle around hinge
        const vx = leafFreeCenter.x - leafHingeCenter.x;
        const vy = leafFreeCenter.y - leafHingeCenter.y;
        const cosA = Math.cos(openRad * (hingeSign * extendDir > 0 ? 1 : -1) * faceSign);
        const sinA = Math.sin(openRad * (hingeSign * extendDir > 0 ? 1 : -1) * faceSign);
        const rvx = vx * cosA - vy * sinA;
        const rvy = vx * sinA + vy * cosA;

        const leafCorners3D = [
          { x: leafHingeCenter.x + perp.x * halfThick * faceSign, y: leafHingeCenter.y + perp.y * halfThick * faceSign, z: zBottom },
          { x: leafHingeCenter.x + rvx + perp.x * halfThick * faceSign, y: leafHingeCenter.y + rvy + perp.y * halfThick * faceSign, z: zBottom },
          { x: leafHingeCenter.x + rvx + perp.x * halfThick * faceSign, y: leafHingeCenter.y + rvy + perp.y * halfThick * faceSign, z: zTop },
          { x: leafHingeCenter.x + perp.x * halfThick * faceSign, y: leafHingeCenter.y + perp.y * halfThick * faceSign, z: zTop },
        ];
        // Additional thickness (back of leaf)
        const leafThickDir = faceSign > 0 ? -leafThickness : leafThickness;
        const leafBack3D = leafCorners3D.map((c) => ({
          x: c.x + perp.x * leafThickDir,
          y: c.y + perp.y * leafThickDir,
          z: c.z,
        }));

        // Front face of leaf
        faces.push({
          points: leafCorners3D.map((p) => isoProject(p.x, p.y, p.z, rotationDeg, elevationDeg)),
          color: adjustBrightness(leafColor, 1.1),
          depth: averageDepth(leafCorners3D, rotationDeg, elevationDeg) + 0.002,
          type: 'door-leaf',
        });
        // Side edges of leaf
        for (let si = 0; si < 4; si++) {
          const sidePts = [leafCorners3D[si], leafCorners3D[(si + 1) % 4], leafBack3D[(si + 1) % 4], leafBack3D[si]];
          faces.push({
            points: sidePts.map((p) => isoProject(p.x, p.y, p.z, rotationDeg, elevationDeg)),
            color: adjustBrightness(leafColor, 0.85),
            depth: averageDepth(sidePts, rotationDeg, elevationDeg) + 0.002,
            type: 'door-leaf',
          });
        }
      }
    } else if (style === 'sliding') {
      // Sliding door: leaf offset to one side, parallel to wall
      const slideOffset = 0.3;
      const slideDir = door.flipSide ? -slideOffset : slideOffset;
      const leafBot3D = [
        { x: lerpWallCenter(wall, tStart).x + perp.x * slideDir, y: lerpWallCenter(wall, tStart).y + perp.y * slideDir, z: zBottom },
        { x: lerpWallCenter(wall, tEnd).x + perp.x * slideDir, y: lerpWallCenter(wall, tEnd).y + perp.y * slideDir, z: zBottom },
        { x: lerpWallCenter(wall, tEnd).x + perp.x * slideDir, y: lerpWallCenter(wall, tEnd).y + perp.y * slideDir, z: zTop },
        { x: lerpWallCenter(wall, tStart).x + perp.x * slideDir, y: lerpWallCenter(wall, tStart).y + perp.y * slideDir, z: zTop },
      ];
      const leafTop3D = leafBot3D.map((p) => ({ x: p.x + perp.x * leafThickness * (slideDir > 0 ? 1 : -1), y: p.y + perp.y * leafThickness * (slideDir > 0 ? 1 : -1), z: p.z }));
      faces.push({
        points: leafTop3D.map((p) => isoProject(p.x, p.y, p.z, rotationDeg, elevationDeg)),
        color: adjustBrightness(leafColor, 1.1),
        depth: averageDepth(leafTop3D, rotationDeg, elevationDeg) + 0.002,
        type: 'door-leaf',
      });
    } else if (style === 'folding') {
      // Folding door: two panels, half width each, hinged in middle
      for (let p = 0; p < 2; p++) {
        const panelMid = (tStart + tEnd) / 2;
        const panelT = p === 0 ? tStart : tEnd;
        const panelMidPt = lerpWallCenter(wall, panelMid);
        const panelTpt = lerpWallCenter(wall, panelT);
        const foldSign = p === 0 ? -1 : 1;
        const foldPt = {
          x: panelMidPt.x + perp.x * halfThick * foldSign,
          y: panelMidPt.y + perp.y * halfThick * foldSign,
        };
        const panelBot3D = [
          { x: panelTpt.x + perp.x * halfThick * faceSign, y: panelTpt.y + perp.y * halfThick * faceSign, z: zBottom },
          foldPt, // same zBottom
          { ...foldPt, z: zTop },
          { x: panelTpt.x + perp.x * halfThick * faceSign, y: panelTpt.y + perp.y * halfThick * faceSign, z: zTop },
        ];
        faces.push({
          points: panelBot3D.map((p) => isoProject(p.x, p.y, p.z, rotationDeg, elevationDeg)),
          color: adjustBrightness(leafColor, 1.1),
          depth: averageDepth(panelBot3D, rotationDeg, elevationDeg) + 0.002,
          type: 'door-leaf',
        });
      }
    } else if (style === 'revolving') {
      // Revolving door: X-shaped quadrants in a cylinder
      const revC = lerpWallCenter(wall, door.position);
      const revR = door.width / 2;
      const hubZBottom = zBottom + 0.05;
      const hubZTop = zTop - 0.05;
      // 4 vanes at 90° intervals
      for (let v = 0; v < 4; v++) {
        const a = (v * Math.PI) / 2;
        const cosA = Math.cos(a);
        const sinA = Math.sin(a);
        const vBot3D = [
          { x: revC.x - cosA * revR, y: revC.y - sinA * revR, z: hubZBottom },
          { x: revC.x + cosA * revR, y: revC.y + sinA * revR, z: hubZBottom },
          { x: revC.x + cosA * revR, y: revC.y + sinA * revR, z: hubZTop },
          { x: revC.x - cosA * revR, y: revC.y - sinA * revR, z: hubZTop },
        ];
        faces.push({
          points: vBot3D.map((p) => isoProject(p.x, p.y, p.z, rotationDeg, elevationDeg)),
          color: adjustBrightness(leafColor, 1.0),
          depth: averageDepth(vBot3D, rotationDeg, elevationDeg) + 0.002,
          type: 'door-leaf',
        });
      }
    }
  }

  // -----------------------------------------------------------------------
  // Window openings -- light blue glass panes overlaid on wall faces
  // -----------------------------------------------------------------------

  for (const win of windows) {
    const wall = wallById.get(win.wallId);
    if (!wall) continue;

    const wLen = wallLength(wall);
    if (wLen === 0) continue;

    // Parametric extent of the window along the wall
    const halfWinT = (win.width / 2) / wLen;
    const tStart = Math.max(0, win.position - halfWinT);
    const tEnd = Math.min(1, win.position + halfWinT);

    const sillH = win.sillHeight ?? 0.9;
    const winH = win.height ?? 1.2;
    const zBottom = sillH;
    const zTop = Math.min(sillH + winH, wall.height);

    // Dark opening frame on front face
    const frontOpeningQuad = wallFaceQuad(wall, tStart, tEnd, zBottom, zTop);
    faces.push({
      points: frontOpeningQuad.map((p) => isoProject(p.x, p.y, p.z, rotationDeg, elevationDeg)),
      color: 'rgb(50,45,40)',
      depth: averageDepth(frontOpeningQuad, rotationDeg, elevationDeg) + 0.001,
      type: 'window-opening',
    });

    // Glass pane -- sits at the wall centerline (between front and back)
    const cStart = lerpWallCenter(wall, tStart);
    const cEnd = lerpWallCenter(wall, tEnd);
    const glassQuad = [
      { x: cStart.x, y: cStart.y, z: zBottom },
      { x: cEnd.x, y: cEnd.y, z: zBottom },
      { x: cEnd.x, y: cEnd.y, z: zTop },
      { x: cStart.x, y: cStart.y, z: zTop },
    ];
    faces.push({
      points: glassQuad.map((p) => isoProject(p.x, p.y, p.z, rotationDeg, elevationDeg)),
      color: 'rgba(140,200,230,0.5)',
      depth: averageDepth(glassQuad, rotationDeg, elevationDeg) + 0.0005,
      type: 'window-glass',
    });

    // Dark opening on back face
    const backOpeningQuad = wallBackFaceQuad(wall, tStart, tEnd, zBottom, zTop);
    faces.push({
      points: backOpeningQuad.map((p) => isoProject(p.x, p.y, p.z, rotationDeg, elevationDeg)),
      color: 'rgb(50,45,40)',
      depth: averageDepth(backOpeningQuad, rotationDeg, elevationDeg) + 0.001,
      type: 'window-opening',
    });

    // --- Window frame details based on style ---
    const frameDepth = 0.002;
    const midT = (tStart + tEnd) / 2;
    const frameColor = 'rgb(80,75,70)';

    // Frame border (thin rectangle around glass on both faces)
    const fStart = lerpWallCenter(wall, tStart);
    const fEnd = lerpWallCenter(wall, tEnd);
    const dxW = (wall.end.x - wall.start.x) / wLen;
    const dyW = (wall.end.y - wall.start.y) / wLen;

    const style = win.windowStyle || 'single';

    // Top frame strip
    const frameTop3D = [
      { x: fStart.x + perp.x * halfThick, y: fStart.y + perp.y * halfThick, z: zTop - 0.02 },
      { x: fEnd.x + perp.x * halfThick, y: fEnd.y + perp.y * halfThick, z: zTop - 0.02 },
      { x: fEnd.x + perp.x * halfThick, y: fEnd.y + perp.y * halfThick, z: zTop },
      { x: fStart.x + perp.x * halfThick, y: fStart.y + perp.y * halfThick, z: zTop },
    ];
    // Bottom frame strip
    const frameBot3D = [
      { x: fStart.x + perp.x * halfThick, y: fStart.y + perp.y * halfThick, z: zBottom },
      { x: fEnd.x + perp.x * halfThick, y: fEnd.y + perp.y * halfThick, z: zBottom },
      { x: fEnd.x + perp.x * halfThick, y: fEnd.y + perp.y * halfThick, z: zBottom + 0.02 },
      { x: fStart.x + perp.x * halfThick, y: fStart.y + perp.y * halfThick, z: zBottom + 0.02 },
    ];

    faces.push({
      points: frameTop3D.map((p) => isoProject(p.x, p.y, p.z, rotationDeg, elevationDeg)),
      color: frameColor,
      depth: averageDepth(frameTop3D, rotationDeg, elevationDeg) + frameDepth,
      type: 'window-frame',
    });
    faces.push({
      points: frameBot3D.map((p) => isoProject(p.x, p.y, p.z, rotationDeg, elevationDeg)),
      color: frameColor,
      depth: averageDepth(frameBot3D, rotationDeg, elevationDeg) + frameDepth,
      type: 'window-frame',
    });

    // Center mullion for double / casement / sliding windows
    if (style === 'double' || style === 'casement' || style === 'sliding') {
      const midPt = lerpWallCenter(wall, midT);
      const mullion3D = [
        { x: midPt.x + perp.x * halfThick - dxW * 0.01, y: midPt.y + perp.y * halfThick - dyW * 0.01, z: zBottom },
        { x: midPt.x + perp.x * halfThick + dxW * 0.01, y: midPt.y + perp.y * halfThick + dyW * 0.01, z: zBottom },
        { x: midPt.x + perp.x * halfThick + dxW * 0.01, y: midPt.y + perp.y * halfThick + dyW * 0.01, z: zTop },
        { x: midPt.x + perp.x * halfThick - dxW * 0.01, y: midPt.y + perp.y * halfThick - dyW * 0.01, z: zTop },
      ];
      faces.push({
        points: mullion3D.map((p) => isoProject(p.x, p.y, p.z, rotationDeg, elevationDeg)),
        color: frameColor,
        depth: averageDepth(mullion3D, rotationDeg, elevationDeg) + frameDepth,
        type: 'window-frame',
      });
    }
  }

  // -----------------------------------------------------------------------
  // Furniture -- stamp-specific 3D shapes
  // -----------------------------------------------------------------------

  const DEFAULT_FURNITURE_COLOR = '#c8b896';

  for (const item of furniture) {
    const cx = item.position.x;
    const cy = item.position.y;
    const w = item.width * item.scale;
    const d = item.depth * item.scale;
    const stampType = classifyStamp(item.stampId);
    const h = elevationHeight(stampType);
    const baseColor = item.color ?? DEFAULT_FURNITURE_COLOR;

    const rad = ((item.rotation ?? 0) * Math.PI) / 180;
    const cosA = Math.cos(rad);
    const sinA = Math.sin(rad);

    const hw = w / 2;
    const hd = d / 2;

    // Transform local point (lx, ly, lz) relative to item center to world
    const itemToWorld = (lx: number, ly: number, lz: number) => ({
      x: cx + lx * cosA - ly * sinA,
      y: cy + lx * sinA + ly * cosA,
      z: lz,
    });

    // Helper: add a box defined by min/max in local coords
    const addBox = (
      minX: number, maxX: number,
      minY: number, maxY: number,
      zBot: number, zTop: number,
      color: string,
      _alpha?: number,
    ) => {
      const p0 = itemToWorld(minX, minY, zBot);
      const p1 = itemToWorld(maxX, minY, zBot);
      const p2 = itemToWorld(maxX, maxY, zBot);
      const p3 = itemToWorld(minX, maxY, zBot);
      const p4 = itemToWorld(minX, minY, zTop);
      const p5 = itemToWorld(maxX, minY, zTop);
      const p6 = itemToWorld(maxX, maxY, zTop);
      const p7 = itemToWorld(minX, maxY, zTop);

      const sideFaces = [
        [p0, p1, p5, p4], // front (minY)
        [p2, p3, p7, p6], // back (maxY)
        [p3, p0, p4, p7], // left (minX)
        [p1, p2, p6, p5], // right (maxX)
      ] as const;
      const sideBrightness = [1.0, 0.75, 0.65, 0.7];

      for (let si = 0; si < 4; si++) {
        const sf = sideFaces[si];
        const s3D = [sf[0], sf[1], sf[2], sf[3]];
        faces.push({
          points: s3D.map((p) => isoProject(p.x, p.y, p.z, rotationDeg, elevationDeg)),
          color: adjustBrightness(color, sideBrightness[si]),
          depth: averageDepth(s3D, rotationDeg, elevationDeg),
          type: 'furniture-box',
        });
      }

      const top3D = [p4, p5, p6, p7];
      faces.push({
        points: top3D.map((p) => isoProject(p.x, p.y, p.z, rotationDeg, elevationDeg)),
        color: adjustBrightness(color, 1.25),
        depth: averageDepth(top3D, rotationDeg, elevationDeg) + 0.0001,
        type: 'furniture-box',
      });
    };

    // Helper: add a cylinder (approximated as polygon, centered)
    const addCylinder = (
      centerLX: number, centerLY: number,
      rx: number, ry: number,
      zBot: number, zTop: number,
      color: string, segs = 12,
    ) => {
      const botPts: Array<{ x: number; y: number; z: number }> = [];
      const topPts: Array<{ x: number; y: number; z: number }> = [];
      for (let s = 0; s <= segs; s++) {
        const a = (Math.PI * 2 * s) / segs;
        botPts.push(itemToWorld(centerLX + Math.cos(a) * rx, centerLY + Math.sin(a) * ry, zBot));
        topPts.push(itemToWorld(centerLX + Math.cos(a) * rx, centerLY + Math.sin(a) * ry, zTop));
      }
      // Top
      faces.push({
        points: topPts.map((p) => isoProject(p.x, p.y, p.z, rotationDeg, elevationDeg)),
        color: adjustBrightness(color, 1.25),
        depth: averageDepth(topPts, rotationDeg, elevationDeg) + 0.0001,
        type: 'furniture-box',
      });
      // Side panels
      for (let s = 0; s < segs; s++) {
        const side3D = [botPts[s], botPts[s + 1], topPts[s + 1], topPts[s]];
        faces.push({
          points: side3D.map((p) => isoProject(p.x, p.y, p.z, rotationDeg, elevationDeg)),
          color: adjustBrightness(color, 0.8 + 0.2 * ((s % 3) / 3)),
          depth: averageDepth(side3D, rotationDeg, elevationDeg),
          type: 'furniture-box',
        });
      }
    };

    // --- Per-category 3D shapes ---
    if (stampType === 'table') {
      // Table: thin top slab + 4 legs
      const tableTopH = h * 0.9;
      const legThick = Math.min(w, d) * 0.08;
      const legOffset = 0.15;
      const legBottomH = 0.02;
      // Top slab
      addBox(-hw, hw, -hd, hd, tableTopH - 0.03, tableTopH, adjustBrightness(baseColor, 1.1));
      // 4 legs
      for (const [lx, ly] of [[-hw + legOffset, -hd + legOffset], [hw - legOffset, -hd + legOffset], [hw - legOffset, hd - legOffset], [-hw + legOffset, hd - legOffset]] as const) {
        addBox(lx - legThick, lx + legThick, ly - legThick, ly + legThick, legBottomH, tableTopH - 0.03, baseColor);
      }
    } else if (stampType === 'chair') {
      // Chair: seat box + backrest
      const seatH = h * 0.55;
      const seatBotH = h * 0.15;
      const backrestMinY = -hd;
      const backrestMaxY = -hd + 0.06;
      const backrestH = h * 0.95;
      // Seat
      addBox(-hw * 0.85, hw * 0.85, -hd * 0.7, hd * 0.7, seatBotH, seatH, baseColor);
      // Backrest (at back edge, minY)
      addBox(-hw * 0.7, hw * 0.7, backrestMinY, backrestMaxY, seatH, backrestH, adjustBrightness(baseColor, 0.9));
      // 4 small legs
      const legW = hw * 0.08;
      for (const [lx, ly] of [[-hw * 0.7, -hd * 0.5], [hw * 0.7, -hd * 0.5], [hw * 0.7, hd * 0.5], [-hw * 0.7, hd * 0.5]] as const) {
        addBox(lx - legW, lx + legW, ly - legW, ly + legW, 0, seatBotH, baseColor);
      }
    } else if (stampType === 'sofa') {
      // Sofa/Armchair: seat + backrest along maxY
      const seatH = h * 0.5;
      const seatBot = h * 0.08;
      // Seat body
      addBox(-hw * 0.9, hw * 0.9, -hd * 0.6, hd * 0.8, seatBot, seatH, baseColor);
      // Backrest at maxY
      addBox(-hw * 0.85, hw * 0.85, hd * 0.55, hd * 0.85, seatH, h, adjustBrightness(baseColor, 1.05));
      // Armrests left/right
      const armW = hw * 0.1;
      addBox(-hw * 0.9, -hw + armW, -hd * 0.5, hd * 0.5, seatBot, seatH + 0.1, adjustBrightness(baseColor, 1.0));
      addBox(hw - armW, hw * 0.9, -hd * 0.5, hd * 0.5, seatBot, seatH + 0.1, adjustBrightness(baseColor, 1.0));
    } else if (stampType === 'bed') {
      // Bed: mattress box + headboard
      const mattressTop = h * 0.85;
      // Mattress/body
      addBox(-hw * 0.9, hw * 0.9, -hd * 0.9, hd * 0.85, h * 0.2, mattressTop, baseColor);
      // Headboard at maxY
      addBox(-hw * 0.9, hw * 0.9, hd * 0.8, hd * 0.95, mattressTop - 0.05, h, adjustBrightness(baseColor, 1.0));
      // Two pillows
      const pillowW = hw * 0.3;
      const pillowCenter = -hd * 0.75;
      addBox(-pillowW, 0, pillowCenter - 0.06, pillowCenter + 0.06, mattressTop, mattressTop + 0.08, '#f5f0e8');
      addBox(0, pillowW, pillowCenter - 0.06, pillowCenter + 0.06, mattressTop, mattressTop + 0.08, '#f5f0e8');
    } else if (stampType === 'wardrobe' || stampType === 'fridge') {
      // Tall storage unit
      addBox(-hw * 0.95, hw * 0.95, -hd * 0.95, hd * 0.95, 0.02, h, baseColor);
      // Vertical divider strip
      addBox(-0.015, 0.015, -hd * 0.9, hd * 0.9, 0.02, h, adjustBrightness(baseColor, 0.75));
    } else if (stampType === 'stove') {
      // Stove: counter-height box + burner rings
      const topH = h * 0.92;
      addBox(-hw, hw, -hd, hd, 0.02, topH, baseColor);
      // Top cooking surface
      addBox(-hw * 0.95, hw * 0.95, -hd * 0.95, hd * 0.95, topH, topH + 0.015, '#333');
    } else if (stampType === 'toilet') {
      // Toilet: low box with tank
      addBox(-hw * 0.7, hw * 0.7, -hd * 0.7, hd * 0.7, 0.02, h * 0.6, baseColor);
      // Tank at maxY
      addBox(-hw * 0.5, hw * 0.5, hd * 0.35, hd * 0.75, h * 0.45, h, baseColor);
    } else if (stampType === 'bidet') {
      addBox(-hw * 0.7, hw * 0.7, -hd * 0.7, hd * 0.7, 0.01, h * 0.5, baseColor);
    } else if (stampType === 'sink' || stampType === 'kitchen-sink') {
      // Sink: counter-height box with basin inset
      const topH = h * 0.9;
      addBox(-hw, hw, -hd, hd, 0.02, topH, baseColor);
      // Basin depression
      addBox(-hw * 0.3, hw * 0.3, -hd * 0.3, hd * 0.3, topH - 0.04, topH, adjustBrightness(baseColor, 0.7));
    } else if (stampType === 'bathtub') {
      addBox(-hw * 0.95, hw * 0.95, -hd * 0.95, hd * 0.95, 0.01, h * 0.5, baseColor);
      // Inner tub
      addBox(-hw * 0.7, hw * 0.7, -hd * 0.7, hd * 0.7, h * 0.05, h * 0.45, '#e8e4dc');
    } else if (stampType === 'shower') {
      // Glass enclosure
      const glassColor = 'rgba(140,200,230,0.35)';
      addBox(-hw * 0.9, hw * 0.9, -hd * 0.9, hd * 0.9, 0, h, glassColor, 0.5);
    } else if (stampType === 'car') {
      // Car: long box with rounded top
      addBox(-hw * 0.95, hw * 0.95, -hd * 0.95, hd * 0.95, 0.02, h * 0.55, baseColor);
      // Cabin (top section)
      addBox(-hw * 0.55, hw * 0.55, -hd * 0.3, hd * 0.3, h * 0.55, h * 0.9, adjustBrightness(baseColor, 1.1));
    } else if (stampType === 'tree') {
      // Tree: trunk + canopy sphere
      const trunkR = Math.min(w, d) * 0.06;
      const canopyR = Math.min(w, d) * 0.4;
      addCylinder(0, 0, trunkR, trunkR, 0, h * 0.5, '#8B6914', 8);
      addCylinder(0, 0, canopyR, canopyR, h * 0.35, h, '#4a8c3f', 14);
    } else if (stampType === 'bush') {
      addCylinder(0, 0, w * 0.4, d * 0.4, 0, h, '#5a9e4a', 10);
    } else if (stampType === 'person') {
      // Person: vertical cylinder + sphere head
      const bodyR = Math.min(w, d) * 0.25;
      addCylinder(0, 0, bodyR, bodyR, 0, h * 0.7, '#5b7399', 10);
      addCylinder(0, h * 0.06, bodyR * 0.85, bodyR * 0.85, h * 0.7, h * 0.92, '#e8c597', 10);
    } else if (stampType === 'child') {
      const bodyR = Math.min(w, d) * 0.25;
      addCylinder(0, 0, bodyR, bodyR, 0, h * 0.65, '#5b7399', 10);
      addCylinder(0, h * 0.04, bodyR * 0.9, bodyR * 0.9, h * 0.65, h * 0.9, '#e8c597', 10);
    } else if (stampType === 'floor-lamp') {
      const poleR = Math.min(w, d) * 0.04;
      const shadeR = Math.min(w, d) * 0.3;
      addCylinder(0, 0, poleR, poleR, 0, h * 0.75, '#888', 8);
      addCylinder(0, 0, shadeR, shadeR, h * 0.7, h, '#e8dcc8', 10);
    } else if (stampType === 'rug') {
      // Very thin flat rectangle
      addBox(-hw, hw, -hd, hd, 0, 0.02, baseColor);
    } else if (stampType === 'painting') {
      // Thin wall-mounted rectangle at mid-height
      addBox(-hw, hw, -hd, hd, h * 0.3, h * 0.9, baseColor);
    } else if (stampType === 'curtain') {
      addBox(-hw, hw, -hd, hd, 0, h, baseColor);
    } else if (stampType === 'pool') {
      addBox(-hw * 0.95, hw * 0.95, -hd * 0.95, hd * 0.95, 0, h * 0.8, 'rgba(90,170,220,0.4)');
    } else if (stampType === 'door-panel' || stampType === 'window-panel') {
      // Glass panels: thin translucent
      addBox(-hw, hw, -hd, hd, 0, h, 'rgba(140,200,230,0.35)');
    } else if (stampType === 'potted-plant') {
      const potR = Math.min(w, d) * 0.2;
      addCylinder(0, 0, potR, potR, 0, h * 0.3, '#a0522d', 8);
      addCylinder(0, 0, potR * 1.5, potR * 1.5, h * 0.25, h, '#5a9e4a', 10);
    } else {
      // Generic box for unknown types
      addBox(-hw, hw, -hd, hd, 0, h, baseColor);
    }
  }

  // -----------------------------------------------------------------------
  // Stairs -- extruded blocks styled by staircase type
  // -----------------------------------------------------------------------

  const STAIR_COLOR = '#c8b696';

  for (const stair of stairs) {
    if (!stair.visible) continue;

    const style = stair.stairStyle || 'straight';
    const w = stair.width;
    const l = stair.length;
    const t = stair.treads;
    const rh = stair.riserHeight;

    if (style === 'straight') {
      const segFaces = generateStraightStairSegment(
        stair, 0, w, 0, l, 0, t, STAIR_COLOR, rotationDeg, elevationDeg,
      );
      for (const f of segFaces) faces.push(f);
    } else if (style === 'l-shaped') {
      const land = stair.landingDepth;
      const halfT = Math.floor(t / 2);
      const run1Len = l - land;
      const midZ = halfT * rh;

      // First run (0..run1Len along Y)
      const f1 = generateStraightStairSegment(
        stair, 0, w, 0, run1Len, 0, halfT, STAIR_COLOR, rotationDeg, elevationDeg,
      );
      for (const f of f1) faces.push(f);

      // Landing -- flat rectangle at (0, run1Len) .. (w+land, run1Len+land), z = midZ
      const landBot = [
        { x: 0, y: run1Len, z: midZ },
        { x: w + land, y: run1Len, z: midZ },
        { x: w + land, y: run1Len + land, z: midZ },
        { x: 0, y: run1Len + land, z: midZ },
      ];
      const landBot3D = landBot.map((p) => stairLocalToWorld(stair, p.x, p.y, p.z));
      faces.push({
        points: landBot3D.map((p) => isoProject(p.x, p.y, p.z, rotationDeg, elevationDeg)),
        color: adjustBrightness(STAIR_COLOR, 1.3),
        depth: averageDepth(landBot3D, rotationDeg, elevationDeg),
        type: 'stair-landing',
      });

      // Second run (goes +X, -Y): local rect (w,0)..(w+land, w)
      // Travel direction is +X (width axis), so we swap roles
      // Width of this run = land (X extent), Length = w (Y extent, descending)
      const remainingT = t - halfT;
      for (let i = 0; i < remainingT; i++) {
        const zBot = midZ + i * rh;
        const zTop = midZ + (i + 1) * rh;
        const xA = w + (i / remainingT) * land;
        const xB = w + ((i + 1) / remainingT) * land;
        const yEnd = w - (i / remainingT) * w;
        const yStart = w - ((i + 1) / remainingT) * w;

        const botLocal = [
          { x: xA, y: yStart, z: zBot },
          { x: xB, y: yStart, z: zBot },
          { x: xB, y: yEnd, z: zBot },
          { x: xA, y: yEnd, z: zBot },
        ];
        const topLocal = [
          { x: xA, y: yStart, z: zTop },
          { x: xB, y: yStart, z: zTop },
          { x: xB, y: yEnd, z: zTop },
          { x: xA, y: yEnd, z: zTop },
        ];

        const toW = (p: { x: number; y: number; z: number }) =>
          stairLocalToWorld(stair, p.x, p.y, p.z);
        const top3D = topLocal.map(toW);

        // Tread
        faces.push({
          points: top3D.map((p) => isoProject(p.x, p.y, p.z, rotationDeg, elevationDeg)),
          color: adjustBrightness(STAIR_COLOR, 1.25),
          depth: averageDepth(top3D, rotationDeg, elevationDeg),
          type: 'stair-tread',
        });

        // Riser at xA (side facing left in local)
        const riserFront = [botLocal[0], botLocal[3], topLocal[3], topLocal[0]].map(toW);
        faces.push({
          points: riserFront.map((p) => isoProject(p.x, p.y, p.z, rotationDeg, elevationDeg)),
          color: adjustBrightness(STAIR_COLOR, 0.85),
          depth: averageDepth(riserFront, rotationDeg, elevationDeg),
          type: 'stair-riser',
        });

        // Riser at xB
        const riserBack = [botLocal[1], botLocal[2], topLocal[2], topLocal[1]].map(toW);
        faces.push({
          points: riserBack.map((p) => isoProject(p.x, p.y, p.z, rotationDeg, elevationDeg)),
          color: adjustBrightness(STAIR_COLOR, 0.9),
          depth: averageDepth(riserBack, rotationDeg, elevationDeg),
          type: 'stair-riser',
        });
      }
    } else if (style === 'u-shaped') {
      const land = stair.landingDepth;
      const halfT = Math.floor(t / 2);
      const halfW = w / 2;
      const runLen = l - land;
      const midZ = halfT * rh;

      // First run (left half, 0..halfW in X, 0..runLen in Y, going up +Y)
      const f1 = generateStraightStairSegment(
        stair, 0, halfW, 0, runLen, 0, halfT, STAIR_COLOR, rotationDeg, elevationDeg,
      );
      for (const f of f1) faces.push(f);

      // Landing (0..w in X, runLen..runLen+land in Y)
      const landBot = [
        { x: 0, y: runLen, z: midZ },
        { x: w, y: runLen, z: midZ },
        { x: w, y: runLen + land, z: midZ },
        { x: 0, y: runLen + land, z: midZ },
      ].map((p) => stairLocalToWorld(stair, p.x, p.y, p.z));
      faces.push({
        points: landBot.map((p) => isoProject(p.x, p.y, p.z, rotationDeg, elevationDeg)),
        color: adjustBrightness(STAIR_COLOR, 1.3),
        depth: averageDepth(landBot, rotationDeg, elevationDeg),
        type: 'stair-landing',
      });

      // Second run (right half, halfW..w in X, from runLen toward 0 in Y)
      const remainingT = t - halfT;
      for (let i = 0; i < remainingT; i++) {
        const zBot = midZ + i * rh;
        const zTop = midZ + (i + 1) * rh;
        const yA = runLen - (i / remainingT) * runLen;
        const yB = runLen - ((i + 1) / remainingT) * runLen;

        const botLocal = [
          { x: halfW, y: yA, z: zBot },
          { x: w, y: yA, z: zBot },
          { x: w, y: yB, z: zBot },
          { x: halfW, y: yB, z: zBot },
        ];
        const topLocal = [
          { x: halfW, y: yA, z: zTop },
          { x: w, y: yA, z: zTop },
          { x: w, y: yB, z: zTop },
          { x: halfW, y: yB, z: zTop },
        ];

        const toW = (p: { x: number; y: number; z: number }) =>
          stairLocalToWorld(stair, p.x, p.y, p.z);
        const top3D = topLocal.map(toW);

        faces.push({
          points: top3D.map((p) => isoProject(p.x, p.y, p.z, rotationDeg, elevationDeg)),
          color: adjustBrightness(STAIR_COLOR, 1.25),
          depth: averageDepth(top3D, rotationDeg, elevationDeg),
          type: 'stair-tread',
        });

        const rf = [botLocal[0], botLocal[3], topLocal[3], topLocal[0]].map(toW);
        faces.push({
          points: rf.map((p) => isoProject(p.x, p.y, p.z, rotationDeg, elevationDeg)),
          color: adjustBrightness(STAIR_COLOR, 0.85),
          depth: averageDepth(rf, rotationDeg, elevationDeg),
          type: 'stair-riser',
        });

        const rb = [botLocal[1], botLocal[2], topLocal[2], topLocal[1]].map(toW);
        faces.push({
          points: rb.map((p) => isoProject(p.x, p.y, p.z, rotationDeg, elevationDeg)),
          color: adjustBrightness(STAIR_COLOR, 0.9),
          depth: averageDepth(rb, rotationDeg, elevationDeg),
          type: 'stair-riser',
        });
      }
    } else if (style === 'spiral') {
      // Approximate spiral as a stacked cylinder
      const cx = w / 2;
      const cy = l / 2;
      const outerR = Math.min(w, l) / 2;
      const segments = 16;
      for (let i = 0; i < t; i++) {
        const zBot = i * rh;
        const zTop = (i + 1) * rh;
        const botPts: Array<{ x: number; y: number; z: number }> = [];
        const topPts: Array<{ x: number; y: number; z: number }> = [];
        for (let s = 0; s <= segments; s++) {
          const a = (Math.PI * 2 * s) / segments;
          const lx = cx + Math.cos(a) * outerR;
          const ly = cy + Math.sin(a) * outerR;
          botPts.push(stairLocalToWorld(stair, lx, ly, zBot));
          topPts.push(stairLocalToWorld(stair, lx, ly, zTop));
        }
        faces.push({
          points: topPts.map((p) => isoProject(p.x, p.y, p.z, rotationDeg, elevationDeg)),
          color: adjustBrightness(STAIR_COLOR, 1.25),
          depth: averageDepth(topPts, rotationDeg, elevationDeg),
          type: 'stair-tread',
        });
        // Side quad for each segment
        for (let s = 0; s < segments; s++) {
          const side3D = [botPts[s], botPts[s + 1], topPts[s + 1], topPts[s]];
          faces.push({
            points: side3D.map((p) => isoProject(p.x, p.y, p.z, rotationDeg, elevationDeg)),
            color: adjustBrightness(STAIR_COLOR, 0.8),
            depth: averageDepth(side3D, rotationDeg, elevationDeg),
            type: 'stair-riser',
          });
        }
      }
    } else if (style === 'winder') {
      // Simplified: render straight portion + triangular fan as a block
      const straightFrac = 0.7;
      const straightLen = l * straightFrac;
      const straightT = Math.max(2, t - 3);

      // Straight portion
      const sFaces = generateStraightStairSegment(
        stair, 0, w, 0, straightLen, 0, straightT, STAIR_COLOR, rotationDeg, elevationDeg,
      );
      for (const f of sFaces) faces.push(f);

      // Winder portion as sloped block (4 treads)
      const wStartZ = straightT * rh;
      const wEndZ = t * rh;
      const wBot = [
        { x: 0, y: straightLen, z: wStartZ },
        { x: w, y: straightLen, z: wStartZ },
        { x: w, y: l, z: wEndZ },
        { x: 0, y: l, z: wEndZ },
      ].map((p) => stairLocalToWorld(stair, p.x, p.y, p.z));
      const wTop = [
        { x: 0, y: straightLen, z: wEndZ },
        { x: w, y: straightLen, z: wEndZ },
        { x: w, y: l, z: wEndZ },
        { x: 0, y: l, z: wEndZ },
      ].map((p) => stairLocalToWorld(stair, p.x, p.y, p.z));

      faces.push({
        points: wTop.map((p) => isoProject(p.x, p.y, p.z, rotationDeg, elevationDeg)),
        color: adjustBrightness(STAIR_COLOR, 1.25),
        depth: averageDepth(wTop, rotationDeg, elevationDeg),
        type: 'stair-tread',
      });
      // Side quads
      const wLeft = [wBot[0], wBot[3], wTop[3], wTop[0]];
      faces.push({
        points: wLeft.map((p) => isoProject(p.x, p.y, p.z, rotationDeg, elevationDeg)),
        color: adjustBrightness(STAIR_COLOR, 0.7),
        depth: averageDepth(wLeft, rotationDeg, elevationDeg),
        type: 'stair-riser',
      });
      const wRight = [wBot[1], wBot[2], wTop[2], wTop[1]];
      faces.push({
        points: wRight.map((p) => isoProject(p.x, p.y, p.z, rotationDeg, elevationDeg)),
        color: adjustBrightness(STAIR_COLOR, 0.75),
        depth: averageDepth(wRight, rotationDeg, elevationDeg),
        type: 'stair-riser',
      });
    } else if (style === 'curved') {
      // Curved stair: approximate as a sloped curved block
      const arcCX = w;
      const arcCY = l / 2;
      const outerR = Math.min(w, l / 2);
      const innerR = outerR * 0.4;
      const segments = 20;

      for (let i = 0; i < t; i++) {
        const zBot = i * rh;
        const zTop = (i + 1) * rh;
        const angleStart = Math.PI / 2;
        const angleEnd = Math.PI * 1.5;
        // Arc is like a wedge of a ring
        const outerBot: Array<{ x: number; y: number; z: number }> = [];
        const outerTop: Array<{ x: number; y: number; z: number }> = [];
        const innerBot: Array<{ x: number; y: number; z: number }> = [];
        const innerTop: Array<{ x: number; y: number; z: number }> = [];

        for (let s = 0; s <= segments; s++) {
          const a = angleStart + (angleEnd - angleStart) * (s / segments);
          const outerX = arcCX + Math.cos(a) * outerR;
          const outerY = arcCY + Math.sin(a) * outerR;
          const innerX = arcCX + Math.cos(a) * innerR;
          const innerY = arcCY + Math.sin(a) * innerR;

          outerBot.push(stairLocalToWorld(stair, outerX, outerY, zBot));
          outerTop.push(stairLocalToWorld(stair, outerX, outerY, zTop));
          innerBot.push(stairLocalToWorld(stair, innerX, innerY, zBot));
          innerTop.push(stairLocalToWorld(stair, innerX, innerY, zTop));
        }

        // Tread: outer arc to inner arc
        const treadPts = [...outerTop, ...innerTop.slice().reverse()];
        faces.push({
          points: treadPts.map((p) => isoProject(p.x, p.y, p.z, rotationDeg, elevationDeg)),
          color: adjustBrightness(STAIR_COLOR, 1.25),
          depth: averageDepth(treadPts, rotationDeg, elevationDeg),
          type: 'stair-tread',
        });

        // Outer side face
        for (let s = 0; s < segments; s++) {
          const side = [outerBot[s], outerBot[s + 1], outerTop[s + 1], outerTop[s]];
          faces.push({
            points: side.map((p) => isoProject(p.x, p.y, p.z, rotationDeg, elevationDeg)),
            color: adjustBrightness(STAIR_COLOR, 0.75),
            depth: averageDepth(side, rotationDeg, elevationDeg),
            type: 'stair-riser',
          });
          const innerSide = [innerBot[s], innerBot[s + 1], innerTop[s + 1], innerTop[s]];
          faces.push({
            points: innerSide.map((p) => isoProject(p.x, p.y, p.z, rotationDeg, elevationDeg)),
            color: adjustBrightness(STAIR_COLOR, 0.65),
            depth: averageDepth(innerSide, rotationDeg, elevationDeg),
            type: 'stair-riser',
          });
        }
      }
    }
  }

  // -----------------------------------------------------------------------
  // Sort faces back-to-front (painter's algorithm)
  // -----------------------------------------------------------------------

  faces.sort((a, b) => {
    const depthDelta = a.depth - b.depth;
    if (Math.abs(depthDelta) > 1e-6) return depthDelta;
    const priorityDelta = FACE_SORT_PRIORITY[a.type] - FACE_SORT_PRIORITY[b.type];
    if (priorityDelta !== 0) return priorityDelta;
    return polygonArea2D(a.points) - polygonArea2D(b.points);
  });

  return faces;
}
