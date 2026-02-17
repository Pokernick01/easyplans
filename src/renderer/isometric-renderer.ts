import type { IsoFace } from '@/engine/views/isometric';
import type { Point } from '@/types/geometry';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BACKGROUND_TOP = '#f8f6f1';
const BACKGROUND_BOTTOM = '#efebe2';
const STROKE_DARKEN = 0.72; // multiplier for stroke color relative to fill

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

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * Darken a color by a given factor.
 */
function darkenColor(color: string, factor: number): string {
  const [r, g, b] = parseColor(color);
  return `rgb(${clamp(Math.round(r * factor), 0, 255)},${clamp(Math.round(g * factor), 0, 255)},${clamp(Math.round(b * factor), 0, 255)})`;
}

/**
 * Lighten a color by blending toward white.
 */
function lightenColor(color: string, amount: number): string {
  const [r, g, b] = parseColor(color);
  const a = clamp(amount, 0, 1);
  const lr = Math.round(r + (255 - r) * a);
  const lg = Math.round(g + (255 - g) * a);
  const lb = Math.round(b + (255 - b) * a);
  return `rgb(${clamp(lr, 0, 255)},${clamp(lg, 0, 255)},${clamp(lb, 0, 255)})`;
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

function polygonBounds(points: Point[]): { minX: number; minY: number; maxX: number; maxY: number } {
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
  return { minX, minY, maxX, maxY };
}

/**
 * Draw a filled and stroked polygon on the canvas.
 */
function drawPolygon(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  fillColor: string | CanvasGradient,
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

function lineWidthForFace(type: IsoFace['type'], fitScale: number): number {
  const baseScale = clamp(fitScale / 140, 0.75, 1.3);
  switch (type) {
    case 'wall-front':
    case 'wall-side':
      return 1.0 * baseScale;
    case 'wall-top':
    case 'roof':
      return 0.95 * baseScale;
    case 'door-opening':
    case 'window-opening':
      return 0.85 * baseScale;
    case 'window-glass':
      return 0.7 * baseScale;
    case 'furniture-box':
      return 0.8 * baseScale;
    case 'floor':
    default:
      return 0.45 * baseScale;
  }
}

function fillStyleForFace(
  ctx: CanvasRenderingContext2D,
  face: IsoFace,
  points: Point[],
  depthT: number,
): string | CanvasGradient {
  const { minX, minY, maxX, maxY } = polygonBounds(points);
  const base = face.color;

  if (face.type === 'window-glass') {
    return base;
  }

  if (face.type === 'floor') {
    const grad = ctx.createLinearGradient(minX, minY, maxX, maxY);
    grad.addColorStop(0, lightenColor(base, 0.05));
    grad.addColorStop(1, darkenColor(base, 0.93));
    return grad;
  }

  if (
    face.type === 'wall-front'
    || face.type === 'wall-side'
    || face.type === 'wall-top'
    || face.type === 'furniture-box'
    || face.type === 'roof'
  ) {
    const grad = ctx.createLinearGradient(minX, minY, maxX, maxY);
    grad.addColorStop(0, lightenColor(base, 0.16 - depthT * 0.05));
    grad.addColorStop(0.6, base);
    grad.addColorStop(1, darkenColor(base, 0.86));
    return grad;
  }

  return base;
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
  // --- 1. Clear canvas with soft drafting gradient background ---
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const bg = ctx.createLinearGradient(0, 0, 0, canvasHeight);
  bg.addColorStop(0, BACKGROUND_TOP);
  bg.addColorStop(1, BACKGROUND_BOTTOM);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  // Subtle vignette helps depth separation.
  const vignette = ctx.createRadialGradient(
    canvasWidth / 2,
    canvasHeight / 2,
    Math.min(canvasWidth, canvasHeight) * 0.2,
    canvasWidth / 2,
    canvasHeight / 2,
    Math.max(canvasWidth, canvasHeight) * 0.65,
  );
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.06)');
  ctx.fillStyle = vignette;
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
  const minDepth = faces.reduce((m, f) => Math.min(m, f.depth), Infinity);
  const maxDepth = faces.reduce((m, f) => Math.max(m, f.depth), -Infinity);
  const depthRange = Math.max(1e-6, maxDepth - minDepth);

  // --- 3. Render faces (already sorted back-to-front) ---
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  for (const face of faces) {
    // Transform projected points to screen coordinates
    const screenPoints = face.points.map((p) => ({
      x: screenCenterX + (p.x - worldCenterX) * scale,
      y: screenCenterY + (p.y - worldCenterY) * scale,
    }));

    const depthT = clamp((face.depth - minDepth) / depthRange, 0, 1);
    const fillStyle = fillStyleForFace(ctx, face, screenPoints, depthT);
    const lineWidth = lineWidthForFace(face.type, scale);
    const strokeColor = darkenColor(face.color, STROKE_DARKEN - depthT * 0.06);

    if (face.type === 'window-glass') {
      ctx.globalAlpha = clamp(0.62 - depthT * 0.2, 0.28, 0.68);
    } else if (face.type === 'floor') {
      ctx.globalAlpha = 0.9;
    } else {
      ctx.globalAlpha = clamp(0.98 - depthT * 0.14, 0.72, 1);
    }

    drawPolygon(ctx, screenPoints, fillStyle, strokeColor, lineWidth);
  }

  // Crisp top-edge pass improves shape readability.
  ctx.globalAlpha = 0.35;
  for (const face of faces) {
    if (face.type !== 'wall-top' && face.type !== 'roof') continue;
    const screenPoints = face.points.map((p) => ({
      x: screenCenterX + (p.x - worldCenterX) * scale,
      y: screenCenterY + (p.y - worldCenterY) * scale,
    }));
    drawPolygon(ctx, screenPoints, 'rgba(0,0,0,0)', darkenColor(face.color, 0.58), lineWidthForFace(face.type, scale) * 0.9);
  }

  ctx.restore();
}
