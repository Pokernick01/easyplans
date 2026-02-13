import { useRef, useEffect, useCallback } from 'react';
import type { MouseEvent as ReactMouseEvent, WheelEvent as ReactWheelEvent, KeyboardEvent as ReactKeyboardEvent, TouchEvent as ReactTouchEvent } from 'react';
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
} from '@/store/selectors.ts';
import type { ArchLineStyle, StairStyle, AnyElement, FillPattern, WallFillPattern } from '@/types/elements.ts';
import { roomPatternFns, wallPatternFns } from '@/renderer/layers/pattern-library.ts';
import { stampRegistry } from '@/library/index.ts';
import { toolManager } from '@/tools/tool-manager.ts';
import { t } from '@/utils/i18n.ts';
import { generateCrossSection } from '@/engine/views/cross-section.ts';
import { generateFacade } from '@/engine/views/facade.ts';
import { generateIsometricView } from '@/engine/views/isometric.ts';
import { renderCrossSection } from '@/renderer/view-renderers/cross-section-renderer.ts';
import { renderFacade } from '@/renderer/view-renderers/facade-renderer.ts';
import { drawNeufertElevation, classifyStamp, elevationHeight, elevationWidth } from '@/engine/views/neufert-elevation.ts';
import type { ViewMode } from '@/types/project.ts';

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
// Architectural line dash patterns & weights (in world meters)
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

  // Track isometric rotation drag
  const isIsoRotating = useRef(false);
  const lastIsoRotateX = useRef(0);

  // Touch support
  const touchCount = useRef(0);
  const lastTouchPos = useRef({ x: 0, y: 0 });
  const lastPinchDist = useRef(0);
  const isTouchDrawing = useRef(false);

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
    const viewMode = uiState.viewMode as ViewMode;

    // ===================================================================
    // Non-plan view modes (Section / Facade / Isometric)
    // ===================================================================
    if (viewMode !== 'plan') {
      const floorHeight = floor.height || 3.0;

      if (viewMode === 'section') {
        // Cross-section view — use dedicated renderer for detailed output
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const w of walls) {
          for (const p of [w.start, w.end]) {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
          }
        }
        if (minX === Infinity) { minX = -5; maxX = 5; minY = -5; maxY = 5; }
        const cutY = (minY + maxY) / 2;
        const cutLine = { start: { x: minX - 1, y: cutY }, end: { x: maxX + 1, y: cutY } };
        const sectionElements = generateCrossSection(cutLine, walls, doors, windows, floorHeight);

        // Reset transform and use the dedicated screen-space renderer
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        renderCrossSection(ctx, width, height, sectionElements, camera.getPixelsPerMeter(), furniture, cutY);
        camera.applyTransform(ctx);
      }

      if (viewMode === 'facade') {
        // Facade / elevation view — use dedicated renderer for detailed output
        const facadeElements = generateFacade('north', walls, doors, windows, floorHeight, furniture);

        // Reset transform and use the dedicated screen-space renderer
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        renderFacade(ctx, width, height, facadeElements, camera.getPixelsPerMeter(), 'Norte');
        camera.applyTransform(ctx);
      }

      if (viewMode === 'isometric') {
        // 3D Isometric view
        const isoRotation = uiState.isoRotation ?? 45;
        const isoFaces = generateIsometricView(walls, doors, windows, rooms, floorHeight, isoRotation, furniture);

        for (const face of isoFaces) {
          if (face.points.length < 3) continue;
          ctx.beginPath();
          ctx.moveTo(face.points[0].x, -face.points[0].y);
          for (let i = 1; i < face.points.length; i++) {
            ctx.lineTo(face.points[i].x, -face.points[i].y);
          }
          ctx.closePath();

          ctx.fillStyle = face.color;
          ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,0.3)';
          ctx.lineWidth = 0.01;
          ctx.stroke();
        }

        // Isometric title
        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = '#666';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`VISTA ISOM\u00c9TRICA 3D  \u2022  ${Math.round(isoRotation)}\u00b0`, width / 2, 30);
        // Drag hint
        ctx.fillStyle = '#999';
        ctx.font = '11px sans-serif';
        ctx.fillText('Arrastra para rotar', width / 2, 48);
        ctx.restore();
        camera.applyTransform(ctx);
      }

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
          const rpx = 1 / camera.getPixelsPerMeter();
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
        ctx.fillText(`${room.area.toFixed(1)} m\u00B2`, cx, cy + 0.2);
        ctx.restore();
      }
    }

    // ----- Drag offset for live preview -----
    const selectedIds = new Set(uiState.selectedIds);
    let dragDx = 0;
    let dragDy = 0;
    const preview = toolManager.getPreview();
    if (preview && preview.type === 'move-ghost') {
      const ghostData = preview.data as { delta: { x: number; y: number }; ids: string[] };
      dragDx = ghostData.delta.x;
      dragDy = ghostData.delta.y;
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
            const wpx = 1 / camera.getPixelsPerMeter();
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

      if (doorStyle === 'single') {
        // Single door: leaf line + swing arc using openAngle
        const openRad = (door.openAngle * Math.PI) / 180;
        // Leaf line (door panel)
        ctx.beginPath();
        ctx.moveTo(hingeX, 0);
        ctx.lineTo(hingeX, swingDir * door.width);
        ctx.stroke();

        // Swing arc
        ctx.beginPath();
        if (door.hinge === 'end') {
          const base = swingDir > 0 ? Math.PI / 2 : -Math.PI / 2;
          const start = Math.PI - base;
          const end = start + swingDir * openRad;
          ctx.arc(hingeX, 0, door.width, start, end, swingDir < 0);
        } else {
          const start = swingDir > 0 ? -Math.PI / 2 : Math.PI / 2;
          const end = start + swingDir * openRad;
          ctx.arc(hingeX, 0, door.width, start, end, swingDir < 0);
        }
        ctx.stroke();
      } else if (doorStyle === 'double') {
        // Double door: two leaves opening from center, using openAngle
        const halfW = door.width / 2;
        const openRad = (door.openAngle * Math.PI) / 180;
        // Left leaf
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, swingDir * halfW);
        ctx.stroke();
        ctx.beginPath();
        {
          const start = swingDir > 0 ? -Math.PI / 2 : Math.PI / 2;
          const end = start + swingDir * openRad;
          ctx.arc(0, 0, halfW, start, end, swingDir < 0);
        }
        ctx.stroke();
        // Right leaf (mirrored)
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -swingDir * halfW);
        ctx.stroke();
        ctx.beginPath();
        {
          const start = -swingDir > 0 ? -Math.PI / 2 : Math.PI / 2;
          const end = start + (-swingDir) * openRad;
          ctx.arc(0, 0, halfW, start, end, -swingDir < 0);
        }
        ctx.stroke();
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
        // Single pane: 3 parallel lines
        for (const offset of [-t * 0.6, 0, t * 0.6]) {
          ctx.beginPath();
          ctx.moveTo(-win.width / 2, offset);
          ctx.lineTo(win.width / 2, offset);
          ctx.stroke();
        }
      } else if (windowStyle === 'double') {
        // Double pane: 3 lines + center divider
        for (const offset of [-t * 0.6, 0, t * 0.6]) {
          ctx.beginPath();
          ctx.moveTo(-win.width / 2, offset);
          ctx.lineTo(win.width / 2, offset);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(0, -t * 0.6);
        ctx.lineTo(0, t * 0.6);
        ctx.stroke();
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
        // Casement window: frame + triangle showing opening direction
        for (const offset of [-t * 0.6, 0, t * 0.6]) {
          ctx.beginPath();
          ctx.moveTo(-win.width / 2, offset);
          ctx.lineTo(win.width / 2, offset);
          ctx.stroke();
        }
        // Opening indicator triangle
        ctx.beginPath();
        ctx.moveTo(-win.width / 2, -t * 0.6);
        ctx.lineTo(0, -t * 0.6 - t * 0.8);
        ctx.lineTo(win.width / 2, -t * 0.6);
        ctx.stroke();
      } else if (windowStyle === 'awning') {
        // Awning window: frame + triangle at bottom
        for (const offset of [-t * 0.6, 0, t * 0.6]) {
          ctx.beginPath();
          ctx.moveTo(-win.width / 2, offset);
          ctx.lineTo(win.width / 2, offset);
          ctx.stroke();
        }
        // Opening indicator triangle at bottom
        ctx.beginPath();
        ctx.moveTo(-win.width / 2, t * 0.6);
        ctx.lineTo(0, t * 0.6 + t * 0.8);
        ctx.lineTo(win.width / 2, t * 0.6);
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
        // Outline
        ctx.strokeRect(0, 0, w, l);
        // Tread lines
        const treadDepth = l / treads;
        for (let i = 1; i < treads; i++) {
          const y = i * treadDepth;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
        // Direction arrow
        ctx.beginPath();
        ctx.moveTo(w / 2, l * 0.8);
        ctx.lineTo(w / 2, l * 0.15);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(w / 2 - 0.08, l * 0.25);
        ctx.lineTo(w / 2, l * 0.15);
        ctx.lineTo(w / 2 + 0.08, l * 0.25);
        ctx.stroke();
        // "UP" / "DN" label
        ctx.fillStyle = isSelected ? '#2d6a4f' : '#000000';
        const fontSize = Math.min(w, l) * 0.12;
        ctx.font = `${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(stair.direction === 'up' ? t('stair.up') : t('stair.down'), w / 2, l * 0.9);
      } else if (style === 'l-shaped') {
        const land = stair.landingDepth;
        const halfTreads = Math.floor(treads / 2);
        const run1 = l - land;
        const treadDepth = run1 / halfTreads;
        // First run
        ctx.strokeRect(0, 0, w, run1);
        for (let i = 1; i < halfTreads; i++) {
          const y = i * treadDepth;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
        // Landing
        ctx.strokeRect(0, run1, w + land, land);
        // Second run (turns right)
        const run2W = land;
        const run2L = w;
        const tread2Depth = run2L / (treads - halfTreads);
        ctx.strokeRect(w, 0, run2W, run2L);
        for (let i = 1; i < treads - halfTreads; i++) {
          const y = run2L - i * tread2Depth;
          ctx.beginPath();
          ctx.moveTo(w, y);
          ctx.lineTo(w + run2W, y);
          ctx.stroke();
        }
        // Arrow
        ctx.beginPath();
        ctx.moveTo(w / 2, run1 - 0.05);
        ctx.lineTo(w / 2, 0.15);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(w / 2 - 0.06, 0.25);
        ctx.lineTo(w / 2, 0.15);
        ctx.lineTo(w / 2 + 0.06, 0.25);
        ctx.stroke();
      } else if (style === 'u-shaped') {
        const land = stair.landingDepth;
        const halfTreads = Math.floor(treads / 2);
        const halfW = w / 2;
        const run1 = l - land;
        const treadDepth = run1 / halfTreads;
        // First run (left half)
        ctx.strokeRect(0, 0, halfW, run1);
        for (let i = 1; i < halfTreads; i++) {
          const y = i * treadDepth;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(halfW, y);
          ctx.stroke();
        }
        // Landing
        ctx.strokeRect(0, run1, w, land);
        // Second run (right half, going back)
        ctx.strokeRect(halfW, 0, halfW, run1);
        for (let i = 1; i < treads - halfTreads; i++) {
          const y = run1 - i * treadDepth;
          ctx.beginPath();
          ctx.moveTo(halfW, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
        // Divider
        ctx.beginPath();
        ctx.moveTo(halfW, 0);
        ctx.lineTo(halfW, run1);
        ctx.stroke();
      } else if (style === 'spiral') {
        const cx = w / 2;
        const cy = l / 2;
        const outerR = Math.min(w, l) / 2;
        const innerR = outerR * 0.2;
        // Outer circle
        ctx.beginPath();
        ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
        ctx.stroke();
        // Inner circle (column)
        ctx.beginPath();
        ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
        ctx.stroke();
        // Radial tread lines
        for (let i = 0; i < treads; i++) {
          const a = (Math.PI * 2 * i) / treads;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * innerR, cy + Math.sin(a) * innerR);
          ctx.lineTo(cx + Math.cos(a) * outerR, cy + Math.sin(a) * outerR);
          ctx.stroke();
        }
      } else if (style === 'winder') {
        // Straight run with pie-shaped winder treads at the turn
        const straightTreads = Math.max(2, treads - 3);
        const straightLen = l * 0.7;
        const treadDepth = straightLen / straightTreads;
        // Straight portion
        ctx.strokeRect(0, 0, w, straightLen);
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
        ctx.strokeRect(0, winderY, w, winderH);
        for (let i = 1; i <= 2; i++) {
          const frac = i / 3;
          ctx.beginPath();
          ctx.moveTo(0, winderY);
          ctx.lineTo(w * frac, winderY + winderH);
          ctx.stroke();
        }
      } else if (style === 'curved') {
        // Curved stair: arc with radial treads
        const cx = w;
        const cy = l / 2;
        const outerR = Math.min(w, l / 2);
        const innerR = outerR * 0.4;
        // Outer arc (half circle from top to bottom on left side)
        ctx.beginPath();
        ctx.arc(cx, cy, outerR, Math.PI / 2, Math.PI * 1.5);
        ctx.stroke();
        // Inner arc
        ctx.beginPath();
        ctx.arc(cx, cy, innerR, Math.PI / 2, Math.PI * 1.5);
        ctx.stroke();
        // Radial tread lines
        for (let i = 0; i <= treads; i++) {
          const a = Math.PI / 2 + (Math.PI * i) / treads;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * innerR, cy + Math.sin(a) * innerR);
          ctx.lineTo(cx + Math.cos(a) * outerR, cy + Math.sin(a) * outerR);
          ctx.stroke();
        }
      }

      ctx.restore(); // restore from flip + rotate + translate

      // Selection highlight + resize handles (drawn in world space, not flipped)
      if (isSelected) {
        ctx.save();
        ctx.translate(stairPx + sDx, stairPy + sDy);
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
    if (uiState.showDimensions) {
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
        const ppm = camera.getPixelsPerMeter();
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
        ctx.fillText(`${length.toFixed(2)} m`, 0, -3);
        ctx.restore();

        if (isSelected && (dragDx !== 0 || dragDy !== 0)) {
          ctx.restore();
        }
      }
    }

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
          ctx.fillText(`${len.toFixed(2)} m`, 0, -(wd.thickness / 2 + 0.03) * ppmW);
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
          ctx.fillText(`${dLen.toFixed(2)} m`, 0, -3);
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

    // ----- Snap indicator -----
    if (viewMode === 'plan' && uiState.snapEnabled && uiState.toolState !== 'idle') {
      const cursorWP = uiState.cursorWorldPos;
      // Gather wall endpoints as snap targets
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

      if (snapType) {
        ctx.save();
        if (snapType === 'endpoint') {
          const s = 0.06;
          ctx.fillStyle = 'rgba(184,92,56,0.9)';
          ctx.beginPath();
          ctx.moveTo(snapPt.x, snapPt.y - s);
          ctx.lineTo(snapPt.x + s, snapPt.y);
          ctx.lineTo(snapPt.x, snapPt.y + s);
          ctx.lineTo(snapPt.x - s, snapPt.y);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = 'rgba(184,92,56,0.5)';
          ctx.lineWidth = 0.005;
          ctx.beginPath();
          ctx.moveTo(snapPt.x - s * 2, snapPt.y);
          ctx.lineTo(snapPt.x + s * 2, snapPt.y);
          ctx.moveTo(snapPt.x, snapPt.y - s * 2);
          ctx.lineTo(snapPt.x, snapPt.y + s * 2);
          ctx.stroke();
        } else {
          ctx.fillStyle = 'rgba(79,195,247,0.7)';
          ctx.beginPath();
          ctx.arc(snapPt.x, snapPt.y, 0.04, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
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

    // In isometric mode, left-click drag rotates the 3D view
    const viewMode = useUIStore.getState().viewMode;
    if (viewMode === 'isometric' && e.button === 0) {
      isIsoRotating.current = true;
      lastIsoRotateX.current = e.clientX;
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

    // Isometric rotation drag
    if (isIsoRotating.current) {
      const dx = e.clientX - lastIsoRotateX.current;
      lastIsoRotateX.current = e.clientX;
      const ui = useUIStore.getState();
      // 1 pixel = 0.5 degrees of rotation
      ui.setIsoRotation(ui.isoRotation + dx * 0.5);
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
    const uiState = useUIStore.getState();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = uiState.zoom * factor;
    useUIStore.getState().setZoom(newZoom);
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

  const handleTouchStart = useCallback((e: ReactTouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const touches = e.touches;
    touchCount.current = touches.length;

    if (touches.length === 2) {
      // Two-finger: start pan + pinch zoom
      isTouchDrawing.current = false;
      const mx = (touches[0].clientX + touches[1].clientX) / 2;
      const my = (touches[0].clientY + touches[1].clientY) / 2;
      lastTouchPos.current = { x: mx, y: my };
      const dx = touches[1].clientX - touches[0].clientX;
      const dy = touches[1].clientY - touches[0].clientY;
      lastPinchDist.current = Math.hypot(dx, dy);
    } else if (touches.length === 1) {
      // One finger: use current tool (like mouse click)
      isTouchDrawing.current = true;
      lastTouchPos.current = { x: touches[0].clientX, y: touches[0].clientY };
      const worldPos = getTouchWorldPos(touches[0]);
      useUIStore.getState().setCursorPos(worldPos);
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const screenPos = { x: touches[0].clientX - rect.left, y: touches[0].clientY - rect.top };
        toolManager.onMouseDown(worldPos, screenPos, e.nativeEvent as unknown as MouseEvent);
      }
    }
  }, [getTouchWorldPos]);

  const handleTouchMove = useCallback((e: ReactTouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const touches = e.touches;

    if (touches.length === 2) {
      // Two-finger: pan + pinch zoom
      const mx = (touches[0].clientX + touches[1].clientX) / 2;
      const my = (touches[0].clientY + touches[1].clientY) / 2;
      const dx = mx - lastTouchPos.current.x;
      const dy = my - lastTouchPos.current.y;
      lastTouchPos.current = { x: mx, y: my };
      useUIStore.getState().panBy(dx, dy);

      // Pinch zoom
      const pinchDx = touches[1].clientX - touches[0].clientX;
      const pinchDy = touches[1].clientY - touches[0].clientY;
      const dist = Math.hypot(pinchDx, pinchDy);
      if (lastPinchDist.current > 0) {
        const scale = dist / lastPinchDist.current;
        const ui = useUIStore.getState();
        ui.setZoom(ui.zoom * scale);
      }
      lastPinchDist.current = dist;
      useUIStore.getState().markDirty();
    } else if (touches.length === 1 && isTouchDrawing.current) {
      // One finger: move with current tool
      const worldPos = getTouchWorldPos(touches[0]);
      useUIStore.getState().setCursorPos(worldPos);
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const screenPos = { x: touches[0].clientX - rect.left, y: touches[0].clientY - rect.top };
        toolManager.onMouseMove(worldPos, screenPos, e.nativeEvent as unknown as MouseEvent);
      }
      useUIStore.getState().markDirty();
    }
  }, [getTouchWorldPos]);

  const handleTouchEnd = useCallback((e: ReactTouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (isTouchDrawing.current && e.changedTouches.length > 0) {
      const touch = e.changedTouches[0];
      const worldPos = getTouchWorldPos(touch);
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const screenPos = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
        toolManager.onMouseUp(worldPos, screenPos, e.nativeEvent as unknown as MouseEvent);
      }
    }
    isTouchDrawing.current = false;
    touchCount.current = e.touches.length;
    lastPinchDist.current = 0;
  }, [getTouchWorldPos]);

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
      const validTypes = new Set(['wall', 'door', 'window', 'room', 'furniture', 'text', 'dimension', 'archline', 'stair']);
      parsed = parsed.filter((el) => el != null && typeof el === 'object' && validTypes.has((el as Record<string, unknown>).type as string));
      if (parsed.length === 0) return;
      const store = useProjectStore.getState();
      const newIds: string[] = [];
      for (const el of parsed) {
        const { id: _id, type, ...rest } = el as AnyElement & Record<string, unknown>;
        switch (type) {
          case 'wall': {
            const w = rest as Record<string, unknown>;
            const start = w.start as { x: number; y: number };
            const end = w.end as { x: number; y: number };
            w.start = { x: start.x + 0.5, y: start.y + 0.5 };
            w.end = { x: end.x + 0.5, y: end.y + 0.5 };
            newIds.push(store.addWall(w as Omit<import('@/types/elements.ts').Wall, 'id' | 'type'>));
            break;
          }
          case 'door': {
            newIds.push(store.addDoor(rest as Omit<import('@/types/elements.ts').Door, 'id' | 'type'>));
            break;
          }
          case 'window': {
            newIds.push(store.addWindow(rest as Omit<import('@/types/elements.ts').Window, 'id' | 'type'>));
            break;
          }
          case 'room': {
            const r = rest as Record<string, unknown>;
            const polygon = r.polygon as { x: number; y: number }[];
            r.polygon = polygon.map((p) => ({ x: p.x + 0.5, y: p.y + 0.5 }));
            newIds.push(store.addRoom(r as Omit<import('@/types/elements.ts').Room, 'id' | 'type'>));
            break;
          }
          case 'furniture': {
            const f = rest as Record<string, unknown>;
            const pos = f.position as { x: number; y: number };
            f.position = { x: pos.x + 0.5, y: pos.y + 0.5 };
            newIds.push(store.addFurniture(f as Omit<import('@/types/elements.ts').FurnitureItem, 'id' | 'type'>));
            break;
          }
          case 'text': {
            const t = rest as Record<string, unknown>;
            const tPos = t.position as { x: number; y: number };
            t.position = { x: tPos.x + 0.5, y: tPos.y + 0.5 };
            newIds.push(store.addText(t as Omit<import('@/types/elements.ts').TextLabel, 'id' | 'type'>));
            break;
          }
          case 'dimension': {
            const d = rest as Record<string, unknown>;
            const dStart = d.start as { x: number; y: number };
            const dEnd = d.end as { x: number; y: number };
            d.start = { x: dStart.x + 0.5, y: dStart.y + 0.5 };
            d.end = { x: dEnd.x + 0.5, y: dEnd.y + 0.5 };
            newIds.push(store.addDimension(d as Omit<import('@/types/elements.ts').DimensionLine, 'id' | 'type'>));
            break;
          }
          case 'archline': {
            const a = rest as Record<string, unknown>;
            const aStart = a.start as { x: number; y: number };
            const aEnd = a.end as { x: number; y: number };
            a.start = { x: aStart.x + 0.5, y: aStart.y + 0.5 };
            a.end = { x: aEnd.x + 0.5, y: aEnd.y + 0.5 };
            newIds.push(store.addArchLine(a as Omit<import('@/types/elements.ts').ArchLine, 'id' | 'type'>));
            break;
          }
          case 'stair': {
            const s = rest as Record<string, unknown>;
            const sPos = s.position as { x: number; y: number };
            s.position = { x: sPos.x + 0.5, y: sPos.y + 0.5 };
            newIds.push(store.addStair(s as Omit<import('@/types/elements.ts').Stair, 'id' | 'type'>));
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
  };
  const canvasCursor = viewMode === 'isometric' ? 'grab' : (cursorMap[activeTool] ?? 'default');

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
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      />
    </div>
  );
}
