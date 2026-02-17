import type { FacadeDirection } from '@/types/project.ts';

const DIR_SHORT: Record<FacadeDirection, string> = {
  north: 'N',
  south: 'S',
  east: 'E',
  west: 'W',
};

const DIR_DEGREES_FROM_NORTH: Record<FacadeDirection, number> = {
  north: 0,
  east: 90,
  south: 180,
  west: 270,
};

function normalizeDegrees(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

function pointFromNorthDegrees(
  cx: number,
  cy: number,
  radius: number,
  angleFromNorthDeg: number,
): { x: number; y: number } {
  const rad = (angleFromNorthDeg * Math.PI) / 180;
  return {
    x: cx + Math.sin(rad) * radius,
    y: cy - Math.cos(rad) * radius,
  };
}

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
  northAngle: number,
): void {
  const northDeg = normalizeDegrees(northAngle);

  ctx.save();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  const nsA = pointFromNorthDegrees(cx, cy, radius, northDeg);
  const nsB = pointFromNorthDegrees(cx, cy, radius, northDeg + 180);
  const ewA = pointFromNorthDegrees(cx, cy, radius, northDeg + 90);
  const ewB = pointFromNorthDegrees(cx, cy, radius, northDeg + 270);
  ctx.beginPath();
  ctx.moveTo(nsA.x, nsA.y);
  ctx.lineTo(nsB.x, nsB.y);
  ctx.moveTo(ewA.x, ewA.y);
  ctx.lineTo(ewB.x, ewB.y);
  ctx.stroke();

  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const labelRadius = radius + 10;
  for (const dir of ['north', 'south', 'east', 'west'] as const) {
    const p = pointFromNorthDegrees(
      cx,
      cy,
      labelRadius,
      northDeg + DIR_DEGREES_FROM_NORTH[dir],
    );
    ctx.fillText(DIR_SHORT[dir], p.x, p.y);
  }

  const northTip = pointFromNorthDegrees(cx, cy, radius - 2, northDeg);
  drawArrow(ctx, cx, cy, northTip.x, northTip.y, '#111', 1.8);

  const frontDeg = northDeg + DIR_DEGREES_FROM_NORTH[frontDirection];
  const frontTip = pointFromNorthDegrees(cx, cy, radius - 3, frontDeg);
  drawArrow(
    ctx,
    cx,
    cy,
    frontTip.x,
    frontTip.y,
    '#b85c38',
    2.2,
  );

  ctx.fillStyle = '#b85c38';
  ctx.font = 'bold 10px sans-serif';
  ctx.fillText(`FRONT ${DIR_SHORT[frontDirection]}`, cx, cy + radius + 20);
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.font = '9px sans-serif';
  ctx.fillText(`N ${Math.round(northDeg)}°`, cx, cy + radius + 31);
  ctx.restore();
}

export function drawPlanOrientationOverlay(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  frontDirection: FacadeDirection,
  northAngle: number,
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

  drawCompassCore(ctx, x + panelW / 2, y + 34, 22, frontDirection, northAngle);

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
  northAngle: number,
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

  drawCompassCore(ctx, x + panelW / 2, y + 33, 21, frontDirection, northAngle);
  ctx.restore();
}
