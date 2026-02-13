import type { Point } from './geometry.ts';

// ---------------------------------------------------------------------------
// Tool type -- which drawing / editing tool is active
// ---------------------------------------------------------------------------

export type ToolType =
  | 'select'
  | 'wall'
  | 'door'
  | 'window'
  | 'room'
  | 'dimension'
  | 'text'
  | 'stamp'
  | 'eraser'
  | 'archline'
  | 'stair'
  | 'shape';

// ---------------------------------------------------------------------------
// Tool state -- current phase of the active tool's interaction
// ---------------------------------------------------------------------------

export type ToolState =
  | 'idle'
  | 'drawing'
  | 'placing'
  | 'dragging'
  | 'selecting';

// ---------------------------------------------------------------------------
// Snap types
// ---------------------------------------------------------------------------

export type SnapType =
  | 'grid'
  | 'endpoint'
  | 'midpoint'
  | 'wall'
  | 'angle';

// ---------------------------------------------------------------------------
// Snap result -- returned by the snap engine
// ---------------------------------------------------------------------------

export interface SnapResult {
  /** Snapped point in world coordinates (meters). */
  point: Point;
  /** Which snap rule was applied. */
  type: SnapType;
  /** ID of the element that provided the snap target, if any. */
  sourceId?: string;
}

// ---------------------------------------------------------------------------
// Tool preview -- generic ghost / preview rendered while tool is active
// ---------------------------------------------------------------------------

export interface ToolPreview<T = unknown> {
  /** Matches the active ToolType. */
  type: ToolType;
  /** Arbitrary payload describing the preview shape (wall ghost, etc.). */
  data: T;
}
