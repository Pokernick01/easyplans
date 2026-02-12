// ---------------------------------------------------------------------------
// Stamp categories
// ---------------------------------------------------------------------------

export type StampCategory =
  | 'furniture'
  | 'bathroom'
  | 'kitchen'
  | 'outdoor'
  | 'people'
  | 'decoration'
  | 'accessories'
  | 'laundry';

// ---------------------------------------------------------------------------
// Stamp definition — a reusable furniture / fixture template
// ---------------------------------------------------------------------------

export interface StampDefinition {
  id: string;
  /** English display name. */
  name: string;
  /** Spanish display name. */
  nameEs: string;
  /** Library category. */
  category: StampCategory;
  /** Default width in meters. */
  width: number;
  /** Default depth in meters. */
  depth: number;
  /**
   * Draw the stamp onto a 2D canvas context.
   *
   * The context is pre-translated so that (0, 0) is the stamp center and
   * pre-scaled so that 1 unit = 1 meter.
   */
  draw: (ctx: CanvasRenderingContext2D, width: number, depth: number) => void;
  /** Color used for the library thumbnail swatch. */
  thumbnailColor: string;
}
