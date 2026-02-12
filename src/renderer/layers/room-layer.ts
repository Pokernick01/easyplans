import type { Room, FillPattern } from '@/types/elements';
import { polygonCentroid } from '@/engine/math/polygon';
import { roomPatternFns } from './pattern-library';

// ---------------------------------------------------------------------------
// Room layer -- fills room polygons, draws patterns, labels and areas
// ---------------------------------------------------------------------------

/**
 * Render rooms as filled polygons with optional pattern overlays, labels,
 * and area annotations.
 *
 * @param ctx            Pre-transformed canvas context (1 unit = 1 m).
 * @param rooms          All rooms on the current floor.
 * @param pixelsPerMeter Camera zoom for scale-independent rendering.
 */
export function renderRooms(
  ctx: CanvasRenderingContext2D,
  rooms: Room[],
  pixelsPerMeter: number,
): void {
  const px = 1 / pixelsPerMeter;

  for (const room of rooms) {
    if (room.polygon.length < 3) continue;

    // ------------------------------------------------------------------
    // 1. Fill with room color (semi-transparent)
    // ------------------------------------------------------------------
    ctx.beginPath();
    ctx.moveTo(room.polygon[0].x, room.polygon[0].y);
    for (let i = 1; i < room.polygon.length; i++) {
      ctx.lineTo(room.polygon[i].x, room.polygon[i].y);
    }
    ctx.closePath();
    ctx.fillStyle = room.color;
    ctx.fill();

    // ------------------------------------------------------------------
    // 2. Pattern overlay
    // ------------------------------------------------------------------
    const pattern = room.fillPattern || 'solid';
    if (pattern !== 'solid') {
      drawRoomPattern(ctx, room, pattern, px);
    }

    // ------------------------------------------------------------------
    // 3. Label and area at centroid
    // ------------------------------------------------------------------
    const centroid = polygonCentroid(room.polygon);

    // Compute font size proportional to room area, clamped between limits
    const baseFontSize = Math.sqrt(room.area) * 0.15;
    const fontSize = Math.max(0.12, Math.min(baseFontSize, 0.5));

    // Room name
    ctx.save();
    ctx.translate(centroid.x, centroid.y);
    ctx.scale(1 / pixelsPerMeter, 1 / pixelsPerMeter);

    const screenFontSize = fontSize * pixelsPerMeter;

    ctx.font = `600 ${screenFontSize}px sans-serif`;
    ctx.fillStyle = '#e0e0e0';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(room.label, 0, 0);

    // Area text below the label
    const areaText = `${room.area.toFixed(1)} m\u00B2`;
    ctx.font = `400 ${screenFontSize * 0.65}px sans-serif`;
    ctx.fillStyle = '#a0a0a0';
    ctx.fillText(areaText, 0, screenFontSize * 0.85);

    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Pattern rendering (clipped to room polygon)
// ---------------------------------------------------------------------------

function drawRoomPattern(
  ctx: CanvasRenderingContext2D,
  room: Room,
  pattern: FillPattern,
  px: number,
): void {
  const fn = roomPatternFns[pattern];
  if (!fn) return;

  ctx.save();
  // Clip to the room polygon so the pattern doesn't bleed
  ctx.beginPath();
  ctx.moveTo(room.polygon[0].x, room.polygon[0].y);
  for (let i = 1; i < room.polygon.length; i++) {
    ctx.lineTo(room.polygon[i].x, room.polygon[i].y);
  }
  ctx.closePath();
  ctx.clip();

  // Compute AABB for the room polygon
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of room.polygon) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  fn(ctx, minX, minY, maxX, maxY, px);

  ctx.restore();
}
