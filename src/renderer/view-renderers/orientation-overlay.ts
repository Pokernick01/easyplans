import type { FacadeDirection } from '@/types/project.ts';

const DIR_SHORT: Record<FacadeDirection, string> = {
  north: 'N',
  south: 'S',
  east: 'E',
  west: 'W',
};

const DIR_VECTOR: Record<FacadeDirection, { x: number; y: number }> = {
  north: { x: 0, y: -1 },
  south: { x: 0, y: 1 },
  east: { x: 1, y: 0 },
  west: { x: -1, y: 0 },
};

function drawArrow(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  color: string,
  width: number,
): void {
  const dx = endX - startX;
  const dy = endY - startY;
  const len = Math.hypot(dx, dy);
  if (len < 1e-3) return;

  const ux = dx / len;
  const uy = dy / len;
  const head = 6;

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(endX - ux * head - uy * (head * 0.6), endY - uy * head + ux * (head * 0.6));
  ctx.lineTo(endX - ux * head + uy * (head * 0.6), endY - uy * head - ux * (head * 0.6));
  ctx.closePath();
  ctx.fill();
}

function drawCompassCore(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  frontDirection: FacadeDirection,
): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.moveTo(cx - radius, cy);
  ctx.lineTo(cx + radius, cy);
  ctx.moveTo(cx, cy - radius);
  ctx.lineTo(cx, cy + radius);
  ctx.stroke();

  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('N', cx, cy - radius - 8);
  ctx.fillText('S', cx, cy + radius + 8);
  ctx.fillText('E', cx + radius + 8, cy);
  ctx.fillText('W', cx - radius - 8, cy);

  drawArrow(ctx, cx, cy, cx, cy - radius + 2, '#111', 1.8);

  const vec = DIR_VECTOR[frontDirection];
  drawArrow(
    ctx,
    cx,
    cy,
    cx + vec.x * (radius - 3),
    cy + vec.y * (radius - 3),
    '#b85c38',
    2.2,
  );

  ctx.fillStyle = '#b85c38';
  ctx.font = 'bold 10px sans-serif';
  ctx.fillText(`FRONT ${DIR_SHORT[frontDirection]}`, cx, cy + radius + 20);
  ctx.restore();
}

export function drawPlanOrientationOverlay(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  frontDirection: FacadeDirection,
): void {
  const panelW = 108;
  const panelH = 98;
  const x = Math.max(8, canvasWidth - panelW - 12);
  const y = 12;

  ctx.save();
  ctx.fillStyle = 'rgba(250,248,244,0.88)';
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, panelW, panelH, 8);
  ctx.fill();
  ctx.stroke();

  drawCompassCore(ctx, x + panelW / 2, y + 38, 22, frontDirection);

  // Keep marker visible against very small canvases.
  if (canvasHeight < 160) {
    ctx.globalAlpha = 0.85;
  }
  ctx.restore();
}

export function drawIsometricOrientationOverlay(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  frontDirection: FacadeDirection,
): void {
  const panelW = 104;
  const panelH = 92;
  const x = canvasWidth - panelW - 14;
  const y = 12;

  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, panelW, panelH, 8);
  ctx.fill();
  ctx.stroke();

  drawCompassCore(ctx, x + panelW / 2, y + 36, 21, frontDirection);
  ctx.restore();
}

