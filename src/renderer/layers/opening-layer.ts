import type { Door, Window, Wall } from '@/types/elements';
import { getDoorWorldPosition, getDoorSwingArc } from '@/engine/geometry/door-placement';
import { getWindowWorldPosition } from '@/engine/geometry/window-placement';

// ---------------------------------------------------------------------------
// Opening layer -- draws doors (leaf + swing arc) and windows (glass panes)
// ---------------------------------------------------------------------------

/**
 * Render doors and windows as symbolic floor-plan representations.
 *
 * @param ctx            Pre-transformed canvas context (1 unit = 1 m).
 * @param doors          All doors on the current floor.
 * @param windows        All windows on the current floor.
 * @param walls          All walls (needed to resolve parent wall geometry).
 * @param pixelsPerMeter Camera zoom for scale-independent line widths.
 */
export function renderOpenings(
  ctx: CanvasRenderingContext2D,
  doors: Door[],
  windows: Window[],
  walls: Wall[],
  pixelsPerMeter: number,
): void {
  const px = 1 / pixelsPerMeter;
  const wallMap = new Map<string, Wall>();
  for (const w of walls) {
    wallMap.set(w.id, w);
  }

  // -------------------------------------------------------------------
  // Doors
  // -------------------------------------------------------------------
  for (const door of doors) {
    const wall = wallMap.get(door.wallId);
    if (!wall) continue;

    const { center, angle } = getDoorWorldPosition(wall, door.position);

    // Swing arc
    const arc = getDoorSwingArc(
      center,
      angle,
      door.width,
      door.swing,
      door.openAngle,
    );

    // -- Draw the door leaf (closed position line) ----------------------
    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.rotate(angle);

    ctx.beginPath();
    ctx.moveTo(-door.width / 2, 0);
    ctx.lineTo(door.width / 2, 0);
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 2 * px;
    ctx.stroke();

    ctx.restore();

    // -- Draw the swing arc (quarter circle) ----------------------------
    ctx.beginPath();
    ctx.arc(
      center.x,
      center.y,
      arc.radius,
      arc.arcStart,
      arc.arcEnd,
      false,
    );
    ctx.strokeStyle = '#aaaaaa';
    ctx.lineWidth = px;
    ctx.setLineDash([4 * px, 4 * px]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // -------------------------------------------------------------------
  // Windows
  // -------------------------------------------------------------------
  for (const win of windows) {
    const wall = wallMap.get(win.wallId);
    if (!wall) continue;

    const { center, angle } = getWindowWorldPosition(wall, win.position);

    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.rotate(angle);

    const halfW = win.width / 2;

    // Perpendicular offset for glass lines (fraction of wall thickness)
    const glassOffset = wall.thickness * 0.15;

    // -- Two parallel glass pane lines ----------------------------------
    ctx.strokeStyle = '#88ccee';
    ctx.lineWidth = px;

    for (const sign of [-1, 1] as const) {
      const oy = sign * glassOffset;
      ctx.beginPath();
      ctx.moveTo(-halfW, oy);
      ctx.lineTo(halfW, oy);
      ctx.stroke();
    }

    // -- Tick marks at each end -----------------------------------------
    const tickLen = wall.thickness * 0.4;
    ctx.strokeStyle = '#88ccee';
    ctx.lineWidth = px;

    for (const xSign of [-1, 1] as const) {
      ctx.beginPath();
      ctx.moveTo(xSign * halfW, -tickLen / 2);
      ctx.lineTo(xSign * halfW, tickLen / 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}
