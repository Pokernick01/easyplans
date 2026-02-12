import type { Point } from '@/types/geometry';
import type { BaseTool } from './base-tool';
import { useProjectStore } from '@/store/project-store';
import { useUIStore } from '@/store/ui-store';
import { findBestSnap } from '@/engine/math/snap';
import { distance } from '@/engine/math/vector';
import { SNAP_THRESHOLD } from '@/utils/constants';

/** Default perpendicular offset of the dimension line from the measured segment. */
const DIMENSION_OFFSET = 0.3; // meters

// ---------------------------------------------------------------------------
// DimensionTool
// ---------------------------------------------------------------------------

/**
 * Manual dimension line tool.
 *
 * Click once to set the start point, move the cursor to preview the
 * dimension line, then click again to place it.  Press Escape to cancel.
 */
export class DimensionTool implements BaseTool {
  readonly name = 'dimension';
  readonly cursor = 'crosshair';

  /** Anchor point of the dimension being drawn, or null when idle. */
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
      // Second click: commit dimension
      const len = distance(this.startPoint, snapped);

      if (len > 0.01) {
        this.commitDimension(this.startPoint, snapped);
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
      return {
        type: 'dimension',
        data: {
          start: this.startPoint,
          end: this.currentEnd,
          offset: DIMENSION_OFFSET,
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

  /** Snap to grid (no angle origin for dimension lines). */
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

  /** Add a dimension line to the project store. */
  private commitDimension(start: Point, end: Point): void {
    const project = useProjectStore.getState();
    const ui = useUIStore.getState();
    const floorIndex = project.project.activeFloorIndex;

    project.addDimension({
      floorIndex,
      locked: false,
      visible: true,
      start: { x: start.x, y: start.y },
      end: { x: end.x, y: end.y },
      offset: DIMENSION_OFFSET,
      auto: false,
    });

    ui.markDirty();
  }
}
