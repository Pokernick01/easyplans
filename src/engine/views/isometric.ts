import type { Point } from '@/types/geometry';
import type { Wall, Door, Window, Room, FurnitureItem } from '@/types/elements';
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
    | 'furniture-box';
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
    const baseColor = wall.fillColor ?? '#d3d3d3';

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
  // Door openings -- dark rectangles overlaid on wall faces
  // -----------------------------------------------------------------------

  for (const door of doors) {
    const wall = wallById.get(door.wallId);
    if (!wall) continue;

    const wLen = wallLength(wall);
    if (wLen === 0) continue;

    // Parametric extent of the door opening along the wall
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
  }

  // -----------------------------------------------------------------------
  // Furniture -- extruded boxes with type-specific Neufert heights
  // -----------------------------------------------------------------------

  const DEFAULT_FURNITURE_COLOR = '#c8b896'; // muted beige

  for (const item of furniture) {
    const cx = item.position.x;
    const cy = item.position.y;
    const w = item.width * item.scale;
    const d = item.depth * item.scale;
    const stampType = classifyStamp(item.stampId);
    const h = elevationHeight(stampType);
    const baseColor = item.color ?? DEFAULT_FURNITURE_COLOR;

    // Rotation of the furniture piece
    const rad = ((item.rotation ?? 0) * Math.PI) / 180;
    const cosA = Math.cos(rad);
    const sinA = Math.sin(rad);

    // Compute the 4 corners of the bounding box in world XY (at z=0)
    // Local corners relative to center: (-w/2, -d/2), (w/2, -d/2), etc.
    const hw = w / 2;
    const hd = d / 2;
    const localCorners = [
      { x: -hw, y: -hd },
      { x: hw, y: -hd },
      { x: hw, y: hd },
      { x: -hw, y: hd },
    ];

    // Rotate and translate to world coordinates
    const worldCorners = localCorners.map((lc) => ({
      x: cx + lc.x * cosA - lc.y * sinA,
      y: cy + lc.x * sinA + lc.y * cosA,
    }));

    // Bottom 3D corners (z = 0)
    const bot3D = worldCorners.map((c) => ({ x: c.x, y: c.y, z: 0 }));
    // Top 3D corners (z = h)
    const top3D = worldCorners.map((c) => ({ x: c.x, y: c.y, z: h }));

    // ----- Top face -----
    faces.push({
      points: top3D.map((p) => isoProject(p.x, p.y, p.z, rotationDeg, elevationDeg)),
      color: adjustBrightness(baseColor, 1.2),
      depth: averageDepth(top3D, rotationDeg, elevationDeg),
      type: 'furniture-box',
    });

    // ----- Four side faces -----
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      const sidePts3D = [bot3D[i], bot3D[j], top3D[j], top3D[i]];

      // Vary brightness by face index for visual depth
      const brightness = i < 2 ? 1.0 : 0.75;

      faces.push({
        points: sidePts3D.map((p) => isoProject(p.x, p.y, p.z, rotationDeg, elevationDeg)),
        color: adjustBrightness(baseColor, brightness),
        depth: averageDepth(sidePts3D, rotationDeg, elevationDeg),
        type: 'furniture-box',
      });
    }
  }

  // -----------------------------------------------------------------------
  // Sort faces back-to-front (painter's algorithm)
  // -----------------------------------------------------------------------

  faces.sort((a, b) => a.depth - b.depth);

  return faces;
}
