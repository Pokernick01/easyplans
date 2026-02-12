import type { Point } from '@/types/geometry';
import type { Wall, Door, Window, FurnitureItem, TextLabel, DimensionLine, ArchLine, Stair, AnyElement } from '@/types/elements';
import type { BaseTool } from './base-tool';
import { useProjectStore } from '@/store/project-store';
import { useUIStore } from '@/store/ui-store';
import { distance } from '@/engine/math/vector';
import { nearestPointOnSegment } from '@/engine/math/line';

// Hit-testing constants (world-space meters)
const HIT_THRESHOLD = 0.15;

// ---------------------------------------------------------------------------
// EraserTool
// ---------------------------------------------------------------------------

/**
 * Eraser tool.
 *
 * Click on any element to remove it from the project.  Hit-testing logic
 * mirrors the SelectTool.
 */
export class EraserTool implements BaseTool {
  readonly name = 'eraser';
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
    const hitId = this.hitTest(worldPos);

    if (hitId) {
      const project = useProjectStore.getState();
      const ui = useUIStore.getState();
      const floorIndex = project.project.activeFloorIndex;

      project.removeElement(floorIndex, hitId);
      ui.markDirty();
    }
  }

  onMouseMove(_worldPos: Point, _screenPos: Point, _event: MouseEvent): void {
    // No preview for eraser.
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
  // Hit testing (mirrors SelectTool logic)
  // -----------------------------------------------------------------------

  private hitTest(worldPos: Point): string | null {
    const elements = this.getActiveFloorElements();

    // First pass: doors/windows (priority over walls beneath them)
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if ((el.type === 'door' || el.type === 'window') && this.hitTestElement(el, worldPos)) {
        return el.id;
      }
    }

    // Second pass: everything else
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (el.type !== 'door' && el.type !== 'window' && this.hitTestElement(el, worldPos)) {
        return el.id;
      }
    }

    return null;
  }

  private hitTestElement(el: AnyElement, worldPos: Point): boolean {
    switch (el.type) {
      case 'wall':
        return this.hitTestWall(el, worldPos);
      case 'door':
        return this.hitTestDoor(el, worldPos);
      case 'window':
        return this.hitTestWindow(el, worldPos);
      case 'furniture':
        return this.hitTestFurniture(el, worldPos);
      case 'text':
        return this.hitTestText(el, worldPos);
      case 'dimension':
        return this.hitTestDimension(el, worldPos);
      case 'archline':
        return this.hitTestArchLine(el, worldPos);
      case 'stair':
        return this.hitTestStair(el, worldPos);
      case 'room':
        return false;
      default:
        return false;
    }
  }

  private hitTestStair(stair: Stair, pos: Point): boolean {
    // Guard: if position is malformed (e.g. SnapResult instead of Point), try to recover
    const sp = stair.position as { x?: number; y?: number; point?: Point };
    const px = sp.x ?? sp.point?.x ?? 0;
    const py = sp.y ?? sp.point?.y ?? 0;
    const hw = stair.width / 2 + HIT_THRESHOLD;
    const hl = stair.length / 2 + HIT_THRESHOLD;
    const cx = px + stair.width / 2;
    const cy = py + stair.length / 2;
    return Math.abs(pos.x - cx) <= hw && Math.abs(pos.y - cy) <= hl;
  }

  private hitTestWall(wall: Wall, pos: Point): boolean {
    const nearest = nearestPointOnSegment(pos, {
      start: wall.start,
      end: wall.end,
    });
    return nearest.distance < wall.thickness / 2 + HIT_THRESHOLD;
  }

  private hitTestFurniture(item: FurnitureItem, pos: Point): boolean {
    const hw = (item.width * item.scale) / 2;
    const hd = (item.depth * item.scale) / 2;
    const halfExtent = Math.max(hw, hd) + HIT_THRESHOLD;
    return (
      Math.abs(pos.x - item.position.x) <= halfExtent &&
      Math.abs(pos.y - item.position.y) <= halfExtent
    );
  }

  private hitTestText(label: TextLabel, pos: Point): boolean {
    const threshold = 0.3 + HIT_THRESHOLD;
    return distance(pos, label.position) < threshold;
  }

  private hitTestDimension(dim: DimensionLine, pos: Point): boolean {
    const nearest = nearestPointOnSegment(pos, {
      start: dim.start,
      end: dim.end,
    });
    return nearest.distance < HIT_THRESHOLD * 2;
  }

  private hitTestDoor(door: Door, pos: Point): boolean {
    const center = this.getDoorWindowCenter(door);
    if (!center) return false;
    return distance(pos, center) < door.width / 2 + HIT_THRESHOLD;
  }

  private hitTestWindow(win: Window, pos: Point): boolean {
    const center = this.getDoorWindowCenter(win);
    if (!center) return false;
    return distance(pos, center) < win.width / 2 + HIT_THRESHOLD;
  }

  private hitTestArchLine(line: ArchLine, pos: Point): boolean {
    const nearest = nearestPointOnSegment(pos, {
      start: line.start,
      end: line.end,
    });
    return nearest.distance < HIT_THRESHOLD * 2;
  }

  /** Compute the world position of a door/window from its wall + parametric position. */
  private getDoorWindowCenter(opening: Door | Window): Point | null {
    const project = useProjectStore.getState();
    const floorIndex = project.project.activeFloorIndex;
    const floor = project.project.floors[floorIndex];
    if (!floor) return null;
    const wall = floor.elements[opening.wallId] as Wall | undefined;
    if (!wall || wall.type !== 'wall') return null;

    const t = opening.position;
    return {
      x: wall.start.x + (wall.end.x - wall.start.x) * t,
      y: wall.start.y + (wall.end.y - wall.start.y) * t,
    };
  }

  /** Return all visible, unlocked elements on the active floor. */
  private getActiveFloorElements(): AnyElement[] {
    const project = useProjectStore.getState();
    const floorIndex = project.project.activeFloorIndex;
    const floor = project.project.floors[floorIndex];
    const allElements: AnyElement[] = floor ? Object.values(floor.elements) : [];

    return allElements.filter(
      (el) => el.visible,
    );
  }
}
