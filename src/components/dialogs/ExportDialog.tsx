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
} from '@/store/selectors.ts';
import { stampRegistry } from '@/library/index.ts';
import { wallToPolygon } from '@/engine/geometry/wall-thickness.ts';
import { getDoorWorldPosition, getDoorSwingArc } from '@/engine/geometry/door-placement.ts';
import type { PaperSize } from '@/types/project.ts';
import type { Point } from '@/types/geometry.ts';
import type { Wall, ArchLineStyle } from '@/types/elements.ts';

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
// ArchLine dash patterns by style
// ---------------------------------------------------------------------------

function getArchLineDash(style: ArchLineStyle, px: number): number[] {
  switch (style) {
    case 'colindancia':
      return [10 * px, 4 * px, 2 * px, 4 * px]; // dash-dot
    case 'limite-lote':
      return [12 * px, 6 * px]; // dashed
    case 'eje':
      return [16 * px, 4 * px, 4 * px, 4 * px]; // center line
    case 'setback':
      return [6 * px, 6 * px]; // short dashes
    case 'center':
      return [20 * px, 4 * px, 4 * px, 4 * px]; // long center
    default:
      return [];
  }
}

function getArchLineColor(style: ArchLineStyle): string {
  switch (style) {
    case 'colindancia':
      return '#cc3333';
    case 'limite-lote':
      return '#cc6600';
    case 'eje':
      return '#3366cc';
    case 'setback':
      return '#669933';
    case 'center':
      return '#996699';
    default:
      return '#666666';
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
      allPoints.push(wall.start, wall.end);
    }
    for (const room of rooms) {
      for (const pt of room.polygon) {
        allPoints.push(pt);
      }
    }
    for (const f of furniture) {
      allPoints.push(f.position);
      // Add corners based on size
      const hw = (f.width * f.scale) / 2;
      const hd = (f.depth * f.scale) / 2;
      allPoints.push(
        { x: f.position.x - hw, y: f.position.y - hd },
        { x: f.position.x + hw, y: f.position.y + hd },
      );
    }
    for (const s of stairs) {
      allPoints.push(s.position);
      allPoints.push({
        x: s.position.x + s.width,
        y: s.position.y + s.length,
      });
    }
    for (const t of texts) {
      allPoints.push(t.position);
    }
    for (const d of dimensions) {
      allPoints.push(d.start, d.end);
    }
    for (const a of archLines) {
      allPoints.push(a.start, a.end);
    }

    if (allPoints.length === 0) {
      // Nothing to export
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
    const PADDING = 1; // meters
    minX -= PADDING;
    minY -= PADDING;
    maxX += PADDING;
    maxY += PADDING;

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    // -----------------------------------------------------------------------
    // 3. Define the renderFn
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

      // Pixel size in world coordinates for consistent line widths
      const px = 1 / fitScale;

      // ----- Draw rooms (fills) -----
      for (const room of rooms) {
        if (room.polygon.length < 3) continue;
        ctx.beginPath();
        ctx.moveTo(room.polygon[0].x, room.polygon[0].y);
        for (let i = 1; i < room.polygon.length; i++) {
          ctx.lineTo(room.polygon[i].x, room.polygon[i].y);
        }
        ctx.closePath();
        ctx.fillStyle = room.color;
        ctx.fill();

        // Room label
        if (room.label) {
          // Compute centroid for label placement
          let cx = 0;
          let cy = 0;
          for (const pt of room.polygon) {
            cx += pt.x;
            cy += pt.y;
          }
          cx /= room.polygon.length;
          cy /= room.polygon.length;

          ctx.save();
          ctx.font = `${12 * px}px "Segoe UI", Arial, sans-serif`;
          ctx.fillStyle = '#555555';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(room.label, cx, cy);

          // Area text below label
          ctx.font = `${9 * px}px "Segoe UI", Arial, sans-serif`;
          ctx.fillStyle = '#888888';
          ctx.fillText(formatAreaInUnit(room.area, du), cx, cy + 16 * px);
          ctx.restore();
        }
      }

      // ----- Draw walls (filled polygons) -----
      for (const wall of walls) {
        const poly = wallToPolygon(wall);
        if (poly.length < 3) continue;

        ctx.beginPath();
        ctx.moveTo(poly[0].x, poly[0].y);
        for (let i = 1; i < poly.length; i++) {
          ctx.lineTo(poly[i].x, poly[i].y);
        }
        ctx.closePath();
        ctx.fillStyle = wall.fillColor;
        ctx.fill();

        // Cut door gaps
        const wallDoors = doors.filter((d) => d.wallId === wall.id);
        for (const door of wallDoors) {
          cutOpeningExport(ctx, wall, door.position, door.width);
        }

        // Cut window gaps and draw glass lines
        const wallWindows = windows.filter((w) => w.wallId === wall.id);
        for (const win of wallWindows) {
          cutOpeningExport(ctx, wall, win.position, win.width);
          drawGlassExport(ctx, wall, win.position, win.width, px);
        }

        // Stroke wall outline
        ctx.beginPath();
        ctx.moveTo(poly[0].x, poly[0].y);
        for (let i = 1; i < poly.length; i++) {
          ctx.lineTo(poly[i].x, poly[i].y);
        }
        ctx.closePath();
        ctx.strokeStyle = wall.color;
        ctx.lineWidth = px;
        ctx.stroke();
      }

      // ----- Draw door swing arcs -----
      for (const door of doors) {
        const wall = wallMap.get(door.wallId);
        if (!wall) continue;

        const { center, angle } = getDoorWorldPosition(wall, door.position);
        const arc = getDoorSwingArc(
          center,
          angle,
          door.width,
          door.swing,
          door.openAngle,
        );

        // Door leaf line
        ctx.save();
        ctx.translate(center.x, center.y);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(-door.width / 2, 0);
        ctx.lineTo(door.width / 2, 0);
        ctx.strokeStyle = '#555555';
        ctx.lineWidth = 2 * px;
        ctx.stroke();
        ctx.restore();

        // Swing arc
        ctx.beginPath();
        ctx.arc(center.x, center.y, arc.radius, arc.arcStart, arc.arcEnd, false);
        ctx.strokeStyle = '#aaaaaa';
        ctx.lineWidth = px;
        ctx.setLineDash([4 * px, 4 * px]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // ----- Draw archlines -----
      for (const archLine of archLines) {
        ctx.beginPath();
        ctx.moveTo(archLine.start.x, archLine.start.y);
        ctx.lineTo(archLine.end.x, archLine.end.y);
        ctx.strokeStyle = getArchLineColor(archLine.lineStyle);
        ctx.lineWidth = archLine.lineWeight * px;
        ctx.setLineDash(getArchLineDash(archLine.lineStyle, px));
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // ----- Draw furniture stamps -----
      for (const f of furniture) {
        const stamp = stampRegistry.get(f.stampId);
        if (!stamp) continue;

        ctx.save();
        ctx.translate(f.position.x, f.position.y);
        ctx.rotate((f.rotation * Math.PI) / 180);
        ctx.scale(f.scale, f.scale);

        if (f.color) {
          // Apply tint by setting fill/stroke before the stamp draws
          ctx.fillStyle = f.color;
          ctx.strokeStyle = f.color;
        }

        stamp.draw(ctx, f.width, f.depth);
        ctx.restore();
      }

      // ----- Draw stairs -----
      for (const stair of stairs) {
        ctx.save();
        ctx.translate(stair.position.x, stair.position.y);

        if (stair.rotation) {
          ctx.translate(stair.width / 2, stair.length / 2);
          ctx.rotate((stair.rotation * Math.PI) / 180);
          ctx.translate(-stair.width / 2, -stair.length / 2);
        }

        if (stair.flipH) {
          ctx.translate(stair.width, 0);
          ctx.scale(-1, 1);
        }
        if (stair.flipV) {
          ctx.translate(0, stair.length);
          ctx.scale(1, -1);
        }

        // Outline
        ctx.strokeStyle = '#666666';
        ctx.lineWidth = px;
        ctx.strokeRect(0, 0, stair.width, stair.length);

        // Treads
        const treadDepth = stair.length / stair.treads;
        ctx.strokeStyle = '#999999';
        ctx.lineWidth = 0.5 * px;
        for (let i = 1; i < stair.treads; i++) {
          const y = i * treadDepth;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(stair.width, y);
          ctx.stroke();
        }

        // Direction arrow
        const arrowX = stair.width / 2;
        const arrowY1 = stair.direction === 'up' ? stair.length * 0.8 : stair.length * 0.2;
        const arrowY2 = stair.direction === 'up' ? stair.length * 0.2 : stair.length * 0.8;

        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 1.5 * px;
        ctx.beginPath();
        ctx.moveTo(arrowX, arrowY1);
        ctx.lineTo(arrowX, arrowY2);
        ctx.stroke();

        // Arrowhead
        const headSize = 4 * px;
        const headDir = stair.direction === 'up' ? -1 : 1;
        ctx.beginPath();
        ctx.moveTo(arrowX, arrowY2);
        ctx.lineTo(arrowX - headSize, arrowY2 + headSize * headDir);
        ctx.lineTo(arrowX + headSize, arrowY2 + headSize * headDir);
        ctx.closePath();
        ctx.fillStyle = '#333333';
        ctx.fill();

        ctx.restore();
      }

      // ----- Draw text labels -----
      for (const t of texts) {
        ctx.save();
        ctx.translate(t.position.x, t.position.y);
        if (t.rotation) {
          ctx.rotate((t.rotation * Math.PI) / 180);
        }
        ctx.font = `${t.fontSize * px}px ${t.fontFamily}`;
        ctx.fillStyle = t.color;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(t.text, 0, 0);
        ctx.restore();
      }

      // ----- Draw dimensions -----
      for (const dim of dimensions) {
        const dx = dim.end.x - dim.start.x;
        const dy = dim.end.y - dim.start.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length === 0) continue;

        // Unit vectors
        const ux = dx / length;
        const uy = dy / length;
        // Perpendicular (for offset)
        const nx = -uy;
        const ny = ux;

        // Offset points
        const s = {
          x: dim.start.x + nx * dim.offset,
          y: dim.start.y + ny * dim.offset,
        };
        const e = {
          x: dim.end.x + nx * dim.offset,
          y: dim.end.y + ny * dim.offset,
        };

        // Extension lines
        ctx.strokeStyle = '#666666';
        ctx.lineWidth = 0.5 * px;

        ctx.beginPath();
        ctx.moveTo(dim.start.x, dim.start.y);
        ctx.lineTo(s.x, s.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(dim.end.x, dim.end.y);
        ctx.lineTo(e.x, e.y);
        ctx.stroke();

        // Dimension line
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(e.x, e.y);
        ctx.stroke();

        // Tick marks at ends
        const tickLen = 3 * px;
        for (const pt of [s, e]) {
          ctx.beginPath();
          ctx.moveTo(pt.x - nx * tickLen, pt.y - ny * tickLen);
          ctx.lineTo(pt.x + nx * tickLen, pt.y + ny * tickLen);
          ctx.stroke();
        }

        // Label (distance in meters)
        const midX = (s.x + e.x) / 2;
        const midY = (s.y + e.y) / 2;

        ctx.save();
        ctx.translate(midX, midY);
        const textAngle = Math.atan2(dy, dx);
        // Flip text if upside-down
        const adjustedAngle =
          textAngle > Math.PI / 2 || textAngle < -Math.PI / 2
            ? textAngle + Math.PI
            : textAngle;
        ctx.rotate(adjustedAngle);

        ctx.font = `${9 * px}px "Segoe UI", Arial, sans-serif`;
        ctx.fillStyle = '#333333';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(formatInUnit(length, du), 0, -2 * px);
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

// ---------------------------------------------------------------------------
// Helpers for the export renderFn (cut openings + glass lines)
// ---------------------------------------------------------------------------

/**
 * Draw a white-filled rectangle over a wall section to erase the fill
 * where a door or window sits. Uses white (#ffffff) as the background
 * since exports always use a white base.
 */
function cutOpeningExport(
  ctx: CanvasRenderingContext2D,
  wall: Wall,
  position: number,
  openingWidth: number,
): void {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const wallLen = Math.sqrt(dx * dx + dy * dy);
  if (wallLen === 0) return;

  const ux = dx / wallLen;
  const uy = dy / wallLen;
  const nx = -uy;
  const ny = ux;

  const cx = wall.start.x + dx * position;
  const cy = wall.start.y + dy * position;

  const halfW = openingWidth / 2;
  const halfT = wall.thickness / 2 + 0.005;

  const x0 = cx - ux * halfW - nx * halfT;
  const y0 = cy - uy * halfW - ny * halfT;
  const x1 = cx + ux * halfW - nx * halfT;
  const y1 = cy + uy * halfW - ny * halfT;
  const x2 = cx + ux * halfW + nx * halfT;
  const y2 = cy + uy * halfW + ny * halfT;
  const x3 = cx - ux * halfW + nx * halfT;
  const y3 = cy - uy * halfW + ny * halfT;

  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
}

/**
 * Draw two parallel glass pane lines across a wall opening.
 */
function drawGlassExport(
  ctx: CanvasRenderingContext2D,
  wall: Wall,
  position: number,
  openingWidth: number,
  px: number,
): void {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const wallLen = Math.sqrt(dx * dx + dy * dy);
  if (wallLen === 0) return;

  const ux = dx / wallLen;
  const uy = dy / wallLen;
  const nx = -uy;
  const ny = ux;

  const cx = wall.start.x + dx * position;
  const cy = wall.start.y + dy * position;

  const halfW = openingWidth / 2;
  const glassOffset = wall.thickness * 0.15;

  ctx.strokeStyle = '#88ccee';
  ctx.lineWidth = px;

  for (const sign of [-1, 1] as const) {
    const ox = nx * glassOffset * sign;
    const oy = ny * glassOffset * sign;

    ctx.beginPath();
    ctx.moveTo(cx - ux * halfW + ox, cy - uy * halfW + oy);
    ctx.lineTo(cx + ux * halfW + ox, cy + uy * halfW + oy);
    ctx.stroke();
  }
}
