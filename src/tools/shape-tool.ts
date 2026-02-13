import type { Point } from '@/types/geometry';
import type { BaseTool } from './base-tool';
import { useProjectStore } from '@/store/project-store';
import { useUIStore } from '@/store/ui-store';
import { snapToGrid } from '@/engine/math/snap';

// ---------------------------------------------------------------------------
// ShapeTool
// ---------------------------------------------------------------------------

/**
 * Shape drawing tool.
 *
 * Click-drag to define the bounding box of the shape.  A simple click (no
 * drag) places a default 1 m × 1 m shape.  Hold Shift while dragging to
 * constrain to equal proportions (square / perfect circle).
 *
 * The active shape kind (rectangle / circle / triangle) is read from the UI
 * store and can be changed via the sub-menu in the left sidebar.
 */
export class ShapeTool implements BaseTool {
  readonly name = 'shape';
  readonly cursor = 'crosshair';

  private startPos: Point | null = null;
  private currentPos: Point | null = null;
  private isDragging = false;
  private shiftHeld = false;

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  onActivate(): void {
    this.reset();
    useUIStore.getState().setToolState('idle');
  }

  onDeactivate(): void {
    this.reset();
  }

  // -----------------------------------------------------------------------
  // Mouse events
  // -----------------------------------------------------------------------

  onMouseDown(worldPos: Point, _screenPos: Point, _event: MouseEvent): void {
    const snapped = this.snap(worldPos);
    this.startPos = snapped;
    this.currentPos = snapped;
    this.isDragging = true;
    useUIStore.getState().setToolState('drawing');
  }

  onMouseMove(worldPos: Point, _screenPos: Point, _event: MouseEvent): void {
    if (!this.isDragging) return;
    this.currentPos = this.snap(worldPos);
  }

  onMouseUp(worldPos: Point, _screenPos: Point, event: MouseEvent): void {
    if (!this.isDragging || !this.startPos) return;

    const endPos = this.snap(worldPos);
    this.shiftHeld = event.shiftKey;

    let width = Math.abs(endPos.x - this.startPos.x);
    let height = Math.abs(endPos.y - this.startPos.y);

    const MIN_SIZE = 0.1;
    const isClick = width < MIN_SIZE && height < MIN_SIZE;

    if (isClick) {
      width = 1.0;
      height = 1.0;
    } else {
      width = Math.max(width, MIN_SIZE);
      height = Math.max(height, MIN_SIZE);
    }

    // Shift → equal proportions
    if (event.shiftKey && !isClick) {
      const maxDim = Math.max(width, height);
      width = maxDim;
      height = maxDim;
    }

    const position = isClick
      ? this.startPos
      : {
          x: (this.startPos.x + endPos.x) / 2,
          y: (this.startPos.y + endPos.y) / 2,
        };

    const project = useProjectStore.getState();
    const ui = useUIStore.getState();
    const floorIndex = project.project.activeFloorIndex;
    const defaults = ui.shapeDefaults;

    const id = project.addShape({
      floorIndex,
      locked: false,
      visible: true,
      position,
      width,
      height,
      shapeKind: ui.activeShapeKind,
      rotation: 0,
      filled: defaults.filled,
      fillColor: defaults.fillColor,
      strokeColor: defaults.strokeColor,
      strokeWidth: defaults.strokeWidth,
    });

    ui.select([id]);
    ui.markDirty();
    this.reset();
    ui.setToolState('idle');
  }

  // -----------------------------------------------------------------------
  // Keyboard
  // -----------------------------------------------------------------------

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.reset();
      useUIStore.getState().setToolState('idle');
    }
  }

  // -----------------------------------------------------------------------
  // Preview
  // -----------------------------------------------------------------------

  getPreview(): { type: string; data: unknown } | null {
    if (!this.isDragging || !this.startPos || !this.currentPos) return null;
    const ui = useUIStore.getState();
    return {
      type: 'shape',
      data: {
        start: this.startPos,
        end: this.currentPos,
        shapeKind: ui.activeShapeKind,
        filled: ui.shapeDefaults.filled,
        fillColor: ui.shapeDefaults.fillColor,
        strokeColor: ui.shapeDefaults.strokeColor,
      },
    };
  }

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  private reset(): void {
    this.startPos = null;
    this.currentPos = null;
    this.isDragging = false;
    this.shiftHeld = false;
  }

  private snap(worldPos: Point): Point {
    const ui = useUIStore.getState();
    if (!ui.snapEnabled) return worldPos;
    return snapToGrid(worldPos, ui.gridSize).point;
  }
}
