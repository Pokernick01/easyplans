import type { Point } from '@/types/geometry';

// ---------------------------------------------------------------------------
// Tool preview layer -- renders ghost / preview shapes for the active tool
// ---------------------------------------------------------------------------

/** Describes the preview currently being rendered. */
export interface ToolPreviewData {
  type:
    | 'wall'
    | 'door'
    | 'window'
    | 'stamp'
    | 'dimension'
    | 'room'
    | 'text'
    | 'cutline';
  data: unknown;
}

// Individual preview data shapes (consumed by this module only)

interface WallPreview {
  start: Point;
  end: Point;
  thickness: number;
}

interface DoorPreview {
  position: Point;
  angle: number;
  width: number;
  swing: 'left' | 'right';
}

interface WindowPreview {
  position: Point;
  angle: number;
  width: number;
  thickness: number;
}

interface StampPreview {
  position: Point;
  width: number;
  depth: number;
  rotation: number;
}

interface DimensionPreview {
  start: Point;
  end: Point;
}

interface RoomPreview {
  polygon: Point[];
}

interface TextPreview {
  position: Point;
  text: string;
}

interface CutlinePreview {
  start: Point;
  end: Point;
}

// ---------------------------------------------------------------------------
// Main render function
// ---------------------------------------------------------------------------

/**
 * Render ghost previews for the active drawing tool.
 *
 * @param ctx            Pre-transformed canvas context (1 unit = 1 m).
 * @param preview        Current preview data, or null if no preview is active.
 * @param pixelsPerMeter Camera zoom for scale-independent rendering.
 */
export function renderToolPreview(
  ctx: CanvasRenderingContext2D,
  preview: ToolPreviewData | null,
  pixelsPerMeter: number,
): void {
  if (!preview) return;

  const px = 1 / pixelsPerMeter;

  ctx.save();
  ctx.globalAlpha = 0.5;

  switch (preview.type) {
    case 'wall':
      drawWallPreview(ctx, preview.data as WallPreview, px, pixelsPerMeter);
      break;
    case 'door':
      drawDoorPreview(ctx, preview.data as DoorPreview, px);
      break;
    case 'window':
      drawWindowPreview(ctx, preview.data as WindowPreview, px);
      break;
    case 'stamp':
      drawStampPreview(ctx, preview.data as StampPreview, px);
      break;
    case 'dimension':
      drawDimensionPreview(ctx, preview.data as DimensionPreview, px, pixelsPerMeter);
      break;
    case 'room':
      drawRoomPreview(ctx, preview.data as RoomPreview, px);
      break;
    case 'text':
      drawTextPreview(ctx, preview.data as TextPreview, px, pixelsPerMeter);
      break;
    case 'cutline':
      drawCutlinePreview(ctx, preview.data as CutlinePreview, px);
      break;
  }

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Preview renderers
// ---------------------------------------------------------------------------

function drawWallPreview(
  ctx: CanvasRenderingContext2D,
  data: WallPreview,
  px: number,
  pixelsPerMeter: number,
): void {
  const dx = data.end.x - data.start.x;
  const dy = data.end.y - data.start.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.001) return;

  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const halfT = data.thickness / 2;

  // Wall rectangle
  ctx.beginPath();
  ctx.moveTo(data.start.x + nx * halfT, data.start.y + ny * halfT);
  ctx.lineTo(data.end.x + nx * halfT, data.end.y + ny * halfT);
  ctx.lineTo(data.end.x - nx * halfT, data.end.y - ny * halfT);
  ctx.lineTo(data.start.x - nx * halfT, data.start.y - ny * halfT);
  ctx.closePath();

  ctx.fillStyle = 'rgba(200, 200, 200, 0.3)';
  ctx.fill();
  ctx.strokeStyle = '#aaaaaa';
  ctx.lineWidth = px;
  ctx.setLineDash([4 * px, 4 * px]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Length label
  const midX = (data.start.x + data.end.x) / 2;
  const midY = (data.start.y + data.end.y) / 2;
  const text = `${len.toFixed(2)} m`;

  ctx.save();
  ctx.translate(midX, midY);
  ctx.scale(1 / pixelsPerMeter, 1 / pixelsPerMeter);
  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.globalAlpha = 0.8;
  ctx.fillText(text, 0, -8);
  ctx.restore();
}

function drawDoorPreview(
  ctx: CanvasRenderingContext2D,
  data: DoorPreview,
  px: number,
): void {
  ctx.save();
  ctx.translate(data.position.x, data.position.y);
  ctx.rotate(data.angle);

  // Door leaf
  ctx.beginPath();
  ctx.moveTo(-data.width / 2, 0);
  ctx.lineTo(data.width / 2, 0);
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 2 * px;
  ctx.setLineDash([4 * px, 4 * px]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Swing arc
  const arcDir = data.swing === 'left' ? 1 : -1;
  ctx.beginPath();
  ctx.arc(0, 0, data.width, 0, (Math.PI / 2) * arcDir, arcDir < 0);
  ctx.strokeStyle = '#aaaaaa';
  ctx.lineWidth = px;
  ctx.setLineDash([3 * px, 3 * px]);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.restore();
}

function drawWindowPreview(
  ctx: CanvasRenderingContext2D,
  data: WindowPreview,
  px: number,
): void {
  ctx.save();
  ctx.translate(data.position.x, data.position.y);
  ctx.rotate(data.angle);

  const halfW = data.width / 2;
  const glassOffset = data.thickness * 0.15;

  ctx.strokeStyle = '#88ccee';
  ctx.lineWidth = px;
  ctx.setLineDash([4 * px, 4 * px]);

  for (const sign of [-1, 1] as const) {
    ctx.beginPath();
    ctx.moveTo(-halfW, sign * glassOffset);
    ctx.lineTo(halfW, sign * glassOffset);
    ctx.stroke();
  }

  ctx.setLineDash([]);
  ctx.restore();
}

function drawStampPreview(
  ctx: CanvasRenderingContext2D,
  data: StampPreview,
  px: number,
): void {
  ctx.save();
  ctx.translate(data.position.x, data.position.y);
  ctx.rotate((data.rotation * Math.PI) / 180);

  ctx.strokeStyle = '#4a9eff';
  ctx.lineWidth = px;
  ctx.setLineDash([4 * px, 4 * px]);
  ctx.strokeRect(-data.width / 2, -data.depth / 2, data.width, data.depth);
  ctx.setLineDash([]);

  // Crosshair at center
  const crossSize = 4 * px;
  ctx.beginPath();
  ctx.moveTo(-crossSize, 0);
  ctx.lineTo(crossSize, 0);
  ctx.moveTo(0, -crossSize);
  ctx.lineTo(0, crossSize);
  ctx.stroke();

  ctx.restore();
}

function drawDimensionPreview(
  ctx: CanvasRenderingContext2D,
  data: DimensionPreview,
  px: number,
  pixelsPerMeter: number,
): void {
  const dx = data.end.x - data.start.x;
  const dy = data.end.y - data.start.y;
  const len = Math.sqrt(dx * dx + dy * dy);

  ctx.beginPath();
  ctx.moveTo(data.start.x, data.start.y);
  ctx.lineTo(data.end.x, data.end.y);
  ctx.strokeStyle = '#ffaa44';
  ctx.lineWidth = px;
  ctx.setLineDash([4 * px, 4 * px]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Endpoints
  const dotR = 3 * px;
  for (const p of [data.start, data.end]) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, dotR, 0, Math.PI * 2);
    ctx.fillStyle = '#ffaa44';
    ctx.fill();
  }

  // Length text
  if (len > 0.01) {
    const midX = (data.start.x + data.end.x) / 2;
    const midY = (data.start.y + data.end.y) / 2;

    ctx.save();
    ctx.translate(midX, midY);
    ctx.scale(1 / pixelsPerMeter, 1 / pixelsPerMeter);
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#ffaa44';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${len.toFixed(2)} m`, 0, -6);
    ctx.restore();
  }
}

function drawRoomPreview(
  ctx: CanvasRenderingContext2D,
  data: RoomPreview,
  px: number,
): void {
  if (data.polygon.length < 3) return;

  ctx.beginPath();
  ctx.moveTo(data.polygon[0].x, data.polygon[0].y);
  for (let i = 1; i < data.polygon.length; i++) {
    ctx.lineTo(data.polygon[i].x, data.polygon[i].y);
  }
  ctx.closePath();

  ctx.fillStyle = 'rgba(74, 158, 255, 0.15)';
  ctx.fill();
  ctx.strokeStyle = '#4a9eff';
  ctx.lineWidth = 1.5 * px;
  ctx.setLineDash([6 * px, 4 * px]);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawTextPreview(
  ctx: CanvasRenderingContext2D,
  data: TextPreview,
  px: number,
  pixelsPerMeter: number,
): void {
  ctx.save();
  ctx.translate(data.position.x, data.position.y);
  ctx.scale(1 / pixelsPerMeter, 1 / pixelsPerMeter);

  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#cccccc';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(data.text || 'Text', 0, 0);

  ctx.restore();

  // Cursor indicator
  ctx.beginPath();
  ctx.arc(data.position.x, data.position.y, 3 * px, 0, Math.PI * 2);
  ctx.fillStyle = '#4a9eff';
  ctx.fill();
}

function drawCutlinePreview(
  ctx: CanvasRenderingContext2D,
  data: CutlinePreview,
  px: number,
): void {
  ctx.beginPath();
  ctx.moveTo(data.start.x, data.start.y);
  ctx.lineTo(data.end.x, data.end.y);
  ctx.strokeStyle = '#ff4444';
  ctx.lineWidth = 2 * px;
  ctx.setLineDash([8 * px, 4 * px, 2 * px, 4 * px]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Arrow heads at each end
  const dx = data.end.x - data.start.x;
  const dy = data.end.y - data.start.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.01) return;

  const arrowSize = 8 * px;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;

  // Perpendicular arrows at endpoints indicating viewing direction
  for (const p of [data.start, data.end]) {
    ctx.beginPath();
    ctx.moveTo(p.x + nx * arrowSize, p.y + ny * arrowSize);
    ctx.lineTo(p.x, p.y);
    ctx.lineTo(p.x - nx * arrowSize, p.y - ny * arrowSize);
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 1.5 * px;
    ctx.stroke();
  }
}
