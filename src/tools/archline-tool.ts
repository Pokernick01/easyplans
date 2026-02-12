import type { Point } from '@/types/geometry';
import type { BaseTool } from './base-tool';
import { useProjectStore } from '@/store/project-store';
import { useUIStore } from '@/store/ui-store';
import { findBestSnap } from '@/engine/math/snap';
import { distance } from '@/engine/math/vector';
import { SNAP_THRESHOLD } from '@/utils/constants';

// ---------------------------------------------------------------------------
// Default line weights per style (meters, used for rendering)
// ---------------------------------------------------------------------------

const DEFAULT_LINE_WEIGHTS: Record<string, number> = {
  colindancia: 3,
  'limite-lote': 2.5,
  eje: 1,
  setback: 1.5,
  center: 1,
};

// ---------------------------------------------------------------------------
// ArchLineTool
// ---------------------------------------------------------------------------

/**
 * Architectural line tool for drawing different line types used in
 * Mexican / Latin American architectural plans (colindancias, ejes, etc.).
 *
 * Click once to set the start point, move the cursor to preview the
 * line, then click again to place it.  Press Escape to cancel.
 */
export class ArchLineTool implements BaseTool {
  readonly name = 'archline';
  readonly cursor = 'crosshair';

  /** Anchor point of the line being drawn, or null when idle. */
  private startPoint: Point | null = null;

  /** Live end-point (follows the snapped cursor). */
  private currentEnd: Point | null = null;

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

    if (this.startPoint === null) {
      // First click: set the anchor
      this.startPoint = snapped;
      this.currentEnd = snapped;
      useUIStore.getState().setToolState('drawing');
    } else {
      // Second click: commit line
      const len = distance(this.startPoint, snapped);

      if (len > 0.01) {
        this.commitArchLine(this.startPoint, snapped);
      }

      this.reset();
      useUIStore.getState().setToolState('idle');
    }
  }

  onMouseMove(worldPos: Point, _screenPos: Point, _event: MouseEvent): void {
    if (this.startPoint !== null) {
      this.currentEnd = this.snap(worldPos);
    }
  }

  onMouseUp(_worldPos: Point, _screenPos: Point, _event: MouseEvent): void {
    // Click-click workflow; nothing on mouse-up.
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
    if (this.startPoint && this.currentEnd) {
      const ui = useUIStore.getState();
      return {
        type: 'archline',
        data: {
          start: this.startPoint,
          end: this.currentEnd,
          lineStyle: ui.activeArchLineStyle,
        },
      };
    }
    return null;
  }

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  private reset(): void {
    this.startPoint = null;
    this.currentEnd = null;
  }

  /** Snap to grid. */
  private snap(worldPos: Point): Point {
    const ui = useUIStore.getState();

    if (!ui.snapEnabled) return worldPos;

    const result = findBestSnap(worldPos, {
      gridSize: ui.gridSize,
      targets: [],
      threshold: SNAP_THRESHOLD * 0.01,
    });

    return result.point;
  }

  /** Add an architectural line to the project store. */
  private commitArchLine(start: Point, end: Point): void {
    const project = useProjectStore.getState();
    const ui = useUIStore.getState();
    const floorIndex = project.project.activeFloorIndex;
    const lineStyle = ui.activeArchLineStyle;
    const lineWeight = DEFAULT_LINE_WEIGHTS[lineStyle] ?? 2;

    project.addArchLine({
      floorIndex,
      locked: false,
      visible: true,
      start: { x: start.x, y: start.y },
      end: { x: end.x, y: end.y },
      lineStyle,
      lineWeight,
    });

    ui.markDirty();
  }
}
