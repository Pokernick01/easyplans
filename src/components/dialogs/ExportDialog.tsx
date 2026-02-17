import { useCallback, useEffect, useRef, useState } from 'react';
import { useProjectStore } from '@/store/project-store.ts';
import { useUIStore } from '@/store/ui-store.ts';
import { useTranslation } from '@/utils/i18n.ts';
import type { DisplayUnit } from '@/utils/units.ts';
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
import type { PaperSize } from '@/types/project.ts';
import type { Point } from '@/types/geometry.ts';
import { buildPlanModelFromState } from '@/engine/geometry/plan-model.ts';
import { buildDerivedSceneGeometry, pixelsPerMeterForZoom } from '@/engine/geometry/geometry-engine.ts';
import { renderDerivedScene } from '@/renderer/view-renderers/scene-renderer.ts';
import { renderPlanScene } from '@/renderer/view-renderers/plan-renderer.ts';
import { drawPlanOrientationOverlay } from '@/renderer/view-renderers/orientation-overlay.ts';

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

type RenderFn = (ctx: CanvasRenderingContext2D, width: number, height: number) => void;

function buildPlanRenderFn(
  state: ReturnType<typeof useProjectStore.getState>,
  includeDimensions: boolean,
): RenderFn | null {
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

  const allPoints: Point[] = [];

  for (const wall of walls) {
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

  if (allPoints.length === 0) return null;

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

  const PADDING = 1;
  minX -= PADDING;
  minY -= PADDING;
  maxX += PADDING;
  maxY += PADDING;

  const contentWidth = maxX - minX;
  const contentHeight = maxY - minY;

  return (ctx: CanvasRenderingContext2D, canvasW: number, canvasH: number) => {
    const scaleX = canvasW / contentWidth;
    const scaleY = canvasH / contentHeight;
    const fitScale = Math.min(scaleX, scaleY);

    const offsetX = (canvasW - contentWidth * fitScale) / 2;
    const offsetY = (canvasH - contentHeight * fitScale) / 2;

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(fitScale, fitScale);
    ctx.translate(-minX, -minY);

    ctx.fillStyle = '#faf8f4';
    ctx.fillRect(minX, minY, contentWidth, contentHeight);

    renderPlanScene(
      ctx,
      {
        walls,
        doors,
        windows,
        rooms,
        archLines,
        furniture,
        texts,
        dimensions,
        stairs,
        shapes,
      },
      {
        displayUnit: du,
        pixelsPerMeter: fitScale,
        showDimensions: includeDimensions,
      },
    );

    ctx.restore();

    drawPlanOrientationOverlay(
      ctx,
      canvasW,
      canvasH,
      state.project.frontDirection ?? 'north',
      state.project.northAngle ?? 0,
    );
  };
}

function buildDerivedRenderFn(
  state: ReturnType<typeof useProjectStore.getState>,
  uiState: ReturnType<typeof useUIStore.getState>,
): RenderFn {
  const model = buildPlanModelFromState(state);
  const scene = buildDerivedSceneGeometry(model, {
    mode: 'isometric',
    facadeDirection: uiState.facadeDirection,
    sectionDirection: uiState.sectionDirection,
    sectionOffset: uiState.sectionOffset,
    isoRotation: uiState.isoRotation,
    isoElevation: uiState.isoElevation,
  });

  return (ctx: CanvasRenderingContext2D, canvasW: number, canvasH: number) => {
    if (scene.kind === 'plan') return;
    renderDerivedScene(
      ctx,
      canvasW,
      canvasH,
      scene,
      pixelsPerMeterForZoom(uiState.zoom),
      model.furniture,
      state.project.frontDirection ?? 'north',
      state.project.northAngle ?? 0,
    );
  };
}

// ---------------------------------------------------------------------------
// ExportDialog
// ---------------------------------------------------------------------------

export function ExportDialog() {
  const setExportDialogOpen = useUIStore((s) => s.setExportDialogOpen);
  const projectName = useProjectStore((s) => s.project.name);
  const projectAuthor = useProjectStore((s) => s.project.author);
  const viewMode = useUIStore((s) => (s.viewMode === 'isometric' ? 'isometric' : 'plan'));
  const uiShowDimensions = useUIStore((s) => s.showDimensions);
  const projectForPreview = useProjectStore((s) => s.project);
  const t = useTranslation();

  const [paperSize, setPaperSize] = useState<PaperSize>('A4');
  const [format, setFormat] = useState<ExportFormat>('PNG');
  const [includeTitleBlock, setIncludeTitleBlock] = useState(true);
  const [name, setName] = useState(projectName);
  const [author, setAuthor] = useState(projectAuthor);
  const [includeDimensions, setIncludeDimensions] = useState(uiShowDimensions);
  const previewRef = useRef<HTMLCanvasElement>(null);

  const createCurrentRenderFn = useCallback((): RenderFn | null => {
    const state = useProjectStore.getState();
    const uiState = useUIStore.getState();

    if (uiState.viewMode === 'isometric') {
      return buildDerivedRenderFn(state, uiState);
    }
    return buildPlanRenderFn(state, includeDimensions);
  }, [includeDimensions]);

  useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const renderFn = createCurrentRenderFn();
    if (!renderFn) return;
    renderFn(ctx, canvas.width, canvas.height);
  }, [projectForPreview, viewMode, includeDimensions, format, paperSize, includeTitleBlock, createCurrentRenderFn]);

  const handleExport = () => {
    const state = useProjectStore.getState();
    const scale = state.project.scale;
    const renderFn = createCurrentRenderFn();
    if (!renderFn) {
      setExportDialogOpen(false);
      return;
    }

    const dispatchExport = (
      fn: RenderFn,
    ) => {
      const dateStr = new Date().toLocaleDateString();

      if (format === 'PDF') {
        exportToPDF(fn, {
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

        exportToPNG(fn, {
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
    };

    dispatchExport(renderFn);
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

          {viewMode === 'plan' && (
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeDimensions}
                  onChange={(e) => setIncludeDimensions(e.target.checked)}
                  className="accent-cyan-400"
                />
                <span className="text-xs" style={{ color: '#2c2c2c' }}>
                  {t('dialog.includeDimensions')}
                </span>
              </label>
            </div>
          )}

          <div>
            <label className="block text-xs mb-2" style={{ color: '#6b6560' }}>
              {t('dialog.preview')}
            </label>
            <div
              className="rounded"
              style={{
                border: '1px solid #d5cfc6',
                background: '#ffffff',
                overflow: 'hidden',
              }}
            >
              <canvas
                ref={previewRef}
                width={640}
                height={360}
                style={{
                  width: '100%',
                  height: 180,
                  display: 'block',
                  background: '#ffffff',
                }}
              />
            </div>
            <div className="text-xs mt-1" style={{ color: '#8a8480' }}>
              {t('dialog.previewHint')}
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

