import type { Point } from '@/types/geometry';
import type { Wall } from '@/types/elements';
import type { BaseTool } from './base-tool';
import { useProjectStore } from '@/store/project-store';
import { useUIStore } from '@/store/ui-store';
import { snapDoorToWall } from '@/engine/geometry/door-placement';
import { DEFAULT_DOOR_WIDTH, DEFAULT_DOOR_HEIGHT } from '@/utils/constants';

// ---------------------------------------------------------------------------
// Preview data shape
// ---------------------------------------------------------------------------

interface DoorPreviewData {
  wallId: string;
  position: number; // parametric 0..1
  width: number;
  swing: 'left' | 'right';
}

// ---------------------------------------------------------------------------
// DoorTool
// ---------------------------------------------------------------------------

/**
 * Door placement tool.
 *
 * As the user moves the cursor, the tool finds the nearest wall and
 * previews a door snapped to it. Clicking places the door on that wall.
 */
export class DoorTool implements BaseTool {
  readonly name = 'door';
  readonly cursor = 'crosshair';

  /** Live preview data (null when no wall is nearby). */
  private preview: DoorPreviewData | null = null;

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

    const doorId = project.addDoor({
      floorIndex,
      locked: false,
      visible: true,
      wallId: wall.id,
      position: this.preview.position,
      width: this.preview.width,
      height: DEFAULT_DOOR_HEIGHT,
      swing: this.preview.swing,
      flipSide: false,
      hinge: 'start',
      openAngle: 90,
      doorStyle: useUIStore.getState().activeDoorStyle,
    });

    // Register the opening on the wall
    project.updateElement(floorIndex, wall.id, {
      openings: [...wall.openings, doorId],
    });

    ui.markDirty();
  }

  onMouseMove(worldPos: Point, _screenPos: Point, _event: MouseEvent): void {
    const walls = this.getActiveFloorWalls();

    if (walls.length === 0) {
      this.preview = null;
      return;
    }

    const snap = snapDoorToWall(worldPos, walls, DEFAULT_DOOR_WIDTH);

    if (snap) {
      this.preview = {
        wallId: snap.wallId,
        position: snap.position,
        width: DEFAULT_DOOR_WIDTH,
        swing: 'left',
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
    // F key: flip door swing direction
    if (event.key === 'f' || event.key === 'F') {
      if (this.preview) {
        this.preview = {
          ...this.preview,
          swing: this.preview.swing === 'left' ? 'right' : 'left',
        };
      }
    }

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
      type: 'door',
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
