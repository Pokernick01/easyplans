import type { Wall, Door, Window } from '@/types/elements';
import { wallToPolygon } from '@/engine/geometry/wall-thickness';

// ---------------------------------------------------------------------------
// Wall layer -- draws wall outlines, cutting gaps for doors and windows
// ---------------------------------------------------------------------------

/**
 * Render all walls, cutting openings for doors and windows.
 *
 * @param ctx            Pre-transformed canvas context (1 unit = 1 m).
 * @param walls          All walls on the current floor.
 * @param doors          All doors on the current floor.
 * @param windows        All windows on the current floor.
 * @param pixelsPerMeter Camera zoom for scale-independent line widths.
 */
export function renderWalls(
  ctx: CanvasRenderingContext2D,
  walls: Wall[],
  doors: Door[],
  windows: Window[],
  pixelsPerMeter: number,
): void {
  const px = 1 / pixelsPerMeter;

  for (const wall of walls) {
    const poly = wallToPolygon(wall);
    if (poly.length < 3) continue;

    // ------------------------------------------------------------------
    // 1. Fill the wall polygon
    // ------------------------------------------------------------------
    ctx.beginPath();
    ctx.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i++) {
      ctx.lineTo(poly[i].x, poly[i].y);
    }
    ctx.closePath();
    ctx.fillStyle = wall.fillColor;
    ctx.fill();

    // ------------------------------------------------------------------
    // 2. Cut door gaps -- draw background-colored rectangles over openings
    // ------------------------------------------------------------------
    const wallDoors = doors.filter((d) => d.wallId === wall.id);
    for (const door of wallDoors) {
      cutOpening(ctx, wall, door.position, door.width, '#1a1a2e');
    }

    // ------------------------------------------------------------------
    // 3. Cut window gaps and draw glass lines
    // ------------------------------------------------------------------
    const wallWindows = windows.filter((w) => w.wallId === wall.id);
    for (const win of wallWindows) {
      cutOpening(ctx, wall, win.position, win.width, '#1a1a2e');
      drawGlassInOpening(ctx, wall, win.position, win.width, px);
    }

    // ------------------------------------------------------------------
    // 4. Stroke the wall outline
    // ------------------------------------------------------------------
    ctx.beginPath();
    ctx.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i++) {
      ctx.lineTo(poly[i].x, poly[i].y);
    }
    ctx.closePath();
    ctx.strokeStyle = wall.color;
    ctx.lineWidth = px; // 1 screen pixel
    ctx.stroke();
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Draw a filled rectangle over a section of a wall to erase the wall fill
 * where a door or window sits.
 */
function cutOpening(
  ctx: CanvasRenderingContext2D,
  wall: Wall,
  position: number,
  openingWidth: number,
  bgColor: string,
): void {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const wallLen = Math.sqrt(dx * dx + dy * dy);
  if (wallLen === 0) return;

  // Unit vectors along and perpendicular to wall
  const ux = dx / wallLen;
  const uy = dy / wallLen;
  const nx = -uy;
  const ny = ux;

  // Center of the opening along the centerline
  const cx = wall.start.x + dx * position;
  const cy = wall.start.y + dy * position;

  const halfW = openingWidth / 2;
  const halfT = wall.thickness / 2 + 0.005; // slight overshoot to fully cover

  // Four corners of the cut rectangle
  const x0 = cx - ux * halfW - nx * halfT;
  const y0 = cy - uy * halfW - ny * halfT;
  const x1 = cx + ux * halfW - nx * halfT;
  const y1 = cy + uy * halfW - ny * halfT;
  const x2 = cx + ux * halfW + nx * halfT;
  const y2 = cy + uy * halfW + ny * halfT;
  const x3 = cx - ux * halfW + nx * halfT;
  const y3 = cy - uy * halfW + ny * halfT;

  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.closePath();
  ctx.fillStyle = bgColor;
  ctx.fill();
}

/**
 * Draw two parallel lines across a wall opening to represent glass panes.
 */
function drawGlassInOpening(
  ctx: CanvasRenderingContext2D,
  wall: Wall,
  position: number,
  openingWidth: number,
  px: number,
): void {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const wallLen = Math.sqrt(dx * dx + dy * dy);
  if (wallLen === 0) return;

  const ux = dx / wallLen;
  const uy = dy / wallLen;
  const nx = -uy;
  const ny = ux;

  const cx = wall.start.x + dx * position;
  const cy = wall.start.y + dy * position;

  const halfW = openingWidth / 2;
  // Two glass pane lines offset slightly from the wall centerline
  const glassOffset = wall.thickness * 0.15;

  ctx.strokeStyle = '#88ccee';
  ctx.lineWidth = px;

  for (const sign of [-1, 1] as const) {
    const ox = nx * glassOffset * sign;
    const oy = ny * glassOffset * sign;

    ctx.beginPath();
    ctx.moveTo(cx - ux * halfW + ox, cy - uy * halfW + oy);
    ctx.lineTo(cx + ux * halfW + ox, cy + uy * halfW + oy);
    ctx.stroke();
  }
}
