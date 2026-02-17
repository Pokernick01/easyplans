import type { Point, Line } from './geometry.ts';
import type { AnyElement } from './elements.ts';
import type { DisplayUnit } from '@/utils/units.ts';

// ---------------------------------------------------------------------------
// Scale
// ---------------------------------------------------------------------------

export type ScaleRatio = string;

// ---------------------------------------------------------------------------
// Paper size
// ---------------------------------------------------------------------------

export type PaperSize = 'A4' | 'A3' | 'Letter';

// ---------------------------------------------------------------------------
// View mode
// ---------------------------------------------------------------------------

export type ViewMode = 'plan' | 'section' | 'facade' | 'isometric';

// ---------------------------------------------------------------------------
// Facade direction
// ---------------------------------------------------------------------------

export type FacadeDirection = 'north' | 'south' | 'east' | 'west';

// ---------------------------------------------------------------------------
// View settings (camera / viewport state)
// ---------------------------------------------------------------------------

export interface ViewSettings {
  mode: ViewMode;
  /** Current zoom level (1 = 100 %). */
  zoom: number;
  /** Pan offset in pixels. */
  panOffset: Point;
  /** Optional section cut line (only relevant in 'section' mode). */
  cutLine?: Line;
  /** Facade viewing direction (only relevant in 'facade' mode). */
  facadeDirection?: FacadeDirection;
}

// ---------------------------------------------------------------------------
// Floor
// ---------------------------------------------------------------------------

export interface Floor {
  id: string;
  /** Display name (e.g. "Ground Floor"). */
  name: string;
  /** Floor level index (0 = ground). */
  level: number;
  /** Floor-to-floor height in meters. @default 3.0 */
  height: number;
  /** All architectural elements on this floor, keyed by element id. */
  elements: Record<string, AnyElement>;
}

// ---------------------------------------------------------------------------
// Project (top-level document)
// ---------------------------------------------------------------------------

export interface Project {
  id: string;
  name: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  /** Measurement unit -- always meters internally. */
  units: 'meters';
  /** Display unit for the UI (coordinates, properties, dimensions). Saved with project. */
  displayUnit: DisplayUnit;
  /** Drawing scale for print / export. */
  scale: ScaleRatio;
  /** Target paper size for PDF export. */
  paperSize: PaperSize;
  /** Cardinal direction that represents the building's front. */
  frontDirection: FacadeDirection;
  /** Ordered list of floors in this project. */
  floors: Floor[];
  /** Index into `floors` for the currently active floor. */
  activeFloorIndex: number;
}
