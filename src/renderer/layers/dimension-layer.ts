import type { DimensionLine, Wall } from '@/types/elements';

// ---------------------------------------------------------------------------
// Dimension layer -- draws dimension lines with tick marks and text
// ---------------------------------------------------------------------------

/**
 * Render dimension lines and auto-generated wall dimensions.
 *
 * @param ctx            Pre-transformed canvas context (1 unit = 1 m).
 * @param dimensions     Explicit dimension lines placed by the user.
 * @param walls          All walls (used for auto-generated dimensions).
 * @param showDimensions Whether to show auto-dimensions for walls.
 * @param pixelsPerMeter Camera zoom for scale-independent rendering.
 */
export function renderDimensions(
  ctx: CanvasRenderingContext2D,
  dimensions: DimensionLine[],
  walls: Wall[],
  showDimensions: boolean,
  pixelsPerMeter: number,
): void {
  const px = 1 / pixelsPerMeter;

  // ------------------------------------------------------------------
  // 1. Explicit dimension lines
  // ------------------------------------------------------------------
  for (const dim of dimensions) {
    drawDimensionLine(ctx, dim.start, dim.end, dim.offset, px, pixelsPerMeter);
  }

  // ------------------------------------------------------------------
  // 2. Auto-generated wall dimensions (when enabled)
  // ------------------------------------------------------------------
  if (showDimensions) {
    // Collect walls that already have an explicit dimension attached
    const dimensionedSegments = new Set<string>();
    for (const dim of dimensions) {
      // Key by rounded endpoints so we can match walls
      dimensionedSegments.add(segmentKey(dim.start, dim.end));
    }

    for (const wall of walls) {
      const key = segmentKey(wall.start, wall.end);
      const keyRev = segmentKey(wall.end, wall.start);
      if (dimensionedSegments.has(key) || dimensionedSegments.has(keyRev)) {
        continue;
      }

      // Auto-offset slightly beyond the wall thickness
      const autoOffset = wall.thickness * 1.5 + 0.15;
      drawDimensionLine(ctx, wall.start, wall.end, autoOffset, px, pixelsPerMeter);
    }
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function segmentKey(
  a: { x: number; y: number },
  b: { x: number; y: number },
): string {
  return `${a.x.toFixed(3)},${a.y.toFixed(3)}-${b.x.toFixed(3)},${b.y.toFixed(3)}`;
}

/**
 * Draw a single dimension line with perpendicular tick marks and
 * centered measurement text.
 */
function drawDimensionLine(
  ctx: CanvasRenderingContext2D,
  start: { x: number; y: number },
  end: { x: number; y: number },
  offset: number,
  px: number,
  pixelsPerMeter: number,
): void {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length < 0.001) return;

  // Unit direction and perpendicular
  const ux = dx / length;
  const uy = dy / length;
  const nx = -uy; // perpendicular
  const ny = ux;

  // Offset the dimension line away from the wall
  const sx = start.x + nx * offset;
  const sy = start.y + ny * offset;
  const ex = end.x + nx * offset;
  const ey = end.y + ny * offset;

  // Tick mark length (in world units)
  const tickLen = 0.08;

  ctx.strokeStyle = '#888888';
  ctx.lineWidth = px;
  ctx.fillStyle = '#999999';

  // -- Main dimension line ----------------------------------------------
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(ex, ey);
  ctx.stroke();

  // -- Perpendicular tick at start --------------------------------------
  ctx.beginPath();
  ctx.moveTo(sx - nx * tickLen, sy - ny * tickLen);
  ctx.lineTo(sx + nx * tickLen, sy + ny * tickLen);
  ctx.stroke();

  // -- Perpendicular tick at end ----------------------------------------
  ctx.beginPath();
  ctx.moveTo(ex - nx * tickLen, ey - ny * tickLen);
  ctx.lineTo(ex + nx * tickLen, ey + ny * tickLen);
  ctx.stroke();

  // -- Extension lines from wall to dimension line ----------------------
  ctx.strokeStyle = '#666666';
  ctx.lineWidth = px * 0.5;

  ctx.beginPath();
  ctx.moveTo(start.x + nx * (offset * 0.3), start.y + ny * (offset * 0.3));
  ctx.lineTo(sx + nx * tickLen, sy + ny * tickLen);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(end.x + nx * (offset * 0.3), end.y + ny * (offset * 0.3));
  ctx.lineTo(ex + nx * tickLen, ey + ny * tickLen);
  ctx.stroke();

  // -- Measurement text -------------------------------------------------
  const midX = (sx + ex) / 2;
  const midY = (sy + ey) / 2;
  const text = formatLength(length);

  // Compute the angle of the dimension line for text rotation
  const angle = Math.atan2(ey - sy, ex - sx);

  ctx.save();
  ctx.translate(midX, midY);

  // Keep text upright: flip if it would be upside-down
  let textAngle = angle;
  if (textAngle > Math.PI / 2 || textAngle < -Math.PI / 2) {
    textAngle += Math.PI;
  }
  ctx.rotate(textAngle);

  // Scale to screen-pixel space for crisp text
  ctx.scale(1 / pixelsPerMeter, 1 / pixelsPerMeter);

  const fontSize = Math.max(10, Math.min(14, pixelsPerMeter * 0.12));
  ctx.font = `${fontSize}px sans-serif`;
  ctx.fillStyle = '#999999';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(text, 0, -3);

  ctx.restore();
}

/** Format a length in meters for display (e.g. "3.50 m"). */
function formatLength(meters: number): string {
  if (meters < 0.01) return `${(meters * 1000).toFixed(0)} mm`;
  if (meters < 1) return `${(meters * 100).toFixed(1)} cm`;
  return `${meters.toFixed(2)} m`;
}
