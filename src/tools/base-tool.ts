import type { Point } from '@/types/geometry';

/**
 * Abstract interface for all drawing / editing tools in the EasyPlans
 * floor-plan editor.
 *
 * Every tool is a state machine driven by mouse and keyboard events
 * forwarded from the canvas interaction layer.
 */
export interface BaseTool {
  /** Unique name matching the ToolType union (e.g. 'select', 'wall'). */
  name: string;

  /** CSS cursor value used while this tool is active. */
  cursor: string;

  /** Called when the tool becomes the active tool. */
  onActivate(): void;

  /** Called when the tool is replaced by another tool. */
  onDeactivate(): void;

  /**
   * Handle a mouse-down event on the canvas.
   * @param worldPos  Cursor position in world/meter coordinates.
   * @param screenPos Cursor position in screen/pixel coordinates.
   * @param event     The original DOM MouseEvent.
   */
  onMouseDown(worldPos: Point, screenPos: Point, event: MouseEvent): void;

  /**
   * Handle a mouse-move event on the canvas.
   * @param worldPos  Cursor position in world/meter coordinates.
   * @param screenPos Cursor position in screen/pixel coordinates.
   * @param event     The original DOM MouseEvent.
   */
  onMouseMove(worldPos: Point, screenPos: Point, event: MouseEvent): void;

  /**
   * Handle a mouse-up event on the canvas.
   * @param worldPos  Cursor position in world/meter coordinates.
   * @param screenPos Cursor position in screen/pixel coordinates.
   * @param event     The original DOM MouseEvent.
   */
  onMouseUp(worldPos: Point, screenPos: Point, event: MouseEvent): void;

  /**
   * Handle a key-down event while this tool is active.
   * @param event The original DOM KeyboardEvent.
   */
  onKeyDown(event: KeyboardEvent): void;

  /**
   * Return a preview / ghost shape to render while the tool is mid-action.
   * Returns `null` when there is nothing to preview.
   */
  getPreview(): { type: string; data: unknown } | null;
}
