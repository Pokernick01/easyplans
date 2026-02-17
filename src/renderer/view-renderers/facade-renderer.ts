import type { FacadeElement } from '@/engine/views/facade';
import { drawNeufertElevation } from '@/engine/views/neufert-elevation';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TITLE_FONT = 'bold 14px "Segoe UI", Arial, sans-serif';
const MARGIN = 60; // px margin around the drawing area

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute the bounding box of all facade elements.
 */
function computeBounds(facades: FacadeElement[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const el of facades) {
    if (el.x < minX) minX = el.x;
    if (el.y < minY) minY = el.y;
    if (el.x + el.width > maxX) maxX = el.x + el.width;
    if (el.y + el.height > maxY) maxY = el.y + el.height;
  }

  const pad = 0.5;
  return {
    minX: minX - pad,
    minY: minY - pad,
    maxX: maxX + pad,
    maxY: maxY + pad,
  };
}

// ---------------------------------------------------------------------------
// Main renderer
// ---------------------------------------------------------------------------

/**
 * Render a facade (elevation) view onto a canvas.
 *
 * @param ctx            Canvas 2D rendering context.
 * @param canvasWidth    Canvas width in pixels.
 * @param canvasHeight   Canvas height in pixels.
 * @param facades        Array of FacadeElement objects to render.
 * @param pixelsPerMeter Scale factor (pixels per meter).
 * @param direction      Facade viewing direction label (optional, for title).
 */
export function renderFacade(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  facades: FacadeElement[],
  pixelsPerMeter: number,
  direction: string = '',
): void {
  // --- 1. Clear canvas ---
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  ctx.restore();

  if (facades.length === 0) return;

  // --- 2. Compute bounds and scale ---
  const bounds = computeBounds(facades);
  const worldWidth = bounds.maxX - bounds.minX;
  const worldHeight = bounds.maxY - bounds.minY;

  const drawableWidth = canvasWidth - MARGIN * 2;
  const drawableHeight = canvasHeight - MARGIN * 2 - 30;
  const fitScale = Math.min(
    drawableWidth / (worldWidth * pixelsPerMeter),
    drawableHeight / (worldHeight * pixelsPerMeter),
    1,
  );
  const effectivePPM = pixelsPerMeter * fitScale;

  // --- Center the view ---
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2 + 15;
  const worldCenterX = (bounds.minX + bounds.maxX) / 2;
  const worldCenterY = (bounds.minY + bounds.maxY) / 2;

  function toScreenX(wx: number): number {
    return centerX + (wx - worldCenterX) * effectivePPM;
  }

  function toScreenY(wy: number): number {
    return centerY - (wy - worldCenterY) * effectivePPM;
  }

  // --- 6. Title ---
  const dirLabel = direction ? ` - ${direction.toUpperCase()}` : '';
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.font = TITLE_FONT;
  ctx.fillStyle = '#222222';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(`FACHADA / FACADE${dirLabel}`, canvasWidth / 2, 12);
  ctx.restore();

  // --- 5. Draw ground line ---
  const groundElements = facades.filter((e) => e.type === 'ground');
  for (const ground of groundElements) {
    const sx = toScreenX(ground.x);
    const sy = toScreenY(0);
    const sw = ground.width * effectivePPM;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + sw, sy);
    ctx.stroke();

    // Ground hatch
    ctx.strokeStyle = '#a0755a';
    ctx.lineWidth = 0.5;
    const hatchSpacing = 8;
    for (let hx = sx; hx < sx + sw; hx += hatchSpacing) {
      ctx.beginPath();
      ctx.moveTo(hx, sy);
      ctx.lineTo(hx - 6, sy + 10);
      ctx.stroke();
    }
    ctx.restore();
  }

  // --- 2. Draw wall faces ---
  const wallFaces = facades.filter((e) => e.type === 'wall-face');
  for (const wall of wallFaces) {
    const sx = toScreenX(wall.x);
    const sy = toScreenY(wall.y + wall.height);
    const sw = wall.width * effectivePPM;
    const sh = wall.height * effectivePPM;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Wall fill
    ctx.fillStyle = wall.color;
    ctx.fillRect(sx, sy, sw, sh);

    // Outline
    ctx.strokeStyle = '#555555';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(sx, sy, sw, sh);

    ctx.restore();
  }

  // --- 3. Draw door openings ---
  const doorElements = facades.filter((e) => e.type === 'door-opening');
  for (const door of doorElements) {
    const sx = toScreenX(door.x);
    const sy = toScreenY(door.y + door.height);
    const sw = door.width * effectivePPM;
    const sh = door.height * effectivePPM;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Clear the opening
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(sx, sy, sw, sh);

    // Door frame
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(sx, sy, sw, sh);

    // Door panel detail (two vertical lines)
    const panelInset = sw * 0.1;
    ctx.strokeStyle = '#888888';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(sx + panelInset, sy + panelInset, sw - panelInset * 2, sh - panelInset);

    // Door handle
    const handleX = sx + sw * 0.75;
    const handleY = sy + sh * 0.5;
    ctx.fillStyle = '#555555';
    ctx.beginPath();
    ctx.arc(handleX, handleY, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // --- 4. Draw window openings (with glass cross pattern) ---
  const windowElements = facades.filter((e) => e.type === 'window-opening');
  for (const win of windowElements) {
    const sx = toScreenX(win.x);
    const sy = toScreenY(win.y + win.height);
    const sw = win.width * effectivePPM;
    const sh = win.height * effectivePPM;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Glass fill
    ctx.fillStyle = '#d4eaf7';
    ctx.fillRect(sx, sy, sw, sh);

    // Window frame
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(sx, sy, sw, sh);

    // Cross pattern (mullions)
    ctx.strokeStyle = '#555555';
    ctx.lineWidth = 1;

    // Vertical mullion
    ctx.beginPath();
    ctx.moveTo(sx + sw / 2, sy);
    ctx.lineTo(sx + sw / 2, sy + sh);
    ctx.stroke();

    // Horizontal mullion
    ctx.beginPath();
    ctx.moveTo(sx, sy + sh / 2);
    ctx.lineTo(sx + sw, sy + sh / 2);
    ctx.stroke();

    // Sill
    ctx.strokeStyle = '#444444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx - 3, sy + sh);
    ctx.lineTo(sx + sw + 3, sy + sh);
    ctx.stroke();

    // Lintel
    ctx.beginPath();
    ctx.moveTo(sx - 3, sy);
    ctx.lineTo(sx + sw + 3, sy);
    ctx.stroke();

    ctx.restore();
  }

  // --- Roof line ---
  const roofElements = facades.filter((e) => e.type === 'roof-line');
  for (const roof of roofElements) {
    const sx = toScreenX(roof.x);
    const sy = toScreenY(roof.y);
    const sw = roof.width * effectivePPM;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.strokeStyle = '#444444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + sw, sy);
    ctx.stroke();
    ctx.restore();
  }

  // --- Silhouette elements (Neufert-style architectural elevations) ---
  const silhouettes = facades.filter((e) => e.type === 'silhouette');
  for (const sil of silhouettes) {
    const sx = toScreenX(sil.x);
    const sy = toScreenY(sil.y + sil.height);
    const sw = sil.width * effectivePPM;
    const sh = sil.height * effectivePPM;

    // Use original stampId if available, else fallback to pseudo-stampId
    const stampId = sil.stampId
      ?? (sil.silhouetteType === 'person' ? 'person-standing'
        : sil.silhouetteType === 'tree' ? 'tree-large'
        : sil.silhouetteType === 'car' ? 'car'
        : 'generic');

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.translate(sx, sy);
    ctx.scale(sw / sil.width, sh / sil.height);
    drawNeufertElevation(ctx, stampId, sil.width, sil.height, '#444');
    ctx.restore();
  }
}
