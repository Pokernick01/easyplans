import type { Point } from '@/types/geometry';
import type { Wall } from '@/types/elements';
import type { BaseTool } from './base-tool';
import { useProjectStore } from '@/store/project-store';
import { useUIStore } from '@/store/ui-store';
import { t } from '@/utils/i18n';
import { detectRooms } from '@/engine/geometry/room-detection';
import { pointInPolygon, polygonArea } from '@/engine/math/polygon';
import { MIN_ROOM_AREA } from '@/utils/constants';

// ---------------------------------------------------------------------------
// RoomTool
// ---------------------------------------------------------------------------

/**
 * Room label tool.
 *
 * When the user clicks inside a closed region formed by walls, the tool
 * auto-detects the enclosing room polygon and creates a Room element with
 * a default label ("Room").  The user can then rename it via the properties
 * panel.
 */
export class RoomTool implements BaseTool {
  readonly name = 'room';
  readonly cursor = 'crosshair';

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  onActivate(): void {
    useUIStore.getState().setToolState('idle');
  }

  onDeactivate(): void {
    // Nothing to clean up.
  }

  // -----------------------------------------------------------------------
  // Mouse events
  // -----------------------------------------------------------------------

  onMouseDown(worldPos: Point, _screenPos: Point, _event: MouseEvent): void {
    const walls = this.getActiveFloorWalls();

    if (walls.length < 3) return; // Need at least 3 walls to form a room

    // Detect all possible room polygons from the current wall graph
    const rooms = detectRooms(walls);

    // Find which detected polygon contains the click point
    for (const room of rooms) {
      if (room.polygon.length < 3) continue;

      const area = polygonArea(room.polygon);
      if (area < MIN_ROOM_AREA) continue;

      if (pointInPolygon(worldPos, room.polygon)) {
        this.createRoom(room.polygon, room.wallIds, area);
        return;
      }
    }

    // No enclosing room found at this click location.
  }

  onMouseMove(_worldPos: Point, _screenPos: Point, _event: MouseEvent): void {
    // No preview for the room tool.
  }

  onMouseUp(_worldPos: Point, _screenPos: Point, _event: MouseEvent): void {
    // Nothing to do.
  }

  // -----------------------------------------------------------------------
  // Keyboard
  // -----------------------------------------------------------------------

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      useUIStore.getState().setToolState('idle');
    }
  }

  // -----------------------------------------------------------------------
  // Preview
  // -----------------------------------------------------------------------

  getPreview(): { type: string; data: unknown } | null {
    return null;
  }

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  private createRoom(
    polygon: Point[],
    wallIds: string[],
    area: number,
  ): void {
    const project = useProjectStore.getState();
    const ui = useUIStore.getState();
    const floorIndex = project.project.activeFloorIndex;

    project.addRoom({
      floorIndex,
      locked: false,
      visible: true,
      wallIds,
      polygon,
      label: t('room.default'),
      color: 'rgba(135,206,235,0.3)', // light blue, semi-transparent
      area,
      fillPattern: 'solid',
    });

    ui.markDirty();
  }

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
}
