import { useState } from 'react';
import { useProjectStore } from '@/store/project-store.ts';
import { useUIStore } from '@/store/ui-store.ts';
import { useTranslation } from '@/utils/i18n.ts';
import { formatInUnit, formatAreaInUnit, type DisplayUnit } from '@/utils/units.ts';
import { exportToPNG } from '@/engine/export/png-export.ts';
import { exportToPDF } from '@/engine/export/pdf-export.ts';
import {
  getWalls,
  getDoors,
  getWindows,
  getRooms,
  getFurniture,
  getTexts,
  getDimensions,
  getArchLines,
  getStairs,
  getShapes,
} from '@/store/selectors.ts';
import { stampRegistry } from '@/library/index.ts';
import { roomPatternFns, wallPatternFns } from '@/renderer/layers/pattern-library.ts';
import type { PaperSize } from '@/types/project.ts';
import type { Point } from '@/types/geometry.ts';
import type { Wall, ArchLineStyle, FillPattern, WallFillPattern } from '@/types/elements.ts';

// ---------------------------------------------------------------------------
// Export format types
// ---------------------------------------------------------------------------

type ExportFormat = 'PNG' | 'PNG_TRANSPARENT' | 'PDF';

// ---------------------------------------------------------------------------
// Paper size pixel dimensions (landscape, 300 DPI)
// ---------------------------------------------------------------------------

const PAPER_SIZES_PX: Record<PaperSize, { width: number; height: number }> = {
  A4: { width: 3508, height: 2480 },
  A3: { width: 4960, height: 3508 },
  Letter: { width: 3300, height: 2550 },
};

// ---------------------------------------------------------------------------
// ArchLine dash patterns & colors (world-space, matching CanvasArea exactly)
// ---------------------------------------------------------------------------

function getArchLineDash(style: ArchLineStyle): { dash: number[]; lineWidth: number; color: string } {
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

// ---------------------------------------------------------------------------
// ExportDialog
// ---------------------------------------------------------------------------

export function ExportDialog() {
  const setExportDialogOpen = useUIStore((s) => s.setExportDialogOpen);
  const projectName = useProjectStore((s) => s.project.name);
  const projectAuthor = useProjectStore((s) => s.project.author);
  const t = useTranslation();

  const [paperSize, setPaperSize] = useState<PaperSize>('A4');
  const [format, setFormat] = useState<ExportFormat>('PNG');
  const [includeTitleBlock, setIncludeTitleBlock] = useState(true);
  const [name, setName] = useState(projectName);
  const [author, setAuthor] = useState(projectAuthor);

  const handleExport = () => {
    // -----------------------------------------------------------------------
    // 1. Read project state and gather all elements
    // -----------------------------------------------------------------------
    const state = useProjectStore.getState();
    const scale = state.project.scale; // e.g. "1:100"
    const du: DisplayUnit = state.project.displayUnit || 'm';

    const walls = getWalls(state);
    const doors = getDoors(state);
    const windows = getWindows(state);
    const rooms = getRooms(state);
    const furniture = getFurniture(state);
    const texts = getTexts(state);
    const dimensions = getDimensions(state);
    const archLines = getArchLines(state);
    const stairs = getStairs(state);
    const shapes = getShapes(state);

    // Build a wall lookup map for door/window placement
    const wallMap = new Map<string, Wall>();
    for (const w of walls) {
      wallMap.set(w.id, w);
    }

    // -----------------------------------------------------------------------
    // 2. Compute bounding box of all content (in meters)
    // -----------------------------------------------------------------------
    const allPoints: Point[] = [];

    for (const wall of walls) {
      // Include wall thickness in bounding box
      const dx = wall.end.x - wall.start.x;
      const dy = wall.end.y - wall.start.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 0) {
        const nx = -dy / len * (wall.thickness / 2);
        const ny = dx / len * (wall.thickness / 2);
        allPoints.push(
          { x: wall.start.x + nx, y: wall.start.y + ny },
          { x: wall.start.x - nx, y: wall.start.y - ny },
          { x: wall.end.x + nx, y: wall.end.y + ny },
          { x: wall.end.x - nx, y: wall.end.y - ny },
        );
      } else {
        allPoints.push(wall.start, wall.end);
      }
    }
    for (const room of rooms) {
      for (const pt of room.polygon) {
        allPoints.push(pt);
      }
    }
    for (const f of furniture) {
      const hw = (f.width * f.scale) / 2;
      const hd = (f.depth * f.scale) / 2;
      allPoints.push(
        { x: f.position.x - hw, y: f.position.y - hd },
        { x: f.position.x + hw, y: f.position.y + hd },
      );
    }
    for (const s of stairs) {
      const sp = s.position as { x?: number; y?: number; point?: Point };
      const sx = sp.x ?? sp.point?.x ?? 0;
      const sy = sp.y ?? sp.point?.y ?? 0;
      allPoints.push({ x: sx, y: sy });
      allPoints.push({ x: sx + s.width, y: sy + s.length });
    }
    for (const txt of texts) {
      allPoints.push(txt.position);
    }
    for (const d of dimensions) {
      allPoints.push(d.start, d.end);
    }
    for (const a of archLines) {
      allPoints.push(a.start, a.end);
    }
    for (const sh of shapes) {
      const hw = sh.width / 2;
      const hh = sh.height / 2;
      allPoints.push(
        { x: sh.position.x - hw, y: sh.position.y - hh },
        { x: sh.position.x + hw, y: sh.position.y + hh },
      );
    }

    if (allPoints.length === 0) {
      setExportDialogOpen(false);
      return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const pt of allPoints) {
      if (pt.x < minX) minX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y > maxY) maxY = pt.y;
    }

    // Add 1 meter padding on all sides
    const PADDING = 1;
    minX -= PADDING;
    minY -= PADDING;
    maxX += PADDING;
    maxY += PADDING;

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    // -----------------------------------------------------------------------
    // 3. Define the renderFn — mirrors CanvasArea plan-view rendering exactly
    // -----------------------------------------------------------------------
    const renderFn = (
      ctx: CanvasRenderingContext2D,
      canvasW: number,
      canvasH: number,
    ) => {
      // Compute scale to fit content within the canvas area
      const scaleX = canvasW / contentWidth;
      const scaleY = canvasH / contentHeight;
      const fitScale = Math.min(scaleX, scaleY);

      // Center the content
      const offsetX = (canvasW - contentWidth * fitScale) / 2;
      const offsetY = (canvasH - contentHeight * fitScale) / 2;

      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(fitScale, fitScale);
      ctx.translate(-minX, -minY);

      // Background (matching CanvasArea plan view color)
      ctx.fillStyle = '#faf8f4';
      ctx.fillRect(minX, minY, contentWidth, contentHeight);

      // "Pixel" size in world coordinates (for pattern functions)
      const px = 1 / fitScale;

      // ----- Rooms (fills + patterns + labels) -----
      for (const room of rooms) {
        if (!room.visible) continue;
        if (room.polygon.length < 3) continue;

        ctx.beginPath();
        ctx.moveTo(room.polygon[0].x, room.polygon[0].y);
        for (let i = 1; i < room.polygon.length; i++) {
          ctx.lineTo(room.polygon[i].x, room.polygon[i].y);
        }
        ctx.closePath();
        ctx.fillStyle = room.color;
        ctx.fill();

        // Room pattern overlay (matching CanvasArea)
        const roomPattern = (room.fillPattern || 'solid') as FillPattern;
        if (roomPattern !== 'solid') {
          const patFn = roomPatternFns[roomPattern];
          if (patFn) {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(room.polygon[0].x, room.polygon[0].y);
            for (let i = 1; i < room.polygon.length; i++) {
              ctx.lineTo(room.polygon[i].x, room.polygon[i].y);
            }
            ctx.closePath();
            ctx.clip();
            let rMinX = Infinity, rMinY = Infinity, rMaxX = -Infinity, rMaxY = -Infinity;
            for (const p of room.polygon) {
              if (p.x < rMinX) rMinX = p.x;
              if (p.y < rMinY) rMinY = p.y;
              if (p.x > rMaxX) rMaxX = p.x;
              if (p.y > rMaxY) rMaxY = p.y;
            }
            patFn(ctx, rMinX, rMinY, rMaxX, rMaxY, px);
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
          ctx.fillText(formatAreaInUnit(room.area, du), cx, cy + 0.2);
          ctx.restore();
        }
      }

      // ----- Walls (fill + pattern + outline) -----
      for (const wall of walls) {
        if (!wall.visible) continue;

        const dx = wall.end.x - wall.start.x;
        const dy = wall.end.y - wall.start.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len === 0) continue;

        const nx = -dy / len * (wall.thickness / 2);
        const ny = dx / len * (wall.thickness / 2);

        // Wall fill
        ctx.fillStyle = wall.fillColor;
        ctx.beginPath();
        ctx.moveTo(wall.start.x + nx, wall.start.y + ny);
        ctx.lineTo(wall.end.x + nx, wall.end.y + ny);
        ctx.lineTo(wall.end.x - nx, wall.end.y - ny);
        ctx.lineTo(wall.start.x - nx, wall.start.y - ny);
        ctx.closePath();
        ctx.fill();

        // Wall pattern overlay (matching CanvasArea)
        const wallPat = ((wall as unknown as Record<string, unknown>).fillPattern || 'solid') as WallFillPattern;
        if (wallPat !== 'solid') {
          const wPatFn = wallPatternFns[wallPat];
          if (wPatFn) {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(wall.start.x + nx, wall.start.y + ny);
            ctx.lineTo(wall.end.x + nx, wall.end.y + ny);
            ctx.lineTo(wall.end.x - nx, wall.end.y - ny);
            ctx.lineTo(wall.start.x - nx, wall.start.y - ny);
            ctx.closePath();
            ctx.clip();
            const wMinX = Math.min(wall.start.x + nx, wall.end.x + nx, wall.end.x - nx, wall.start.x - nx);
            const wMinY = Math.min(wall.start.y + ny, wall.end.y + ny, wall.end.y - ny, wall.start.y - ny);
            const wMaxX = Math.max(wall.start.x + nx, wall.end.x + nx, wall.end.x - nx, wall.start.x - nx);
            const wMaxY = Math.max(wall.start.y + ny, wall.end.y + ny, wall.end.y - ny, wall.start.y - ny);
            wPatFn(ctx, wMinX, wMinY, wMaxX, wMaxY, px);
            ctx.restore();
          }
        }

        // Wall outline
        ctx.strokeStyle = wall.color;
        ctx.lineWidth = 0.01;
        ctx.beginPath();
        ctx.moveTo(wall.start.x + nx, wall.start.y + ny);
        ctx.lineTo(wall.end.x + nx, wall.end.y + ny);
        ctx.lineTo(wall.end.x - nx, wall.end.y - ny);
        ctx.lineTo(wall.start.x - nx, wall.start.y - ny);
        ctx.closePath();
        ctx.stroke();
      }

      // ----- Doors (all styles, matching CanvasArea exactly) -----
      for (const door of doors) {
        if (!door.visible) continue;
        const parentWall = wallMap.get(door.wallId);
        if (!parentWall) continue;

        const dx = parentWall.end.x - parentWall.start.x;
        const dy = parentWall.end.y - parentWall.start.y;
        const dpx = parentWall.start.x + dx * door.position;
        const dpy = parentWall.start.y + dy * door.position;
        const doorStyle = door.doorStyle || 'single';

        ctx.save();
        const angle = Math.atan2(dy, dx);
        ctx.translate(dpx, dpy);
        ctx.rotate(angle);

        // Door gap (erase wall segment)
        ctx.strokeStyle = '#faf8f4';
        ctx.lineWidth = parentWall.thickness + 0.02;
        ctx.beginPath();
        ctx.moveTo(-door.width / 2, 0);
        ctx.lineTo(door.width / 2, 0);
        ctx.stroke();

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 0.02;
        let swingDir = door.swing === 'left' ? -1 : 1;
        if (door.flipSide) swingDir *= -1;
        const hingeX = (door.hinge === 'end') ? door.width / 2 : -door.width / 2;

        // Wall jamb lines
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
          const openRad = (door.openAngle * Math.PI) / 180;
          const closedAngle = (door.hinge === 'start') ? 0 : Math.PI;
          const flipForHinge = (door.hinge === 'start') ? 1 : -1;
          const sweepAngle = swingDir * flipForHinge * openRad;
          const leafAngle = closedAngle + sweepAngle;
          // Door leaf
          ctx.lineWidth = 0.03;
          ctx.beginPath();
          ctx.moveTo(hingeX, 0);
          ctx.lineTo(hingeX + Math.cos(leafAngle) * door.width, Math.sin(leafAngle) * door.width);
          ctx.stroke();
          // Swing arc
          ctx.lineWidth = 0.012;
          ctx.beginPath();
          const ccw = (swingDir * flipForHinge) < 0;
          ctx.arc(hingeX, 0, door.width, closedAngle, leafAngle, ccw);
          ctx.stroke();
          ctx.lineWidth = 0.02;
        } else if (doorStyle === 'double') {
          const halfW = door.width / 2;
          const openRad = (door.openAngle * Math.PI) / 180;
          // Left leaf
          const closedL = Math.PI;
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
          // Right leaf
          const closedR = 0;
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
          const wt = parentWall.thickness / 2;
          ctx.beginPath();
          ctx.moveTo(-door.width / 2, wt * 0.3);
          ctx.lineTo(door.width / 2, wt * 0.3);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(-door.width / 2, -wt * 0.3);
          ctx.lineTo(0, -wt * 0.3);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(door.width * 0.15, wt * 0.3 - 0.03);
          ctx.lineTo(door.width * 0.3, wt * 0.3);
          ctx.lineTo(door.width * 0.15, wt * 0.3 + 0.03);
          ctx.stroke();
        } else if (doorStyle === 'pocket') {
          const wt = parentWall.thickness / 2;
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
          ctx.setLineDash([0.02, 0.02]);
          ctx.beginPath();
          ctx.moveTo(-door.width / 2, -wt * 0.5);
          ctx.lineTo(0, -wt * 0.5);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(-door.width / 2, wt * 0.5);
          ctx.lineTo(0, wt * 0.5);
          ctx.stroke();
          ctx.setLineDash([]);
        } else if (doorStyle === 'folding') {
          const segments = 4;
          const segW = door.width / segments;
          ctx.beginPath();
          ctx.moveTo(-door.width / 2, 0);
          for (let i = 0; i < segments; i++) {
            const fx = -door.width / 2 + segW * (i + 1);
            const fy = (i % 2 === 0) ? swingDir * 0.08 : 0;
            ctx.lineTo(fx, fy);
          }
          ctx.stroke();
        } else if (doorStyle === 'revolving') {
          const r = door.width / 2;
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.stroke();
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

      // ----- Windows (all styles, matching CanvasArea exactly) -----
      for (const win of windows) {
        if (!win.visible) continue;
        const parentWall = wallMap.get(win.wallId);
        if (!parentWall) continue;

        const dx = parentWall.end.x - parentWall.start.x;
        const dy = parentWall.end.y - parentWall.start.y;
        const wpx = parentWall.start.x + dx * win.position;
        const wpy = parentWall.start.y + dy * win.position;
        const windowStyle = win.windowStyle || 'single';

        ctx.save();
        const angle = Math.atan2(dy, dx);
        ctx.translate(wpx, wpy);
        ctx.rotate(angle);

        // Window gap
        ctx.strokeStyle = '#faf8f4';
        ctx.lineWidth = parentWall.thickness + 0.02;
        ctx.beginPath();
        ctx.moveTo(-win.width / 2, 0);
        ctx.lineTo(win.width / 2, 0);
        ctx.stroke();

        const wt = parentWall.thickness / 2;
        ctx.strokeStyle = '#4a9eda';
        ctx.lineWidth = 0.015;

        if (windowStyle === 'single') {
          ctx.beginPath();
          ctx.moveTo(-win.width / 2, -wt * 0.6);
          ctx.lineTo(win.width / 2, -wt * 0.6);
          ctx.moveTo(-win.width / 2, wt * 0.6);
          ctx.lineTo(win.width / 2, wt * 0.6);
          ctx.stroke();
          const hw = win.width / 2;
          const ht = wt * 0.6;
          ctx.lineWidth = 0.01;
          ctx.beginPath();
          ctx.moveTo(-hw, -ht);
          ctx.lineTo(hw, ht);
          ctx.moveTo(-hw, ht);
          ctx.lineTo(hw, -ht);
          ctx.stroke();
          ctx.lineWidth = 0.015;
        } else if (windowStyle === 'double') {
          ctx.beginPath();
          ctx.moveTo(-win.width / 2, -wt * 0.6);
          ctx.lineTo(win.width / 2, -wt * 0.6);
          ctx.moveTo(-win.width / 2, wt * 0.6);
          ctx.lineTo(win.width / 2, wt * 0.6);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(0, -wt * 0.6);
          ctx.lineTo(0, wt * 0.6);
          ctx.stroke();
          const hw = win.width / 2;
          const ht = wt * 0.6;
          ctx.lineWidth = 0.01;
          ctx.beginPath();
          ctx.moveTo(-hw, -ht);
          ctx.lineTo(0, ht);
          ctx.moveTo(-hw, ht);
          ctx.lineTo(0, -ht);
          ctx.moveTo(0, -ht);
          ctx.lineTo(hw, ht);
          ctx.moveTo(0, ht);
          ctx.lineTo(hw, -ht);
          ctx.stroke();
          ctx.lineWidth = 0.015;
        } else if (windowStyle === 'sliding') {
          ctx.beginPath();
          ctx.moveTo(-win.width / 2, -wt * 0.4);
          ctx.lineTo(win.width * 0.1, -wt * 0.4);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(-win.width * 0.1, wt * 0.4);
          ctx.lineTo(win.width / 2, wt * 0.4);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(-win.width / 2, -wt * 0.6);
          ctx.lineTo(win.width / 2, -wt * 0.6);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(-win.width / 2, wt * 0.6);
          ctx.lineTo(win.width / 2, wt * 0.6);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(win.width * 0.2, wt * 0.4 - 0.025);
          ctx.lineTo(win.width * 0.35, wt * 0.4);
          ctx.lineTo(win.width * 0.2, wt * 0.4 + 0.025);
          ctx.stroke();
        } else if (windowStyle === 'fixed') {
          for (const offset of [-wt * 0.6, wt * 0.6]) {
            ctx.beginPath();
            ctx.moveTo(-win.width / 2, offset);
            ctx.lineTo(win.width / 2, offset);
            ctx.stroke();
          }
          ctx.beginPath();
          ctx.moveTo(-win.width / 2, -wt * 0.6);
          ctx.lineTo(win.width / 2, wt * 0.6);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(-win.width / 2, wt * 0.6);
          ctx.lineTo(win.width / 2, -wt * 0.6);
          ctx.stroke();
        } else if (windowStyle === 'casement') {
          const hw = win.width / 2;
          const ht = wt * 0.6;
          ctx.beginPath();
          ctx.moveTo(-hw, -ht);
          ctx.lineTo(hw, -ht);
          ctx.moveTo(-hw, ht);
          ctx.lineTo(hw, ht);
          ctx.stroke();
          ctx.lineWidth = 0.01;
          ctx.beginPath();
          ctx.moveTo(-hw, -ht);
          ctx.lineTo(hw, ht);
          ctx.moveTo(-hw, ht);
          ctx.lineTo(hw, -ht);
          ctx.stroke();
          ctx.lineWidth = 0.015;
          ctx.beginPath();
          ctx.moveTo(-hw, -ht);
          ctx.lineTo(0, -ht - wt * 0.8);
          ctx.lineTo(hw, -ht);
          ctx.stroke();
        } else if (windowStyle === 'awning') {
          const hw = win.width / 2;
          const ht = wt * 0.6;
          ctx.beginPath();
          ctx.moveTo(-hw, -ht);
          ctx.lineTo(hw, -ht);
          ctx.moveTo(-hw, ht);
          ctx.lineTo(hw, ht);
          ctx.stroke();
          ctx.lineWidth = 0.01;
          ctx.beginPath();
          ctx.moveTo(-hw, -ht);
          ctx.lineTo(hw, ht);
          ctx.moveTo(-hw, ht);
          ctx.lineTo(hw, -ht);
          ctx.stroke();
          ctx.lineWidth = 0.015;
          ctx.beginPath();
          ctx.moveTo(-hw, ht);
          ctx.lineTo(0, ht + wt * 0.8);
          ctx.lineTo(hw, ht);
          ctx.stroke();
        }

        ctx.restore();
      }

      // ----- Architectural Lines -----
      for (const line of archLines) {
        if (!line.visible) continue;
        const { dash, lineWidth: defaultLW, color } = getArchLineDash(line.lineStyle);
        const effectiveLW = line.lineWeight > 0 ? line.lineWeight * 0.01 : defaultLW;

        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = effectiveLW;
        ctx.setLineDash(dash);
        ctx.lineCap = 'butt';
        ctx.beginPath();
        ctx.moveTo(line.start.x, line.start.y);
        ctx.lineTo(line.end.x, line.end.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      // ----- Furniture stamps -----
      for (const f of furniture) {
        if (!f.visible) continue;
        const stamp = stampRegistry.get(f.stampId);
        if (!stamp) continue;

        ctx.save();
        ctx.translate(f.position.x, f.position.y);
        ctx.rotate((f.rotation * Math.PI) / 180);
        ctx.scale(f.scale, f.scale);
        ctx.translate(-f.width / 2, -f.depth / 2);

        if (f.color) {
          ctx.strokeStyle = f.color;
          ctx.fillStyle = f.color;
        }
        stamp.draw(ctx, f.width, f.depth);
        ctx.restore();
      }

      // ----- Stairs (all styles, matching CanvasArea exactly) -----
      for (const stair of stairs) {
        if (!stair.visible) continue;

        const stairPos = stair.position as { x?: number; y?: number; point?: Point };
        const stairPx = stairPos.x ?? stairPos.point?.x ?? 0;
        const stairPy = stairPos.y ?? stairPos.point?.y ?? 0;

        ctx.save();
        ctx.translate(stairPx, stairPy);
        ctx.rotate((stair.rotation * Math.PI) / 180);

        if (stair.flipH || stair.flipV) {
          ctx.translate(stair.flipH ? stair.width : 0, stair.flipV ? stair.length : 0);
          ctx.scale(stair.flipH ? -1 : 1, stair.flipV ? -1 : 1);
        }

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 0.02;
        ctx.fillStyle = 'transparent';

        const stStyle = stair.stairStyle || 'straight';
        const sw = stair.width;
        const sl = stair.length;
        const treads = stair.treads;

        if (stStyle === 'straight') {
          ctx.lineWidth = 0.025;
          ctx.strokeRect(0, 0, sw, sl);
          ctx.lineWidth = 0.012;
          const treadDepth = sl / treads;
          for (let i = 1; i < treads; i++) {
            const y = i * treadDepth;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(sw, y);
            ctx.stroke();
          }
          ctx.lineWidth = 0.015;
          ctx.beginPath();
          ctx.moveTo(0, sl * 0.55);
          ctx.lineTo(sw, sl * 0.45);
          ctx.stroke();
          ctx.lineWidth = 0.012;
          ctx.beginPath();
          ctx.moveTo(sw / 2, sl * 0.85);
          ctx.lineTo(sw / 2, sl * 0.1);
          ctx.stroke();
          const arrowSize = Math.min(sw * 0.1, 0.1);
          ctx.beginPath();
          ctx.moveTo(sw / 2 - arrowSize, sl * 0.1 + arrowSize * 1.2);
          ctx.lineTo(sw / 2, sl * 0.1);
          ctx.lineTo(sw / 2 + arrowSize, sl * 0.1 + arrowSize * 1.2);
          ctx.stroke();
        } else if (stStyle === 'l-shaped') {
          const land = stair.landingDepth;
          const halfTreads = Math.floor(treads / 2);
          const run1 = sl - land;
          const treadDepth = run1 / halfTreads;
          ctx.lineWidth = 0.025;
          ctx.strokeRect(0, 0, sw, run1);
          ctx.lineWidth = 0.012;
          for (let i = 1; i < halfTreads; i++) {
            ctx.beginPath();
            ctx.moveTo(0, i * treadDepth);
            ctx.lineTo(sw, i * treadDepth);
            ctx.stroke();
          }
          ctx.lineWidth = 0.025;
          ctx.strokeRect(0, run1, sw + land, land);
          const run2W = land;
          const run2L = sw;
          const tread2Depth = run2L / (treads - halfTreads);
          ctx.strokeRect(sw, 0, run2W, run2L);
          ctx.lineWidth = 0.012;
          for (let i = 1; i < treads - halfTreads; i++) {
            const y = run2L - i * tread2Depth;
            ctx.beginPath();
            ctx.moveTo(sw, y);
            ctx.lineTo(sw + run2W, y);
            ctx.stroke();
          }
          ctx.beginPath();
          ctx.moveTo(sw / 2, run1 - 0.05);
          ctx.lineTo(sw / 2, 0.1);
          ctx.stroke();
          const arrowSize = Math.min(sw * 0.08, 0.08);
          ctx.beginPath();
          ctx.moveTo(sw / 2 - arrowSize, 0.1 + arrowSize * 1.2);
          ctx.lineTo(sw / 2, 0.1);
          ctx.lineTo(sw / 2 + arrowSize, 0.1 + arrowSize * 1.2);
          ctx.stroke();
        } else if (stStyle === 'u-shaped') {
          const land = stair.landingDepth;
          const halfTreads = Math.floor(treads / 2);
          const halfW = sw / 2;
          const run1 = sl - land;
          const treadDepth = run1 / halfTreads;
          ctx.lineWidth = 0.025;
          ctx.strokeRect(0, 0, halfW, run1);
          ctx.lineWidth = 0.012;
          for (let i = 1; i < halfTreads; i++) {
            ctx.beginPath();
            ctx.moveTo(0, i * treadDepth);
            ctx.lineTo(halfW, i * treadDepth);
            ctx.stroke();
          }
          ctx.lineWidth = 0.025;
          ctx.strokeRect(0, run1, sw, land);
          ctx.strokeRect(halfW, 0, halfW, run1);
          ctx.lineWidth = 0.012;
          for (let i = 1; i < treads - halfTreads; i++) {
            const y = run1 - i * treadDepth;
            ctx.beginPath();
            ctx.moveTo(halfW, y);
            ctx.lineTo(sw, y);
            ctx.stroke();
          }
          ctx.lineWidth = 0.025;
          ctx.beginPath();
          ctx.moveTo(halfW, 0);
          ctx.lineTo(halfW, run1);
          ctx.stroke();
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
        } else if (stStyle === 'spiral') {
          const cx = sw / 2;
          const cy = sl / 2;
          const outerR = Math.min(sw, sl) / 2;
          const innerR = outerR * 0.2;
          ctx.lineWidth = 0.025;
          ctx.beginPath();
          ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = 'transparent';
          ctx.lineWidth = 0.012;
          for (let i = 0; i < treads; i++) {
            const a = (Math.PI * 2 * i) / treads;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(a) * innerR, cy + Math.sin(a) * innerR);
            ctx.lineTo(cx + Math.cos(a) * outerR, cy + Math.sin(a) * outerR);
            ctx.stroke();
          }
        } else if (stStyle === 'winder') {
          const straightTreads = Math.max(2, treads - 3);
          const straightLen = sl * 0.7;
          const treadDepth = straightLen / straightTreads;
          ctx.lineWidth = 0.025;
          ctx.strokeRect(0, 0, sw, straightLen);
          ctx.lineWidth = 0.012;
          for (let i = 1; i < straightTreads; i++) {
            ctx.beginPath();
            ctx.moveTo(0, i * treadDepth);
            ctx.lineTo(sw, i * treadDepth);
            ctx.stroke();
          }
          const winderY = straightLen;
          const winderH = sl - straightLen;
          ctx.lineWidth = 0.025;
          ctx.strokeRect(0, winderY, sw, winderH);
          ctx.lineWidth = 0.012;
          for (let i = 1; i <= 2; i++) {
            const frac = i / 3;
            ctx.beginPath();
            ctx.moveTo(0, winderY);
            ctx.lineTo(sw * frac, winderY + winderH);
            ctx.stroke();
          }
          ctx.beginPath();
          ctx.moveTo(sw / 2, straightLen - 0.05);
          ctx.lineTo(sw / 2, 0.1);
          ctx.stroke();
          const arrowSize = Math.min(sw * 0.1, 0.1);
          ctx.beginPath();
          ctx.moveTo(sw / 2 - arrowSize, 0.1 + arrowSize * 1.2);
          ctx.lineTo(sw / 2, 0.1);
          ctx.lineTo(sw / 2 + arrowSize, 0.1 + arrowSize * 1.2);
          ctx.stroke();
        } else if (stStyle === 'curved') {
          const cx = sw;
          const cy = sl / 2;
          const outerR = Math.min(sw, sl / 2);
          const innerR = outerR * 0.4;
          ctx.lineWidth = 0.025;
          ctx.beginPath();
          ctx.arc(cx, cy, outerR, Math.PI / 2, Math.PI * 1.5);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(cx, cy, innerR, Math.PI / 2, Math.PI * 1.5);
          ctx.stroke();
          ctx.lineWidth = 0.012;
          for (let i = 0; i <= treads; i++) {
            const a = Math.PI / 2 + (Math.PI * i) / treads;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(a) * innerR, cy + Math.sin(a) * innerR);
            ctx.lineTo(cx + Math.cos(a) * outerR, cy + Math.sin(a) * outerR);
            ctx.stroke();
          }
        }

        ctx.restore();
      }

      // ----- Shapes (rectangle, circle, triangle) -----
      for (const shape of shapes) {
        if (!shape.visible) continue;

        ctx.save();
        ctx.translate(shape.position.x, shape.position.y);
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

        ctx.restore();
      }

      // ----- Text Labels -----
      for (const txt of texts) {
        if (!txt.visible) continue;

        ctx.save();
        ctx.translate(txt.position.x, txt.position.y);
        if (txt.rotation) {
          ctx.rotate((txt.rotation * Math.PI) / 180);
        }
        ctx.fillStyle = txt.color;
        ctx.font = `${txt.fontSize * 0.01}px ${txt.fontFamily}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(txt.text, 0, 0);
        ctx.restore();
      }

      // ----- Dimensions -----
      for (const dim of dimensions) {
        if (!dim.visible) continue;

        const ddx = dim.end.x - dim.start.x;
        const ddy = dim.end.y - dim.start.y;
        const length = Math.sqrt(ddx * ddx + ddy * ddy);
        if (length < 0.001) continue;

        const dnx = -ddy / length;
        const dny = ddx / length;
        const off = dim.offset;

        const sx = dim.start.x + dnx * off;
        const sy = dim.start.y + dny * off;
        const ex = dim.end.x + dnx * off;
        const ey = dim.end.y + dny * off;

        ctx.strokeStyle = '#888';
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

        // Tick marks
        const tickLen = 0.05;
        ctx.lineWidth = 0.015;
        ctx.beginPath();
        ctx.moveTo(sx - dnx * tickLen, sy - dny * tickLen);
        ctx.lineTo(sx + dnx * tickLen, sy + dny * tickLen);
        ctx.moveTo(ex - dnx * tickLen, ey - dny * tickLen);
        ctx.lineTo(ex + dnx * tickLen, ey + dny * tickLen);
        ctx.stroke();

        // Label
        const mx = (sx + ex) / 2;
        const my = (sy + ey) / 2;
        ctx.save();
        ctx.translate(mx, my);
        const textAngle = Math.atan2(ddy, ddx);
        const normalizedAngle = ((textAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const flipText = normalizedAngle > Math.PI / 2 && normalizedAngle < Math.PI * 1.5;
        ctx.rotate(flipText ? textAngle + Math.PI : textAngle);
        // Scale to screen pixels for readable text
        ctx.scale(1 / fitScale, 1 / fitScale);
        const screenFontSize = Math.max(11, Math.min(14, fitScale * 0.12));
        ctx.fillStyle = '#2c2c2c';
        ctx.font = `600 ${screenFontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(formatInUnit(length, du), 0, -3);
        ctx.restore();
      }

      ctx.restore();
    };

    // -----------------------------------------------------------------------
    // 4. Dispatch to appropriate export function
    // -----------------------------------------------------------------------
    const dateStr = new Date().toLocaleDateString();

    if (format === 'PDF') {
      exportToPDF(renderFn, {
        paperSize,
        projectName: name,
        author,
        scale,
        date: dateStr,
        orientation: 'landscape',
      });
    } else {
      const dims = PAPER_SIZES_PX[paperSize];
      const isTransparent = format === 'PNG_TRANSPARENT';

      exportToPNG(renderFn, {
        width: dims.width,
        height: dims.height,
        projectName: name,
        author,
        scale,
        date: dateStr,
        transparent: isTransparent,
        includeTitleBlock: isTransparent ? false : includeTitleBlock,
      });
    }

    setExportDialogOpen(false);
  };

  const handleClose = () => {
    setExportDialogOpen(false);
  };

  return (
    <div
      className="ep-dialog-overlay fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="ep-dialog rounded-lg shadow-2xl"
        style={{
          width: 400,
          maxWidth: '90vw',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: '1px solid #d5cfc6' }}
        >
          <h2 className="text-sm font-semibold" style={{ color: '#2c2c2c' }}>
            {t('dialog.export')}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="ep-close-btn cursor-pointer"
          >
            {'\u2715'}
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4">
          {/* Paper size */}
          <div>
            <label className="block text-xs mb-2" style={{ color: '#6b6560' }}>
              {t('dialog.paperSize')}
            </label>
            <div className="flex gap-2">
              {(['A4', 'A3', 'Letter'] as PaperSize[]).map((size) => (
                <label
                  key={size}
                  className="flex items-center gap-1.5 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="paperSize"
                    value={size}
                    checked={paperSize === size}
                    onChange={() => setPaperSize(size)}
                    className="accent-cyan-400"
                  />
                  <span className="text-xs" style={{ color: '#2c2c2c' }}>
                    {size}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Format */}
          <div>
            <label className="block text-xs mb-2" style={{ color: '#6b6560' }}>
              {t('dialog.format')}
            </label>
            <div className="flex gap-2">
              {([
                { value: 'PNG' as ExportFormat, label: 'PNG' },
                { value: 'PNG_TRANSPARENT' as ExportFormat, label: t('dialog.pngTransparent') },
                { value: 'PDF' as ExportFormat, label: 'PDF' },
              ]).map(({ value, label }) => (
                <label
                  key={value}
                  className="flex items-center gap-1.5 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="format"
                    value={value}
                    checked={format === value}
                    onChange={() => setFormat(value)}
                    className="accent-cyan-400"
                  />
                  <span className="text-xs" style={{ color: '#2c2c2c' }}>
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Include title block (hidden for transparent) */}
          {format !== 'PNG_TRANSPARENT' && (
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeTitleBlock}
                  onChange={(e) => setIncludeTitleBlock(e.target.checked)}
                  className="accent-cyan-400"
                />
                <span className="text-xs" style={{ color: '#2c2c2c' }}>
                  {t('dialog.includeTitleBlock')}
                </span>
              </label>
            </div>
          )}

          {/* Project name */}
          {format !== 'PNG_TRANSPARENT' && includeTitleBlock && (
            <>
              <div>
                <label className="block text-xs mb-1" style={{ color: '#6b6560' }}>
                  {t('dialog.projectName')}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="ep-input w-full text-xs rounded"
                />
              </div>

              <div>
                <label className="block text-xs mb-1" style={{ color: '#6b6560' }}>
                  {t('dialog.author')}
                </label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="ep-input w-full text-xs rounded"
                />
              </div>
            </>
          )}

          {/* Transparent info */}
          {format === 'PNG_TRANSPARENT' && (
            <div className="text-xs px-2 py-1.5 rounded" style={{ background: '#ece8e1', color: '#6b6560' }}>
              {t('dialog.transparentInfo')}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-2 px-5 py-3"
          style={{ borderTop: '1px solid #d5cfc6' }}
        >
          <button
            type="button"
            onClick={handleClose}
            className="ep-btn-secondary cursor-pointer"
          >
            {t('dialog.cancel')}
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="ep-btn-primary cursor-pointer"
          >
            {t('dialog.export')}
          </button>
        </div>
      </div>
    </div>
  );
}
