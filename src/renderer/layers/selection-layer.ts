import type { Point } from '@/types/geometry';
import type { AnyElement } from '@/types/elements';

// ---------------------------------------------------------------------------
// Selection layer -- highlights selected / hovered elements and box select
// ---------------------------------------------------------------------------

/**
 * Render selection indicators: bounding boxes, resize handles, rotation
 * handle, hover highlights, and box-select rectangle.
 *
 * @param ctx              Pre-transformed canvas context (1 unit = 1 m).
 * @param selectedElements Currently selected elements.
 * @param hoveredElement   Element under the cursor (may be null).
 * @param pixelsPerMeter   Camera zoom for scale-independent rendering.
 * @param boxSelect        Optional drag-selection rectangle.
 */
export function renderSelection(
  ctx: CanvasRenderingContext2D,
  selectedElements: AnyElement[],
  hoveredElement: AnyElement | null,
  pixelsPerMeter: number,
  boxSelect?: { start: Point; end: Point },
): void {
  const px = 1 / pixelsPerMeter;

  // ------------------------------------------------------------------
  // 1. Hover highlight
  // ------------------------------------------------------------------
  if (hoveredElement) {
    const bounds = getElementBounds(hoveredElement);
    if (bounds) {
      ctx.strokeStyle = 'rgba(74, 158, 255, 0.4)';
      ctx.lineWidth = 2 * px;
      ctx.setLineDash([]);
      ctx.strokeRect(bounds.x, bounds.y, bounds.w, bounds.h);
    }
  }

  // ------------------------------------------------------------------
  // 2. Selected elements -- dashed bounding box + handles
  // ------------------------------------------------------------------
  for (const el of selectedElements) {
    const bounds = getElementBounds(el);
    if (!bounds) continue;

    // Dashed blue bounding box
    ctx.strokeStyle = '#4a9eff';
    ctx.lineWidth = 1.5 * px;
    ctx.setLineDash([6 * px, 4 * px]);
    ctx.strokeRect(bounds.x, bounds.y, bounds.w, bounds.h);
    ctx.setLineDash([]);

    // Resize handles (small squares) at corners and edge midpoints
    const handleSize = 6 * px;
    const halfHandle = handleSize / 2;

    const corners: Point[] = [
      { x: bounds.x, y: bounds.y },
      { x: bounds.x + bounds.w, y: bounds.y },
      { x: bounds.x + bounds.w, y: bounds.y + bounds.h },
      { x: bounds.x, y: bounds.y + bounds.h },
    ];

    const midpoints: Point[] = [
      { x: bounds.x + bounds.w / 2, y: bounds.y },
      { x: bounds.x + bounds.w, y: bounds.y + bounds.h / 2 },
      { x: bounds.x + bounds.w / 2, y: bounds.y + bounds.h },
      { x: bounds.x, y: bounds.y + bounds.h / 2 },
    ];

    const allHandles = [...corners, ...midpoints];

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#4a9eff';
    ctx.lineWidth = px;

    for (const h of allHandles) {
      ctx.fillRect(h.x - halfHandle, h.y - halfHandle, handleSize, handleSize);
      ctx.strokeRect(h.x - halfHandle, h.y - halfHandle, handleSize, handleSize);
    }

    // Rotation handle (circle above the element)
    const rotHandleOffset = 20 * px;
    const rotHandleRadius = 5 * px;
    const rotHandleX = bounds.x + bounds.w / 2;
    const rotHandleY = bounds.y - rotHandleOffset;

    // Stem line from top center to rotation handle
    ctx.beginPath();
    ctx.moveTo(rotHandleX, bounds.y);
    ctx.lineTo(rotHandleX, rotHandleY);
    ctx.strokeStyle = '#4a9eff';
    ctx.lineWidth = px;
    ctx.stroke();

    // Rotation circle
    ctx.beginPath();
    ctx.arc(rotHandleX, rotHandleY, rotHandleRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#4a9eff';
    ctx.lineWidth = px;
    ctx.stroke();
  }

  // ------------------------------------------------------------------
  // 3. Box select rectangle
  // ------------------------------------------------------------------
  if (boxSelect) {
    const x = Math.min(boxSelect.start.x, boxSelect.end.x);
    const y = Math.min(boxSelect.start.y, boxSelect.end.y);
    const w = Math.abs(boxSelect.end.x - boxSelect.start.x);
    const h = Math.abs(boxSelect.end.y - boxSelect.start.y);

    ctx.fillStyle = 'rgba(74, 158, 255, 0.1)';
    ctx.fillRect(x, y, w, h);

    ctx.strokeStyle = 'rgba(74, 158, 255, 0.6)';
    ctx.lineWidth = px;
    ctx.setLineDash([4 * px, 3 * px]);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);
  }
}

// ---------------------------------------------------------------------------
// Bounding box extraction for each element type
// ---------------------------------------------------------------------------

interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

function getElementBounds(el: AnyElement): Bounds | null {
  switch (el.type) {
    case 'wall': {
      const minX = Math.min(el.start.x, el.end.x) - el.thickness / 2;
      const minY = Math.min(el.start.y, el.end.y) - el.thickness / 2;
      const maxX = Math.max(el.start.x, el.end.x) + el.thickness / 2;
      const maxY = Math.max(el.start.y, el.end.y) + el.thickness / 2;
      return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    }

    case 'door':
    case 'window':
      // Doors and windows are positioned on walls; their bounding box
      // is derived at draw time from the parent wall. For selection we
      // return null and let the wall handle it.
      return null;

    case 'room': {
      if (el.polygon.length === 0) return null;
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const p of el.polygon) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      }
      return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    }

    case 'furniture': {
      const hw = (el.width * el.scale) / 2;
      const hd = (el.depth * el.scale) / 2;
      return {
        x: el.position.x - hw,
        y: el.position.y - hd,
        w: hw * 2,
        h: hd * 2,
      };
    }

    case 'text':
      // Approximate bounding box -- exact would require measuring text
      return {
        x: el.position.x,
        y: el.position.y,
        w: el.text.length * el.fontSize * 0.01,
        h: el.fontSize * 0.02,
      };

    case 'dimension': {
      const minX = Math.min(el.start.x, el.end.x);
      const minY = Math.min(el.start.y, el.end.y);
      const maxX = Math.max(el.start.x, el.end.x);
      const maxY = Math.max(el.start.y, el.end.y);
      const pad = Math.abs(el.offset) + 0.1;
      return {
        x: minX - pad,
        y: minY - pad,
        w: maxX - minX + pad * 2,
        h: maxY - minY + pad * 2,
      };
    }

    default:
      return null;
  }
}
