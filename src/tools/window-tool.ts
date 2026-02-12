import type { Point } from '@/types/geometry';
import type { Wall } from '@/types/elements';
import type { BaseTool } from './base-tool';
import { useProjectStore } from '@/store/project-store';
import { useUIStore } from '@/store/ui-store';
import { snapWindowToWall } from '@/engine/geometry/window-placement';
import {
  DEFAULT_WINDOW_WIDTH,
  DEFAULT_WINDOW_HEIGHT,
  DEFAULT_WINDOW_SILL,
} from '@/utils/constants';

// ---------------------------------------------------------------------------
// Preview data shape
// ---------------------------------------------------------------------------

interface WindowPreviewData {
  wallId: string;
  position: number; // parametric 0..1
  width: number;
}

// ---------------------------------------------------------------------------
// WindowTool
// ---------------------------------------------------------------------------

/**
 * Window placement tool.
 *
 * Identical workflow to DoorTool: hover near a wall to preview a window,
 * click to place it.  Uses `snapWindowToWall` from the geometry engine.
 */
export class WindowTool implements BaseTool {
  readonly name = 'window';
  readonly cursor = 'crosshair';

  /** Live preview data (null when no wall is nearby). */
  private preview: WindowPreviewData | null = null;

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  onActivate(): void {
    this.preview = null;
    useUIStore.getState().setToolState('placing');
  }

  onDeactivate(): void {
    this.preview = null;
  }

  // -----------------------------------------------------------------------
  // Mouse events
  // -----------------------------------------------------------------------

  onMouseDown(_worldPos: Point, _screenPos: Point, _event: MouseEvent): void {
    if (!this.preview) return;

    const project = useProjectStore.getState();
    const ui = useUIStore.getState();

    // Find the host wall so we can register the opening
    const wall = this.findWallById(this.preview.wallId);
    if (!wall) return;

    const floorIndex = project.project.activeFloorIndex;

    const windowId = project.addWindow({
      floorIndex,
      locked: false,
      visible: true,
      wallId: wall.id,
      position: this.preview.position,
      width: this.preview.width,
      height: DEFAULT_WINDOW_HEIGHT,
      sillHeight: DEFAULT_WINDOW_SILL,
      windowStyle: ui.activeWindowStyle,
    });

    // Register the opening on the wall
    project.updateElement(floorIndex, wall.id, {
      openings: [...wall.openings, windowId],
    });

    ui.markDirty();
  }

  onMouseMove(worldPos: Point, _screenPos: Point, _event: MouseEvent): void {
    const walls = this.getActiveFloorWalls();

    if (walls.length === 0) {
      this.preview = null;
      return;
    }

    const snap = snapWindowToWall(worldPos, walls, DEFAULT_WINDOW_WIDTH);

    if (snap) {
      this.preview = {
        wallId: snap.wallId,
        position: snap.position,
        width: DEFAULT_WINDOW_WIDTH,
      };
    } else {
      this.preview = null;
    }
  }

  onMouseUp(_worldPos: Point, _screenPos: Point, _event: MouseEvent): void {
    // Placement is click-only; nothing on mouse-up.
  }

  // -----------------------------------------------------------------------
  // Keyboard
  // -----------------------------------------------------------------------

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.preview = null;
      useUIStore.getState().setToolState('idle');
    }
  }

  // -----------------------------------------------------------------------
  // Preview
  // -----------------------------------------------------------------------

  getPreview(): { type: string; data: unknown } | null {
    if (!this.preview) return null;

    return {
      type: 'window',
      data: this.preview,
    };
  }

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  /** Return all walls on the active floor. */
  private getActiveFloorWalls(): Wall[] {
    const project = useProjectStore.getState();
    const floorIndex = project.project.activeFloorIndex;
    const floor = project.project.floors[floorIndex];
    const elements = floor ? Object.values(floor.elements) : [];
    return elements.filter(
      (el): el is Wall => el.type === 'wall',
    );
  }

  /** Look up a single wall by id. */
  private findWallById(wallId: string): Wall | undefined {
    const project = useProjectStore.getState();
    const floorIndex = project.project.activeFloorIndex;
    const floor = project.project.floors[floorIndex];
    const elements = floor ? Object.values(floor.elements) : [];
    return elements.find(
      (el): el is Wall => el.type === 'wall' && el.id === wallId,
    );
  }
}
