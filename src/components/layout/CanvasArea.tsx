import { useRef, useEffect, useCallback, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, WheelEvent as ReactWheelEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { CanvasManager } from '@/renderer/canvas-manager.ts';
import { Camera } from '@/renderer/camera.ts';
import { RenderLoop } from '@/renderer/render-loop.ts';
import { useProjectStore } from '@/store/project-store.ts';
import { useUIStore } from '@/store/ui-store.ts';
import {
  getActiveFloor,
  getActiveElements,
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
import type { ArchLineStyle, AnyElement, ShapeKind } from '@/types/elements.ts';
import { toolManager } from '@/tools/tool-manager.ts';
import { formatInUnit } from '@/utils/units.ts';
import type { DisplayUnit } from '@/utils/units.ts';
import { buildPlanModelFromState } from '@/engine/geometry/plan-model.ts';
import { buildDerivedSceneGeometry } from '@/engine/geometry/geometry-engine.ts';
import { renderDerivedScene } from '@/renderer/view-renderers/scene-renderer.ts';
import { getArchLineDash, renderPlanScene } from '@/renderer/view-renderers/plan-renderer.ts';
import type { ViewMode } from '@/types/project.ts';
import { drawPlanOrientationOverlay } from '@/renderer/view-renderers/orientation-overlay.ts';

// ---------------------------------------------------------------------------
// Grid drawing helper (module-level, no component state needed)
// ---------------------------------------------------------------------------

function drawGrid(ctx: CanvasRenderingContext2D, camera: Camera) {
  const bounds = camera.getVisibleBounds();
  const ppm = camera.getPixelsPerMeter();

  // Major grid (1m)
  const majorSize = 1.0;
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 0.005;

  const startX = Math.floor(bounds.minX / majorSize) * majorSize;
  const endX = Math.ceil(bounds.maxX / majorSize) * majorSize;
  const startY = Math.floor(bounds.minY / majorSize) * majorSize;
  const endY = Math.ceil(bounds.maxY / majorSize) * majorSize;

  ctx.beginPath();
  for (let x = startX; x <= endX; x += majorSize) {
    ctx.moveTo(x, startY);
    ctx.lineTo(x, endY);
  }
  for (let y = startY; y <= endY; y += majorSize) {
    ctx.moveTo(startX, y);
    ctx.lineTo(endX, y);
  }
  ctx.stroke();

  // Minor grid (0.1m) -- only if zoomed in enough
  if (ppm > 20) {
    const minorSize = 0.1;
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 0.002;

    const mStartX = Math.floor(bounds.minX / minorSize) * minorSize;
    const mEndX = Math.ceil(bounds.maxX / minorSize) * minorSize;
    const mStartY = Math.floor(bounds.minY / minorSize) * minorSize;
    const mEndY = Math.ceil(bounds.maxY / minorSize) * minorSize;

    ctx.beginPath();
    for (let x = mStartX; x <= mEndX; x += minorSize) {
      ctx.moveTo(x, mStartY);
      ctx.lineTo(x, mEndY);
    }
    for (let y = mStartY; y <= mEndY; y += minorSize) {
      ctx.moveTo(mStartX, y);
      ctx.lineTo(mEndX, y);
    }
    ctx.stroke();
  }

  // Origin crosshair
  ctx.strokeStyle = 'rgba(45,106,79,0.25)';
  ctx.lineWidth = 0.01;
  ctx.beginPath();
  ctx.moveTo(bounds.minX, 0);
  ctx.lineTo(bounds.maxX, 0);
  ctx.moveTo(0, bounds.minY);
  ctx.lineTo(0, bounds.maxY);
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// CanvasArea -- main drawing canvas with pan/zoom and event handling
// ---------------------------------------------------------------------------

export function CanvasArea() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasManagerRef = useRef<CanvasManager | null>(null);
  const cameraRef = useRef<Camera>(new Camera());
  const renderLoopRef = useRef<RenderLoop | null>(null);

  // Track panning state
  const isPanning = useRef(false);
  const lastPanPos = useRef({ x: 0, y: 0 });
  const isSpaceHeld = useRef(false);

  // Track isometric rotation drag (azimuth + elevation)
  const isIsoRotating = useRef(false);
  const lastIsoRotateX = useRef(0);
  const lastIsoRotateY = useRef(0);

  // Touch support
  const touchCount = useRef(0);
  const lastTouchPos = useRef({ x: 0, y: 0 });
  const lastPinchDist = useRef(0);
  const isTouchDrawing = useRef(false);
  const isTouchPanning = useRef(false);
  const touchStartTime = useRef(0);
  const touchStartPos = useRef({ x: 0, y: 0 });
  const isTouchMaybePan = useRef(false); // select tool: tap vs pan disambiguation

  // -----------------------------------------------------------------------
  // Render function
  // -----------------------------------------------------------------------

  const render = useCallback(() => {
    const cm = canvasManagerRef.current;
    const camera = cameraRef.current;
    if (!cm) return;

    const ctx = cm.getContext();
    const width = cm.getWidth();
    const height = cm.getHeight();

    // Sync camera with UI store state
    const uiState = useUIStore.getState();
    camera.update(uiState.zoom, uiState.panOffset.x, uiState.panOffset.y, width, height, cm.getDPR());

    // Clear
    cm.clear();

    // Apply DPR scaling
    const dpr = cm.getDPR();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Fill background — warm off-white drafting paper
    ctx.fillStyle = '#faf8f4';
    ctx.fillRect(0, 0, width, height);

    // Apply camera transform
    camera.applyTransform(ctx);

    // Get project data
    const projectState = useProjectStore.getState();
    const displayUnit: DisplayUnit = projectState.project.displayUnit || 'm';
    const floor = getActiveFloor(projectState);
    if (!floor) {
      useUIStore.getState().markClean();
      return;
    }

    const walls = getWalls(projectState);
    const doors = getDoors(projectState);
    const windows = getWindows(projectState);
    const rooms = getRooms(projectState);
    const archLines = getArchLines(projectState);
    const furniture = getFurniture(projectState);
    const texts = getTexts(projectState);
    const dimensions = getDimensions(projectState);
    const stairs = getStairs(projectState);
    const shapes = getShapes(projectState);
    const viewMode = (uiState.viewMode === 'isometric' ? 'isometric' : 'plan') as ViewMode;

    // ===================================================================
    // 3D view mode
    // ===================================================================
    if (viewMode === 'isometric') {
      const isoRotation = uiState.isoRotation ?? 45;
      const isoElevation = uiState.isoElevation ?? 30;

      const planModel = buildPlanModelFromState(projectState);
      const derivedScene = buildDerivedSceneGeometry(planModel, {
        mode: 'isometric',
        facadeDirection: 'south',
        sectionDirection: 'south',
        sectionOffset: 0,
        isoRotation,
        isoElevation,
      });

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (derivedScene.kind === 'isometric') {
        renderDerivedScene(
          ctx,
          width,
          height,
          derivedScene,
          camera.getPixelsPerMeter(),
          furniture,
          projectState.project.frontDirection ?? 'north',
        );
        // Title + preset buttons
        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = '#666';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`VISTA 3D  \u2022  ${Math.round(isoRotation)}\u00b0 / ${Math.round(isoElevation)}\u00b0`, width / 2, 18);

        // Preset view buttons
        const presets = [
          { label: 'Iso', rot: 45, elev: 30 },
          { label: 'Top', rot: 0, elev: 85 },
          { label: 'Front', rot: 0, elev: 5 },
          { label: 'Side', rot: 90, elev: 5 },
        ];
        const pbW = 42, pbH = 20, pbGap = 4;
        const pbTotalW = presets.length * (pbW + pbGap) - pbGap;
        const pbStartX = (width - pbTotalW) / 2;
        const pbY = 28;

        for (let i = 0; i < presets.length; i++) {
          const p = presets[i];
          const bx = pbStartX + i * (pbW + pbGap);
          const isActive = Math.abs(isoRotation - p.rot) < 2 && Math.abs(isoElevation - p.elev) < 2;

          ctx.fillStyle = isActive ? 'rgba(45,106,79,0.85)' : 'rgba(0,0,0,0.06)';
          ctx.beginPath();
          ctx.roundRect(bx, pbY, pbW, pbH, 4);
          ctx.fill();
          ctx.strokeStyle = isActive ? '#2d6a4f' : 'rgba(0,0,0,0.2)';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = isActive ? '#fff' : '#555';
          ctx.font = '11px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(p.label, bx + pbW / 2, pbY + pbH / 2);
        }

        // Drag hint
        ctx.fillStyle = '#999';
        ctx.font = '10px sans-serif';
        ctx.fillText('Arrastra \u2194\u2195 para rotar / Drag to orbit', width / 2, pbY + pbH + 14);
        ctx.restore();
      }

      camera.applyTransform(ctx);

      useUIStore.getState().markClean();
      return;
    }

    // ===================================================================
    // Plan view (default)
    // ===================================================================

    // ----- Grid -----
    if (uiState.showGrid) {
      drawGrid(ctx, camera);
    }

    const selectedIds = new Set(uiState.selectedIds);
    let dragDx = 0;
    let dragDy = 0;
    const preview = toolManager.getPreview();
    if (preview && preview.type === 'move-ghost') {
      const ghostData = preview.data as { delta: { x: number; y: number }; ids: string[] };
      dragDx = ghostData.delta.x;
      dragDy = ghostData.delta.y;
    }

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
        displayUnit,
        pixelsPerMeter: camera.getPixelsPerMeter(),
        showDimensions: uiState.showDimensions,
        selectedIds,
        dragOffset: { x: dragDx, y: dragDy },
      },
    );
    // ----- Tool Previews (ghost lines while drawing) -----
    if (preview) {
      ctx.save();
      ctx.globalAlpha = 0.5;

      if (preview.type === 'wall') {
        const wd = preview.data as { start: { x: number; y: number }; end: { x: number; y: number }; thickness: number };
        const dx = wd.end.x - wd.start.x;
        const dy = wd.end.y - wd.start.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0) {
          const nx = -dy / len * (wd.thickness / 2);
          const ny = dx / len * (wd.thickness / 2);
          ctx.fillStyle = '#888';
          ctx.beginPath();
          ctx.moveTo(wd.start.x + nx, wd.start.y + ny);
          ctx.lineTo(wd.end.x + nx, wd.end.y + ny);
          ctx.lineTo(wd.end.x - nx, wd.end.y - ny);
          ctx.lineTo(wd.start.x - nx, wd.start.y - ny);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#333';
          ctx.lineWidth = 0.01;
          ctx.stroke();
          // Show length
          ctx.globalAlpha = 0.8;
          const ppmW = camera.getPixelsPerMeter();
          const mx = (wd.start.x + wd.end.x) / 2;
          const my = (wd.start.y + wd.end.y) / 2;
          ctx.save();
          ctx.translate(mx, my);
          const wAngle = Math.atan2(dy, dx);
          const wNorm = ((wAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
          const wFlip = wNorm > Math.PI / 2 && wNorm < Math.PI * 1.5;
          ctx.rotate(wFlip ? wAngle + Math.PI : wAngle);
          ctx.scale(1 / ppmW, 1 / ppmW);
          const wFontSize = Math.max(11, Math.min(14, ppmW * 0.12));
          ctx.fillStyle = '#2c2c2c';
          ctx.font = `600 ${wFontSize}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(formatInUnit(len, displayUnit), 0, -(wd.thickness / 2 + 0.03) * ppmW);
          ctx.restore();
        }
      }

      if (preview.type === 'archline') {
        const ad = preview.data as { start: { x: number; y: number }; end: { x: number; y: number }; lineStyle: ArchLineStyle };
        const { dash, lineWidth, color } = getArchLineDash(ad.lineStyle);
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.setLineDash(dash);
        ctx.lineCap = 'butt';
        ctx.beginPath();
        ctx.moveTo(ad.start.x, ad.start.y);
        ctx.lineTo(ad.end.x, ad.end.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (preview.type === 'dimension') {
        const dd = preview.data as { start: { x: number; y: number }; end: { x: number; y: number } };
        ctx.strokeStyle = '#2d6a4f';
        ctx.lineWidth = 0.01;
        ctx.setLineDash([0.03, 0.03]);
        ctx.beginPath();
        ctx.moveTo(dd.start.x, dd.start.y);
        ctx.lineTo(dd.end.x, dd.end.y);
        ctx.stroke();
        ctx.setLineDash([]);
        // Length label
        const ddx = dd.end.x - dd.start.x;
        const ddy = dd.end.y - dd.start.y;
        const dLen = Math.sqrt(ddx * ddx + ddy * ddy);
        if (dLen > 0.01) {
          const ppmD = camera.getPixelsPerMeter();
          const mx = (dd.start.x + dd.end.x) / 2;
          const my = (dd.start.y + dd.end.y) / 2;
          ctx.save();
          ctx.translate(mx, my);
          const dAngle = Math.atan2(ddy, ddx);
          const dNorm = ((dAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
          const dFlip = dNorm > Math.PI / 2 && dNorm < Math.PI * 1.5;
          ctx.rotate(dFlip ? dAngle + Math.PI : dAngle);
          ctx.scale(1 / ppmD, 1 / ppmD);
          const dFontSize = Math.max(11, Math.min(14, ppmD * 0.12));
          ctx.fillStyle = '#2d6a4f';
          ctx.font = `600 ${dFontSize}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(formatInUnit(dLen, displayUnit), 0, -3);
          ctx.restore();
        }
      }

      if (preview.type === 'stair') {
        const sd = preview.data as { position: { x: number; y: number }; rotation: number; stairStyle: string };
        ctx.save();
        ctx.translate(sd.position.x, sd.position.y);
        ctx.rotate((sd.rotation * Math.PI) / 180);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 0.02;
        ctx.strokeRect(-0.5, -1.5, 1.0, 3.0);
        ctx.restore();
      }

      if (preview.type === 'shape') {
        const sd = preview.data as {
          start: { x: number; y: number };
          end: { x: number; y: number };
          shapeKind: ShapeKind;
          filled: boolean;
          fillColor: string;
          strokeColor: string;
        };
        const sx = Math.min(sd.start.x, sd.end.x);
        const sy = Math.min(sd.start.y, sd.end.y);
        const sw = Math.abs(sd.end.x - sd.start.x);
        const sh = Math.abs(sd.end.y - sd.start.y);
        const cx = sx + sw / 2;
        const cy = sy + sh / 2;

        ctx.save();
        ctx.strokeStyle = sd.strokeColor;
        ctx.lineWidth = 0.02;
        ctx.setLineDash([0.05, 0.05]);

        ctx.beginPath();
        if (sd.shapeKind === 'rectangle') {
          ctx.rect(sx, sy, sw, sh);
        } else if (sd.shapeKind === 'circle') {
          ctx.ellipse(cx, cy, sw / 2, sh / 2, 0, 0, Math.PI * 2);
        } else if (sd.shapeKind === 'triangle') {
          ctx.moveTo(cx, sy);
          ctx.lineTo(sx + sw, sy + sh);
          ctx.lineTo(sx, sy + sh);
          ctx.closePath();
        }

        if (sd.filled) {
          ctx.fillStyle = sd.fillColor + '66';
          ctx.fill();
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      if (preview.type === 'room') {
        const rd = preview.data as { points: { x: number; y: number }[] };
        if (rd.points.length > 1) {
          ctx.strokeStyle = '#2d6a4f';
          ctx.lineWidth = 0.02;
          ctx.setLineDash([0.05, 0.05]);
          ctx.beginPath();
          ctx.moveTo(rd.points[0].x, rd.points[0].y);
          for (let i = 1; i < rd.points.length; i++) {
            ctx.lineTo(rd.points[i].x, rd.points[i].y);
          }
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      ctx.restore();
    }

    // ----- Selection box preview -----
    if (preview && preview.type === 'selection-box') {
      const box = preview.data as { start: { x: number; y: number }; end: { x: number; y: number } };
      ctx.save();
      ctx.strokeStyle = '#2d6a4f';
      ctx.lineWidth = 0.01;
      ctx.setLineDash([0.05, 0.05]);
      ctx.fillStyle = 'rgba(79,195,247,0.08)';
      const bx = Math.min(box.start.x, box.end.x);
      const by = Math.min(box.start.y, box.end.y);
      const bw = Math.abs(box.end.x - box.start.x);
      const bh = Math.abs(box.end.y - box.start.y);
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeRect(bx, by, bw, bh);
      ctx.setLineDash([]);
      ctx.restore();
    }

    // ----- Wall endpoint dots (always visible in plan view for drawing tools) -----
    const drawingTools = new Set(['wall', 'door', 'window', 'dimension', 'archline', 'room']);
    if (viewMode === 'plan' && drawingTools.has(uiState.activeTool)) {
      ctx.save();
      const dotR = 0.04;
      ctx.fillStyle = 'rgba(45,106,79,0.35)';
      for (const w of walls) {
        ctx.beginPath();
        ctx.arc(w.start.x, w.start.y, dotR, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(w.end.x, w.end.y, dotR, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // ----- Snap indicator + precision crosshair -----
    if (viewMode === 'plan' && uiState.snapEnabled && drawingTools.has(uiState.activeTool)) {
      const cursorWP = uiState.cursorWorldPos;
      // Gather snap targets from all relevant elements
      const snapTargets: { x: number; y: number }[] = [];
      for (const w of walls) {
        snapTargets.push(w.start, w.end);
      }
      for (const al of archLines) {
        snapTargets.push(al.start, al.end);
      }
      for (const d of dimensions) {
        snapTargets.push(d.start, d.end);
      }

      const threshold = 0.15;
      let snapType: string | null = null;
      let snapPt = cursorWP;
      let bestDist = Infinity;

      for (const t of snapTargets) {
        const dx = cursorWP.x - t.x;
        const dy = cursorWP.y - t.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < bestDist && d <= threshold) {
          bestDist = d;
          snapPt = t;
          snapType = 'endpoint';
        }
      }

      if (!snapType) {
        const gx = Math.round(cursorWP.x / uiState.gridSize) * uiState.gridSize;
        const gy = Math.round(cursorWP.y / uiState.gridSize) * uiState.gridSize;
        const gd = Math.sqrt((cursorWP.x - gx) ** 2 + (cursorWP.y - gy) ** 2);
        if (gd < threshold * 0.5) {
          snapPt = { x: gx, y: gy };
          snapType = 'grid';
        }
      }

      ctx.save();
      if (snapType === 'endpoint') {
        // Diamond + crosshair at snap point
        const s = 0.06;
        ctx.fillStyle = 'rgba(184,92,56,0.9)';
        ctx.beginPath();
        ctx.moveTo(snapPt.x, snapPt.y - s);
        ctx.lineTo(snapPt.x + s, snapPt.y);
        ctx.lineTo(snapPt.x, snapPt.y + s);
        ctx.lineTo(snapPt.x - s, snapPt.y);
        ctx.closePath();
        ctx.fill();
        // Crosshair lines
        ctx.strokeStyle = 'rgba(184,92,56,0.5)';
        ctx.lineWidth = 0.005;
        ctx.beginPath();
        ctx.moveTo(snapPt.x - s * 2.5, snapPt.y);
        ctx.lineTo(snapPt.x + s * 2.5, snapPt.y);
        ctx.moveTo(snapPt.x, snapPt.y - s * 2.5);
        ctx.lineTo(snapPt.x, snapPt.y + s * 2.5);
        ctx.stroke();
      } else if (snapType === 'grid') {
        // Circle at grid snap
        ctx.fillStyle = 'rgba(79,195,247,0.7)';
        ctx.beginPath();
        ctx.arc(snapPt.x, snapPt.y, 0.04, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // No snap — show a small precision crosshair at cursor position
        const s = 0.05;
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 0.005;
        ctx.beginPath();
        ctx.moveTo(cursorWP.x - s, cursorWP.y);
        ctx.lineTo(cursorWP.x + s, cursorWP.y);
        ctx.moveTo(cursorWP.x, cursorWP.y - s);
        ctx.lineTo(cursorWP.x, cursorWP.y + s);
        ctx.stroke();
      }
      ctx.restore();
    }

    // ----- Scale bar (screen space, bottom-left) -----
    if (viewMode === 'plan') {
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const ppm = camera.getPixelsPerMeter();
      // Pick a nice round meter value that produces a bar ~40-200px on screen
      const niceValues = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100];
      let scaleMeters = 1;
      for (const v of niceValues) {
        if (v * ppm >= 40) { scaleMeters = v; break; }
      }
      const barPx = scaleMeters * ppm;
      const barX = 20;
      const barY = height - 20;

      ctx.strokeStyle = '#666';
      ctx.lineWidth = 2;
      ctx.fillStyle = '#888';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';

      // Bar
      ctx.beginPath();
      ctx.moveTo(barX, barY);
      ctx.lineTo(barX + barPx, barY);
      ctx.stroke();
      // End ticks
      ctx.beginPath();
      ctx.moveTo(barX, barY - 4);
      ctx.lineTo(barX, barY + 1);
      ctx.moveTo(barX + barPx, barY - 4);
      ctx.lineTo(barX + barPx, barY + 1);
      ctx.stroke();
      // Label
      const label = scaleMeters >= 1 ? `${scaleMeters}m` : `${Math.round(scaleMeters * 100)}cm`;
      ctx.fillText(label, barX + barPx / 2, barY - 5);

      ctx.restore();
      camera.applyTransform(ctx);
    }

    if (viewMode === 'plan') {
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawPlanOrientationOverlay(
        ctx,
        width,
        height,
        projectState.project.frontDirection ?? 'north',
      );
      ctx.restore();
      camera.applyTransform(ctx);
    }

    // Mark clean
    useUIStore.getState().markClean();
  }, []);

  // -----------------------------------------------------------------------
  // Setup and teardown
  // -----------------------------------------------------------------------

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const cm = new CanvasManager(canvas);
    canvasManagerRef.current = cm;

    const rl = new RenderLoop(render);
    renderLoopRef.current = rl;
    rl.start();

    // Subscribe to store changes to trigger re-renders
    const unsubProject = useProjectStore.subscribe(() => {
      rl.requestFrame();
    });
    const unsubUI = useUIStore.subscribe(() => {
      rl.requestFrame();
    });

    // Sync tool manager with UI store tool changes
    let lastTool = useUIStore.getState().activeTool;
    toolManager.setActiveTool(lastTool);
    const unsubToolSync = useUIStore.subscribe((state) => {
      if (state.activeTool !== lastTool) {
        lastTool = state.activeTool;
        toolManager.setActiveTool(state.activeTool);
      }
    });

    return () => {
      rl.stop();
      cm.destroy();
      unsubProject();
      unsubUI();
      unsubToolSync();
      canvasManagerRef.current = null;
      renderLoopRef.current = null;
    };
  }, [render]);

  // -----------------------------------------------------------------------
  // Coordinate conversion
  // -----------------------------------------------------------------------

  const getWorldPos = useCallback((e: ReactMouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    return cameraRef.current.screenToWorld({ x: sx, y: sy });
  }, []);

  // -----------------------------------------------------------------------
  // Mouse event handlers
  // -----------------------------------------------------------------------

  const handleMouseDown = useCallback((e: ReactMouseEvent<HTMLCanvasElement>) => {
    // Ensure canvas has focus for keyboard shortcuts (copy/paste/delete/etc.)
    canvasRef.current?.focus();

    // Middle button or right-click = pan
    if (e.button === 1 || e.button === 2) {
      e.preventDefault();
      isPanning.current = true;
      lastPanPos.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // Space + left click = pan
    if (e.button === 0 && isSpaceHeld.current) {
      e.preventDefault();
      isPanning.current = true;
      lastPanPos.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // 3D view interaction
    const viewMode = useUIStore.getState().viewMode === 'isometric' ? 'isometric' : 'plan';
    if (viewMode === 'isometric' && e.button === 0) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const cw = rect.width;

      // Check preset buttons
      const presets = [
        { label: 'Iso', rot: 45, elev: 30 },
        { label: 'Top', rot: 0, elev: 85 },
        { label: 'Front', rot: 0, elev: 5 },
        { label: 'Side', rot: 90, elev: 5 },
      ];
      const pbW = 42, pbH = 20, pbGap = 4;
      const pbTotalW = presets.length * (pbW + pbGap) - pbGap;
      const pbStartX = (cw - pbTotalW) / 2;
      const pbY = 28;

      for (let i = 0; i < presets.length; i++) {
        const bx = pbStartX + i * (pbW + pbGap);
        if (mx >= bx && mx <= bx + pbW && my >= pbY && my <= pbY + pbH) {
          const ui = useUIStore.getState();
          ui.setIsoRotation(presets[i].rot);
          ui.setIsoElevation(presets[i].elev);
          ui.markDirty();
          return;
        }
      }

      // If not clicking a button, start orbital drag
      isIsoRotating.current = true;
      lastIsoRotateX.current = e.clientX;
      lastIsoRotateY.current = e.clientY;
      return;
    }

    const worldPos = getWorldPos(e);
    useUIStore.getState().setCursorPos(worldPos);

    const canvas = canvasRef.current;
    if (canvas) {
      const screenPos = { x: e.clientX - canvas.getBoundingClientRect().left, y: e.clientY - canvas.getBoundingClientRect().top };
      toolManager.onMouseDown(worldPos, screenPos, e.nativeEvent);
    }
  }, [getWorldPos]);

  const handleMouseMove = useCallback((e: ReactMouseEvent<HTMLCanvasElement>) => {
    const worldPos = getWorldPos(e);
    useUIStore.getState().setCursorPos(worldPos);

    if (isPanning.current) {
      const dx = e.clientX - lastPanPos.current.x;
      const dy = e.clientY - lastPanPos.current.y;
      lastPanPos.current = { x: e.clientX, y: e.clientY };
      useUIStore.getState().panBy(dx, dy);
      return;
    }

    // Isometric orbital drag (azimuth + elevation)
    if (isIsoRotating.current) {
      const dx = e.clientX - lastIsoRotateX.current;
      const dy = e.clientY - lastIsoRotateY.current;
      lastIsoRotateX.current = e.clientX;
      lastIsoRotateY.current = e.clientY;
      const ui = useUIStore.getState();
      // 1 pixel = 0.5 degrees azimuth, 0.3 degrees elevation
      ui.setIsoRotation(ui.isoRotation + dx * 0.5);
      ui.setIsoElevation(ui.isoElevation + dy * 0.3);
      ui.markDirty();
      return;
    }

    const canvas = canvasRef.current;
    if (canvas) {
      const screenPos = { x: e.clientX - canvas.getBoundingClientRect().left, y: e.clientY - canvas.getBoundingClientRect().top };
      toolManager.onMouseMove(worldPos, screenPos, e.nativeEvent);
    }
    // Always repaint during any tool interaction for smooth previews
    useUIStore.getState().markDirty();
  }, [getWorldPos]);

  const handleMouseUp = useCallback((e: ReactMouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1 || e.button === 2 || (e.button === 0 && isPanning.current)) {
      isPanning.current = false;
      return;
    }

    if (isIsoRotating.current) {
      isIsoRotating.current = false;
      return;
    }

    const worldPos = getWorldPos(e);
    const canvas = canvasRef.current;
    if (canvas) {
      const screenPos = { x: e.clientX - canvas.getBoundingClientRect().left, y: e.clientY - canvas.getBoundingClientRect().top };
      toolManager.onMouseUp(worldPos, screenPos, e.nativeEvent);
    }
  }, [getWorldPos]);

  const handleWheel = useCallback((e: ReactWheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const ui = useUIStore.getState();
    const viewMode = ui.viewMode === 'isometric' ? 'isometric' : 'plan';

    if (viewMode === 'isometric') {
      // 3D controls:
      // - wheel: tilt camera
      // - shift+wheel: rotate camera
      if (e.shiftKey) {
        ui.setIsoRotation(ui.isoRotation + (e.deltaY > 0 ? 4 : -4));
      } else {
        ui.setIsoElevation(ui.isoElevation + (e.deltaY > 0 ? 1.5 : -1.5));
      }
      ui.markDirty();
      return;
    }

    if (e.ctrlKey || e.metaKey) {
      // Ctrl+scroll = zoom (pinch-to-zoom on trackpads also sends ctrl)
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = ui.zoom * factor;
      ui.setZoom(newZoom);
    } else {
      // Plain scroll = pan
      // deltaY = vertical pan, deltaX or Shift+deltaY = horizontal pan
      const dx = e.shiftKey ? -e.deltaY : -e.deltaX;
      const dy = e.shiftKey ? 0 : -e.deltaY;
      ui.panBy(dx, dy);
    }
  }, []);

  const handleContextMenu = useCallback((e: ReactMouseEvent) => {
    e.preventDefault();
  }, []);

  // -----------------------------------------------------------------------
  // Touch event handlers (mobile support)
  // -----------------------------------------------------------------------

  const getTouchWorldPos = useCallback((touch: React.Touch) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const sx = touch.clientX - rect.left;
    const sy = touch.clientY - rect.top;
    return cameraRef.current.screenToWorld({ x: sx, y: sy });
  }, []);

  // Native touch handlers — attached via useEffect with { passive: false }
  // so preventDefault() works without the passive event listener warning.
  const nativeTouchStart = useCallback((e: TouchEvent) => {
    e.preventDefault();
    const touches = e.touches;
    const isIso = useUIStore.getState().viewMode === 'isometric';
    touchCount.current = touches.length;

    if (touches.length === 2) {
      isTouchDrawing.current = false;
      isTouchPanning.current = false;
      isTouchMaybePan.current = false;
      const mx = (touches[0].clientX + touches[1].clientX) / 2;
      const my = (touches[0].clientY + touches[1].clientY) / 2;
      lastTouchPos.current = { x: mx, y: my };
      const dx = touches[1].clientX - touches[0].clientX;
      const dy = touches[1].clientY - touches[0].clientY;
      lastPinchDist.current = Math.hypot(dx, dy);
    } else if (touches.length === 1) {
      const activeTool = useUIStore.getState().activeTool;
      lastTouchPos.current = { x: touches[0].clientX, y: touches[0].clientY };
      touchStartTime.current = Date.now();
      touchStartPos.current = { x: touches[0].clientX, y: touches[0].clientY };

      if (isIso) {
        // In 3D, one-finger drag orbits the camera.
        isTouchDrawing.current = false;
        isTouchMaybePan.current = false;
        isTouchPanning.current = true;
        return;
      }

      if (activeTool === 'select') {
        // Start in "maybe pan" state — disambiguate tap (select) from drag (pan)
        isTouchMaybePan.current = true;
        isTouchPanning.current = false;
        isTouchDrawing.current = false;
      } else {
        isTouchDrawing.current = true;
        isTouchPanning.current = false;
        isTouchMaybePan.current = false;
        const worldPos = getTouchWorldPos(touches[0]);
        useUIStore.getState().setCursorPos(worldPos);
        const canvas = canvasRef.current;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          const screenPos = { x: touches[0].clientX - rect.left, y: touches[0].clientY - rect.top };
          toolManager.onMouseDown(worldPos, screenPos, e as unknown as MouseEvent);
        }
      }
    }
  }, [getTouchWorldPos]);

  const nativeTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault();
    const touches = e.touches;
    const ui = useUIStore.getState();
    const isIso = ui.viewMode === 'isometric';

    if (touches.length === 2) {
      const mx = (touches[0].clientX + touches[1].clientX) / 2;
      const my = (touches[0].clientY + touches[1].clientY) / 2;
      const dx = mx - lastTouchPos.current.x;
      const dy = my - lastTouchPos.current.y;
      lastTouchPos.current = { x: mx, y: my };

      const pinchDx = touches[1].clientX - touches[0].clientX;
      const pinchDy = touches[1].clientY - touches[0].clientY;
      const dist = Math.hypot(pinchDx, pinchDy);

      if (isIso) {
        ui.setIsoRotation(ui.isoRotation + dx * 0.25);
        if (lastPinchDist.current > 0) {
          const pinchDelta = dist - lastPinchDist.current;
          ui.setIsoElevation(ui.isoElevation - pinchDelta * 0.08);
        }
      } else {
        ui.panBy(dx, dy);
        if (lastPinchDist.current > 0) {
          const scale = dist / lastPinchDist.current;
          ui.setZoom(ui.zoom * scale);
        }
      }

      lastPinchDist.current = dist;
      ui.markDirty();
    } else if (touches.length === 1 && isTouchMaybePan.current) {
      // Select tool disambiguation: if finger moved > 8px, switch to panning
      const movedX = touches[0].clientX - touchStartPos.current.x;
      const movedY = touches[0].clientY - touchStartPos.current.y;
      const movedDist = Math.sqrt(movedX * movedX + movedY * movedY);
      if (movedDist > 8) {
        isTouchMaybePan.current = false;
        isTouchPanning.current = true;
        lastTouchPos.current = { x: touches[0].clientX, y: touches[0].clientY };
      }
    } else if (touches.length === 1 && isTouchPanning.current) {
      const dx = touches[0].clientX - lastTouchPos.current.x;
      const dy = touches[0].clientY - lastTouchPos.current.y;
      lastTouchPos.current = { x: touches[0].clientX, y: touches[0].clientY };
      if (isIso) {
        ui.setIsoRotation(ui.isoRotation + dx * 0.35);
        ui.setIsoElevation(ui.isoElevation + dy * 0.2);
      } else {
        ui.panBy(dx, dy);
      }
      ui.markDirty();
    } else if (touches.length === 1 && isTouchDrawing.current) {
      const worldPos = getTouchWorldPos(touches[0]);
      ui.setCursorPos(worldPos);
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const screenPos = { x: touches[0].clientX - rect.left, y: touches[0].clientY - rect.top };
        toolManager.onMouseMove(worldPos, screenPos, e as unknown as MouseEvent);
      }
      ui.markDirty();
    }
  }, [getTouchWorldPos]);

  const nativeTouchEnd = useCallback((e: TouchEvent) => {
    e.preventDefault();
    const isIso = useUIStore.getState().viewMode === 'isometric';

    // Select tool: if we were in "maybe pan" state and finger didn't move much,
    // treat this as a tap — forward mouseDown + mouseUp to the select tool
    if (!isIso && isTouchMaybePan.current && e.changedTouches.length > 0) {
      const touch = e.changedTouches[0];
      const worldPos = getTouchWorldPos(touch);
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const screenPos = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
        toolManager.onMouseDown(worldPos, screenPos, e as unknown as MouseEvent);
        toolManager.onMouseUp(worldPos, screenPos, e as unknown as MouseEvent);
      }
    }

    if (!isIso && isTouchDrawing.current && e.changedTouches.length > 0) {
      const touch = e.changedTouches[0];
      const worldPos = getTouchWorldPos(touch);
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const screenPos = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
        toolManager.onMouseUp(worldPos, screenPos, e as unknown as MouseEvent);
      }
    }
    isTouchDrawing.current = false;
    isTouchPanning.current = false;
    isTouchMaybePan.current = false;
    touchCount.current = e.touches.length;
    lastPinchDist.current = 0;
  }, [getTouchWorldPos]);

  // Attach native touch listeners with { passive: false } to allow preventDefault
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const opts: AddEventListenerOptions = { passive: false };
    canvas.addEventListener('touchstart', nativeTouchStart, opts);
    canvas.addEventListener('touchmove', nativeTouchMove, opts);
    canvas.addEventListener('touchend', nativeTouchEnd, opts);
    canvas.addEventListener('touchcancel', nativeTouchEnd, opts);
    return () => {
      canvas.removeEventListener('touchstart', nativeTouchStart);
      canvas.removeEventListener('touchmove', nativeTouchMove);
      canvas.removeEventListener('touchend', nativeTouchEnd);
      canvas.removeEventListener('touchcancel', nativeTouchEnd);
    };
  }, [nativeTouchStart, nativeTouchMove, nativeTouchEnd]);

  // -----------------------------------------------------------------------
  // Keyboard event handlers
  // -----------------------------------------------------------------------

  const handleKeyUp = useCallback((e: ReactKeyboardEvent) => {
    if (e.key === ' ') {
      isSpaceHeld.current = false;
      // If we were panning via space+drag, stop panning
      if (isPanning.current) {
        isPanning.current = false;
      }
    }
  }, []);

  // Global keyboard listener so copy/paste/delete work even when canvas lacks focus
  useEffect(() => {
    const onGlobalKeyDown = (e: globalThis.KeyboardEvent) => {
      // Skip if user is typing in an input/textarea/contenteditable
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
      // Only intercept shortcuts that the canvas handles
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v' || e.key === 'x' || e.key === 'z' || e.key === 'y')) {
        // Focus the canvas so the React onKeyDown fires
        canvasRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onGlobalKeyDown, true);
    return () => window.removeEventListener('keydown', onGlobalKeyDown, true);
  }, []);

  const handleKeyDown = useCallback((e: ReactKeyboardEvent) => {
    // Space key: enable pan mode
    if (e.key === ' ' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      isSpaceHeld.current = true;
      return;
    }

    // Copy
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
      e.preventDefault();
      const { selectedIds } = useUIStore.getState();
      if (selectedIds.length === 0) return;
      const projectState = useProjectStore.getState();
      const elements = getActiveElements(projectState);
      const copiedElements: AnyElement[] = [];
      for (const id of selectedIds) {
        const el = elements[id];
        if (el) copiedElements.push(el);
      }
      if (copiedElements.length > 0) {
        useUIStore.getState().setClipboard(JSON.stringify(copiedElements));
      }
      return;
    }

    // Cut
    if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
      e.preventDefault();
      const { selectedIds } = useUIStore.getState();
      if (selectedIds.length === 0) return;
      const projectState = useProjectStore.getState();
      const elements = getActiveElements(projectState);
      const copiedElements: AnyElement[] = [];
      for (const id of selectedIds) {
        const el = elements[id];
        if (el) copiedElements.push(el);
      }
      if (copiedElements.length > 0) {
        useUIStore.getState().setClipboard(JSON.stringify(copiedElements));
      }
      const floorIndex = projectState.project.activeFloorIndex;
      useProjectStore.getState().removeElements(floorIndex, selectedIds);
      useUIStore.getState().clearSelection();
      return;
    }

    // Paste
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
      e.preventDefault();
      const clipboard = useUIStore.getState().clipboard;
      if (!clipboard) return;
      let parsed: unknown[];
      try {
        const raw = JSON.parse(clipboard);
        if (!Array.isArray(raw) || raw.length === 0) return;
        parsed = raw;
      } catch { return; }
      // Validate: only allow known element types
      const validTypes = new Set(['wall', 'door', 'window', 'room', 'furniture', 'text', 'dimension', 'archline', 'stair', 'shape']);
      parsed = parsed.filter((el) => el != null && typeof el === 'object' && validTypes.has((el as Record<string, unknown>).type as string));
      if (parsed.length === 0) return;
      const store = useProjectStore.getState();
      const newIds: string[] = [];
      const OFFSET = 0.5;
      // ID remap: old id -> new id (for walls so doors/windows/rooms keep references)
      const idMap = new Map<string, string>();
      // Sort: walls first, then doors/windows/rooms (they reference walls), then rest
      const order: Record<string, number> = { wall: 0, door: 1, window: 1, room: 2 };
      const sorted = [...parsed].sort((a, b) => {
        const ta = (a as Record<string, unknown>).type as string;
        const tb = (b as Record<string, unknown>).type as string;
        return (order[ta] ?? 3) - (order[tb] ?? 3);
      });
      for (const el of sorted) {
        const { id: oldId, type, ...rest } = el as AnyElement & Record<string, unknown>;
        switch (type) {
          case 'wall': {
            const w = rest as Record<string, unknown>;
            const start = w.start as { x: number; y: number };
            const end = w.end as { x: number; y: number };
            w.start = { x: start.x + OFFSET, y: start.y + OFFSET };
            w.end = { x: end.x + OFFSET, y: end.y + OFFSET };
            const newId = store.addWall(w as Omit<import('@/types/elements.ts').Wall, 'id' | 'type'>);
            idMap.set(oldId, newId);
            newIds.push(newId);
            break;
          }
          case 'door': {
            const d = rest as Record<string, unknown>;
            // Remap wallId to new wall if it was copied together
            if (d.wallId && idMap.has(d.wallId as string)) {
              d.wallId = idMap.get(d.wallId as string);
            }
            newIds.push(store.addDoor(d as Omit<import('@/types/elements.ts').Door, 'id' | 'type'>));
            break;
          }
          case 'window': {
            const w = rest as Record<string, unknown>;
            // Remap wallId to new wall if it was copied together
            if (w.wallId && idMap.has(w.wallId as string)) {
              w.wallId = idMap.get(w.wallId as string);
            }
            newIds.push(store.addWindow(w as Omit<import('@/types/elements.ts').Window, 'id' | 'type'>));
            break;
          }
          case 'room': {
            const r = rest as Record<string, unknown>;
            const polygon = r.polygon as { x: number; y: number }[];
            r.polygon = polygon.map((p) => ({ x: p.x + OFFSET, y: p.y + OFFSET }));
            // Remap wallIds to new walls if they were copied together
            if (Array.isArray(r.wallIds)) {
              r.wallIds = (r.wallIds as string[]).map((wid) => idMap.get(wid) ?? wid);
            }
            newIds.push(store.addRoom(r as Omit<import('@/types/elements.ts').Room, 'id' | 'type'>));
            break;
          }
          case 'furniture': {
            const f = rest as Record<string, unknown>;
            const pos = f.position as { x: number; y: number };
            f.position = { x: pos.x + OFFSET, y: pos.y + OFFSET };
            newIds.push(store.addFurniture(f as Omit<import('@/types/elements.ts').FurnitureItem, 'id' | 'type'>));
            break;
          }
          case 'text': {
            const t = rest as Record<string, unknown>;
            const tPos = t.position as { x: number; y: number };
            t.position = { x: tPos.x + OFFSET, y: tPos.y + OFFSET };
            newIds.push(store.addText(t as Omit<import('@/types/elements.ts').TextLabel, 'id' | 'type'>));
            break;
          }
          case 'dimension': {
            const d = rest as Record<string, unknown>;
            const dStart = d.start as { x: number; y: number };
            const dEnd = d.end as { x: number; y: number };
            d.start = { x: dStart.x + OFFSET, y: dStart.y + OFFSET };
            d.end = { x: dEnd.x + OFFSET, y: dEnd.y + OFFSET };
            newIds.push(store.addDimension(d as Omit<import('@/types/elements.ts').DimensionLine, 'id' | 'type'>));
            break;
          }
          case 'archline': {
            const a = rest as Record<string, unknown>;
            const aStart = a.start as { x: number; y: number };
            const aEnd = a.end as { x: number; y: number };
            a.start = { x: aStart.x + OFFSET, y: aStart.y + OFFSET };
            a.end = { x: aEnd.x + OFFSET, y: aEnd.y + OFFSET };
            newIds.push(store.addArchLine(a as Omit<import('@/types/elements.ts').ArchLine, 'id' | 'type'>));
            break;
          }
          case 'stair': {
            const s = rest as Record<string, unknown>;
            const sPos = s.position as { x: number; y: number };
            s.position = { x: sPos.x + OFFSET, y: sPos.y + OFFSET };
            newIds.push(store.addStair(s as Omit<import('@/types/elements.ts').Stair, 'id' | 'type'>));
            break;
          }
          case 'shape': {
            const sh = rest as Record<string, unknown>;
            const shPos = sh.position as { x: number; y: number };
            sh.position = { x: shPos.x + OFFSET, y: shPos.y + OFFSET };
            newIds.push(store.addShape(sh as Omit<import('@/types/elements.ts').Shape, 'id' | 'type'>));
            break;
          }
        }
      }
      useUIStore.getState().select(newIds);
      useUIStore.getState().markDirty();
      return;
    }

    // Undo / Redo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        useProjectStore.temporal.getState().redo();
      } else {
        useProjectStore.temporal.getState().undo();
      }
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
      e.preventDefault();
      useProjectStore.temporal.getState().redo();
      return;
    }

    // Tool shortcuts (skip if modifier keys held)
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    const { setTool, toggleGrid, toggleSnap } = useUIStore.getState();
    switch (e.key.toLowerCase()) {
      case 'v': setTool('select'); break;
      case 'w': setTool('wall'); break;
      case 'd': setTool('door'); break;
      case 'n': setTool('window'); break;
      case 'r': setTool('room'); break;
      case 'm': setTool('dimension'); break;
      case 'f': setTool('stamp'); break;
      case 'l': setTool('archline'); break;
      case 'h': setTool('stair'); break;
      case 'e': setTool('eraser'); break;
      case 'o': setTool('shape'); break;
      case 'g': toggleGrid(); break;
      case 's': toggleSnap(); break;
      case 'escape': useUIStore.getState().clearSelection(); break;
      case 'arrowup':
      case 'arrowdown':
      case 'arrowleft':
      case 'arrowright': {
        e.preventDefault();
        const { selectedIds } = useUIStore.getState();
        if (selectedIds.length > 0) {
          // Move selected elements
          const step = e.shiftKey ? 0.01 : 0.05; // Shift = 1cm, normal = 5cm
          let dx = 0, dy = 0;
          if (e.key === 'ArrowUp') dy = -step;
          else if (e.key === 'ArrowDown') dy = step;
          else if (e.key === 'ArrowLeft') dx = -step;
          else if (e.key === 'ArrowRight') dx = step;
          const floorIndex = useProjectStore.getState().project.activeFloorIndex;
          for (const id of selectedIds) {
            useProjectStore.getState().moveElement(floorIndex, id, dx, dy);
          }
          useUIStore.getState().markDirty();
        } else {
          // Pan canvas when nothing selected
          const panStep = e.shiftKey ? 20 : 60; // pixels
          let pdx = 0, pdy = 0;
          if (e.key === 'ArrowUp') pdy = panStep;
          else if (e.key === 'ArrowDown') pdy = -panStep;
          else if (e.key === 'ArrowLeft') pdx = panStep;
          else if (e.key === 'ArrowRight') pdx = -panStep;
          useUIStore.getState().panBy(pdx, pdy);
        }
        break;
      }
      case 'delete':
      case 'backspace': {
        const { selectedIds } = useUIStore.getState();
        if (selectedIds.length > 0) {
          const floorIndex = useProjectStore.getState().project.activeFloorIndex;
          useProjectStore.getState().removeElements(floorIndex, selectedIds);
          useUIStore.getState().clearSelection();
        }
        break;
      }
    }
  }, []);

  // -----------------------------------------------------------------------
  // Cursor per tool
  // -----------------------------------------------------------------------

  const activeTool = useUIStore((s) => s.activeTool);
  const viewMode = useUIStore((s) => s.viewMode);
  const effectiveViewMode = viewMode === 'isometric' ? 'isometric' : 'plan';

  const cursorMap: Record<string, string> = {
    select: 'default',
    wall: 'crosshair',
    door: 'crosshair',
    window: 'crosshair',
    room: 'crosshair',
    dimension: 'crosshair',
    text: 'text',
    stamp: 'copy',
    eraser: 'pointer',
    archline: 'crosshair',
    stair: 'crosshair',
    shape: 'crosshair',
  };
  const canvasCursor = effectiveViewMode === 'isometric' ? 'grab' : (cursorMap[activeTool] ?? 'default');

  // -----------------------------------------------------------------------
  // Scrollbar state — shows visible area when zoomed in
  // -----------------------------------------------------------------------

  const zoom = useUIStore((s) => s.zoom);
  const panOffset = useUIStore((s) => s.panOffset);

  // Scrollbar drag refs
  const isDraggingScrollbarV = useRef(false);
  const isDraggingScrollbarH = useRef(false);
  const scrollbarDragStart = useRef({ x: 0, y: 0 });
  const scrollbarPanStart = useRef({ x: 0, y: 0 });
  const [scrollbarActive, setScrollbarActive] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const applySize = (width: number, height: number) => {
      const nextWidth = Math.max(1, Math.round(width));
      const nextHeight = Math.max(1, Math.round(height));
      setContainerSize((prev) => {
        if (prev.width === nextWidth && prev.height === nextHeight) return prev;
        return { width: nextWidth, height: nextHeight };
      });
    };

    applySize(container.clientWidth || 800, container.clientHeight || 600);

    if (typeof ResizeObserver === 'undefined') {
      const onResize = () => {
        applySize(container.clientWidth || 800, container.clientHeight || 600);
      };
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      applySize(entry.contentRect.width, entry.contentRect.height);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Compute scrollbar thumb positions.
  // The "virtual canvas" spans a fixed world area (e.g. -50m to +50m = 100m).
  // panOffset is in screen pixels; a larger pan moves the world under the viewport.
  const WORLD_EXTENT = 100; // total world meters the scrollbar represents
  const containerW = containerSize.width;
  const containerH = containerSize.height;
  const ppm = 100 * zoom; // pixels per meter at current zoom
  const totalPxW = WORLD_EXTENT * ppm; // total pixels the world would occupy
  const totalPxH = WORLD_EXTENT * ppm;

  // Thumb size = viewport / total (clamped to 10%–100%)
  const thumbW = Math.max(0.08, Math.min(1, containerW / totalPxW));
  const thumbH = Math.max(0.08, Math.min(1, containerH / totalPxH));

  // Thumb position: panOffset is how many screen pixels the world center is shifted.
  // Center of the virtual world is at panOffset = 0, so the viewport sees the center.
  // panOffset positive = world shifted right/down = we're looking at left/up part of world.
  const thumbX = 0.5 - (panOffset.x / totalPxW) - thumbW / 2;
  const thumbY = 0.5 - (panOffset.y / totalPxH) - thumbH / 2;

  const showScrollbars = effectiveViewMode === 'plan' && zoom > 1.05; // only show for 2D plan zoom/pan

  const handleScrollbarMouseDown = useCallback((axis: 'h' | 'v', e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (axis === 'h') isDraggingScrollbarH.current = true;
    else isDraggingScrollbarV.current = true;
    scrollbarDragStart.current = { x: e.clientX, y: e.clientY };
    const ui = useUIStore.getState();
    scrollbarPanStart.current = { x: ui.panOffset.x, y: ui.panOffset.y };
    setScrollbarActive(true);

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - scrollbarDragStart.current.x;
      const dy = ev.clientY - scrollbarDragStart.current.y;
      if (isDraggingScrollbarH.current) {
        // Dragging scrollbar right means viewport moves right = panOffset decreases
        useUIStore.getState().setPan({
          x: scrollbarPanStart.current.x - (dx / containerW) * totalPxW,
          y: scrollbarPanStart.current.y,
        });
      }
      if (isDraggingScrollbarV.current) {
        useUIStore.getState().setPan({
          x: scrollbarPanStart.current.x,
          y: scrollbarPanStart.current.y - (dy / containerH) * totalPxH,
        });
      }
    };
    const onUp = () => {
      isDraggingScrollbarH.current = false;
      isDraggingScrollbarV.current = false;
      setScrollbarActive(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [totalPxW, totalPxH, containerW, containerH]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div
      ref={containerRef}
      className="flex-1 relative overflow-hidden"
      style={{ background: '#f4f1ec', minWidth: 0 }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block outline-none"
        tabIndex={0}
        style={{ cursor: canvasCursor, touchAction: 'none' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
      />

      {/* Vertical scrollbar (right edge) */}
      {showScrollbars && (
        <div
          style={{
            position: 'absolute',
            right: 2,
            top: 0,
            bottom: 10,
            width: 8,
            pointerEvents: 'auto',
            zIndex: 20,
          }}
          onMouseDown={(e) => {
            // Click on track: jump to position
            const rect = e.currentTarget.getBoundingClientRect();
            const clickRatio = (e.clientY - rect.top) / rect.height;
            const newPanY = (0.5 - clickRatio) * totalPxH;
            useUIStore.getState().setPan({ x: panOffset.x, y: newPanY });
          }}
        >
          <div
            onMouseDown={(e) => handleScrollbarMouseDown('v', e)}
            style={{
              position: 'absolute',
              top: `${Math.max(0, Math.min(1 - thumbH, thumbY)) * 100}%`,
              height: `${thumbH * 100}%`,
              width: '100%',
              minHeight: 20,
              background: scrollbarActive ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.25)',
              borderRadius: 4,
              cursor: 'grab',
              transition: scrollbarActive ? 'none' : 'background 0.15s',
            }}
          />
        </div>
      )}

      {/* Horizontal scrollbar (bottom edge) */}
      {showScrollbars && (
        <div
          style={{
            position: 'absolute',
            bottom: 2,
            left: 0,
            right: 10,
            height: 8,
            pointerEvents: 'auto',
            zIndex: 20,
          }}
          onMouseDown={(e) => {
            // Click on track: jump to position
            const rect = e.currentTarget.getBoundingClientRect();
            const clickRatio = (e.clientX - rect.left) / rect.width;
            const newPanX = (0.5 - clickRatio) * totalPxW;
            useUIStore.getState().setPan({ x: newPanX, y: panOffset.y });
          }}
        >
          <div
            onMouseDown={(e) => handleScrollbarMouseDown('h', e)}
            style={{
              position: 'absolute',
              left: `${Math.max(0, Math.min(1 - thumbW, thumbX)) * 100}%`,
              width: `${thumbW * 100}%`,
              height: '100%',
              minWidth: 20,
              background: scrollbarActive ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.25)',
              borderRadius: 4,
              cursor: 'grab',
              transition: scrollbarActive ? 'none' : 'background 0.15s',
            }}
          />
        </div>
      )}
    </div>
  );
}


