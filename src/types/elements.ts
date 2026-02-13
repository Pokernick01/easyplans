import type { Point } from './geometry.ts';

// ---------------------------------------------------------------------------
// Element type discriminator
// ---------------------------------------------------------------------------

export type ElementType =
  | 'wall'
  | 'door'
  | 'window'
  | 'room'
  | 'furniture'
  | 'text'
  | 'dimension'
  | 'archline'
  | 'stair'
  | 'shape';

// ---------------------------------------------------------------------------
// Fill patterns for rooms
// ---------------------------------------------------------------------------

export type FillPattern =
  | 'solid'
  | 'hatch'
  | 'tile'
  | 'wood'
  | 'stone'
  | 'brick'
  | 'marble'
  | 'concrete'
  | 'ceramic'
  | 'parquet'
  | 'herringbone'
  | 'hexagonal'
  | 'carpet'
  | 'grass'
  | 'granite';

export type WallFillPattern =
  | 'solid'
  | 'brick'
  | 'concrete'
  | 'stone'
  | 'hatch'
  | 'crosshatch'
  | 'drywall'
  | 'block'
  | 'stucco'
  | 'plaster';

// ---------------------------------------------------------------------------
// Door swing direction
// ---------------------------------------------------------------------------

export type DoorSwing = 'left' | 'right';

// ---------------------------------------------------------------------------
// Door style variants
// ---------------------------------------------------------------------------

export type DoorStyle = 'single' | 'double' | 'sliding' | 'pocket' | 'folding' | 'revolving';

// ---------------------------------------------------------------------------
// Window style variants
// ---------------------------------------------------------------------------

export type WindowStyle = 'single' | 'double' | 'sliding' | 'fixed' | 'casement' | 'awning';

// ---------------------------------------------------------------------------
// Base element — shared by every architectural element
// ---------------------------------------------------------------------------

export interface BaseElement {
  id: string;
  type: ElementType;
  floorIndex: number;
  locked: boolean;
  visible: boolean;
}

// ---------------------------------------------------------------------------
// Wall
// ---------------------------------------------------------------------------

export interface Wall extends BaseElement {
  type: 'wall';
  /** Centerline start point (meters). */
  start: Point;
  /** Centerline end point (meters). */
  end: Point;
  /** Wall thickness in meters. @default 0.15 */
  thickness: number;
  /** Wall height in meters. @default 2.8 */
  height: number;
  /** IDs of doors / windows cut into this wall. */
  openings: string[];
  /** Stroke / outline color. @default '#808080' */
  color: string;
  /** Interior fill color (texture tint). @default '#d3d3d3' */
  fillColor: string;
  /** Wall fill pattern / material texture. @default 'solid' */
  fillPattern: WallFillPattern;
}

// ---------------------------------------------------------------------------
// Door
// ---------------------------------------------------------------------------

export interface Door extends BaseElement {
  type: 'door';
  /** ID of the wall this door belongs to. */
  wallId: string;
  /** Parametric position along the wall (0 = start, 1 = end). */
  position: number;
  /** Door width in meters. @default 0.9 */
  width: number;
  /** Door height in meters. @default 2.1 */
  height: number;
  /** Swing direction (left or right side opens). */
  swing: DoorSwing;
  /** Opening angle in degrees. @default 90 */
  openAngle: number;
  /** Door style variant. @default 'single' */
  doorStyle: DoorStyle;
  /** Which side of the wall the door opens to. @default false */
  flipSide: boolean;
  /** Hinge position: 'start' = hinge at start-side of opening, 'end' = hinge at end-side. @default 'start' */
  hinge: 'start' | 'end';
}

// ---------------------------------------------------------------------------
// Window
// ---------------------------------------------------------------------------

export interface Window extends BaseElement {
  type: 'window';
  /** ID of the wall this window belongs to. */
  wallId: string;
  /** Parametric position along the wall (0 = start, 1 = end). */
  position: number;
  /** Window width in meters. @default 1.2 */
  width: number;
  /** Window height in meters. @default 1.2 */
  height: number;
  /** Sill height from floor in meters. @default 0.9 */
  sillHeight: number;
  /** Window style variant. @default 'single' */
  windowStyle: WindowStyle;
}

// ---------------------------------------------------------------------------
// Room
// ---------------------------------------------------------------------------

export interface Room extends BaseElement {
  type: 'room';
  /** IDs of walls that form this room's boundary. */
  wallIds: string[];
  /** Closed polygon describing the room outline. */
  polygon: Point[];
  /** Human-readable room label (e.g. "Living Room"). */
  label: string;
  /** Fill color (typically semi-transparent). */
  color: string;
  /** Computed floor area in square meters. */
  area: number;
  /** Floor fill pattern / texture. @default 'solid' */
  fillPattern: FillPattern;
}

// ---------------------------------------------------------------------------
// Furniture (stamp instance)
// ---------------------------------------------------------------------------

export interface FurnitureItem extends BaseElement {
  type: 'furniture';
  /** ID referencing a StampDefinition in the library. */
  stampId: string;
  /** Position of the stamp center (meters). */
  position: Point;
  /** Rotation in degrees. */
  rotation: number;
  /** Uniform scale factor (1 = original size). */
  scale: number;
  /** Stamp width in meters (from StampDefinition, may be scaled). */
  width: number;
  /** Stamp depth in meters (from StampDefinition, may be scaled). */
  depth: number;
  /** Optional tint color override. */
  color?: string;
}

// ---------------------------------------------------------------------------
// Text label
// ---------------------------------------------------------------------------

export interface TextLabel extends BaseElement {
  type: 'text';
  /** Position of the label anchor (meters). */
  position: Point;
  /** Display text. */
  text: string;
  /** Font size in points. */
  fontSize: number;
  /** CSS font-family string. */
  fontFamily: string;
  /** Text color. */
  color: string;
  /** Rotation in degrees. */
  rotation: number;
}

// ---------------------------------------------------------------------------
// Dimension line
// ---------------------------------------------------------------------------

export interface DimensionLine extends BaseElement {
  type: 'dimension';
  /** Start point of the measured segment (meters). */
  start: Point;
  /** End point of the measured segment (meters). */
  end: Point;
  /** Perpendicular offset of the dimension line from the segment (meters). */
  offset: number;
  /** Whether this dimension was auto-generated. */
  auto: boolean;
}

// ---------------------------------------------------------------------------
// Architectural line styles (Mexican / Latin American plan conventions)
// ---------------------------------------------------------------------------

export type ArchLineStyle = 'colindancia' | 'limite-lote' | 'eje' | 'setback' | 'center';

// ---------------------------------------------------------------------------
// Architectural line
// ---------------------------------------------------------------------------

export interface ArchLine extends BaseElement {
  type: 'archline';
  /** Start point of the line (meters). */
  start: Point;
  /** End point of the line (meters). */
  end: Point;
  /** Visual line style / dash pattern. */
  lineStyle: ArchLineStyle;
  /** Line weight in pixels. */
  lineWeight: number;
}

// ---------------------------------------------------------------------------
// Stair style variants
// ---------------------------------------------------------------------------

export type StairStyle =
  | 'straight'
  | 'l-shaped'
  | 'u-shaped'
  | 'spiral'
  | 'winder'
  | 'curved';

// ---------------------------------------------------------------------------
// Stair direction (which way the arrow points = direction of ascent)
// ---------------------------------------------------------------------------

export type StairDirection = 'up' | 'down';

// ---------------------------------------------------------------------------
// Stair
// ---------------------------------------------------------------------------

export interface Stair extends BaseElement {
  type: 'stair';
  /** Position of the stair's bottom-left corner (meters). */
  position: Point;
  /** Total stair run width in meters (perpendicular to treads). @default 1.0 */
  width: number;
  /** Total stair run length in meters (along direction of travel). @default 3.0 */
  length: number;
  /** Number of treads (steps). @default 12 */
  treads: number;
  /** Stair style variant. @default 'straight' */
  stairStyle: StairStyle;
  /** Direction of ascent. @default 'up' */
  direction: StairDirection;
  /** Rotation in degrees. @default 0 */
  rotation: number;
  /** Riser height in meters (for cross-section). @default 0.175 */
  riserHeight: number;
  /** Landing depth for L/U shapes in meters. @default 1.0 */
  landingDepth: number;
  /** Flip horizontally. @default false */
  flipH: boolean;
  /** Flip vertically. @default false */
  flipV: boolean;
}

// ---------------------------------------------------------------------------
// Union of all element types
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Shape kind variants
// ---------------------------------------------------------------------------

export type ShapeKind = 'rectangle' | 'circle' | 'triangle';

// ---------------------------------------------------------------------------
// Shape (geometric drawing primitive)
// ---------------------------------------------------------------------------

export interface Shape extends BaseElement {
  type: 'shape';
  /** Center position of the shape bounding box (meters). */
  position: Point;
  /** Bounding box width in meters. */
  width: number;
  /** Bounding box height in meters. */
  height: number;
  /** Which geometric shape to render. @default 'rectangle' */
  shapeKind: ShapeKind;
  /** Rotation in degrees. @default 0 */
  rotation: number;
  /** Whether the shape is filled. @default false */
  filled: boolean;
  /** Fill color (used when filled=true). @default '#cccccc' */
  fillColor: string;
  /** Stroke/outline color. @default '#000000' */
  strokeColor: string;
  /** Stroke width in meters. @default 0.02 */
  strokeWidth: number;
}

// ---------------------------------------------------------------------------
// Union of all element types
// ---------------------------------------------------------------------------

export type AnyElement =
  | Wall
  | Door
  | Window
  | Room
  | FurnitureItem
  | TextLabel
  | DimensionLine
  | ArchLine
  | Stair
  | Shape;
