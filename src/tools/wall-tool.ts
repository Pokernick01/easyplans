import type { Point } from '@/types/geometry';
import type { AnyElement } from '@/types/elements';
import type { BaseTool } from './base-tool';
import { useProjectStore } from '@/store/project-store';
import { useUIStore } from '@/store/ui-store';
import { findBestSnap } from '@/engine/math/snap';
import { distance } from '@/engine/math/vector';
import {
  DEFAULT_WALL_THICKNESS,
  DEFAULT_WALL_HEIGHT,
  SNAP_THRESHOLD,
  MIN_WALL_LENGTH,
} from '@/utils/constants';

// ---------------------------------------------------------------------------
// WallTool
// ---------------------------------------------------------------------------

/**
 * Wall drawing tool.
 *
 * Click to set the start point, move to preview the wall, click again to
 * commit it.  Hold Shift on the second click to continue drawing from the
 * new end-point (chain mode).  Press Escape to cancel.
 */
export class WallTool implements BaseTool {
  readonly name = 'wall';
  readonly cursor = 'crosshair';

  /** Anchor point of the wall currently being drawn, or null when idle. */
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

  onMouseDown(worldPos: Point, _screenPos: Point, event: MouseEvent): void {
    const snapped = this.snap(worldPos, this.startPoint);

    if (this.startPoint === null) {
      // First click: set the anchor
      this.startPoint = snapped;
      this.currentEnd = snapped;
      useUIStore.getState().setToolState('drawing');
    } else {
      // Second click: commit wall
      const wallLength = distance(this.startPoint, snapped);

      if (wallLength >= MIN_WALL_LENGTH) {
        this.commitWall(this.startPoint, snapped);
      }

      if (event.shiftKey) {
        // Chain mode: continue from the new end-point
        this.startPoint = snapped;
        this.currentEnd = snapped;
      } else {
        this.reset();
        useUIStore.getState().setToolState('idle');
      }
    }
  }

  onMouseMove(worldPos: Point, _screenPos: Point, _event: MouseEvent): void {
    if (this.startPoint !== null) {
      this.currentEnd = this.snap(worldPos, this.startPoint);
    }
  }

  onMouseUp(_worldPos: Point, _screenPos: Point, _event: MouseEvent): void {
    // Wall placement is click-click, not click-drag.
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
        type: 'wall',
        data: {
          start: this.startPoint,
          end: this.currentEnd,
          thickness: useUIStore.getState().wallDefaults.thickness,
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

  /**
   * Snap a raw cursor position using the project-wide snap settings.
   *
   * Priority:
   * 1. Existing wall endpoints (within SNAP_THRESHOLD)
   * 2. Angle constraint from `angleOrigin` (0/45/90 degrees)
   * 3. Grid snap
   */
  private snap(worldPos: Point, angleOrigin: Point | null): Point {
    const ui = useUIStore.getState();

    if (!ui.snapEnabled) return worldPos;

    const targets = this.getWallEndpoints();

    const result = findBestSnap(worldPos, {
      gridSize: ui.gridSize,
      angleOrigin: angleOrigin ?? undefined,
      targets,
      threshold: SNAP_THRESHOLD * 0.01, // Convert px-ish threshold to meters
    });

    return result.point;
  }

  /** Collect all wall start/end points on the active floor. */
  private getWallEndpoints(): Point[] {
    const project = useProjectStore.getState();
    const floorIndex = project.project.activeFloorIndex;
    const floor = project.project.floors[floorIndex];
    const elements: AnyElement[] = floor ? Object.values(floor.elements) : [];

    const points: Point[] = [];

    for (const el of elements) {
      if (el.type === 'wall') {
        points.push(el.start, el.end);
      }
    }

    return points;
  }

  /** Add a wall segment to the project store, using persistent wall defaults. */
  private commitWall(start: Point, end: Point): void {
    const project = useProjectStore.getState();
    const ui = useUIStore.getState();
    const floorIndex = project.project.activeFloorIndex;
    const wd = ui.wallDefaults;

    project.addWall({
      floorIndex,
      locked: false,
      visible: true,
      start: { x: start.x, y: start.y },
      end: { x: end.x, y: end.y },
      thickness: wd.thickness,
      height: wd.height,
      openings: [],
      color: wd.color,
      fillColor: wd.fillColor,
      fillPattern: wd.fillPattern,
    });

    ui.markDirty();
  }
}
