/**
 * neufert-elevation.ts
 *
 * Neufert-style architectural elevation (side-view) drawing functions for
 * people, trees, cars, furniture, bathroom fixtures, kitchen appliances,
 * laundry machines, lighting, and decoration.
 *
 * Used by section, facade, and isometric renderers.
 *
 * All functions draw at origin (0,0) with the given width (w) and height (h).
 * The caller must ctx.save() + translate + scale before calling.
 * Stroke color is "currentColor" - set ctx.strokeStyle before calling.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setLineStyle(ctx: CanvasRenderingContext2D, weight = 1) {
  ctx.lineWidth = weight;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

// ---------------------------------------------------------------------------
// PERSON (standing, Neufert-style elevation)
// ---------------------------------------------------------------------------
export function drawPersonElevation(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
) {
  const cx = w / 2;
  const headR = w * 0.22;
  const headY = headR * 1.1;
  const shoulderY = h * 0.21;
  const shoulderW = w * 0.38;
  const waistY = h * 0.43;
  const waistW = w * 0.18;
  const hipY = h * 0.48;
  const hipW = w * 0.24;
  const kneeY = h * 0.72;
  const footY = h;
  const footW = w * 0.12;

  setLineStyle(ctx, w * 0.03);

  // Head
  ctx.beginPath();
  ctx.arc(cx, headY, headR, 0, Math.PI * 2);
  ctx.stroke();

  // Neck
  ctx.beginPath();
  ctx.moveTo(cx, headY + headR);
  ctx.lineTo(cx, shoulderY);
  ctx.stroke();

  // Shoulders
  ctx.beginPath();
  ctx.moveTo(cx - shoulderW, shoulderY);
  ctx.lineTo(cx + shoulderW, shoulderY);
  ctx.stroke();

  // Torso — left side
  ctx.beginPath();
  ctx.moveTo(cx - shoulderW, shoulderY);
  ctx.lineTo(cx - waistW, waistY);
  ctx.lineTo(cx - hipW, hipY);
  ctx.stroke();

  // Torso — right side
  ctx.beginPath();
  ctx.moveTo(cx + shoulderW, shoulderY);
  ctx.lineTo(cx + waistW, waistY);
  ctx.lineTo(cx + hipW, hipY);
  ctx.stroke();

  // Arms (slightly angled outward)
  const armEndY = h * 0.52;
  ctx.beginPath();
  ctx.moveTo(cx - shoulderW, shoulderY);
  ctx.lineTo(cx - shoulderW - w * 0.05, armEndY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + shoulderW, shoulderY);
  ctx.lineTo(cx + shoulderW + w * 0.05, armEndY);
  ctx.stroke();

  // Left leg
  ctx.beginPath();
  ctx.moveTo(cx - hipW, hipY);
  ctx.lineTo(cx - w * 0.15, kneeY);
  ctx.lineTo(cx - w * 0.13, footY);
  ctx.stroke();
  // Left foot
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.13, footY);
  ctx.lineTo(cx - w * 0.13 - footW, footY);
  ctx.stroke();

  // Right leg
  ctx.beginPath();
  ctx.moveTo(cx + hipW, hipY);
  ctx.lineTo(cx + w * 0.15, kneeY);
  ctx.lineTo(cx + w * 0.13, footY);
  ctx.stroke();
  // Right foot
  ctx.beginPath();
  ctx.moveTo(cx + w * 0.13, footY);
  ctx.lineTo(cx + w * 0.13 + footW, footY);
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// CHILD (smaller person proportions)
// ---------------------------------------------------------------------------
export function drawChildElevation(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
) {
  const cx = w / 2;
  const headR = w * 0.28;
  const headY = headR * 1.1;
  const shoulderY = h * 0.32;
  const shoulderW = w * 0.3;
  const hipY = h * 0.55;
  const hipW = w * 0.2;
  const footY = h;
  const footW = w * 0.1;

  setLineStyle(ctx, w * 0.035);

  ctx.beginPath();
  ctx.arc(cx, headY, headR, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx, headY + headR);
  ctx.lineTo(cx, shoulderY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - shoulderW, shoulderY);
  ctx.lineTo(cx + shoulderW, shoulderY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - shoulderW, shoulderY);
  ctx.lineTo(cx - hipW, hipY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + shoulderW, shoulderY);
  ctx.lineTo(cx + hipW, hipY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - hipW, hipY);
  ctx.lineTo(cx - w * 0.12, footY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + hipW, hipY);
  ctx.lineTo(cx + w * 0.12, footY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.12, footY);
  ctx.lineTo(cx - w * 0.12 - footW, footY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + w * 0.12, footY);
  ctx.lineTo(cx + w * 0.12 + footW, footY);
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// TREE (deciduous, Neufert elevation)
// ---------------------------------------------------------------------------
export function drawTreeElevation(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
) {
  const cx = w / 2;
  const trunkW = w * 0.08;
  const trunkTop = h * 0.4;
  const crownCx = cx;
  const crownCy = h * 0.32;
  const crownRx = w * 0.45;
  const crownRy = h * 0.3;

  setLineStyle(ctx, w * 0.02);

  ctx.beginPath();
  ctx.moveTo(cx - trunkW, h);
  ctx.lineTo(cx - trunkW, trunkTop);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + trunkW, h);
  ctx.lineTo(cx + trunkW, trunkTop);
  ctx.stroke();

  ctx.beginPath();
  const lobes = 10;
  for (let i = 0; i <= lobes; i++) {
    const angle = (i / lobes) * Math.PI * 2 - Math.PI / 2;
    const lobeR = 0.85 + Math.sin(i * 2.7) * 0.15;
    const px = crownCx + Math.cos(angle) * crownRx * lobeR;
    const py = crownCy + Math.sin(angle) * crownRy * lobeR;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();

  ctx.save();
  ctx.globalAlpha = 0.3;
  setLineStyle(ctx, w * 0.012);
  ctx.beginPath();
  ctx.moveTo(cx, trunkTop);
  ctx.quadraticCurveTo(cx - w * 0.15, trunkTop - h * 0.1, cx - w * 0.25, crownCy - crownRy * 0.3);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, trunkTop);
  ctx.quadraticCurveTo(cx + w * 0.15, trunkTop - h * 0.1, cx + w * 0.25, crownCy - crownRy * 0.3);
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// BUSH (small shrub, Neufert elevation)
// ---------------------------------------------------------------------------
export function drawBushElevation(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
) {
  const cx = w / 2;
  setLineStyle(ctx, w * 0.025);

  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.quadraticCurveTo(0, h * 0.5, w * 0.15, h * 0.3);
  ctx.quadraticCurveTo(w * 0.3, h * 0.05, cx, h * 0.1);
  ctx.quadraticCurveTo(w * 0.7, h * 0.05, w * 0.85, h * 0.3);
  ctx.quadraticCurveTo(w, h * 0.5, w, h);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(w, h);
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// CAR (side profile, Neufert elevation)
// ---------------------------------------------------------------------------
export function drawCarElevation(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
) {
  const wheelR = h * 0.16;
  const bodyBottom = h - wheelR;
  const bodyTop = h * 0.45;
  const roofTop = h * 0.08;
  const hoodLen = w * 0.28;
  const trunkLen = w * 0.2;
  const cabStart = hoodLen;
  const cabEnd = w - trunkLen;

  setLineStyle(ctx, w * 0.008);

  ctx.beginPath();
  ctx.moveTo(w * 0.1, bodyBottom);
  ctx.lineTo(w * 0.9, bodyBottom);
  ctx.lineTo(w * 0.95, bodyTop);
  ctx.lineTo(cabEnd, roofTop + h * 0.1);
  ctx.lineTo(cabStart + w * 0.05, roofTop);
  ctx.lineTo(cabStart - w * 0.05, bodyTop);
  ctx.lineTo(w * 0.05, bodyTop);
  ctx.lineTo(w * 0.05, bodyBottom);
  ctx.closePath();
  ctx.stroke();

  setLineStyle(ctx, w * 0.005);
  ctx.beginPath();
  ctx.moveTo(cabStart - w * 0.03, bodyTop + h * 0.04);
  ctx.lineTo(cabStart + w * 0.07, roofTop + h * 0.06);
  ctx.lineTo(cabStart + w * 0.07, bodyTop + h * 0.04);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cabStart + w * 0.1, bodyTop + h * 0.04);
  ctx.lineTo(cabStart + w * 0.1, roofTop + h * 0.06);
  ctx.lineTo(cabEnd - w * 0.05, roofTop + h * 0.12);
  ctx.lineTo(cabEnd - w * 0.05, bodyTop + h * 0.04);
  ctx.closePath();
  ctx.stroke();

  setLineStyle(ctx, w * 0.008);
  ctx.beginPath();
  ctx.arc(w * 0.22, bodyBottom, wheelR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(w * 0.22, bodyBottom, wheelR * 0.4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(w * 0.78, bodyBottom, wheelR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(w * 0.78, bodyBottom, wheelR * 0.4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(w * 0.06, bodyTop + h * 0.06, h * 0.03, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(w * 0.94, bodyTop + h * 0.06, h * 0.03, 0, Math.PI * 2);
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// SOFA (side elevation)
// ---------------------------------------------------------------------------
export function drawSofaElevation(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
) {
  const legH = h * 0.1;
  const seatH = h * 0.35;
  const backH = h * 0.55;
  const armW = w * 0.08;

  setLineStyle(ctx, w * 0.015);

  ctx.strokeRect(armW, 0, w - armW * 2, backH);
  ctx.strokeRect(armW, backH, w - armW * 2, seatH);
  ctx.strokeRect(0, backH * 0.3, armW, backH * 0.7 + seatH);
  ctx.strokeRect(w - armW, backH * 0.3, armW, backH * 0.7 + seatH);
  const baseY = backH + seatH;
  ctx.beginPath();
  ctx.moveTo(armW * 0.5, baseY);
  ctx.lineTo(armW * 0.3, baseY + legH);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w - armW * 0.5, baseY);
  ctx.lineTo(w - armW * 0.3, baseY + legH);
  ctx.stroke();

  setLineStyle(ctx, w * 0.008);
  ctx.setLineDash([w * 0.02, w * 0.015]);
  ctx.beginPath();
  ctx.moveTo(armW + w * 0.05, backH + seatH * 0.5);
  ctx.lineTo(w - armW - w * 0.05, backH + seatH * 0.5);
  ctx.stroke();
  ctx.setLineDash([]);
}

// ---------------------------------------------------------------------------
// BED (side elevation)
// ---------------------------------------------------------------------------
export function drawBedElevation(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
) {
  const legH = h * 0.12;
  const mattressH = h * 0.3;
  const headboardH = h * 0.58;
  const baseY = h - legH;

  setLineStyle(ctx, w * 0.01);

  ctx.strokeRect(0, 0, w * 0.06, headboardH);
  ctx.strokeRect(w - w * 0.04, headboardH * 0.5, w * 0.04, headboardH * 0.5);
  const mattressY = baseY - mattressH;
  ctx.beginPath();
  ctx.moveTo(w * 0.06, mattressY);
  ctx.lineTo(w - w * 0.04, mattressY);
  ctx.lineTo(w - w * 0.04, baseY);
  ctx.lineTo(w * 0.06, baseY);
  ctx.closePath();
  ctx.stroke();
  const pillowW = w * 0.15;
  const pillowH = mattressH * 0.5;
  ctx.beginPath();
  ctx.ellipse(w * 0.06 + pillowW / 2 + w * 0.02, mattressY + pillowH * 0.6, pillowW / 2, pillowH / 2, 0, 0, Math.PI * 2);
  ctx.stroke();
  setLineStyle(ctx, w * 0.006);
  ctx.beginPath();
  ctx.moveTo(w * 0.06 + pillowW + w * 0.05, mattressY + mattressH * 0.15);
  ctx.quadraticCurveTo(w * 0.5, mattressY - mattressH * 0.1, w - w * 0.08, mattressY + mattressH * 0.15);
  ctx.stroke();
  setLineStyle(ctx, w * 0.01);
  ctx.beginPath();
  ctx.moveTo(w * 0.08, baseY);
  ctx.lineTo(w * 0.08, h);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w - w * 0.06, baseY);
  ctx.lineTo(w - w * 0.06, h);
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// TABLE (side elevation)
// ---------------------------------------------------------------------------
export function drawTableElevation(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
) {
  const topH = h * 0.08;
  const legInset = w * 0.08;

  setLineStyle(ctx, w * 0.015);

  ctx.strokeRect(0, 0, w, topH);
  ctx.beginPath();
  ctx.moveTo(legInset, topH);
  ctx.lineTo(legInset, h);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w - legInset, topH);
  ctx.lineTo(w - legInset, h);
  ctx.stroke();
  setLineStyle(ctx, w * 0.008);
  ctx.setLineDash([w * 0.02, w * 0.015]);
  ctx.beginPath();
  ctx.moveTo(legInset, h * 0.7);
  ctx.lineTo(w - legInset, h * 0.7);
  ctx.stroke();
  ctx.setLineDash([]);
}

// ---------------------------------------------------------------------------
// CHAIR (side elevation)
// ---------------------------------------------------------------------------
export function drawChairElevation(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
) {
  const seatY = h * 0.52;
  const seatH = h * 0.06;
  const backTop = h * 0.0;
  const legBottom = h;

  setLineStyle(ctx, w * 0.03);

  ctx.beginPath();
  ctx.moveTo(0, seatY);
  ctx.lineTo(0, backTop);
  ctx.lineTo(w * 0.05, backTop);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, backTop);
  ctx.lineTo(0, seatY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w * 0.05, seatY * 0.2);
  ctx.lineTo(w * 0.05, seatY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, backTop + h * 0.05);
  ctx.lineTo(w * 0.05, backTop + h * 0.05);
  ctx.stroke();
  ctx.strokeRect(0, seatY, w, seatH);
  ctx.beginPath();
  ctx.moveTo(w - w * 0.08, seatY + seatH);
  ctx.lineTo(w, legBottom);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w * 0.03, seatY + seatH);
  ctx.lineTo(0, legBottom);
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// WARDROBE/CABINET (side elevation)
// ---------------------------------------------------------------------------
export function drawWardrobeElevation(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
) {
  const legH = h * 0.04;
  const bodyH = h - legH;

  setLineStyle(ctx, w * 0.02);

  ctx.strokeRect(0, 0, w, bodyH);
  ctx.beginPath();
  ctx.moveTo(w / 2, 0);
  ctx.lineTo(w / 2, bodyH);
  ctx.stroke();
  const handleY = bodyH * 0.48;
  const handleH = bodyH * 0.08;
  setLineStyle(ctx, w * 0.015);
  ctx.beginPath();
  ctx.moveTo(w / 2 - w * 0.06, handleY);
  ctx.lineTo(w / 2 - w * 0.06, handleY + handleH);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w / 2 + w * 0.06, handleY);
  ctx.lineTo(w / 2 + w * 0.06, handleY + handleH);
  ctx.stroke();
  setLineStyle(ctx, w * 0.02);
  ctx.beginPath();
  ctx.moveTo(w * 0.1, bodyH);
  ctx.lineTo(w * 0.1, h);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w - w * 0.1, bodyH);
  ctx.lineTo(w - w * 0.1, h);
  ctx.stroke();
}

// ===========================================================================
// BATHROOM FIXTURES — ELEVATION
// ===========================================================================

// ---------------------------------------------------------------------------
// TOILET (side elevation, Neufert)
// ---------------------------------------------------------------------------
export function drawToiletElevation(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
) {
  setLineStyle(ctx, w * 0.03);

  // Tank (back, rectangular)
  const tankW = w * 0.35;
  const tankH = h * 0.4;
  const tankX = w * 0.05;
  const tankY = h * 0.1;
  ctx.strokeRect(tankX, tankY, tankW, tankH);

  // Flush button on top of tank
  ctx.beginPath();
  ctx.moveTo(tankX + tankW * 0.3, tankY);
  ctx.lineTo(tankX + tankW * 0.7, tankY);
  ctx.stroke();

  // Bowl profile (rounded shape extending right)
  const bowlLeft = tankX + tankW;
  const bowlBottom = h * 0.85;
  const seatTop = h * 0.35;
  ctx.beginPath();
  ctx.moveTo(bowlLeft, seatTop);
  ctx.lineTo(bowlLeft, bowlBottom);
  // Bottom curve of bowl
  ctx.quadraticCurveTo(w * 0.55, h, w * 0.85, bowlBottom);
  // Front curve up
  ctx.quadraticCurveTo(w * 0.98, bowlBottom * 0.7, w * 0.85, seatTop);
  ctx.closePath();
  ctx.stroke();

  // Seat rim (thin line on top)
  setLineStyle(ctx, w * 0.02);
  ctx.beginPath();
  ctx.moveTo(bowlLeft, seatTop);
  ctx.lineTo(w * 0.85, seatTop);
  ctx.stroke();

  // Pedestal base
  setLineStyle(ctx, w * 0.03);
  ctx.beginPath();
  ctx.moveTo(w * 0.15, bowlBottom);
  ctx.lineTo(w * 0.15, h);
  ctx.lineTo(w * 0.75, h);
  ctx.lineTo(w * 0.75, bowlBottom);
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// SINK / WASHBASIN (side elevation, Neufert)
// ---------------------------------------------------------------------------
export function drawSinkElevation(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
) {
  setLineStyle(ctx, w * 0.03);

  // Wall line at back
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, h);
  ctx.stroke();

  // Basin profile (semi-circular bowl from side)
  const basinTop = h * 0.35;
  const basinBottom = h * 0.55;
  const basinFront = w * 0.85;

  setLineStyle(ctx, w * 0.025);
  ctx.beginPath();
  ctx.moveTo(w * 0.05, basinTop);
  ctx.lineTo(basinFront, basinTop);
  // Front curve down
  ctx.quadraticCurveTo(basinFront + w * 0.05, (basinTop + basinBottom) / 2, basinFront, basinBottom);
  // Bottom back to wall
  ctx.lineTo(w * 0.05, basinBottom);
  ctx.stroke();

  // Faucet
  setLineStyle(ctx, w * 0.02);
  const faucetBase = basinTop;
  ctx.beginPath();
  ctx.moveTo(w * 0.15, faucetBase);
  ctx.lineTo(w * 0.15, faucetBase - h * 0.18);
  ctx.quadraticCurveTo(w * 0.15, faucetBase - h * 0.25, w * 0.35, faucetBase - h * 0.22);
  ctx.stroke();

  // Pedestal / pipe going down
  setLineStyle(ctx, w * 0.02);
  ctx.beginPath();
  ctx.moveTo(w * 0.3, basinBottom);
  ctx.lineTo(w * 0.3, h);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w * 0.45, basinBottom);
  ctx.lineTo(w * 0.45, h);
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// BATHTUB (side elevation, Neufert)
// ---------------------------------------------------------------------------
export function drawBathtubElevation(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
) {
  setLineStyle(ctx, w * 0.01);

  // Outer tub profile
  const rimTop = h * 0.2;
  const legH = h * 0.12;
  const tubBottom = h - legH;

  ctx.beginPath();
  // Left rim
  ctx.moveTo(0, rimTop);
  ctx.lineTo(0, tubBottom);
  // Bottom with slight curve
  ctx.quadraticCurveTo(w * 0.5, tubBottom + h * 0.05, w, tubBottom);
  // Right side up
  ctx.lineTo(w, rimTop);
  ctx.stroke();

  // Rim (thicker top line)
  setLineStyle(ctx, w * 0.015);
  ctx.beginPath();
  ctx.moveTo(0, rimTop);
  ctx.lineTo(w, rimTop);
  ctx.stroke();

  // Inner basin line
  setLineStyle(ctx, w * 0.008);
  const innerRim = rimTop + h * 0.08;
  ctx.beginPath();
  ctx.moveTo(w * 0.04, innerRim);
  ctx.lineTo(w * 0.96, innerRim);
  ctx.stroke();

  // Claw feet
  setLineStyle(ctx, w * 0.012);
  // Left foot
  ctx.beginPath();
  ctx.moveTo(w * 0.08, tubBottom);
  ctx.quadraticCurveTo(w * 0.06, h, w * 0.12, h);
  ctx.stroke();
  // Right foot
  ctx.beginPath();
  ctx.moveTo(w * 0.92, tubBottom);
  ctx.quadraticCurveTo(w * 0.94, h, w * 0.88, h);
  ctx.stroke();

  // Faucet handles at left
  setLineStyle(ctx, w * 0.008);
  ctx.beginPath();
  ctx.arc(w * 0.1, rimTop - h * 0.06, w * 0.02, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(w * 0.18, rimTop - h * 0.06, w * 0.02, 0, Math.PI * 2);
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// SHOWER (side elevation, Neufert)
// ---------------------------------------------------------------------------
export function drawShowerElevation(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
) {
  setLineStyle(ctx, w * 0.02);

  // Back wall
  ctx.beginPath();
  ctx.moveTo(w * 0.1, 0);
  ctx.lineTo(w * 0.1, h);
  ctx.stroke();

  // Floor tray
  ctx.beginPath();
  ctx.moveTo(w * 0.1, h * 0.95);
  ctx.lineTo(w * 0.9, h * 0.95);
  ctx.lineTo(w * 0.9, h);
  ctx.lineTo(w * 0.1, h);
  ctx.stroke();

  // Glass door
  setLineStyle(ctx, w * 0.015);
  ctx.beginPath();
  ctx.moveTo(w * 0.85, 0);
  ctx.lineTo(w * 0.85, h * 0.95);
  ctx.stroke();

  // Shower head (from wall, pipe going up then across)
  setLineStyle(ctx, w * 0.015);
  ctx.beginPath();
  ctx.moveTo(w * 0.1, h * 0.05);
  ctx.lineTo(w * 0.35, h * 0.05);
  ctx.lineTo(w * 0.35, h * 0.12);
  ctx.stroke();
  // Shower head oval
  ctx.beginPath();
  ctx.ellipse(w * 0.35, h * 0.14, w * 0.06, h * 0.025, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Water droplet lines (light)
  setLineStyle(ctx, w * 0.005);
  ctx.setLineDash([w * 0.01, w * 0.02]);
  for (let i = 0; i < 3; i++) {
    const x = w * 0.28 + i * w * 0.07;
    ctx.beginPath();
    ctx.moveTo(x, h * 0.18);
    ctx.lineTo(x, h * 0.4);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

// ---------------------------------------------------------------------------
// BIDET (side elevation, Neufert)
// ---------------------------------------------------------------------------
export function drawBidetElevation(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
) {
  setLineStyle(ctx, w * 0.03);

  const rimTop = h * 0.3;
  const bowlBottom = h * 0.7;

  // Bowl profile (oval-ish from side)
  ctx.beginPath();
  ctx.moveTo(w * 0.1, rimTop);
  ctx.lineTo(w * 0.9, rimTop);
  ctx.quadraticCurveTo(w, (rimTop + bowlBottom) / 2, w * 0.9, bowlBottom);
  ctx.lineTo(w * 0.1, bowlBottom);
  ctx.quadraticCurveTo(0, (rimTop + bowlBottom) / 2, w * 0.1, rimTop);
  ctx.stroke();

  // Pedestal
  setLineStyle(ctx, w * 0.025);
  ctx.beginPath();
  ctx.moveTo(w * 0.25, bowlBottom);
  ctx.lineTo(w * 0.2, h);
  ctx.lineTo(w * 0.8, h);
  ctx.lineTo(w * 0.75, bowlBottom);
  ctx.stroke();

  // Faucet on top
  setLineStyle(ctx, w * 0.02);
  ctx.beginPath();
  ctx.moveTo(w * 0.45, rimTop);
  ctx.lineTo(w * 0.45, rimTop - h * 0.1);
  ctx.lineTo(w * 0.55, rimTop - h * 0.1);
  ctx.lineTo(w * 0.55, rimTop);
  ctx.stroke();
}

// ===========================================================================
// KITCHEN APPLIANCES — ELEVATION
// ===========================================================================

// ---------------------------------------------------------------------------
// STOVE / COOKER (front elevation)
// ---------------------------------------------------------------------------
export function drawStoveElevation(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
) {
  setLineStyle(ctx, w * 0.02);

  // Main body
  ctx.strokeRect(0, 0, w, h);

  // Oven door (large rectangle in lower portion)
  const ovenTop = h * 0.3;
  const ovenPad = w * 0.08;
  ctx.strokeRect(ovenPad, ovenTop, w - ovenPad * 2, h * 0.6);

  // Oven door handle
  setLineStyle(ctx, w * 0.015);
  ctx.beginPath();
  ctx.moveTo(ovenPad + w * 0.05, ovenTop + h * 0.05);
  ctx.lineTo(w - ovenPad - w * 0.05, ovenTop + h * 0.05);
  ctx.stroke();

  // Oven window (glass)
  setLineStyle(ctx, w * 0.01);
  const winPad = w * 0.15;
  ctx.strokeRect(winPad, ovenTop + h * 0.1, w - winPad * 2, h * 0.25);

  // Burner knobs at top
  const knobY = h * 0.12;
  const knobR = w * 0.04;
  const knobCount = 4;
  const spacing = (w - ovenPad * 2) / (knobCount + 1);
  setLineStyle(ctx, w * 0.012);
  for (let i = 0; i < knobCount; i++) {
    const kx = ovenPad + spacing * (i + 1);
    ctx.beginPath();
    ctx.arc(kx, knobY, knobR, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// ---------------------------------------------------------------------------
// FRIDGE (front elevation)
// ---------------------------------------------------------------------------
export function drawFridgeElevation(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
) {
  setLineStyle(ctx, w * 0.02);

  // Main body
  ctx.strokeRect(0, 0, w, h);

  // Freezer / upper compartment divider at ~30%
  const divY = h * 0.3;
  ctx.beginPath();
  ctx.moveTo(0, divY);
  ctx.lineTo(w, divY);
  ctx.stroke();

  // Handles (right side)
  setLineStyle(ctx, w * 0.018);
  const handleX = w * 0.85;
  // Freezer handle
  ctx.beginPath();
  ctx.moveTo(handleX, divY * 0.3);
  ctx.lineTo(handleX, divY * 0.7);
  ctx.stroke();
  // Fridge handle
  ctx.beginPath();
  ctx.moveTo(handleX, divY + (h - divY) * 0.2);
  ctx.lineTo(handleX, divY + (h - divY) * 0.5);
  ctx.stroke();

  // Legs
  setLineStyle(ctx, w * 0.015);
  ctx.beginPath();
  ctx.moveTo(w * 0.1, h);
  ctx.lineTo(w * 0.1, h + h * 0.02);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w * 0.9, h);
  ctx.lineTo(w * 0.9, h + h * 0.02);
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// DISHWASHER (front elevation)
// ---------------------------------------------------------------------------
export function drawDishwasherElevation(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
) {
  setLineStyle(ctx, w * 0.02);

  // Main body
  ctx.strokeRect(0, 0, w, h);

  // Control panel at top ~15%
  const panelH = h * 0.15;
  ctx.beginPath();
  ctx.moveTo(0, panelH);
  ctx.lineTo(w, panelH);
  ctx.stroke();

  // Handle below panel
  setLineStyle(ctx, w * 0.015);
  ctx.beginPath();
  ctx.moveTo(w * 0.15, panelH + h * 0.03);
  ctx.lineTo(w * 0.85, panelH + h * 0.03);
  ctx.stroke();

  // Control buttons
  setLineStyle(ctx, w * 0.012);
  const btnY = panelH * 0.5;
  for (let i = 0; i < 3; i++) {
    const bx = w * 0.25 + i * w * 0.2;
    ctx.beginPath();
    ctx.arc(bx, btnY, w * 0.03, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Door lower panel line
  setLineStyle(ctx, w * 0.008);
  ctx.setLineDash([w * 0.02, w * 0.015]);
  ctx.beginPath();
  ctx.moveTo(w * 0.1, h * 0.55);
  ctx.lineTo(w * 0.9, h * 0.55);
  ctx.stroke();
  ctx.setLineDash([]);
}

// ---------------------------------------------------------------------------
// MICROWAVE (front elevation)
// ---------------------------------------------------------------------------
export function drawMicrowaveElevation(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
) {
  setLineStyle(ctx, w * 0.02);

  // Main body
  ctx.strokeRect(0, 0, w, h);

  // Door window (left ~65%)
  const pad = w * 0.06;
  const doorW = w * 0.62;
  ctx.strokeRect(pad, pad, doorW, h - pad * 2);

  // Handle (vertical line right of door)
  setLineStyle(ctx, w * 0.018);
  ctx.beginPath();
  ctx.moveTo(pad + doorW + w * 0.04, pad + h * 0.1);
  ctx.lineTo(pad + doorW + w * 0.04, h - pad - h * 0.1);
  ctx.stroke();

  // Control panel (right side)
  setLineStyle(ctx, w * 0.012);
  const panelCx = pad + doorW + w * 0.16;
  // Timer dial
  ctx.beginPath();
  ctx.arc(panelCx, h * 0.35, w * 0.05, 0, Math.PI * 2);
  ctx.stroke();
  // Start button
  ctx.beginPath();
  ctx.arc(panelCx, h * 0.65, w * 0.04, 0, Math.PI * 2);
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// KITCHEN SINK (front elevation)
// ---------------------------------------------------------------------------
export function drawKitchenSinkElevation(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
) {
  setLineStyle(ctx, w * 0.02);

  // Counter/cabinet body
  ctx.strokeRect(0, 0, w, h);

  // Counter top (thicker)
  setLineStyle(ctx, w * 0.025);
  ctx.beginPath();
  ctx.moveTo(0, h * 0.08);
  ctx.lineTo(w, h * 0.08);
  ctx.stroke();

  // Sink basin (recessed)
  setLineStyle(ctx, w * 0.015);
  const basinPad = w * 0.15;
  const basinTop = h * 0.08;
  const basinH = h * 0.25;
  ctx.beginPath();
  ctx.moveTo(basinPad, basinTop);
  ctx.lineTo(basinPad + w * 0.05, basinTop + basinH);
  ctx.lineTo(w - basinPad - w * 0.05, basinTop + basinH);
  ctx.lineTo(w - basinPad, basinTop);
  ctx.stroke();

  // Faucet
  setLineStyle(ctx, w * 0.012);
  const fCx = w * 0.5;
  ctx.beginPath();
  ctx.moveTo(fCx, basinTop);
  ctx.lineTo(fCx, basinTop - h * 0.15);
  ctx.quadraticCurveTo(fCx, basinTop - h * 0.2, fCx + w * 0.08, basinTop - h * 0.18);
  ctx.stroke();

  // Cabinet doors below
  setLineStyle(ctx, w * 0.012);
  ctx.beginPath();
  ctx.moveTo(w / 2, h * 0.4);
  ctx.lineTo(w / 2, h * 0.95);
  ctx.stroke();
  // Handles
  const handleY = h * 0.6;
  ctx.beginPath();
  ctx.moveTo(w / 2 - w * 0.08, handleY);
  ctx.lineTo(w / 2 - w * 0.08, handleY + h * 0.06);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w / 2 + w * 0.08, handleY);
  ctx.lineTo(w / 2 + w * 0.08, handleY + h * 0.06);
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// COUNTER (front elevation)
// ---------------------------------------------------------------------------
export function drawCounterElevation(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
) {
  setLineStyle(ctx, w * 0.02);

  // Main body
  ctx.strokeRect(0, 0, w, h);

  // Countertop (thicker line at top)
  setLineStyle(ctx, w * 0.03);
  ctx.beginPath();
  ctx.moveTo(0, h * 0.06);
  ctx.lineTo(w, h * 0.06);
  ctx.stroke();

  // Cabinet doors below
  setLineStyle(ctx, w * 0.012);
  const doorDivs = 3;
  for (let i = 1; i < doorDivs; i++) {
    const dx = (w / doorDivs) * i;
    ctx.beginPath();
    ctx.moveTo(dx, h * 0.12);
    ctx.lineTo(dx, h * 0.95);
    ctx.stroke();
  }
  // Small knob handles
  for (let i = 0; i < doorDivs; i++) {
    const cx2 = (w / doorDivs) * i + (w / doorDivs) / 2;
    ctx.beginPath();
    ctx.arc(cx2, h * 0.5, w * 0.02, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// ===========================================================================
// LAUNDRY — ELEVATION
// ===========================================================================

// ---------------------------------------------------------------------------
// WASHER (front elevation)
// ---------------------------------------------------------------------------
export function drawWasherElevation(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
) {
  setLineStyle(ctx, w * 0.02);

  // Main body
  ctx.strokeRect(0, 0, w, h);

  // Control panel at top
  const panelH = h * 0.2;
  ctx.beginPath();
  ctx.moveTo(0, panelH);
  ctx.lineTo(w, panelH);
  ctx.stroke();

  // Drum door (large circle)
  const drumCx = w / 2;
  const drumCy = panelH + (h - panelH) / 2;
  const drumR = Math.min(w, h - panelH) * 0.32;
  ctx.beginPath();
  ctx.arc(drumCx, drumCy, drumR, 0, Math.PI * 2);
  ctx.stroke();

  // Inner drum circle
  setLineStyle(ctx, w * 0.012);
  ctx.beginPath();
  ctx.arc(drumCx, drumCy, drumR * 0.7, 0, Math.PI * 2);
  ctx.stroke();

  // Control knobs
  setLineStyle(ctx, w * 0.015);
  const knobR = w * 0.04;
  ctx.beginPath();
  ctx.arc(w * 0.25, panelH * 0.5, knobR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(w * 0.5, panelH * 0.5, knobR, 0, Math.PI * 2);
  ctx.stroke();
  // Power button (filled)
  ctx.beginPath();
  ctx.arc(w * 0.78, panelH * 0.5, knobR * 0.7, 0, Math.PI * 2);
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// DRYER (front elevation — similar to washer but different details)
// ---------------------------------------------------------------------------
export function drawDryerElevation(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
) {
  setLineStyle(ctx, w * 0.02);

  // Main body
  ctx.strokeRect(0, 0, w, h);

  // Control panel at top
  const panelH = h * 0.2;
  ctx.beginPath();
  ctx.moveTo(0, panelH);
  ctx.lineTo(w, panelH);
  ctx.stroke();

  // Drum door (large circle)
  const drumCx = w / 2;
  const drumCy = panelH + (h - panelH) / 2;
  const drumR = Math.min(w, h - panelH) * 0.32;
  ctx.beginPath();
  ctx.arc(drumCx, drumCy, drumR, 0, Math.PI * 2);
  ctx.stroke();

  // Inner drum circle with vent holes pattern
  setLineStyle(ctx, w * 0.008);
  ctx.beginPath();
  ctx.arc(drumCx, drumCy, drumR * 0.65, 0, Math.PI * 2);
  ctx.stroke();

  // Vent pattern (small circles inside drum)
  const ventR = drumR * 0.08;
  const ventCount = 6;
  for (let i = 0; i < ventCount; i++) {
    const angle = (Math.PI * 2 * i) / ventCount;
    const vx = drumCx + Math.cos(angle) * drumR * 0.4;
    const vy = drumCy + Math.sin(angle) * drumR * 0.4;
    ctx.beginPath();
    ctx.arc(vx, vy, ventR, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Control knob (single large dial)
  setLineStyle(ctx, w * 0.015);
  ctx.beginPath();
  ctx.arc(w * 0.5, panelH * 0.5, w * 0.06, 0, Math.PI * 2);
  ctx.stroke();
  // Dial indicator
  ctx.beginPath();
  ctx.moveTo(w * 0.5, panelH * 0.5);
  ctx.lineTo(w * 0.5 + w * 0.04, panelH * 0.5 - panelH * 0.12);
  ctx.stroke();
}

// ===========================================================================
// PLANTS / DECORATION — ELEVATION
// ===========================================================================

// ---------------------------------------------------------------------------
// POTTED PLANT (side elevation)
// ---------------------------------------------------------------------------
export function drawPottedPlantElevation(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
) {
  const cx = w / 2;
  setLineStyle(ctx, w * 0.025);

  // Pot (tapered trapezoid at bottom)
  const potTop = h * 0.5;
  const potTopW = w * 0.35;
  const potBotW = w * 0.25;
  ctx.beginPath();
  ctx.moveTo(cx - potTopW, potTop);
  ctx.lineTo(cx - potBotW, h);
  ctx.lineTo(cx + potBotW, h);
  ctx.lineTo(cx + potTopW, potTop);
  ctx.closePath();
  ctx.stroke();

  // Pot rim
  setLineStyle(ctx, w * 0.03);
  ctx.beginPath();
  ctx.moveTo(cx - potTopW - w * 0.03, potTop);
  ctx.lineTo(cx + potTopW + w * 0.03, potTop);
  ctx.stroke();

  // Plant foliage (organic curved shapes rising above pot)
  setLineStyle(ctx, w * 0.02);
  // Center stem
  ctx.beginPath();
  ctx.moveTo(cx, potTop);
  ctx.quadraticCurveTo(cx - w * 0.05, h * 0.3, cx, h * 0.05);
  ctx.stroke();
  // Left leaf
  ctx.beginPath();
  ctx.moveTo(cx, h * 0.35);
  ctx.quadraticCurveTo(cx - w * 0.35, h * 0.15, cx - w * 0.15, h * 0.05);
  ctx.stroke();
  // Right leaf
  ctx.beginPath();
  ctx.moveTo(cx, h * 0.3);
  ctx.quadraticCurveTo(cx + w * 0.35, h * 0.1, cx + w * 0.2, 0);
  ctx.stroke();
  // Small leaf left
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.05, h * 0.42);
  ctx.quadraticCurveTo(cx - w * 0.25, h * 0.3, cx - w * 0.35, h * 0.2);
  ctx.stroke();
  // Small leaf right
  ctx.beginPath();
  ctx.moveTo(cx + w * 0.05, h * 0.38);
  ctx.quadraticCurveTo(cx + w * 0.3, h * 0.25, cx + w * 0.38, h * 0.15);
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// POOL (side elevation / cross-section)
// ---------------------------------------------------------------------------
export function drawPoolElevation(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
) {
  setLineStyle(ctx, w * 0.01);

  // Ground line
  ctx.beginPath();
  ctx.moveTo(0, h * 0.3);
  ctx.lineTo(w * 0.1, h * 0.3);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w * 0.9, h * 0.3);
  ctx.lineTo(w, h * 0.3);
  ctx.stroke();

  // Pool walls (cross-section view)
  setLineStyle(ctx, w * 0.015);
  ctx.beginPath();
  // Left wall
  ctx.moveTo(w * 0.1, h * 0.3);
  ctx.lineTo(w * 0.1, h * 0.95);
  // Bottom
  ctx.lineTo(w * 0.9, h * 0.95);
  // Right wall
  ctx.lineTo(w * 0.9, h * 0.3);
  ctx.stroke();

  // Water level line
  setLineStyle(ctx, w * 0.008);
  const waterY = h * 0.38;
  ctx.beginPath();
  ctx.moveTo(w * 0.1, waterY);
  ctx.lineTo(w * 0.9, waterY);
  ctx.stroke();

  // Wavy water lines
  setLineStyle(ctx, w * 0.005);
  for (let i = 0; i < 3; i++) {
    const wy = waterY + h * 0.08 * (i + 1);
    ctx.beginPath();
    const segs = 8;
    for (let s = 0; s <= segs; s++) {
      const sx = w * 0.12 + ((w * 0.76) / segs) * s;
      const sy = wy + Math.sin((s / segs) * Math.PI * 4) * h * 0.015;
      if (s === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();
  }

  // Ladder
  setLineStyle(ctx, w * 0.01);
  ctx.beginPath();
  ctx.moveTo(w * 0.82, h * 0.15);
  ctx.lineTo(w * 0.82, h * 0.6);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w * 0.88, h * 0.15);
  ctx.lineTo(w * 0.88, h * 0.6);
  ctx.stroke();
  // Rungs
  for (let i = 0; i < 4; i++) {
    const ry = h * 0.2 + i * h * 0.1;
    ctx.beginPath();
    ctx.moveTo(w * 0.82, ry);
    ctx.lineTo(w * 0.88, ry);
    ctx.stroke();
  }
}

// ---------------------------------------------------------------------------
// FLOOR LAMP (side elevation)
// ---------------------------------------------------------------------------
export function drawFloorLampElevation(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
) {
  const cx = w / 2;
  setLineStyle(ctx, w * 0.025);

  // Base (flat wide bottom)
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.25, h);
  ctx.lineTo(cx + w * 0.25, h);
  ctx.stroke();

  // Pole
  setLineStyle(ctx, w * 0.02);
  ctx.beginPath();
  ctx.moveTo(cx, h);
  ctx.lineTo(cx, h * 0.2);
  ctx.stroke();

  // Shade (trapezoid at top)
  setLineStyle(ctx, w * 0.02);
  const shadeTop = h * 0.02;
  const shadeBot = h * 0.2;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.15, shadeTop);
  ctx.lineTo(cx - w * 0.35, shadeBot);
  ctx.lineTo(cx + w * 0.35, shadeBot);
  ctx.lineTo(cx + w * 0.15, shadeTop);
  ctx.closePath();
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// RUG (side elevation — very flat rectangle with fringe)
// ---------------------------------------------------------------------------
export function drawRugElevation(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
) {
  setLineStyle(ctx, w * 0.015);

  // Main flat shape (very thin)
  ctx.strokeRect(w * 0.05, h * 0.3, w * 0.9, h * 0.4);

  // Decorative border line
  setLineStyle(ctx, w * 0.008);
  ctx.strokeRect(w * 0.1, h * 0.38, w * 0.8, h * 0.24);

  // Fringe at edges
  setLineStyle(ctx, w * 0.005);
  const fringeCount = 8;
  const fringeH = h * 0.15;
  // Left fringe
  for (let i = 0; i < fringeCount; i++) {
    const fy = h * 0.32 + (h * 0.36 / fringeCount) * (i + 0.5);
    ctx.beginPath();
    ctx.moveTo(w * 0.05, fy);
    ctx.lineTo(0, fy + fringeH * 0.3);
    ctx.stroke();
  }
  // Right fringe
  for (let i = 0; i < fringeCount; i++) {
    const fy = h * 0.32 + (h * 0.36 / fringeCount) * (i + 0.5);
    ctx.beginPath();
    ctx.moveTo(w * 0.95, fy);
    ctx.lineTo(w, fy + fringeH * 0.3);
    ctx.stroke();
  }
}

// ---------------------------------------------------------------------------
// PAINTING / MIRROR (front elevation — framed rectangle on wall)
// ---------------------------------------------------------------------------
export function drawPaintingElevation(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
) {
  setLineStyle(ctx, w * 0.02);

  // Frame
  ctx.strokeRect(0, 0, w, h);

  // Inner frame
  const pad = Math.min(w, h) * 0.1;
  ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);

  // Hanging wire at top center
  setLineStyle(ctx, w * 0.01);
  ctx.beginPath();
  ctx.moveTo(w * 0.3, 0);
  ctx.lineTo(w * 0.5, -h * 0.15);
  ctx.lineTo(w * 0.7, 0);
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// CURTAIN (side elevation — draped fabric)
// ---------------------------------------------------------------------------
export function drawCurtainElevation(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
) {
  setLineStyle(ctx, w * 0.02);

  // Rod at top
  ctx.beginPath();
  ctx.moveTo(0, h * 0.02);
  ctx.lineTo(w, h * 0.02);
  ctx.stroke();

  // Curtain folds (wavy vertical lines)
  setLineStyle(ctx, w * 0.012);
  const folds = 5;
  for (let i = 0; i <= folds; i++) {
    const x = (w / folds) * i;
    ctx.beginPath();
    ctx.moveTo(x, h * 0.04);
    for (let j = 0; j < 8; j++) {
      const y = h * 0.04 + (h * 0.92 / 8) * (j + 1);
      const dx = Math.sin(j * 1.2) * w * 0.04;
      ctx.lineTo(x + dx, y);
    }
    ctx.stroke();
  }

  // Bottom hem
  setLineStyle(ctx, w * 0.015);
  ctx.beginPath();
  ctx.moveTo(0, h * 0.98);
  ctx.lineTo(w, h * 0.98);
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// GENERIC FURNITURE (simple box with label-ready outline)
// ---------------------------------------------------------------------------
export function drawGenericFurnitureElevation(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
) {
  setLineStyle(ctx, w * 0.02);
  ctx.strokeRect(0, 0, w, h);
  setLineStyle(ctx, w * 0.01);
  ctx.setLineDash([w * 0.03, w * 0.02]);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(w, h);
  ctx.moveTo(w, 0);
  ctx.lineTo(0, h);
  ctx.stroke();
  ctx.setLineDash([]);
}

// ---------------------------------------------------------------------------
// DISPATCH: choose the right elevation draw function based on stampId
// ---------------------------------------------------------------------------
export type ElevationType =
  | 'person'
  | 'child'
  | 'tree'
  | 'bush'
  | 'car'
  | 'sofa'
  | 'bed'
  | 'table'
  | 'chair'
  | 'wardrobe'
  | 'toilet'
  | 'sink'
  | 'bathtub'
  | 'shower'
  | 'bidet'
  | 'stove'
  | 'fridge'
  | 'dishwasher'
  | 'microwave'
  | 'kitchen-sink'
  | 'counter'
  | 'washer'
  | 'dryer'
  | 'potted-plant'
  | 'pool'
  | 'floor-lamp'
  | 'rug'
  | 'painting'
  | 'curtain'
  | 'generic';

export function classifyStamp(stampId: string): ElevationType {
  const id = stampId.toLowerCase();

  // People
  if (id.includes('child')) return 'child';
  if (id.includes('person') || id.includes('wheelchair') || id.includes('group')) return 'person';

  // Outdoor
  if (id.includes('tree')) return 'tree';
  if (id.includes('bush')) return 'bush';
  if (id.includes('car') || id.includes('parking')) return 'car';
  if (id.includes('pool')) return 'pool';

  // Bathroom
  if (id.includes('bidet')) return 'bidet';
  if (id.includes('toilet')) return 'toilet';
  if (id.includes('bathtub')) return 'bathtub';
  if (id.includes('shower')) return 'shower';
  if (id === 'sink') return 'sink';

  // Kitchen (must check kitchen-sink before generic sink/table/counter)
  if (id.includes('kitchen-sink')) return 'kitchen-sink';
  if (id.includes('stove') || id.includes('burner')) return 'stove';
  if (id.includes('fridge') || id.includes('refriger')) return 'fridge';
  if (id.includes('dishwasher')) return 'dishwasher';
  if (id.includes('microwave')) return 'microwave';
  if (id.includes('counter')) return 'counter';

  // Laundry
  if (id.includes('laundry-sink')) return 'sink';
  if (id.includes('washer') && !id.includes('dish')) return 'washer';
  if (id.includes('dryer')) return 'dryer';
  if (id.includes('ironing')) return 'table';

  // Furniture
  if (id.includes('sofa') || id.includes('armchair')) return 'sofa';
  if (id.includes('bed')) return 'bed';
  if (id.includes('table') || id.includes('desk') || id.includes('coffee')) return 'table';
  if (id.includes('chair') || id.includes('bench')) return 'chair';
  if (id.includes('wardrobe') || id.includes('bookshelf') || id.includes('tv-stand')) return 'wardrobe';

  // Decoration
  if (id.includes('potted-plant') || id.includes('vase')) return 'potted-plant';
  if (id.includes('rug')) return 'rug';
  if (id.includes('painting') || id.includes('mirror') || id.includes('clock')) return 'painting';
  if (id.includes('curtain')) return 'curtain';

  // Lighting / Accessories
  if (id.includes('floor-lamp')) return 'floor-lamp';
  if (id.includes('lamp') || id.includes('light') || id.includes('chandelier') || id.includes('sconce')) return 'floor-lamp';

  return 'generic';
}

/** Suggested elevation height (meters) based on type */
export function elevationHeight(type: ElevationType): number {
  switch (type) {
    case 'person': return 1.7;
    case 'child': return 1.2;
    case 'tree': return 4.5;
    case 'bush': return 1.2;
    case 'car': return 1.5;
    case 'sofa': return 0.85;
    case 'bed': return 0.6;
    case 'table': return 0.75;
    case 'chair': return 0.85;
    case 'wardrobe': return 1.8;
    case 'toilet': return 0.75;
    case 'sink': return 0.85;
    case 'bathtub': return 0.6;
    case 'shower': return 2.1;
    case 'bidet': return 0.4;
    case 'stove': return 0.9;
    case 'fridge': return 1.8;
    case 'dishwasher': return 0.85;
    case 'microwave': return 0.3;
    case 'kitchen-sink': return 0.9;
    case 'counter': return 0.9;
    case 'washer': return 0.85;
    case 'dryer': return 0.85;
    case 'potted-plant': return 0.8;
    case 'pool': return 1.5;
    case 'floor-lamp': return 1.6;
    case 'rug': return 0.02;
    case 'painting': return 0.6;
    case 'curtain': return 2.4;
    case 'generic': return 0.6;
  }
}

/** Suggested elevation width (meters) based on type */
export function elevationWidth(type: ElevationType): number {
  switch (type) {
    case 'person': return 0.5;
    case 'child': return 0.35;
    case 'tree': return 3.0;
    case 'bush': return 1.2;
    case 'car': return 4.0;
    case 'sofa': return 1.6;
    case 'bed': return 2.0;
    case 'table': return 1.2;
    case 'chair': return 0.45;
    case 'wardrobe': return 1.0;
    case 'toilet': return 0.65;
    case 'sink': return 0.5;
    case 'bathtub': return 1.7;
    case 'shower': return 0.9;
    case 'bidet': return 0.4;
    case 'stove': return 0.6;
    case 'fridge': return 0.7;
    case 'dishwasher': return 0.6;
    case 'microwave': return 0.5;
    case 'kitchen-sink': return 0.8;
    case 'counter': return 1.0;
    case 'washer': return 0.6;
    case 'dryer': return 0.6;
    case 'potted-plant': return 0.35;
    case 'pool': return 4.0;
    case 'floor-lamp': return 0.4;
    case 'rug': return 1.5;
    case 'painting': return 0.8;
    case 'curtain': return 1.5;
    case 'generic': return 0.6;
  }
}

const drawFns: Record<
  ElevationType,
  (ctx: CanvasRenderingContext2D, w: number, h: number) => void
> = {
  person: drawPersonElevation,
  child: drawChildElevation,
  tree: drawTreeElevation,
  bush: drawBushElevation,
  car: drawCarElevation,
  sofa: drawSofaElevation,
  bed: drawBedElevation,
  table: drawTableElevation,
  chair: drawChairElevation,
  wardrobe: drawWardrobeElevation,
  toilet: drawToiletElevation,
  sink: drawSinkElevation,
  bathtub: drawBathtubElevation,
  shower: drawShowerElevation,
  bidet: drawBidetElevation,
  stove: drawStoveElevation,
  fridge: drawFridgeElevation,
  dishwasher: drawDishwasherElevation,
  microwave: drawMicrowaveElevation,
  'kitchen-sink': drawKitchenSinkElevation,
  counter: drawCounterElevation,
  washer: drawWasherElevation,
  dryer: drawDryerElevation,
  'potted-plant': drawPottedPlantElevation,
  pool: drawPoolElevation,
  'floor-lamp': drawFloorLampElevation,
  rug: drawRugElevation,
  painting: drawPaintingElevation,
  curtain: drawCurtainElevation,
  generic: drawGenericFurnitureElevation,
};

/**
 * Draw the Neufert-style elevation for a given stamp at the current canvas
 * position. Sets stroke to the given color, draws at (0,0) -> (w, h).
 */
export function drawNeufertElevation(
  ctx: CanvasRenderingContext2D,
  stampId: string,
  w: number,
  h: number,
  color = '#333',
) {
  const type = classifyStamp(stampId);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = 'none';
  drawFns[type](ctx, w, h);
  ctx.restore();
}
