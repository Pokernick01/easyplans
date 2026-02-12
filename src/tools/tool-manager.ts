import type { Point } from '@/types/geometry';
import type { BaseTool } from './base-tool';

import { SelectTool } from './select-tool';
import { WallTool } from './wall-tool';
import { DoorTool } from './door-tool';
import { WindowTool } from './window-tool';
import { RoomTool } from './room-tool';
import { DimensionTool } from './dimension-tool';
import { TextTool } from './text-tool';
import { StampTool } from './stamp-tool';
import { EraserTool } from './eraser-tool';
import { ArchLineTool } from './archline-tool';
import { StairTool } from './stair-tool';

// ---------------------------------------------------------------------------
// ToolManager
// ---------------------------------------------------------------------------

/**
 * Central registry and dispatcher for all editing tools.
 *
 * The canvas interaction layer delegates every mouse / keyboard event to
 * the currently active tool via the manager's forwarding methods.
 *
 * Usage:
 * ```ts
 * import { toolManager } from '@/tools/tool-manager';
 *
 * toolManager.setActiveTool('wall');
 * toolManager.onMouseDown(worldPos, screenPos, event);
 * ```
 */
export class ToolManager {
  private tools: Map<string, BaseTool> = new Map();
  private activeTool: BaseTool | null = null;

  constructor() {
    // Instantiate and register all tools
    const toolInstances: BaseTool[] = [
      new SelectTool(),
      new WallTool(),
      new DoorTool(),
      new WindowTool(),
      new RoomTool(),
      new DimensionTool(),
      new TextTool(),
      new StampTool(),
      new EraserTool(),
      new ArchLineTool(),
      new StairTool(),
    ];

    for (const tool of toolInstances) {
      this.tools.set(tool.name, tool);
    }
  }

  // -----------------------------------------------------------------------
  // Tool switching
  // -----------------------------------------------------------------------

  /**
   * Switch to a different tool by name.
   *
   * Deactivates the current tool (if any) and activates the new one.
   * If `toolName` is not recognized, the active tool is set to `null`.
   */
  setActiveTool(toolName: string): void {
    if (this.activeTool) {
      this.activeTool.onDeactivate();
    }

    const next = this.tools.get(toolName) ?? null;
    this.activeTool = next;

    if (next) {
      next.onActivate();
    }
  }

  /** Return the currently active tool instance, or `null`. */
  getActiveTool(): BaseTool | null {
    return this.activeTool;
  }

  /** Return the CSS cursor for the active tool (defaults to 'default'). */
  getCursor(): string {
    return this.activeTool?.cursor ?? 'default';
  }

  // -----------------------------------------------------------------------
  // Event forwarding
  // -----------------------------------------------------------------------

  onMouseDown(worldPos: Point, screenPos: Point, event: MouseEvent): void {
    this.activeTool?.onMouseDown(worldPos, screenPos, event);
  }

  onMouseMove(worldPos: Point, screenPos: Point, event: MouseEvent): void {
    this.activeTool?.onMouseMove(worldPos, screenPos, event);
  }

  onMouseUp(worldPos: Point, screenPos: Point, event: MouseEvent): void {
    this.activeTool?.onMouseUp(worldPos, screenPos, event);
  }

  onKeyDown(event: KeyboardEvent): void {
    this.activeTool?.onKeyDown(event);
  }

  // -----------------------------------------------------------------------
  // Preview
  // -----------------------------------------------------------------------

  /** Return the active tool's preview data, or `null`. */
  getPreview(): { type: string; data: unknown } | null {
    return this.activeTool?.getPreview() ?? null;
  }
}

// ---------------------------------------------------------------------------
// Singleton instance
// ---------------------------------------------------------------------------

export const toolManager = new ToolManager();
