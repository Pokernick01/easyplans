import type { Point } from '@/types/geometry';
import type { BaseTool } from './base-tool';
import { useProjectStore } from '@/store/project-store';
import { useUIStore } from '@/store/ui-store';
import { findBestSnap } from '@/engine/math/snap';
import { getStampById } from '@/library/index';
import { SNAP_THRESHOLD } from '@/utils/constants';

// ---------------------------------------------------------------------------
// StampTool
// ---------------------------------------------------------------------------

/**
 * Furniture stamp placement tool.
 *
 * The active stamp is determined by `activeStampId` in the UI store.
 * Move the cursor to preview the stamp (snapped to grid), click to place
 * it.  Press R to rotate 90 degrees.
 */
export class StampTool implements BaseTool {
  readonly name = 'stamp';
  readonly cursor = 'crosshair';

  /** Current rotation in degrees (incremented by 90 on R key). */
  private rotation = 0;

  /** Current snapped preview position. */
  private previewPos: Point | null = null;

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  onActivate(): void {
    this.rotation = 0;
    this.previewPos = null;
    useUIStore.getState().setToolState('placing');
  }

  onDeactivate(): void {
    this.previewPos = null;
  }

  // -----------------------------------------------------------------------
  // Mouse events
  // -----------------------------------------------------------------------

  onMouseDown(worldPos: Point, _screenPos: Point, _event: MouseEvent): void {
    const ui = useUIStore.getState();
    const stampId = ui.activeStampId;

    if (!stampId) return; // No stamp selected

    const snapped = this.snap(worldPos);
    this.placeStamp(snapped, stampId);
  }

  onMouseMove(worldPos: Point, _screenPos: Point, _event: MouseEvent): void {
    this.previewPos = this.snap(worldPos);
  }

  onMouseUp(_worldPos: Point, _screenPos: Point, _event: MouseEvent): void {
    // Placement is click-only.
  }

  // -----------------------------------------------------------------------
  // Keyboard
  // -----------------------------------------------------------------------

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'r' || event.key === 'R') {
      this.rotation = (this.rotation + 90) % 360;
    }

    if (event.key === 'Escape') {
      this.previewPos = null;
      useUIStore.getState().setToolState('idle');
    }
  }

  // -----------------------------------------------------------------------
  // Preview
  // -----------------------------------------------------------------------

  getPreview(): { type: string; data: unknown } | null {
    const ui = useUIStore.getState();

    if (!this.previewPos || !ui.activeStampId) return null;

    return {
      type: 'stamp',
      data: {
        stampId: ui.activeStampId,
        position: this.previewPos,
        rotation: this.rotation,
      },
    };
  }

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  /** Snap a position to the grid. */
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

  /** Place a furniture stamp at the given position. */
  private placeStamp(position: Point, stampId: string): void {
    const project = useProjectStore.getState();
    const ui = useUIStore.getState();
    const floorIndex = project.project.activeFloorIndex;
    const stampDef = getStampById(stampId);
    const width = stampDef?.width ?? 1;
    const depth = stampDef?.depth ?? 1;

    project.addFurniture({
      floorIndex,
      locked: false,
      visible: true,
      stampId,
      position: { x: position.x, y: position.y },
      rotation: this.rotation,
      scale: 1,
      width,
      depth,
    });

    ui.markDirty();
  }
}
