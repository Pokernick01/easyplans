// ---------------------------------------------------------------------------
// PNG Export
// ---------------------------------------------------------------------------

export interface PNGExportOptions {
  /** Output width in pixels. */
  width: number;
  /** Output height in pixels. */
  height: number;
  /** Project name displayed in the title block. */
  projectName: string;
  /** Author name displayed in the title block. */
  author: string;
  /** Scale string (e.g. "1:100") displayed in the title block. */
  scale: string;
  /** Date string displayed in the title block. */
  date: string;
  /** If true, export with transparent background (no white fill, no border/title). */
  transparent?: boolean;
  /** If true, include the title block even on opaque exports. @default true */
  includeTitleBlock?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TITLE_BLOCK_HEIGHT = 60; // px
const BORDER_MARGIN = 20; // px
const TITLE_FONT = 'bold 14px "Segoe UI", Arial, sans-serif';
const INFO_FONT = '11px "Segoe UI", Arial, sans-serif';
const NORTH_ARROW_SIZE = 30; // px

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Draw a simple north arrow pointing up.
 */
function drawNorthArrow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
): void {
  ctx.save();
  ctx.strokeStyle = '#333333';
  ctx.fillStyle = '#333333';
  ctx.lineWidth = 1.5;

  // Arrow shaft
  ctx.beginPath();
  ctx.moveTo(cx, cy + size / 2);
  ctx.lineTo(cx, cy - size / 2);
  ctx.stroke();

  // Arrowhead
  ctx.beginPath();
  ctx.moveTo(cx, cy - size / 2);
  ctx.lineTo(cx - size / 4, cy - size / 4);
  ctx.lineTo(cx + size / 4, cy - size / 4);
  ctx.closePath();
  ctx.fill();

  // "N" label
  ctx.font = 'bold 12px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('N', cx, cy + size / 2 + 2);

  ctx.restore();
}

/**
 * Draw the title block at the bottom of the canvas.
 */
function drawTitleBlock(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  options: PNGExportOptions,
): void {
  const blockY = canvasHeight - BORDER_MARGIN - TITLE_BLOCK_HEIGHT;
  const blockX = BORDER_MARGIN;
  const blockWidth = canvasWidth - BORDER_MARGIN * 2;

  ctx.save();

  // Block background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(blockX, blockY, blockWidth, TITLE_BLOCK_HEIGHT);

  // Block border
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(blockX, blockY, blockWidth, TITLE_BLOCK_HEIGHT);

  // Vertical dividers (4 columns)
  const col1 = blockX + blockWidth * 0.35;
  const col2 = blockX + blockWidth * 0.55;
  const col3 = blockX + blockWidth * 0.75;

  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(col1, blockY);
  ctx.lineTo(col1, blockY + TITLE_BLOCK_HEIGHT);
  ctx.moveTo(col2, blockY);
  ctx.lineTo(col2, blockY + TITLE_BLOCK_HEIGHT);
  ctx.moveTo(col3, blockY);
  ctx.lineTo(col3, blockY + TITLE_BLOCK_HEIGHT);
  ctx.stroke();

  // Text
  ctx.fillStyle = '#333333';
  const textY = blockY + 15;
  const valueY = blockY + 38;

  // Column 1: Project name
  ctx.font = INFO_FONT;
  ctx.textAlign = 'left';
  ctx.fillText('PROJECT', blockX + 10, textY);
  ctx.font = TITLE_FONT;
  ctx.fillText(options.projectName, blockX + 10, valueY);

  // Column 2: Author
  ctx.font = INFO_FONT;
  ctx.fillText('AUTHOR', col1 + 10, textY);
  ctx.font = '12px "Segoe UI", Arial, sans-serif';
  ctx.fillText(options.author, col1 + 10, valueY);

  // Column 3: Date
  ctx.font = INFO_FONT;
  ctx.fillText('DATE', col2 + 10, textY);
  ctx.font = '12px "Segoe UI", Arial, sans-serif';
  ctx.fillText(options.date, col2 + 10, valueY);

  // Column 4: Scale
  ctx.font = INFO_FONT;
  ctx.fillText('SCALE', col3 + 10, textY);
  ctx.font = 'bold 13px "Segoe UI", Arial, sans-serif';
  ctx.fillText(options.scale, col3 + 10, valueY);

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Main export function
// ---------------------------------------------------------------------------

/**
 * Export a rendered floor plan (or any view) to a PNG file download.
 *
 * @param renderFn  A callback that draws the plan content onto the provided
 *                  canvas context within the given (width, height) area.
 * @param options   Export options (dimensions, metadata for title block).
 */
export function exportToPNG(
  renderFn: (ctx: CanvasRenderingContext2D, width: number, height: number) => void,
  options: PNGExportOptions,
): void {
  // --- 1. Create offscreen canvas ---
  const canvas = document.createElement('canvas');
  canvas.width = options.width;
  canvas.height = options.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const isTransparent = options.transparent === true;
  const showTitleBlock = !isTransparent && options.includeTitleBlock !== false;

  if (isTransparent) {
    // Transparent: just draw the content, no border/title/north arrow
    ctx.clearRect(0, 0, options.width, options.height);
    renderFn(ctx, options.width, options.height);
  } else {
    // --- 2. Fill with white background ---
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, options.width, options.height);

    // --- 3. Draw title block border ---
    if (showTitleBlock) {
      ctx.strokeStyle = '#333333';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        BORDER_MARGIN,
        BORDER_MARGIN,
        options.width - BORDER_MARGIN * 2,
        options.height - BORDER_MARGIN * 2,
      );

      // --- 4. Draw title block text at bottom ---
      drawTitleBlock(ctx, options.width, options.height, options);

      // --- 5. Draw north arrow in top-right ---
      drawNorthArrow(
        ctx,
        options.width - BORDER_MARGIN - NORTH_ARROW_SIZE,
        BORDER_MARGIN + NORTH_ARROW_SIZE + 10,
        NORTH_ARROW_SIZE,
      );
    }

    // --- 6. Call renderFn to draw plan content in center area ---
    const contentX = showTitleBlock ? BORDER_MARGIN + 10 : 0;
    const contentY = showTitleBlock ? BORDER_MARGIN + 10 : 0;
    const contentWidth = showTitleBlock
      ? options.width - BORDER_MARGIN * 2 - 20
      : options.width;
    const contentHeight = showTitleBlock
      ? options.height - BORDER_MARGIN * 2 - TITLE_BLOCK_HEIGHT - 20
      : options.height;

    ctx.save();
    ctx.beginPath();
    ctx.rect(contentX, contentY, contentWidth, contentHeight);
    ctx.clip();
    ctx.translate(contentX, contentY);
    renderFn(ctx, contentWidth, contentHeight);
    ctx.restore();
  }

  // --- 7. Convert to blob and trigger download ---
  canvas.toBlob((blob) => {
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeName = options.projectName.replace(/[^a-zA-Z0-9_\-\s]/g, '').replace(/\s+/g, '_').slice(0, 200) || 'project';
    link.download = `${safeName}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 'image/png');
}
