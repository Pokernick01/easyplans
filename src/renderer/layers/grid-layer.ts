// ---------------------------------------------------------------------------
// Grid layer -- draws minor/major grid lines and origin axes
// ---------------------------------------------------------------------------

/**
 * Render the background grid.
 *
 * All coordinates are in world space (meters). The context is already
 * transformed so that 1 unit = 1 meter on screen.
 *
 * @param ctx            Pre-transformed canvas context.
 * @param visibleBounds  World-space AABB currently visible.
 * @param gridSizeMajor  Major grid spacing in meters (e.g. 1.0).
 * @param gridSizeMinor  Minor grid spacing in meters (e.g. 0.1).
 * @param pixelsPerMeter Current camera zoom (px per meter).
 */
export function renderGrid(
  ctx: CanvasRenderingContext2D,
  visibleBounds: { minX: number; minY: number; maxX: number; maxY: number },
  gridSizeMajor: number,
  gridSizeMinor: number,
  pixelsPerMeter: number,
): void {
  const { minX, minY, maxX, maxY } = visibleBounds;

  // A 1-screen-pixel line in world units
  const px = 1 / pixelsPerMeter;

  // -------------------------------------------------------------------
  // Minor grid -- only draw when the on-screen spacing is large enough
  // to be useful (> 8 screen pixels).
  // -------------------------------------------------------------------
  const minorScreenSize = pixelsPerMeter * gridSizeMinor;

  if (minorScreenSize > 8) {
    ctx.beginPath();
    ctx.strokeStyle = '#2a2a4a';
    ctx.lineWidth = px;

    const startX = Math.floor(minX / gridSizeMinor) * gridSizeMinor;
    const startY = Math.floor(minY / gridSizeMinor) * gridSizeMinor;

    for (let x = startX; x <= maxX; x += gridSizeMinor) {
      ctx.moveTo(x, minY);
      ctx.lineTo(x, maxY);
    }
    for (let y = startY; y <= maxY; y += gridSizeMinor) {
      ctx.moveTo(minX, y);
      ctx.lineTo(maxX, y);
    }

    ctx.stroke();
  }

  // -------------------------------------------------------------------
  // Major grid -- always drawn
  // -------------------------------------------------------------------
  ctx.beginPath();
  ctx.strokeStyle = '#3a3a5a';
  ctx.lineWidth = px;

  const majorStartX = Math.floor(minX / gridSizeMajor) * gridSizeMajor;
  const majorStartY = Math.floor(minY / gridSizeMajor) * gridSizeMajor;

  for (let x = majorStartX; x <= maxX; x += gridSizeMajor) {
    ctx.moveTo(x, minY);
    ctx.lineTo(x, maxY);
  }
  for (let y = majorStartY; y <= maxY; y += gridSizeMajor) {
    ctx.moveTo(minX, y);
    ctx.lineTo(maxX, y);
  }

  ctx.stroke();

  // -------------------------------------------------------------------
  // Origin axes -- bright accent lines through (0, 0)
  // -------------------------------------------------------------------
  ctx.beginPath();
  ctx.strokeStyle = '#5a7abf';
  ctx.lineWidth = 2 * px;

  // X axis
  ctx.moveTo(minX, 0);
  ctx.lineTo(maxX, 0);

  // Y axis
  ctx.moveTo(0, minY);
  ctx.lineTo(0, maxY);

  ctx.stroke();
}
