import type { IsoFace } from '@/engine/views/isometric';
import type { Point } from '@/types/geometry';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BACKGROUND_COLOR = '#f5f5f0';
const STROKE_DARKEN = 0.7; // multiplier for stroke color relative to fill

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse an rgb/rgba color string into [r, g, b].
 * Falls back to [200, 200, 200] if parsing fails.
 */
function parseColor(color: string): [number, number, number] {
  // Try rgb(r, g, b) or rgba(r, g, b, a)
  const rgbMatch = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    return [parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3])];
  }

  // Try hex #RRGGBB or #RGB
  const hex = color.replace('#', '');
  if (hex.length === 3) {
    return [
      parseInt(hex[0] + hex[0], 16),
      parseInt(hex[1] + hex[1], 16),
      parseInt(hex[2] + hex[2], 16),
    ];
  }
  if (hex.length >= 6) {
    return [
      parseInt(hex.substring(0, 2), 16),
      parseInt(hex.substring(2, 4), 16),
      parseInt(hex.substring(4, 6), 16),
    ];
  }

  return [200, 200, 200];
}

/**
 * Darken a color by a given factor.
 */
function darkenColor(color: string, factor: number): string {
  const [r, g, b] = parseColor(color);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `rgb(${clamp(r * factor)},${clamp(g * factor)},${clamp(b * factor)})`;
}

/**
 * Compute the bounding box of all projected face points.
 */
function computeBounds(faces: IsoFace[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const face of faces) {
    for (const p of face.points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  }

  return { minX, minY, maxX, maxY };
}

/**
 * Draw a filled and stroked polygon on the canvas.
 */
function drawPolygon(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  fillColor: string,
  strokeColor: string,
  lineWidth: number,
): void {
  if (points.length < 3) return;

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.closePath();

  ctx.fillStyle = fillColor;
  ctx.fill();

  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// Main renderer
// ---------------------------------------------------------------------------

/**
 * Render an isometric 3D view onto a canvas.
 *
 * The faces array must already be sorted back-to-front (painter's algorithm)
 * by the isometric view generator.
 *
 * @param ctx          Canvas 2D rendering context.
 * @param canvasWidth  Canvas width in pixels.
 * @param canvasHeight Canvas height in pixels.
 * @param faces        Sorted array of IsoFace objects.
 */
export function renderIsometric(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  faces: IsoFace[],
): void {
  // --- 1. Clear canvas with light background ---
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = BACKGROUND_COLOR;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  ctx.restore();

  if (faces.length === 0) return;

  // --- 2. Compute bounds and center the view ---
  const bounds = computeBounds(faces);
  const worldWidth = bounds.maxX - bounds.minX;
  const worldHeight = bounds.maxY - bounds.minY;
  const safeWorldWidth = Math.max(worldWidth, 1e-6);
  const safeWorldHeight = Math.max(worldHeight, 1e-6);

  // Scale to fit the canvas with some margin
  const margin = 80;
  const drawableWidth = canvasWidth - margin * 2;
  const drawableHeight = canvasHeight - margin * 2;
  const scale = Math.min(
    drawableWidth / safeWorldWidth,
    drawableHeight / safeWorldHeight,
  );
  if (!Number.isFinite(scale) || scale <= 0) return;

  const worldCenterX = (bounds.minX + bounds.maxX) / 2;
  const worldCenterY = (bounds.minY + bounds.maxY) / 2;
  const screenCenterX = canvasWidth / 2;
  const screenCenterY = canvasHeight / 2;

  // --- 3. Render faces (already sorted back-to-front) ---
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  for (const face of faces) {
    // Transform projected points to screen coordinates
    const screenPoints = face.points.map((p) => ({
      x: screenCenterX + (p.x - worldCenterX) * scale,
      y: screenCenterY + (p.y - worldCenterY) * scale,
    }));

    // Determine line width based on face type
    let lineWidth = 0.5;
    switch (face.type) {
      case 'wall-front':
      case 'wall-side':
        lineWidth = 1.0;
        break;
      case 'wall-top':
        lineWidth = 0.8;
        break;
      case 'floor':
        lineWidth = 0.3;
        break;
      case 'roof':
        lineWidth = 1.0;
        break;
    }

    const strokeColor = darkenColor(face.color, STROKE_DARKEN);
    drawPolygon(ctx, screenPoints, face.color, strokeColor, lineWidth);
  }

  ctx.restore();
}
