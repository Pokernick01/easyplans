import { jsPDF } from 'jspdf';

// ---------------------------------------------------------------------------
// PDF Export
// ---------------------------------------------------------------------------

export interface PDFExportOptions {
  /** Paper size. */
  paperSize: 'A4' | 'A3' | 'Letter';
  /** Project name displayed in the title block. */
  projectName: string;
  /** Author name displayed in the title block. */
  author: string;
  /** Scale string (e.g. "1:100") displayed in the title block. */
  scale: string;
  /** Date string displayed in the title block. */
  date: string;
  /** Page orientation. */
  orientation: 'portrait' | 'landscape';
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TITLE_BLOCK_HEIGHT_MM = 20; // mm
const BORDER_MARGIN_MM = 10; // mm
const DPI = 300; // target resolution for the raster content
const MM_PER_INCH = 25.4;

// ---------------------------------------------------------------------------
// Paper dimensions (mm)
// ---------------------------------------------------------------------------

function getPaperDimensions(
  paperSize: 'A4' | 'A3' | 'Letter',
  orientation: 'portrait' | 'landscape',
): { width: number; height: number } {
  let w: number;
  let h: number;

  switch (paperSize) {
    case 'A4':
      w = 210;
      h = 297;
      break;
    case 'A3':
      w = 297;
      h = 420;
      break;
    case 'Letter':
      w = 215.9;
      h = 279.4;
      break;
  }

  if (orientation === 'landscape') {
    return { width: h, height: w };
  }
  return { width: w, height: h };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Draw a scale bar onto the PDF page.
 * Shows 1-meter increments.
 */
function drawScaleBar(
  doc: jsPDF,
  x: number,
  y: number,
  scaleFactor: number,
  segments: number,
): void {
  const segmentWidthMM = scaleFactor; // 1 meter in mm at the given scale

  doc.setDrawColor(51, 51, 51);
  doc.setLineWidth(0.3);

  for (let i = 0; i < segments; i++) {
    const sx = x + i * segmentWidthMM;

    // Alternating black/white fills
    if (i % 2 === 0) {
      doc.setFillColor(51, 51, 51);
    } else {
      doc.setFillColor(255, 255, 255);
    }

    doc.rect(sx, y, segmentWidthMM, 3, 'FD');

    // Label
    doc.setFontSize(6);
    doc.setTextColor(51, 51, 51);
    doc.text(`${i}`, sx, y + 5.5);
  }

  // End label
  doc.text(`${segments} m`, x + segments * segmentWidthMM, y + 5.5);
}

/**
 * Draw the title block at the bottom of the page.
 */
function drawTitleBlock(
  doc: jsPDF,
  pageWidth: number,
  pageHeight: number,
  options: PDFExportOptions,
): void {
  const blockX = BORDER_MARGIN_MM;
  const blockY = pageHeight - BORDER_MARGIN_MM - TITLE_BLOCK_HEIGHT_MM;
  const blockWidth = pageWidth - BORDER_MARGIN_MM * 2;

  // Block border
  doc.setDrawColor(51, 51, 51);
  doc.setLineWidth(0.5);
  doc.rect(blockX, blockY, blockWidth, TITLE_BLOCK_HEIGHT_MM);

  // Column dividers
  const col1 = blockX + blockWidth * 0.35;
  const col2 = blockX + blockWidth * 0.55;
  const col3 = blockX + blockWidth * 0.75;

  doc.setLineWidth(0.2);
  doc.line(col1, blockY, col1, blockY + TITLE_BLOCK_HEIGHT_MM);
  doc.line(col2, blockY, col2, blockY + TITLE_BLOCK_HEIGHT_MM);
  doc.line(col3, blockY, col3, blockY + TITLE_BLOCK_HEIGHT_MM);

  doc.setTextColor(80, 80, 80);

  // Column 1: Project name
  doc.setFontSize(7);
  doc.text('PROJECT', blockX + 3, blockY + 5);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(options.projectName, blockX + 3, blockY + 13);

  // Column 2: Author
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('AUTHOR', col1 + 3, blockY + 5);
  doc.setFontSize(9);
  doc.text(options.author, col1 + 3, blockY + 13);

  // Column 3: Date
  doc.setFontSize(7);
  doc.text('DATE', col2 + 3, blockY + 5);
  doc.setFontSize(9);
  doc.text(options.date, col2 + 3, blockY + 13);

  // Column 4: Scale
  doc.setFontSize(7);
  doc.text('SCALE', col3 + 3, blockY + 5);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(options.scale, col3 + 3, blockY + 13);
  doc.setFont('helvetica', 'normal');
}

// ---------------------------------------------------------------------------
// Main export function
// ---------------------------------------------------------------------------

/**
 * Export a rendered floor plan (or any view) to a PDF file download.
 *
 * @param renderFn  A callback that draws the plan content onto the provided
 *                  canvas context within the given (width, height) area.
 * @param options   Export options (paper size, metadata for title block).
 */
export function exportToPDF(
  renderFn: (ctx: CanvasRenderingContext2D, width: number, height: number) => void,
  options: PDFExportOptions,
): void {
  // --- 1. Create jsPDF instance ---
  const doc = new jsPDF({
    orientation: options.orientation === 'landscape' ? 'l' : 'p',
    unit: 'mm',
    format: options.paperSize.toLowerCase(),
  });

  // --- 2. Get paper dimensions in mm ---
  const { width: pageWidth, height: pageHeight } = getPaperDimensions(
    options.paperSize,
    options.orientation,
  );

  // --- 3. Draw page border ---
  doc.setDrawColor(51, 51, 51);
  doc.setLineWidth(0.5);
  doc.rect(
    BORDER_MARGIN_MM,
    BORDER_MARGIN_MM,
    pageWidth - BORDER_MARGIN_MM * 2,
    pageHeight - BORDER_MARGIN_MM * 2,
  );

  // --- 3b. Draw title block ---
  drawTitleBlock(doc, pageWidth, pageHeight, options);

  // --- 4. Draw scale bar ---
  // Parse the scale ratio to compute mm-per-meter
  const scaleMatch = options.scale.match(/1:(\d+)/);
  const scaleRatio = scaleMatch ? parseInt(scaleMatch[1]) : 100;
  const mmPerMeter = 1000 / scaleRatio; // e.g. 1:100 => 10 mm/m

  const scaleBarSegments = Math.min(5, Math.floor((pageWidth - BORDER_MARGIN_MM * 2 - 20) / mmPerMeter));
  if (scaleBarSegments > 0) {
    drawScaleBar(
      doc,
      BORDER_MARGIN_MM + 5,
      pageHeight - BORDER_MARGIN_MM - TITLE_BLOCK_HEIGHT_MM - 10,
      mmPerMeter,
      scaleBarSegments,
    );
  }

  // --- 5. Create offscreen canvas at 300 DPI for the drawable area ---
  const drawableWidthMM = pageWidth - BORDER_MARGIN_MM * 2 - 4;
  const drawableHeightMM = pageHeight - BORDER_MARGIN_MM * 2 - TITLE_BLOCK_HEIGHT_MM - 18;

  const canvasWidthPx = Math.round((drawableWidthMM / MM_PER_INCH) * DPI);
  const canvasHeightPx = Math.round((drawableHeightMM / MM_PER_INCH) * DPI);

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidthPx;
  canvas.height = canvasHeightPx;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasWidthPx, canvasHeightPx);

  // --- 6. Render plan content ---
  renderFn(ctx, canvasWidthPx, canvasHeightPx);

  // --- 7. Add canvas as image to PDF ---
  const imgData = canvas.toDataURL('image/png');
  doc.addImage(
    imgData,
    'PNG',
    BORDER_MARGIN_MM + 2,
    BORDER_MARGIN_MM + 2,
    drawableWidthMM,
    drawableHeightMM,
  );

  // --- 8. Save PDF ---
  const safeName = options.projectName.replace(/[^a-zA-Z0-9_\-\s]/g, '').replace(/\s+/g, '_').slice(0, 200) || 'project';
  const filename = `${safeName}.pdf`;
  doc.save(filename);
}
