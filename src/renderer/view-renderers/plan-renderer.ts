import { stampRegistry } from '@/library/index.ts';
import { roomPatternFns, wallPatternFns } from '@/renderer/layers/pattern-library.ts';
import { formatAreaInUnit, formatInUnit } from '@/utils/units.ts';
import type { DisplayUnit } from '@/utils/units.ts';
import type {
  ArchLine,
  ArchLineStyle,
  DimensionLine,
  Door,
  FillPattern,
  FurnitureItem,
  Room,
  Shape,
  Stair,
  TextLabel,
  Wall,
  WallFillPattern,
  Window,
} from '@/types/elements.ts';

export interface PlanRenderData {
  walls: Wall[];
  doors: Door[];
  windows: Window[];
  rooms: Room[];
  archLines: ArchLine[];
  furniture: FurnitureItem[];
  texts: TextLabel[];
  dimensions: DimensionLine[];
  stairs: Stair[];
  shapes: Shape[];
}

export interface PlanRenderOptions {
  displayUnit: DisplayUnit;
  pixelsPerMeter: number;
  showDimensions: boolean;
  selectedIds?: Set<string>;
  dragOffset?: { x: number; y: number };
}

export function getArchLineDash(style: ArchLineStyle): { dash: number[]; lineWidth: number; color: string } {
  switch (style) {
    case 'colindancia':
      return { dash: [0.1, 0.05], lineWidth: 0.03, color: '#b05030' };
    case 'limite-lote':
      return { dash: [0.12, 0.04, 0.02, 0.04, 0.02, 0.04], lineWidth: 0.025, color: '#d04040' };
    case 'eje':
      return { dash: [0.08, 0.03, 0.02, 0.03], lineWidth: 0.008, color: '#40a040' };
    case 'setback':
      return { dash: [0.05, 0.05], lineWidth: 0.015, color: '#6080c0' };
    case 'center':
      return { dash: [0.1, 0.03, 0.02, 0.03], lineWidth: 0.008, color: '#40a040' };
    default:
      return { dash: [0.1, 0.05], lineWidth: 0.02, color: '#888' };
  }
}

export function renderPlanScene(
  ctx: CanvasRenderingContext2D,
  data: PlanRenderData,
  options: PlanRenderOptions,
): void {
  const { walls, doors, windows, rooms, archLines, furniture, texts, dimensions, stairs, shapes } = data;
  const displayUnit = options.displayUnit;
  const pixelsPerMeter = options.pixelsPerMeter;
  const showDimensions = options.showDimensions;
  const selectedIds = options.selectedIds ?? new Set<string>();
  const dragDx = options.dragOffset?.x ?? 0;
  const dragDy = options.dragOffset?.y ?? 0;
    // ----- Rooms (filled regions, drawn first) -----
    for (const room of rooms) {
      if (!room.visible || room.polygon.length < 3) continue;
      ctx.fillStyle = room.color;
      ctx.beginPath();
      ctx.moveTo(room.polygon[0].x, room.polygon[0].y);
      for (let i = 1; i < room.polygon.length; i++) {
        ctx.lineTo(room.polygon[i].x, room.polygon[i].y);
      }
      ctx.closePath();
      ctx.fill();

      // Room pattern overlay
      const roomPattern = (room.fillPattern || 'solid') as FillPattern;
      if (roomPattern !== 'solid') {
        const patFn = roomPatternFns[roomPattern];
        if (patFn) {
          ctx.save();
          // Clip to room polygon
          ctx.beginPath();
          ctx.moveTo(room.polygon[0].x, room.polygon[0].y);
          for (let i = 1; i < room.polygon.length; i++) {
            ctx.lineTo(room.polygon[i].x, room.polygon[i].y);
          }
          ctx.closePath();
          ctx.clip();
          // Compute AABB
          let rMinX = Infinity, rMinY = Infinity, rMaxX = -Infinity, rMaxY = -Infinity;
          for (const p of room.polygon) {
            if (p.x < rMinX) rMinX = p.x;
            if (p.y < rMinY) rMinY = p.y;
            if (p.x > rMaxX) rMaxX = p.x;
            if (p.y > rMaxY) rMaxY = p.y;
          }
          const rpx = 1 / pixelsPerMeter;
          patFn(ctx, rMinX, rMinY, rMaxX, rMaxY, rpx);
          ctx.restore();
        }
      }

      // Room label
      if (room.label) {
        const cx = room.polygon.reduce((sum, p) => sum + p.x, 0) / room.polygon.length;
        const cy = room.polygon.reduce((sum, p) => sum + p.y, 0) / room.polygon.length;
        ctx.save();
        ctx.fillStyle = '#666';
        ctx.font = '0.15px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(room.label, cx, cy);
        ctx.fillStyle = '#888';
        ctx.font = '0.10px sans-serif';
        ctx.fillText(formatAreaInUnit(room.area, displayUnit), cx, cy + 0.2);
        ctx.restore();
      }
    }
    // ----- Walls -----

    for (const wall of walls) {
      if (!wall.visible) continue;
      const isSelected = selectedIds.has(wall.id);
      const odx = isSelected ? dragDx : 0;
      const ody = isSelected ? dragDy : 0;

      // Wall fill (quad from centerline + thickness)
      const dx = wall.end.x - wall.start.x;
      const dy = wall.end.y - wall.start.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 0) {
        const nx = -dy / len * (wall.thickness / 2);
        const ny = dx / len * (wall.thickness / 2);
        ctx.fillStyle = wall.fillColor;
        ctx.beginPath();
        ctx.moveTo(wall.start.x + nx + odx, wall.start.y + ny + ody);
        ctx.lineTo(wall.end.x + nx + odx, wall.end.y + ny + ody);
        ctx.lineTo(wall.end.x - nx + odx, wall.end.y - ny + ody);
        ctx.lineTo(wall.start.x - nx + odx, wall.start.y - ny + ody);
        ctx.closePath();
        ctx.fill();

        // Wall pattern overlay
        const wallPat = ((wall as unknown as Record<string, unknown>).fillPattern || 'solid') as WallFillPattern;
        if (wallPat !== 'solid') {
          const wPatFn = wallPatternFns[wallPat];
          if (wPatFn) {
            ctx.save();
            // Clip to wall quad
            ctx.beginPath();
            ctx.moveTo(wall.start.x + nx + odx, wall.start.y + ny + ody);
            ctx.lineTo(wall.end.x + nx + odx, wall.end.y + ny + ody);
            ctx.lineTo(wall.end.x - nx + odx, wall.end.y - ny + ody);
            ctx.lineTo(wall.start.x - nx + odx, wall.start.y - ny + ody);
            ctx.closePath();
            ctx.clip();
            // AABB of the wall quad
            const wMinX = Math.min(wall.start.x + nx + odx, wall.end.x + nx + odx, wall.end.x - nx + odx, wall.start.x - nx + odx);
            const wMinY = Math.min(wall.start.y + ny + ody, wall.end.y + ny + ody, wall.end.y - ny + ody, wall.start.y - ny + ody);
            const wMaxX = Math.max(wall.start.x + nx + odx, wall.end.x + nx + odx, wall.end.x - nx + odx, wall.start.x - nx + odx);
            const wMaxY = Math.max(wall.start.y + ny + ody, wall.end.y + ny + ody, wall.end.y - ny + ody, wall.start.y - ny + ody);
            const wpx = 1 / pixelsPerMeter;
            wPatFn(ctx, wMinX, wMinY, wMaxX, wMaxY, wpx);
            ctx.restore();
          }
        }

        // Wall outline
        ctx.strokeStyle = isSelected ? '#2d6a4f' : wall.color;
        ctx.lineWidth = 0.01;
        ctx.stroke();
      }
    }

    // ----- Doors -----
    for (const door of doors) {
      if (!door.visible) continue;
      const parentWall = walls.find((w) => w.id === door.wallId);
      if (!parentWall) continue;

      const dx = parentWall.end.x - parentWall.start.x;
      const dy = parentWall.end.y - parentWall.start.y;
      const px = parentWall.start.x + dx * door.position;
      const py = parentWall.start.y + dy * door.position;
      const isSelected = selectedIds.has(door.id);
      const doorStyle = door.doorStyle || 'single';

      ctx.save();
      const angle = Math.atan2(dy, dx);
      ctx.translate(px, py);
      ctx.rotate(angle);

      // Door gap (erase wall segment)
      ctx.strokeStyle = '#f4f1ec';
      ctx.lineWidth = parentWall.thickness + 0.02;
      ctx.beginPath();
      ctx.moveTo(-door.width / 2, 0);
      ctx.lineTo(door.width / 2, 0);
      ctx.stroke();

      ctx.strokeStyle = isSelected ? '#2d6a4f' : '#000000';
      ctx.lineWidth = 0.02;
      let swingDir = door.swing === 'left' ? -1 : 1;
      if (door.flipSide) swingDir *= -1;
      const hingeX = (door.hinge === 'end') ? door.width / 2 : -door.width / 2;

      // Wall jamb lines (short perpendicular stubs at each side of the opening)
      const jambLen = parentWall.thickness / 2;
      ctx.lineWidth = 0.025;
      ctx.beginPath();
      ctx.moveTo(-door.width / 2, -jambLen);
      ctx.lineTo(-door.width / 2, jambLen);
      ctx.moveTo(door.width / 2, -jambLen);
      ctx.lineTo(door.width / 2, jambLen);
      ctx.stroke();

      ctx.lineWidth = 0.02;

      if (doorStyle === 'single') {
        // Single door: thick leaf line + thin swing arc (Neufert style)
        //
        // Wall runs along X axis. Hinge at hingeX, opposite jamb at -hingeX.
        // closedAngle = angle from hinge toward opposite jamb (along wall).
        // Arc sweeps from closedAngle by openAngle toward the swing side (+Y or -Y).
        //
        const openRad = (door.openAngle * Math.PI) / 180;
        // Closed angle: from hinge toward opposite jamb
        const closedAngle = (door.hinge === 'start') ? 0 : Math.PI;
        // Sweep: hinge=start sweeps same as swingDir; hinge=end sweeps opposite
        const flipForHinge = (door.hinge === 'start') ? 1 : -1;
        const sweepAngle = swingDir * flipForHinge * openRad;
        const leafAngle = closedAngle + sweepAngle;

        // Door leaf — thick line from hinge to open position
        ctx.lineWidth = 0.03;
        ctx.beginPath();
        ctx.moveTo(hingeX, 0);
        ctx.lineTo(hingeX + Math.cos(leafAngle) * door.width, Math.sin(leafAngle) * door.width);
        ctx.stroke();

        // Swing arc — thin line from closed to open
        ctx.lineWidth = 0.012;
        ctx.beginPath();
        const ccw = (swingDir * flipForHinge) < 0;
        ctx.arc(hingeX, 0, door.width, closedAngle, leafAngle, ccw);
        ctx.stroke();
        ctx.lineWidth = 0.02;
      } else if (doorStyle === 'double') {
        // Double door: two leaves from center, each half-width (Neufert style)
        const halfW = door.width / 2;
        const openRad = (door.openAngle * Math.PI) / 180;

        // Left leaf: hinge at center (x=0), closed pointing left (toward -width/2)
        const closedL = Math.PI; // pointing left
        const sweepL = swingDir > 0 ? openRad : -openRad;
        const openL = closedL + sweepL;
        ctx.lineWidth = 0.03;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(openL) * halfW, Math.sin(openL) * halfW);
        ctx.stroke();
        ctx.lineWidth = 0.012;
        ctx.beginPath();
        ctx.arc(0, 0, halfW, closedL, openL, swingDir < 0);
        ctx.stroke();

        // Right leaf: hinge at center, closed pointing right (toward +width/2)
        const closedR = 0; // pointing right
        const sweepR = swingDir > 0 ? -openRad : openRad;
        const openR = closedR + sweepR;
        ctx.lineWidth = 0.03;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(openR) * halfW, Math.sin(openR) * halfW);
        ctx.stroke();
        ctx.lineWidth = 0.012;
        ctx.beginPath();
        ctx.arc(0, 0, halfW, closedR, openR, swingDir > 0);
        ctx.stroke();

        ctx.lineWidth = 0.02;
      } else if (doorStyle === 'sliding') {
        // Sliding door: two offset lines with arrow
        const t = parentWall.thickness / 2;
        ctx.beginPath();
        ctx.moveTo(-door.width / 2, t * 0.3);
        ctx.lineTo(door.width / 2, t * 0.3);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-door.width / 2, -t * 0.3);
        ctx.lineTo(0, -t * 0.3);
        ctx.stroke();
        // Arrow
        ctx.beginPath();
        ctx.moveTo(door.width * 0.15, t * 0.3 - 0.03);
        ctx.lineTo(door.width * 0.3, t * 0.3);
        ctx.lineTo(door.width * 0.15, t * 0.3 + 0.03);
        ctx.stroke();
      } else if (doorStyle === 'pocket') {
        // Pocket door: dashed line showing pocket, solid for visible part
        const t = parentWall.thickness / 2;
        ctx.setLineDash([0.04, 0.03]);
        ctx.beginPath();
        ctx.moveTo(-door.width / 2, 0);
        ctx.lineTo(0, 0);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(door.width / 2, 0);
        ctx.stroke();
        // Pocket cavity indicator
        ctx.setLineDash([0.02, 0.02]);
        ctx.beginPath();
        ctx.moveTo(-door.width / 2, -t * 0.5);
        ctx.lineTo(0, -t * 0.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-door.width / 2, t * 0.5);
        ctx.lineTo(0, t * 0.5);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (doorStyle === 'folding') {
        // Folding door: zigzag pattern
        const segments = 4;
        const segW = door.width / segments;
        ctx.beginPath();
        ctx.moveTo(-door.width / 2, 0);
        for (let i = 0; i < segments; i++) {
          const x = -door.width / 2 + segW * (i + 1);
          const y = (i % 2 === 0) ? swingDir * 0.08 : 0;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else if (doorStyle === 'revolving') {
        // Revolving door: circle with 4 vanes
        const r = door.width / 2;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
        // 4 vanes (cross)
        for (let i = 0; i < 4; i++) {
          const a = (Math.PI / 2) * i + Math.PI / 4;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          ctx.stroke();
        }
      }

      ctx.restore();
    }

    // ----- Windows -----
    for (const win of windows) {
      if (!win.visible) continue;
      const parentWall = walls.find((w) => w.id === win.wallId);
      if (!parentWall) continue;

      const dx = parentWall.end.x - parentWall.start.x;
      const dy = parentWall.end.y - parentWall.start.y;
      const px = parentWall.start.x + dx * win.position;
      const py = parentWall.start.y + dy * win.position;
      const isSelected = selectedIds.has(win.id);
      const windowStyle = win.windowStyle || 'single';

      ctx.save();
      const angle = Math.atan2(dy, dx);
      ctx.translate(px, py);
      ctx.rotate(angle);

      // Window gap
      ctx.strokeStyle = '#f4f1ec';
      ctx.lineWidth = parentWall.thickness + 0.02;
      ctx.beginPath();
      ctx.moveTo(-win.width / 2, 0);
      ctx.lineTo(win.width / 2, 0);
      ctx.stroke();

      const t = parentWall.thickness / 2;
      ctx.strokeStyle = isSelected ? '#2d6a4f' : '#4a9eda';
      ctx.lineWidth = 0.015;

      if (windowStyle === 'single') {
        // Single pane: 2 parallel frame lines + X cross-hatching (Neufert)
        ctx.beginPath();
        ctx.moveTo(-win.width / 2, -t * 0.6);
        ctx.lineTo(win.width / 2, -t * 0.6);
        ctx.moveTo(-win.width / 2, t * 0.6);
        ctx.lineTo(win.width / 2, t * 0.6);
        ctx.stroke();
        // X cross-hatching between the frame lines
        const hw = win.width / 2;
        const ht = t * 0.6;
        ctx.lineWidth = 0.01;
        ctx.beginPath();
        ctx.moveTo(-hw, -ht);
        ctx.lineTo(hw, ht);
        ctx.moveTo(-hw, ht);
        ctx.lineTo(hw, -ht);
        ctx.stroke();
        ctx.lineWidth = 0.015;
      } else if (windowStyle === 'double') {
        // Double pane: 2 frame lines + center divider + X cross per pane (Neufert)
        ctx.beginPath();
        ctx.moveTo(-win.width / 2, -t * 0.6);
        ctx.lineTo(win.width / 2, -t * 0.6);
        ctx.moveTo(-win.width / 2, t * 0.6);
        ctx.lineTo(win.width / 2, t * 0.6);
        ctx.stroke();
        // Center mullion
        ctx.beginPath();
        ctx.moveTo(0, -t * 0.6);
        ctx.lineTo(0, t * 0.6);
        ctx.stroke();
        // X cross-hatching in each pane
        const hw = win.width / 2;
        const ht = t * 0.6;
        ctx.lineWidth = 0.01;
        ctx.beginPath();
        // Left pane X
        ctx.moveTo(-hw, -ht);
        ctx.lineTo(0, ht);
        ctx.moveTo(-hw, ht);
        ctx.lineTo(0, -ht);
        // Right pane X
        ctx.moveTo(0, -ht);
        ctx.lineTo(hw, ht);
        ctx.moveTo(0, ht);
        ctx.lineTo(hw, -ht);
        ctx.stroke();
        ctx.lineWidth = 0.015;
      } else if (windowStyle === 'sliding') {
        // Sliding window: overlapping panes with arrow
        ctx.beginPath();
        ctx.moveTo(-win.width / 2, -t * 0.4);
        ctx.lineTo(win.width * 0.1, -t * 0.4);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-win.width * 0.1, t * 0.4);
        ctx.lineTo(win.width / 2, t * 0.4);
        ctx.stroke();
        // Frame top and bottom
        ctx.beginPath();
        ctx.moveTo(-win.width / 2, -t * 0.6);
        ctx.lineTo(win.width / 2, -t * 0.6);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-win.width / 2, t * 0.6);
        ctx.lineTo(win.width / 2, t * 0.6);
        ctx.stroke();
        // Arrow
        ctx.beginPath();
        ctx.moveTo(win.width * 0.2, t * 0.4 - 0.025);
        ctx.lineTo(win.width * 0.35, t * 0.4);
        ctx.lineTo(win.width * 0.2, t * 0.4 + 0.025);
        ctx.stroke();
      } else if (windowStyle === 'fixed') {
        // Fixed window: X cross pattern inside frame
        for (const offset of [-t * 0.6, t * 0.6]) {
          ctx.beginPath();
          ctx.moveTo(-win.width / 2, offset);
          ctx.lineTo(win.width / 2, offset);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(-win.width / 2, -t * 0.6);
        ctx.lineTo(win.width / 2, t * 0.6);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-win.width / 2, t * 0.6);
        ctx.lineTo(win.width / 2, -t * 0.6);
        ctx.stroke();
      } else if (windowStyle === 'casement') {
        // Casement window: frame lines + X cross-hatching + triangle opening indicator
        const hw = win.width / 2;
        const ht = t * 0.6;
        ctx.beginPath();
        ctx.moveTo(-hw, -ht);
        ctx.lineTo(hw, -ht);
        ctx.moveTo(-hw, ht);
        ctx.lineTo(hw, ht);
        ctx.stroke();
        // X cross-hatching
        ctx.lineWidth = 0.01;
        ctx.beginPath();
        ctx.moveTo(-hw, -ht);
        ctx.lineTo(hw, ht);
        ctx.moveTo(-hw, ht);
        ctx.lineTo(hw, -ht);
        ctx.stroke();
        ctx.lineWidth = 0.015;
        // Opening indicator triangle
        ctx.beginPath();
        ctx.moveTo(-hw, -ht);
        ctx.lineTo(0, -ht - t * 0.8);
        ctx.lineTo(hw, -ht);
        ctx.stroke();
      } else if (windowStyle === 'awning') {
        // Awning window: frame lines + X cross-hatching + triangle at bottom
        const hw = win.width / 2;
        const ht = t * 0.6;
        ctx.beginPath();
        ctx.moveTo(-hw, -ht);
        ctx.lineTo(hw, -ht);
        ctx.moveTo(-hw, ht);
        ctx.lineTo(hw, ht);
        ctx.stroke();
        // X cross-hatching
        ctx.lineWidth = 0.01;
        ctx.beginPath();
        ctx.moveTo(-hw, -ht);
        ctx.lineTo(hw, ht);
        ctx.moveTo(-hw, ht);
        ctx.lineTo(hw, -ht);
        ctx.stroke();
        ctx.lineWidth = 0.015;
        // Opening indicator triangle at bottom
        ctx.beginPath();
        ctx.moveTo(-hw, ht);
        ctx.lineTo(0, ht + t * 0.8);
        ctx.lineTo(hw, ht);
        ctx.stroke();
      }

      ctx.restore();
    }

    // ----- Architectural Lines -----
    for (const line of archLines) {
      if (!line.visible) continue;
      const isSelected = selectedIds.has(line.id);
      const { dash, lineWidth: defaultLineWidth, color } = getArchLineDash(line.lineStyle);
      const lOdx = isSelected ? dragDx : 0;
      const lOdy = isSelected ? dragDy : 0;

      // Use element lineWeight if set, converting from display units to world
      // lineWeight is stored as a multiplier (e.g. 1=thin, 3=thick) over the default
      const effectiveLineWidth = line.lineWeight > 0 ? line.lineWeight * 0.01 : defaultLineWidth;

      ctx.save();
      ctx.strokeStyle = isSelected ? '#2d6a4f' : color;
      ctx.lineWidth = effectiveLineWidth;
      ctx.setLineDash(dash);
      ctx.lineCap = 'butt';
      ctx.beginPath();
      ctx.moveTo(line.start.x + lOdx, line.start.y + lOdy);
      ctx.lineTo(line.end.x + lOdx, line.end.y + lOdy);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // ----- Furniture -----
    for (const item of furniture) {
      if (!item.visible) continue;
      const isSelected = selectedIds.has(item.id);

      ctx.save();
      ctx.translate(
        item.position.x + (isSelected ? dragDx : 0),
        item.position.y + (isSelected ? dragDy : 0),
      );
      ctx.rotate((item.rotation * Math.PI) / 180);
      ctx.scale(item.scale, item.scale);

      // Stamps draw from (0,0) to (w,h); center the stamp on position
      ctx.translate(-item.width / 2, -item.depth / 2);

      const stamp = stampRegistry.get(item.stampId);
      if (stamp) {
        // Apply color tint if set
        if (item.color) {
          ctx.strokeStyle = item.color;
          ctx.fillStyle = item.color;
        }
        stamp.draw(ctx, item.width, item.depth);
        // Reset after draw if color was applied
        if (item.color) {
          ctx.strokeStyle = '#000';
          ctx.fillStyle = 'transparent';
        }
      } else {
        // Fallback rectangle
        ctx.fillStyle = '#aaa';
        ctx.fillRect(0, 0, item.width, item.depth);
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 0.01;
        ctx.strokeRect(0, 0, item.width, item.depth);
      }

      if (isSelected) {
        ctx.strokeStyle = '#2d6a4f';
        ctx.lineWidth = 0.02;
        ctx.strokeRect(-0.02, -0.02, item.width + 0.04, item.depth + 0.04);
      }

      ctx.restore();
    }

    // ----- Stairs -----
    for (const stair of stairs) {
      if (!stair.visible) continue;
      const isSelected = selectedIds.has(stair.id);
      const sDx = isSelected ? dragDx : 0;
      const sDy = isSelected ? dragDy : 0;

      // Guard against corrupted position data (old stairs stored SnapResult instead of Point)
      const stairPos = stair.position as { x?: number; y?: number; point?: { x: number; y: number } };
      const stairPx = stairPos.x ?? stairPos.point?.x ?? 0;
      const stairPy = stairPos.y ?? stairPos.point?.y ?? 0;

      ctx.save();
      ctx.translate(stairPx + sDx, stairPy + sDy);
      ctx.rotate((stair.rotation * Math.PI) / 180);

      // Apply flip transforms
      if (stair.flipH || stair.flipV) {
        ctx.translate(stair.flipH ? stair.width : 0, stair.flipV ? stair.length : 0);
        ctx.scale(stair.flipH ? -1 : 1, stair.flipV ? -1 : 1);
      }

      ctx.strokeStyle = isSelected ? '#2d6a4f' : '#000000';
      ctx.lineWidth = 0.02;
      ctx.fillStyle = 'transparent';

      const style = stair.stairStyle || 'straight';
      const w = stair.width;
      const l = stair.length;
      const treads = stair.treads;

      if (style === 'straight') {
        // Outline (slightly thicker)
        ctx.lineWidth = 0.025;
        ctx.strokeRect(0, 0, w, l);
        // Tread lines (thinner)
        ctx.lineWidth = 0.012;
        const treadDepth = l / treads;
        for (let i = 1; i < treads; i++) {
          const y = i * treadDepth;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
        // Diagonal break line across middle (Neufert convention)
        ctx.lineWidth = 0.015;
        ctx.beginPath();
        ctx.moveTo(0, l * 0.55);
        ctx.lineTo(w, l * 0.45);
        ctx.stroke();
        // Direction arrow (full length center line with arrowhead)
        ctx.lineWidth = 0.012;
        ctx.beginPath();
        ctx.moveTo(w / 2, l * 0.85);
        ctx.lineTo(w / 2, l * 0.1);
        ctx.stroke();
        // Arrowhead
        const arrowSize = Math.min(w * 0.1, 0.1);
        ctx.beginPath();
        ctx.moveTo(w / 2 - arrowSize, l * 0.1 + arrowSize * 1.2);
        ctx.lineTo(w / 2, l * 0.1);
        ctx.lineTo(w / 2 + arrowSize, l * 0.1 + arrowSize * 1.2);
        ctx.stroke();
        ctx.lineWidth = 0.02;
      } else if (style === 'l-shaped') {
        const land = stair.landingDepth;
        const halfTreads = Math.floor(treads / 2);
        const run1 = l - land;
        const treadDepth = run1 / halfTreads;
        // First run
        ctx.lineWidth = 0.025;
        ctx.strokeRect(0, 0, w, run1);
        ctx.lineWidth = 0.012;
        for (let i = 1; i < halfTreads; i++) {
          const y = i * treadDepth;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
        // Landing
        ctx.lineWidth = 0.025;
        ctx.strokeRect(0, run1, w + land, land);
        // Second run (turns right)
        const run2W = land;
        const run2L = w;
        const tread2Depth = run2L / (treads - halfTreads);
        ctx.strokeRect(w, 0, run2W, run2L);
        ctx.lineWidth = 0.012;
        for (let i = 1; i < treads - halfTreads; i++) {
          const y = run2L - i * tread2Depth;
          ctx.beginPath();
          ctx.moveTo(w, y);
          ctx.lineTo(w + run2W, y);
          ctx.stroke();
        }
        // Direction arrow
        ctx.beginPath();
        ctx.moveTo(w / 2, run1 - 0.05);
        ctx.lineTo(w / 2, 0.1);
        ctx.stroke();
        const arrowSize = Math.min(w * 0.08, 0.08);
        ctx.beginPath();
        ctx.moveTo(w / 2 - arrowSize, 0.1 + arrowSize * 1.2);
        ctx.lineTo(w / 2, 0.1);
        ctx.lineTo(w / 2 + arrowSize, 0.1 + arrowSize * 1.2);
        ctx.stroke();
        ctx.lineWidth = 0.02;
      } else if (style === 'u-shaped') {
        const land = stair.landingDepth;
        const halfTreads = Math.floor(treads / 2);
        const halfW = w / 2;
        const run1 = l - land;
        const treadDepth = run1 / halfTreads;
        // First run (left half)
        ctx.lineWidth = 0.025;
        ctx.strokeRect(0, 0, halfW, run1);
        ctx.lineWidth = 0.012;
        for (let i = 1; i < halfTreads; i++) {
          const y = i * treadDepth;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(halfW, y);
          ctx.stroke();
        }
        // Landing
        ctx.lineWidth = 0.025;
        ctx.strokeRect(0, run1, w, land);
        // Second run (right half, going back)
        ctx.strokeRect(halfW, 0, halfW, run1);
        ctx.lineWidth = 0.012;
        for (let i = 1; i < treads - halfTreads; i++) {
          const y = run1 - i * treadDepth;
          ctx.beginPath();
          ctx.moveTo(halfW, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
        // Divider
        ctx.lineWidth = 0.025;
        ctx.beginPath();
        ctx.moveTo(halfW, 0);
        ctx.lineTo(halfW, run1);
        ctx.stroke();
        // Direction arrow on left run
        ctx.lineWidth = 0.012;
        ctx.beginPath();
        ctx.moveTo(halfW / 2, run1 - 0.05);
        ctx.lineTo(halfW / 2, 0.1);
        ctx.stroke();
        const arrowSize = Math.min(halfW * 0.12, 0.08);
        ctx.beginPath();
        ctx.moveTo(halfW / 2 - arrowSize, 0.1 + arrowSize * 1.2);
        ctx.lineTo(halfW / 2, 0.1);
        ctx.lineTo(halfW / 2 + arrowSize, 0.1 + arrowSize * 1.2);
        ctx.stroke();
        ctx.lineWidth = 0.02;
      } else if (style === 'spiral') {
        const cx = w / 2;
        const cy = l / 2;
        const outerR = Math.min(w, l) / 2;
        const innerR = outerR * 0.2;
        // Outer circle
        ctx.lineWidth = 0.025;
        ctx.beginPath();
        ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
        ctx.stroke();
        // Inner circle (column) - filled
        ctx.fillStyle = isSelected ? '#2d6a4f' : '#000000';
        ctx.beginPath();
        ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = 'transparent';
        // Radial tread lines
        ctx.lineWidth = 0.012;
        for (let i = 0; i < treads; i++) {
          const a = (Math.PI * 2 * i) / treads;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * innerR, cy + Math.sin(a) * innerR);
          ctx.lineTo(cx + Math.cos(a) * outerR, cy + Math.sin(a) * outerR);
          ctx.stroke();
        }
        ctx.lineWidth = 0.02;
      } else if (style === 'winder') {
        // Straight run with pie-shaped winder treads at the turn
        const straightTreads = Math.max(2, treads - 3);
        const straightLen = l * 0.7;
        const treadDepth = straightLen / straightTreads;
        // Straight portion
        ctx.lineWidth = 0.025;
        ctx.strokeRect(0, 0, w, straightLen);
        ctx.lineWidth = 0.012;
        for (let i = 1; i < straightTreads; i++) {
          const y = i * treadDepth;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
        // Winder treads (3 pie slices)
        const winderY = straightLen;
        const winderH = l - straightLen;
        ctx.lineWidth = 0.025;
        ctx.strokeRect(0, winderY, w, winderH);
        ctx.lineWidth = 0.012;
        for (let i = 1; i <= 2; i++) {
          const frac = i / 3;
          ctx.beginPath();
          ctx.moveTo(0, winderY);
          ctx.lineTo(w * frac, winderY + winderH);
          ctx.stroke();
        }
        // Direction arrow
        ctx.beginPath();
        ctx.moveTo(w / 2, straightLen - 0.05);
        ctx.lineTo(w / 2, 0.1);
        ctx.stroke();
        const arrowSize = Math.min(w * 0.1, 0.1);
        ctx.beginPath();
        ctx.moveTo(w / 2 - arrowSize, 0.1 + arrowSize * 1.2);
        ctx.lineTo(w / 2, 0.1);
        ctx.lineTo(w / 2 + arrowSize, 0.1 + arrowSize * 1.2);
        ctx.stroke();
        ctx.lineWidth = 0.02;
      } else if (style === 'curved') {
        // Curved stair: arc with radial treads
        const cx = w;
        const cy = l / 2;
        const outerR = Math.min(w, l / 2);
        const innerR = outerR * 0.4;
        // Outer arc
        ctx.lineWidth = 0.025;
        ctx.beginPath();
        ctx.arc(cx, cy, outerR, Math.PI / 2, Math.PI * 1.5);
        ctx.stroke();
        // Inner arc
        ctx.beginPath();
        ctx.arc(cx, cy, innerR, Math.PI / 2, Math.PI * 1.5);
        ctx.stroke();
        // Radial tread lines
        ctx.lineWidth = 0.012;
        for (let i = 0; i <= treads; i++) {
          const a = Math.PI / 2 + (Math.PI * i) / treads;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * innerR, cy + Math.sin(a) * innerR);
          ctx.lineTo(cx + Math.cos(a) * outerR, cy + Math.sin(a) * outerR);
          ctx.stroke();
        }
        ctx.lineWidth = 0.02;
      }

      ctx.restore(); // restore from flip + rotate + translate

      // Selection highlight + resize handles (drawn with rotation to match stair)
      if (isSelected) {
        ctx.save();
        ctx.translate(stairPx + sDx, stairPy + sDy);
        ctx.rotate((stair.rotation * Math.PI) / 180);
        ctx.strokeStyle = '#2d6a4f';
        ctx.lineWidth = 0.03;
        ctx.setLineDash([0.05, 0.03]);
        ctx.strokeRect(-0.03, -0.03, w + 0.06, l + 0.06);
        ctx.setLineDash([]);

        // Draw resize handles (small filled squares at corners and edge midpoints)
        const hs = 0.08; // handle half-size in world units
        ctx.fillStyle = '#2d6a4f';
        ctx.strokeStyle = '#ddd7cc';
        ctx.lineWidth = 0.015;
        const handlePositions = [
          [0, 0], [w, 0], [0, l], [w, l],  // corners
          [w / 2, 0], [w / 2, l], [0, l / 2], [w, l / 2],  // edges
        ];
        for (const [hx, hy] of handlePositions) {
          ctx.fillRect(hx - hs, hy - hs, hs * 2, hs * 2);
          ctx.strokeRect(hx - hs, hy - hs, hs * 2, hs * 2);
        }
        ctx.restore();
      }
    }

    // ----- Shapes -----
    for (const shape of shapes) {
      if (!shape.visible) continue;
      const isSelected = selectedIds.has(shape.id);
      const odx = isSelected ? dragDx : 0;
      const ody = isSelected ? dragDy : 0;

      ctx.save();
      ctx.translate(shape.position.x + odx, shape.position.y + ody);
      ctx.rotate((shape.rotation * Math.PI) / 180);

      const hw = shape.width / 2;
      const hh = shape.height / 2;

      ctx.beginPath();
      if (shape.shapeKind === 'rectangle') {
        ctx.rect(-hw, -hh, shape.width, shape.height);
      } else if (shape.shapeKind === 'circle') {
        ctx.ellipse(0, 0, hw, hh, 0, 0, Math.PI * 2);
      } else if (shape.shapeKind === 'triangle') {
        ctx.moveTo(0, -hh);
        ctx.lineTo(hw, hh);
        ctx.lineTo(-hw, hh);
        ctx.closePath();
      }

      if (shape.filled) {
        ctx.fillStyle = shape.fillColor;
        ctx.fill();
      }
      ctx.strokeStyle = shape.strokeColor;
      ctx.lineWidth = shape.strokeWidth;
      ctx.stroke();

      if (isSelected) {
        ctx.strokeStyle = '#2d6a4f';
        ctx.lineWidth = 0.02;
        ctx.setLineDash([0.04, 0.04]);
        if (shape.shapeKind === 'circle') {
          ctx.beginPath();
          ctx.ellipse(0, 0, hw + 0.03, hh + 0.03, 0, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.strokeRect(-hw - 0.03, -hh - 0.03, shape.width + 0.06, shape.height + 0.06);
        }
        ctx.setLineDash([]);
      }

      ctx.restore();
    }

    // ----- Text Labels -----
    for (const text of texts) {
      if (!text.visible) continue;
      const isSelected = selectedIds.has(text.id);

      ctx.save();
      ctx.translate(
        text.position.x + (isSelected ? dragDx : 0),
        text.position.y + (isSelected ? dragDy : 0),
      );
      ctx.rotate((text.rotation * Math.PI) / 180);

      ctx.fillStyle = isSelected ? '#2d6a4f' : text.color;
      ctx.font = `${text.fontSize * 0.01}px ${text.fontFamily}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(text.text, 0, 0);

      ctx.restore();
    }

    // ----- Dimensions -----
    if (showDimensions) {
      for (const dim of dimensions) {
        if (!dim.visible) continue;
        const isSelected = selectedIds.has(dim.id);

        if (isSelected && (dragDx !== 0 || dragDy !== 0)) {
          ctx.save();
          ctx.translate(dragDx, dragDy);
        }

        const dx = dim.end.x - dim.start.x;
        const dy = dim.end.y - dim.start.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length < 0.001) continue;

        // Normal direction for offset
        const nx = -dy / length;
        const ny = dx / length;
        const off = dim.offset;

        const sx = dim.start.x + nx * off;
        const sy = dim.start.y + ny * off;
        const ex = dim.end.x + nx * off;
        const ey = dim.end.y + ny * off;

        ctx.strokeStyle = isSelected ? '#2d6a4f' : '#888';
        ctx.lineWidth = 0.01;

        // Extension lines
        ctx.beginPath();
        ctx.moveTo(dim.start.x, dim.start.y);
        ctx.lineTo(sx, sy);
        ctx.moveTo(dim.end.x, dim.end.y);
        ctx.lineTo(ex, ey);
        ctx.stroke();

        // Dimension line
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();

        // Tick marks at endpoints
        const tickLen = 0.05;
        ctx.lineWidth = 0.015;
        ctx.beginPath();
        ctx.moveTo(sx - nx * tickLen, sy - ny * tickLen);
        ctx.lineTo(sx + nx * tickLen, sy + ny * tickLen);
        ctx.moveTo(ex - nx * tickLen, ey - ny * tickLen);
        ctx.lineTo(ex + nx * tickLen, ey + ny * tickLen);
        ctx.stroke();

        // Measurement text — render at fixed screen size for readability
        const mx = (sx + ex) / 2;
        const my = (sy + ey) / 2;
        const ppm = pixelsPerMeter;
        ctx.save();
        ctx.translate(mx, my);
        const textAngle = Math.atan2(dy, dx);
        // Flip text if upside-down (angle > 90° or < -90°)
        const normalizedAngle = ((textAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const flipText = normalizedAngle > Math.PI / 2 && normalizedAngle < Math.PI * 1.5;
        ctx.rotate(flipText ? textAngle + Math.PI : textAngle);
        // Scale to screen pixels so font-size is predictable
        ctx.scale(1 / ppm, 1 / ppm);
        const screenFontSize = Math.max(11, Math.min(14, ppm * 0.12));
        ctx.fillStyle = isSelected ? '#2d6a4f' : '#2c2c2c';
        ctx.font = `600 ${screenFontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(formatInUnit(length, displayUnit), 0, -3);
        ctx.restore();

        if (isSelected && (dragDx !== 0 || dragDy !== 0)) {
          ctx.restore();
        }
      }
    }


}
