import type { Point } from '@/types/geometry';
import type { BaseTool } from './base-tool';
import { useProjectStore } from '@/store/project-store';
import { useUIStore } from '@/store/ui-store';
import { snapToGrid } from '@/engine/math/snap';

// ---------------------------------------------------------------------------
// StairTool
// ---------------------------------------------------------------------------

/**
 * Stair placement tool.
 *
 * The active stair style is determined by `activeStairStyle` in the UI store.
 * Move the cursor to preview the stair (snapped to grid), click to place
 * it.  Press R to rotate 90 degrees.
 */
export class StairTool implements BaseTool {
  readonly name = 'stair';
  readonly cursor = 'crosshair';

  private previewPos: Point | null = null;
  private previewRotation = 0;

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  onActivate(): void {
    this.previewPos = null;
    this.previewRotation = 0;
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
    const project = useProjectStore.getState();
    const floorIndex = project.project.activeFloorIndex;
    const snapResult = ui.snapEnabled ? snapToGrid(worldPos, ui.gridSize) : null;
    const snapped = snapResult ? snapResult.point : worldPos;

    project.addStair({
      floorIndex,
      locked: false,
      visible: true,
      position: snapped,
      width: 1.0,
      length: 3.0,
      treads: 12,
      stairStyle: ui.activeStairStyle,
      direction: 'up',
      rotation: this.previewRotation,
      riserHeight: 0.175,
      landingDepth: 1.0,
      flipH: false,
      flipV: false,
    });

    ui.markDirty();
  }

  onMouseMove(worldPos: Point, _screenPos: Point, _event: MouseEvent): void {
    const ui = useUIStore.getState();
    const snapResult = ui.snapEnabled ? snapToGrid(worldPos, ui.gridSize) : null;
    this.previewPos = snapResult ? snapResult.point : worldPos;
  }

  onMouseUp(): void {}

  // -----------------------------------------------------------------------
  // Keyboard
  // -----------------------------------------------------------------------

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'r' || event.key === 'R') {
      this.previewRotation = (this.previewRotation + 90) % 360;
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
    if (!this.previewPos) return null;
    return {
      type: 'stair',
      data: {
        position: this.previewPos,
        rotation: this.previewRotation,
        stairStyle: useUIStore.getState().activeStairStyle,
      },
    };
  }
}
