import type { SectionElement } from '@/engine/views/cross-section';
import type { FurnitureItem } from '@/types/elements';
import { drawNeufertElevation, classifyStamp, elevationHeight, elevationWidth } from '@/engine/views/neufert-elevation';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TITLE_FONT = 'bold 14px "Segoe UI", Arial, sans-serif';
const DIM_FONT = '10px "Segoe UI", Arial, sans-serif';
const MARGIN = 60; // px margin around the drawing area

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute the bounding box of all section elements.
 */
function computeBounds(sections: SectionElement[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const el of sections) {
    if (el.x < minX) minX = el.x;
    if (el.y < minY) minY = el.y;
    if (el.x + el.width > maxX) maxX = el.x + el.width;
    if (el.y + el.height > maxY) maxY = el.y + el.height;
  }

  // Add some padding
  const pad = 0.5;
  return {
    minX: minX - pad,
    minY: minY - pad,
    maxX: maxX + pad,
    maxY: maxY + pad,
  };
}

/**
 * Draw a dimension annotation between two vertical or horizontal coordinates.
 */
function drawDimensionVertical(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY1: number,
  screenY2: number,
  label: string,
  offset: number,
): void {
  const x = screenX + offset;
  const midY = (screenY1 + screenY2) / 2;

  ctx.save();
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 0.5;
  ctx.setLineDash([3, 2]);

  // Extension lines
  ctx.beginPath();
  ctx.moveTo(screenX, screenY1);
  ctx.lineTo(x + 5, screenY1);
  ctx.moveTo(screenX, screenY2);
  ctx.lineTo(x + 5, screenY2);
  ctx.stroke();

  // Dimension line
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(x, screenY1);
  ctx.lineTo(x, screenY2);
  ctx.stroke();

  // Arrowheads
  const arrowSize = 4;
  ctx.beginPath();
  ctx.moveTo(x, screenY1);
  ctx.lineTo(x - arrowSize, screenY1 + arrowSize);
  ctx.lineTo(x + arrowSize, screenY1 + arrowSize);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(x, screenY2);
  ctx.lineTo(x - arrowSize, screenY2 - arrowSize);
  ctx.lineTo(x + arrowSize, screenY2 - arrowSize);
  ctx.closePath();
  ctx.fill();

  // Label
  ctx.font = DIM_FONT;
  ctx.fillStyle = '#333333';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + 15, midY);

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Main renderer
// ---------------------------------------------------------------------------

/**
 * Render a cross-section view onto a canvas.
 *
 * @param ctx            Canvas 2D rendering context.
 * @param canvasWidth    Canvas width in pixels.
 * @param canvasHeight   Canvas height in pixels.
 * @param sections       Array of SectionElement objects to render.
 * @param pixelsPerMeter Scale factor (pixels per meter).
 * @param furniture      Optional furniture items for Neufert silhouettes.
 * @param cutCoordinate  Cut coordinate (X or Y depending on cut axis).
 * @param directionLabel Optional direction label for the title (e.g. "Norte").
 * @param cutAxis        Axis used for section proximity filtering.
 */
export function renderCrossSection(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  sections: SectionElement[],
  pixelsPerMeter: number,
  furniture?: FurnitureItem[],
  cutCoordinate?: number,
  directionLabel?: string,
  cutAxis: 'x' | 'y' = 'y',
): void {
  // --- 1. Clear canvas ---
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  ctx.restore();

  if (sections.length === 0) return;

  // --- 2. Compute bounds ---
  const bounds = computeBounds(sections);
  const worldWidth = bounds.maxX - bounds.minX;
  const worldHeight = bounds.maxY - bounds.minY;

  // Fit the view to the available area
  const drawableWidth = canvasWidth - MARGIN * 2;
  const drawableHeight = canvasHeight - MARGIN * 2 - 30; // 30px for title
  const fitScale = Math.min(
    drawableWidth / (worldWidth * pixelsPerMeter),
    drawableHeight / (worldHeight * pixelsPerMeter),
    1,
  );
  const effectivePPM = pixelsPerMeter * fitScale;

  // --- 3. Center the view ---
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2 + 15; // offset for title
  const worldCenterX = (bounds.minX + bounds.maxX) / 2;
  const worldCenterY = (bounds.minY + bounds.maxY) / 2;

  /** Convert world coordinates to screen coordinates. */
  function toScreenX(wx: number): number {
    return centerX + (wx - worldCenterX) * effectivePPM;
  }

  /** Convert world Y to screen Y (Y axis is flipped: up in world = up on screen). */
  function toScreenY(wy: number): number {
    return centerY - (wy - worldCenterY) * effectivePPM;
  }

  // --- 10. Title ---
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.font = TITLE_FONT;
  ctx.fillStyle = '#222222';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const dirSuffix = directionLabel ? ` - ${directionLabel.toUpperCase()}` : '';
  ctx.fillText(`CORTE / CROSS SECTION${dirSuffix}`, canvasWidth / 2, 12);
  ctx.restore();

  // --- 4. Draw ground line ---
  const groundElements = sections.filter((e) => e.type === 'ground');
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

    // Hatch below the ground line
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

  // --- 9. Draw floor slabs ---
  const slabElements = sections.filter((e) => e.type === 'floor-slab');
  for (const slab of slabElements) {
    const sx = toScreenX(slab.x);
    const sy = toScreenY(slab.y + slab.height);
    const sw = slab.width * effectivePPM;
    const sh = slab.height * effectivePPM;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = slab.color;
    ctx.strokeStyle = '#444444';
    ctx.lineWidth = 1;
    ctx.fillRect(sx, sy, sw, sh);
    ctx.strokeRect(sx, sy, sw, sh);
    ctx.restore();
  }

  // --- 5. Draw wall sections ---
  const wallElements = sections.filter((e) => e.type === 'wall');
  for (const wall of wallElements) {
    const sx = toScreenX(wall.x);
    const sy = toScreenY(wall.y + wall.height);
    const sw = wall.width * effectivePPM;
    const sh = wall.height * effectivePPM;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Filled rectangle
    ctx.fillStyle = wall.color;
    ctx.fillRect(sx, sy, sw, sh);

    // Hatch pattern for cut wall
    ctx.strokeStyle = '#555555';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    const spacing = 6;
    for (let d = -sh; d < sw + sh; d += spacing) {
      ctx.moveTo(sx + Math.max(0, d), sy + Math.max(0, -d));
      ctx.lineTo(
        sx + Math.min(sw, d + sh),
        sy + Math.min(sh, sh - d),
      );
    }
    ctx.stroke();

    // Outline
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(sx, sy, sw, sh);

    ctx.restore();
  }

  // --- 6. Draw door openings (white gaps over walls) ---
  const doorElements = sections.filter((e) => e.type === 'door-opening');
  for (const door of doorElements) {
    const sx = toScreenX(door.x);
    const sy = toScreenY(door.y + door.height);
    const sw = door.width * effectivePPM;
    const sh = door.height * effectivePPM;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // White gap
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(sx, sy, sw, sh);

    // Door frame lines
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx, sy + sh);
    ctx.moveTo(sx + sw, sy);
    ctx.lineTo(sx + sw, sy + sh);
    ctx.stroke();

    // Door threshold
    ctx.setLineDash([4, 2]);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + sw, sy);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();
  }

  // --- 7. Draw window openings with glass lines ---
  const windowElements = sections.filter((e) => e.type === 'window-opening');
  for (const win of windowElements) {
    const sx = toScreenX(win.x);
    const sy = toScreenY(win.y + win.height);
    const sw = win.width * effectivePPM;
    const sh = win.height * effectivePPM;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // White gap
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(sx, sy, sw, sh);

    // Window frame
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    ctx.strokeRect(sx, sy, sw, sh);

    // Glass lines (two thin lines in the middle representing the glass pane)
    ctx.strokeStyle = '#87CEEB';
    ctx.lineWidth = 1.5;
    const glassMid = sx + sw / 2;
    ctx.beginPath();
    ctx.moveTo(glassMid - 1, sy + 2);
    ctx.lineTo(glassMid - 1, sy + sh - 2);
    ctx.moveTo(glassMid + 1, sy + 2);
    ctx.lineTo(glassMid + 1, sy + sh - 2);
    ctx.stroke();

    // Sill line
    ctx.strokeStyle = '#555555';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx - 3, sy + sh);
    ctx.lineTo(sx + sw + 3, sy + sh);
    ctx.stroke();

    ctx.restore();
  }

  // --- 8. Dimension annotations ---
  // Find the tallest wall for dimension lines
  const tallestWall = wallElements.reduce(
    (max, w) => (w.height > max.height ? w : max),
    wallElements[0],
  );

  if (tallestWall) {
    const wallScreenX = toScreenX(tallestWall.x + tallestWall.width);
    const wallBottomY = toScreenY(0);
    const wallTopY = toScreenY(tallestWall.height);

    drawDimensionVertical(
      ctx,
      wallScreenX,
      wallTopY,
      wallBottomY,
      `${tallestWall.height.toFixed(2)} m`,
      20,
    );
  }

  // Floor height dimension (from ground to upper slab)
  const upperSlab = slabElements.find((s) => s.y > 0);
  if (upperSlab) {
    const rightEdge = toScreenX(bounds.maxX - 0.5);
    const groundY = toScreenY(0);
    const upperY = toScreenY(upperSlab.y + upperSlab.height);

    drawDimensionVertical(
      ctx,
      rightEdge,
      upperY,
      groundY,
      `${(upperSlab.y + upperSlab.height).toFixed(2)} m`,
      40,
    );
  }

  // --- 11. Furniture Neufert elevation silhouettes ---
  if (furniture && furniture.length > 0 && cutCoordinate !== undefined) {
    const cutTolerance = 2.0; // meters -- items within 2m of cut line are shown
    for (const item of furniture) {
      if (!item.visible) continue;
      const nearCoord = cutAxis === 'y' ? item.position.y : item.position.x;
      if (Math.abs(nearCoord - cutCoordinate) > cutTolerance) continue;

      const type = classifyStamp(item.stampId);
      const elW = elevationWidth(type);
      const elH = elevationHeight(type);
      const alongCoord = cutAxis === 'y' ? item.position.x : item.position.y;

      // Convert to the cut-line distance coordinate system
      const sx = toScreenX(alongCoord - elW / 2);
      const sy = toScreenY(elH);
      const sw = elW * effectivePPM;
      const sh = elH * effectivePPM;

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.translate(sx, sy);
      ctx.scale(sw / elW, sh / elH);
      drawNeufertElevation(ctx, item.stampId, elW, elH, '#555');
      ctx.restore();
    }
  }
}
