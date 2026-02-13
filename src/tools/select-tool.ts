import type { Point } from '@/types/geometry';
import type { BaseTool } from './base-tool';
import type { Wall, Door, Window, FurnitureItem, TextLabel, DimensionLine, ArchLine, Stair, AnyElement } from '@/types/elements';
import { useProjectStore } from '@/store/project-store';
import { useUIStore } from '@/store/ui-store';
import { distance } from '@/engine/math/vector';
import { nearestPointOnSegment } from '@/engine/math/line';

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

type SelectPhase = 'IDLE' | 'MAYBE_DRAGGING' | 'DRAGGING' | 'BOX_SELECTING' | 'RESIZING';

/** Which corner/edge of the bounding box is being dragged. */
type ResizeHandle =
  | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  | 'top' | 'bottom' | 'left' | 'right';

// Hit-testing constants (world-space meters)
const HIT_THRESHOLD = 0.15;  // Extra tolerance around element edges
const DRAG_THRESHOLD_PX = 3; // Pixel distance before a click becomes a drag
const HANDLE_SIZE = 0.12;    // World-space size of a resize handle

// ---------------------------------------------------------------------------
// SelectTool
// ---------------------------------------------------------------------------

/**
 * Selection and move tool.
 *
 * State machine:
 *   IDLE
 *     -> click on resize handle       = RESIZING
 *     -> click on element             = select it, enter MAYBE_DRAGGING
 *     -> click on empty space         = clear selection
 *     -> click on empty + drag        = BOX_SELECTING
 *   MAYBE_DRAGGING
 *     -> mouse move > threshold       = DRAGGING
 *     -> mouseUp (within threshold)   = stay selected, back to IDLE
 *   DRAGGING
 *     -> mouseUp                      = commit move, back to IDLE
 *   BOX_SELECTING
 *     -> mouseUp                      = select elements inside box, back to IDLE
 *   RESIZING
 *     -> mouseUp                      = commit resize, back to IDLE
 */
export class SelectTool implements BaseTool {
  readonly name = 'select';
  readonly cursor = 'default';

  private phase: SelectPhase = 'IDLE';

  /** World position where the current mouse-down started. */
  private mouseDownWorld: Point = { x: 0, y: 0 };
  /** Screen position where the current mouse-down started. */
  private mouseDownScreen: Point = { x: 0, y: 0 };

  /** Accumulated drag delta in world coordinates. */
  private dragDelta: Point = { x: 0, y: 0 };

  /** Current mouse position in world coordinates (for box-select preview). */
  private currentWorld: Point = { x: 0, y: 0 };

  /** ID of the element that was hit on mouse-down (if any). */
  private hitElementId: string | null = null;

  /** Last click position for cycle-through selection. */
  private lastClickWorld: Point = { x: 0, y: 0 };
  /** Index of last selected element in overlapping set for cycling. */
  private cycleIndex: number = 0;

  /** Active resize handle being dragged. */
  private resizeHandle: ResizeHandle | null = null;
  /** Element ID being resized. */
  private resizeElementId: string | null = null;
  /** Original stair state before resize starts. */
  private resizeOriginal: { position: Point; width: number; length: number } | null = null;

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  onActivate(): void {
    this.phase = 'IDLE';
    useUIStore.getState().setToolState('idle');
  }

  onDeactivate(): void {
    this.phase = 'IDLE';
  }

  // -----------------------------------------------------------------------
  // Mouse events
  // -----------------------------------------------------------------------

  onMouseDown(worldPos: Point, screenPos: Point, event: MouseEvent): void {
    const ui = useUIStore.getState();

    this.mouseDownWorld = { ...worldPos };
    this.mouseDownScreen = { ...screenPos };
    this.currentWorld = { ...worldPos };
    this.dragDelta = { x: 0, y: 0 };

    // First, check if clicking on a resize handle of a selected stair
    // Only trigger resize if clicking near the edges — interior clicks start drag
    if (ui.selectedIds.length === 1) {
      const handleHit = this.hitTestResizeHandles(worldPos, ui.selectedIds[0]);
      if (handleHit && !this.isInsideStairBody(worldPos, ui.selectedIds[0])) {
        this.phase = 'RESIZING';
        this.resizeHandle = handleHit.handle;
        this.resizeElementId = ui.selectedIds[0];
        // Store original stair state
        const project = useProjectStore.getState();
        const floorIndex = project.project.activeFloorIndex;
        const floor = project.project.floors[floorIndex];
        const el = floor?.elements[ui.selectedIds[0]];
        if (el && el.type === 'stair') {
          this.resizeOriginal = {
            position: { ...el.position },
            width: el.width,
            length: el.length,
          };
        }
        ui.setToolState('dragging');
        return;
      }
    }

    // Hit-test all visible elements on the active floor
    const hitId = this.hitTest(worldPos);
    this.hitElementId = hitId;

    if (hitId) {
      // Shift+click toggles membership
      if (event.shiftKey) {
        const alreadySelected = ui.selectedIds.includes(hitId);
        if (alreadySelected) {
          // Remove from selection (re-select without this id)
          const remaining = ui.selectedIds.filter((id) => id !== hitId);
          ui.select(remaining);
        } else {
          ui.addToSelection(hitId);
        }
      } else if (!ui.selectedIds.includes(hitId)) {
        // Click on an unselected element -> make it the sole selection
        ui.clearSelection();
        ui.select([hitId]);
      }
      // If already selected without shift, keep selection (allows dragging)

      this.phase = 'MAYBE_DRAGGING';
      ui.setToolState('idle');
    } else {
      // Clicked on empty space
      if (!event.shiftKey) {
        ui.clearSelection();
      }
      this.phase = 'BOX_SELECTING';
      ui.setToolState('selecting');
    }
  }

  onMouseMove(worldPos: Point, screenPos: Point, _event: MouseEvent): void {
    const ui = useUIStore.getState();
    this.currentWorld = { ...worldPos };

    if (this.phase === 'RESIZING') {
      // Live-resize the stair
      this.applyResize(worldPos, false);
      return;
    }

    if (this.phase === 'MAYBE_DRAGGING') {
      const dx = screenPos.x - this.mouseDownScreen.x;
      const dy = screenPos.y - this.mouseDownScreen.y;
      const screenDist = Math.sqrt(dx * dx + dy * dy);

      if (screenDist > DRAG_THRESHOLD_PX) {
        this.phase = 'DRAGGING';
        ui.setToolState('dragging');
      }
    }

    if (this.phase === 'DRAGGING') {
      this.dragDelta = {
        x: worldPos.x - this.mouseDownWorld.x,
        y: worldPos.y - this.mouseDownWorld.y,
      };
    }

    // BOX_SELECTING: currentWorld is already updated for the preview.
  }

  onMouseUp(worldPos: Point, _screenPos: Point, _event: MouseEvent): void {
    const ui = useUIStore.getState();
    const project = useProjectStore.getState();

    if (this.phase === 'RESIZING') {
      this.applyResize(worldPos, true);
      this.resizeHandle = null;
      this.resizeElementId = null;
      this.resizeOriginal = null;
      ui.markDirty();
      this.phase = 'IDLE';
      ui.setToolState('idle');
      return;
    }

    if (this.phase === 'DRAGGING') {
      // Commit move for every selected element
      const finalDelta = {
        x: worldPos.x - this.mouseDownWorld.x,
        y: worldPos.y - this.mouseDownWorld.y,
      };
      const floorIndex = project.project.activeFloorIndex;
      for (const id of ui.selectedIds) {
        project.moveElement(floorIndex, id, finalDelta.x, finalDelta.y);
      }
      ui.markDirty();
    }

    if (this.phase === 'BOX_SELECTING') {
      // Determine box bounds
      const minX = Math.min(this.mouseDownWorld.x, worldPos.x);
      const maxX = Math.max(this.mouseDownWorld.x, worldPos.x);
      const minY = Math.min(this.mouseDownWorld.y, worldPos.y);
      const maxY = Math.max(this.mouseDownWorld.y, worldPos.y);

      // Select every visible element whose center/key-point falls inside the box
      const elements = this.getActiveFloorElements();
      const boxSelectedIds: string[] = [];
      for (const el of elements) {
        const center = this.getElementCenter(el);
        if (
          center &&
          center.x >= minX &&
          center.x <= maxX &&
          center.y >= minY &&
          center.y <= maxY
        ) {
          boxSelectedIds.push(el.id);
        }
      }
      if (boxSelectedIds.length > 0) {
        ui.select(boxSelectedIds);
      }
    }

    // Return to idle
    this.phase = 'IDLE';
    this.dragDelta = { x: 0, y: 0 };
    ui.setToolState('idle');
  }

  // -----------------------------------------------------------------------
  // Keyboard
  // -----------------------------------------------------------------------

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      const ui = useUIStore.getState();
      const project = useProjectStore.getState();
      const floorIndex = project.project.activeFloorIndex;

      for (const id of [...ui.selectedIds]) {
        project.removeElement(floorIndex, id);
      }
      ui.clearSelection();
      ui.markDirty();
    }

    if (event.key === 'Escape') {
      const ui = useUIStore.getState();
      ui.clearSelection();
      this.phase = 'IDLE';
      ui.setToolState('idle');
    }

    // Flip selected element horizontally (F) or vertically (G)
    if (event.key === 'f' || event.key === 'F' || event.key === 'g' || event.key === 'G') {
      const ui = useUIStore.getState();
      if (ui.selectedIds.length === 1) {
        const project = useProjectStore.getState();
        const floorIndex = project.project.activeFloorIndex;
        const floor = project.project.floors[floorIndex];
        const el = floor?.elements[ui.selectedIds[0]];
        if (el && el.type === 'stair') {
          const isH = event.key === 'f' || event.key === 'F';
          if (isH) {
            project.updateElement(floorIndex, el.id, { flipH: !el.flipH } as Partial<Stair>);
          } else {
            project.updateElement(floorIndex, el.id, { flipV: !el.flipV } as Partial<Stair>);
          }
          ui.markDirty();
        } else if (el && el.type === 'door') {
          const door = el as Door;
          const isH = event.key === 'f' || event.key === 'F';
          if (isH) {
            // F: toggle swing direction (left ↔ right)
            project.updateElement(floorIndex, el.id, {
              swing: door.swing === 'left' ? 'right' : 'left',
            } as Partial<Door>);
          } else {
            // G: toggle which side of the wall the door opens to
            project.updateElement(floorIndex, el.id, {
              flipSide: !door.flipSide,
            } as Partial<Door>);
          }
          ui.markDirty();
        }
      }
    }

    // Rotate selected element (R) — works on stairs, furniture, text, archlines
    if (event.key === 'r' || event.key === 'R') {
      const ui = useUIStore.getState();
      if (ui.selectedIds.length === 1) {
        const project = useProjectStore.getState();
        const floorIndex = project.project.activeFloorIndex;
        const floor = project.project.floors[floorIndex];
        const el = floor?.elements[ui.selectedIds[0]];
        if (!el) return;

        if (el.type === 'stair' || el.type === 'furniture') {
          project.updateElement(floorIndex, el.id, {
            rotation: ((el as Stair | FurnitureItem).rotation + 90) % 360,
          });
          ui.markDirty();
        } else if (el.type === 'text') {
          const textEl = el as TextLabel;
          const curAngle = textEl.rotation ?? 0;
          project.updateElement(floorIndex, el.id, {
            rotation: (curAngle + 90) % 360,
          });
          ui.markDirty();
        } else if (el.type === 'archline') {
          // Rotate archline 90° around its midpoint
          const line = el as ArchLine;
          const mx = (line.start.x + line.end.x) / 2;
          const my = (line.start.y + line.end.y) / 2;
          // Rotate start/end around midpoint by 90 degrees
          const cosA = Math.cos(Math.PI / 2);
          const sinA = Math.sin(Math.PI / 2);
          const rotatePoint = (p: Point): Point => ({
            x: mx + (p.x - mx) * cosA - (p.y - my) * sinA,
            y: my + (p.x - mx) * sinA + (p.y - my) * cosA,
          });
          project.updateElement(floorIndex, el.id, {
            start: rotatePoint(line.start),
            end: rotatePoint(line.end),
          });
          ui.markDirty();
        } else if (el.type === 'dimension') {
          // Rotate dimension line 90° around its midpoint
          const dim = el as DimensionLine;
          const mx = (dim.start.x + dim.end.x) / 2;
          const my = (dim.start.y + dim.end.y) / 2;
          const cosA = Math.cos(Math.PI / 2);
          const sinA = Math.sin(Math.PI / 2);
          const rotatePoint = (p: Point): Point => ({
            x: mx + (p.x - mx) * cosA - (p.y - my) * sinA,
            y: my + (p.x - mx) * sinA + (p.y - my) * cosA,
          });
          project.updateElement(floorIndex, el.id, {
            start: rotatePoint(dim.start),
            end: rotatePoint(dim.end),
          });
          ui.markDirty();
        }
      }
    }
  }

  // -----------------------------------------------------------------------
  // Preview
  // -----------------------------------------------------------------------

  getPreview(): { type: string; data: unknown } | null {
    if (this.phase === 'BOX_SELECTING') {
      return {
        type: 'selection-box',
        data: {
          start: this.mouseDownWorld,
          end: this.currentWorld,
        },
      };
    }

    if (this.phase === 'DRAGGING') {
      return {
        type: 'move-ghost',
        data: {
          delta: this.dragDelta,
          ids: useUIStore.getState().selectedIds,
        },
      };
    }

    return null;
  }

  // -----------------------------------------------------------------------
  // Resize logic
  // -----------------------------------------------------------------------

  /** Get the 4 corner handles + 4 edge handles for a stair element. */
  getStairHandles(stair: Stair): { handle: ResizeHandle; x: number; y: number }[] {
    // Guard: recover from malformed position (SnapResult instead of Point)
    const sp = stair.position as { x?: number; y?: number; point?: Point };
    const x = sp.x ?? sp.point?.x ?? 0;
    const y = sp.y ?? sp.point?.y ?? 0;
    const w = stair.width;
    const l = stair.length;
    return [
      { handle: 'top-left', x: x, y: y },
      { handle: 'top-right', x: x + w, y: y },
      { handle: 'bottom-left', x: x, y: y + l },
      { handle: 'bottom-right', x: x + w, y: y + l },
      { handle: 'top', x: x + w / 2, y: y },
      { handle: 'bottom', x: x + w / 2, y: y + l },
      { handle: 'left', x: x, y: y + l / 2 },
      { handle: 'right', x: x + w, y: y + l / 2 },
    ];
  }

  /** Check if worldPos is inside the stair body (interior, away from edges).
   *  Used to prefer drag over resize when clicking in the center. */
  private isInsideStairBody(worldPos: Point, elementId: string): boolean {
    const project = useProjectStore.getState();
    const floorIndex = project.project.activeFloorIndex;
    const floor = project.project.floors[floorIndex];
    if (!floor) return false;
    const el = floor.elements[elementId];
    if (!el || el.type !== 'stair') return false;
    const sp = el.position as { x?: number; y?: number; point?: Point };
    const px = sp.x ?? sp.point?.x ?? 0;
    const py = sp.y ?? sp.point?.y ?? 0;
    // Inset margin — clicks within this margin from edges are "handle zone"
    const margin = HANDLE_SIZE + 0.05;
    return (
      worldPos.x > px + margin &&
      worldPos.x < px + el.width - margin &&
      worldPos.y > py + margin &&
      worldPos.y < py + el.length - margin
    );
  }

  /** Check if worldPos is on a resize handle of a selected element. */
  private hitTestResizeHandles(
    worldPos: Point,
    elementId: string,
  ): { handle: ResizeHandle } | null {
    const project = useProjectStore.getState();
    const floorIndex = project.project.activeFloorIndex;
    const floor = project.project.floors[floorIndex];
    if (!floor) return null;
    const el = floor.elements[elementId];
    if (!el || el.type !== 'stair') return null;

    const handles = this.getStairHandles(el);
    for (const h of handles) {
      if (distance(worldPos, { x: h.x, y: h.y }) < HANDLE_SIZE + HIT_THRESHOLD) {
        return { handle: h.handle };
      }
    }
    return null;
  }

  /** Apply resize from current mouse position. If commit=true, finalize. */
  private applyResize(worldPos: Point, commit: boolean): void {
    if (!this.resizeElementId || !this.resizeHandle || !this.resizeOriginal) return;

    const project = useProjectStore.getState();
    const floorIndex = project.project.activeFloorIndex;

    const orig = this.resizeOriginal;
    const handle = this.resizeHandle;
    const MIN_SIZE = 0.3;

    let newX = orig.position.x;
    let newY = orig.position.y;
    let newW = orig.width;
    let newL = orig.length;

    // The mouse delta from where we started
    const dx = worldPos.x - this.mouseDownWorld.x;
    const dy = worldPos.y - this.mouseDownWorld.y;

    // Adjust based on which handle is being dragged
    if (handle === 'right' || handle === 'top-right' || handle === 'bottom-right') {
      newW = Math.max(MIN_SIZE, orig.width + dx);
    }
    if (handle === 'left' || handle === 'top-left' || handle === 'bottom-left') {
      const widthChange = Math.min(dx, orig.width - MIN_SIZE);
      newX = orig.position.x + widthChange;
      newW = orig.width - widthChange;
    }
    if (handle === 'bottom' || handle === 'bottom-left' || handle === 'bottom-right') {
      newL = Math.max(MIN_SIZE, orig.length + dy);
    }
    if (handle === 'top' || handle === 'top-left' || handle === 'top-right') {
      const lenChange = Math.min(dy, orig.length - MIN_SIZE);
      newY = orig.position.y + lenChange;
      newL = orig.length - lenChange;
    }

    project.updateElement(floorIndex, this.resizeElementId, {
      position: { x: newX, y: newY },
      width: newW,
      length: newL,
    } as Partial<Stair>);

    if (!commit) {
      useUIStore.getState().markDirty();
    }
  }

  // -----------------------------------------------------------------------
  // Hit testing helpers
  // -----------------------------------------------------------------------

  /**
   * Return the id of the topmost element at `worldPos`, or `null`.
   * Elements are tested in reverse order so that the most-recently-added
   * element (rendered on top) wins.
   */
  /**
   * Find all elements that overlap at the given position, ordered by
   * priority: doors/windows first, then other elements in reverse order.
   */
  private hitTestAll(worldPos: Point): string[] {
    const elements = this.getActiveFloorElements();
    const hits: string[] = [];

    // First pass: doors and windows (they sit on top of walls)
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if ((el.type === 'door' || el.type === 'window') && this.hitTestElement(el, worldPos)) {
        hits.push(el.id);
      }
    }

    // Second pass: everything else in reverse order
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (el.type !== 'door' && el.type !== 'window' && this.hitTestElement(el, worldPos)) {
        hits.push(el.id);
      }
    }

    return hits;
  }

  /**
   * Hit-test with click-through cycling: if the user clicks in the same spot
   * on an already-selected element, cycle to the next overlapping element.
   */
  private hitTest(worldPos: Point): string | null {
    const hits = this.hitTestAll(worldPos);
    if (hits.length === 0) return null;
    if (hits.length === 1) return hits[0];

    // Check if clicking roughly the same spot as last click
    const dx = worldPos.x - this.lastClickWorld.x;
    const dy = worldPos.y - this.lastClickWorld.y;
    const sameSpot = Math.sqrt(dx * dx + dy * dy) < HIT_THRESHOLD;

    const ui = useUIStore.getState();
    const currentlySelected = ui.selectedIds.length === 1 ? ui.selectedIds[0] : null;

    if (sameSpot && currentlySelected && hits.includes(currentlySelected)) {
      // Cycle to next overlapping element
      const currentIdx = hits.indexOf(currentlySelected);
      this.cycleIndex = (currentIdx + 1) % hits.length;
    } else {
      this.cycleIndex = 0;
    }

    this.lastClickWorld = { x: worldPos.x, y: worldPos.y };
    return hits[this.cycleIndex];
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
        // Rooms are background fills; we don't pick them with the pointer.
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
    // Axis-aligned bounding box around the furniture center
    const hw = (item.width * item.scale) / 2;
    const hd = (item.depth * item.scale) / 2;
    const halfExtent = Math.max(hw, hd) + HIT_THRESHOLD;

    return (
      Math.abs(pos.x - item.position.x) <= halfExtent &&
      Math.abs(pos.y - item.position.y) <= halfExtent
    );
  }

  private hitTestText(label: TextLabel, pos: Point): boolean {
    // Simple proximity check (text has no explicit bounding box yet)
    const threshold = 0.3 + HIT_THRESHOLD; // ~30 cm hit region
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

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  /** Return all visible, unlocked elements on the active floor. */
  private getActiveFloorElements(): AnyElement[] {
    const project = useProjectStore.getState();
    const floorIndex = project.project.activeFloorIndex;
    const floor = project.project.floors[floorIndex];
    const allElements: AnyElement[] = floor ? Object.values(floor.elements) : [];

    return allElements.filter(
      (el) => el.visible && !el.locked,
    );
  }

  /** Return a representative centre point for an element. */
  private getElementCenter(el: AnyElement): Point | null {
    switch (el.type) {
      case 'wall':
        return {
          x: (el.start.x + el.end.x) / 2,
          y: (el.start.y + el.end.y) / 2,
        };
      case 'furniture':
        return el.position;
      case 'text':
        return el.position;
      case 'dimension':
      case 'archline':
        return {
          x: (el.start.x + el.end.x) / 2,
          y: (el.start.y + el.end.y) / 2,
        };
      case 'door':
      case 'window':
        return this.getDoorWindowCenter(el);
      case 'stair': {
        // Guard: recover from malformed position
        const ssp = el.position as { x?: number; y?: number; point?: Point };
        return {
          x: (ssp.x ?? ssp.point?.x ?? 0) + el.width / 2,
          y: (ssp.y ?? ssp.point?.y ?? 0) + el.length / 2,
        };
      }
      case 'room':
        if (el.polygon.length === 0) return null;
        return {
          x: el.polygon.reduce((s, p) => s + p.x, 0) / el.polygon.length,
          y: el.polygon.reduce((s, p) => s + p.y, 0) / el.polygon.length,
        };
      default:
        return null;
    }
  }
}
