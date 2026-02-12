import type { Point } from '@/types/geometry.ts';

// ---------------------------------------------------------------------------
// Camera -- maps between world coordinates (meters) and screen pixels
// ---------------------------------------------------------------------------

/**
 * The Camera handles coordinate transforms between the world space (meters)
 * used by architectural elements and the screen space (pixels) used for
 * canvas rendering.
 *
 * Convention:
 * - World origin (0, 0) maps to the **center** of the canvas plus any pan offset.
 * - `pixelsPerMeter = basePixelsPerMeter * zoom`
 * - Pan is stored in screen pixels; mouse deltas are added directly to panX/panY.
 *
 * Transform:
 *   screenX = worldX * pixelsPerMeter + canvasWidth / 2 + panX
 *   screenY = worldY * pixelsPerMeter + canvasHeight / 2 + panY
 */
export class Camera {
  private zoom: number = 1.0;
  private panX: number = 0;
  private panY: number = 0;
  private canvasWidth: number = 0;
  private canvasHeight: number = 0;
  private dpr: number = 1;
  private basePixelsPerMeter: number = 100; // at zoom=1, 1 meter = 100 pixels

  // -----------------------------------------------------------------------
  // Update from external state (called once per frame)
  // -----------------------------------------------------------------------

  update(
    zoom: number,
    panX: number,
    panY: number,
    width: number,
    height: number,
    dpr: number,
  ): void {
    this.zoom = zoom;
    this.panX = panX;
    this.panY = panY;
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.dpr = dpr;
  }

  // -----------------------------------------------------------------------
  // Coordinate conversion
  // -----------------------------------------------------------------------

  /**
   * Convert a world-space point (meters) to screen-space pixels.
   */
  worldToScreen(point: Point): Point {
    const ppm = this.getPixelsPerMeter();
    return {
      x: point.x * ppm + this.canvasWidth / 2 + this.panX,
      y: point.y * ppm + this.canvasHeight / 2 + this.panY,
    };
  }

  /**
   * Convert a screen-space point (pixels) to world-space meters.
   */
  screenToWorld(point: Point): Point {
    const ppm = this.getPixelsPerMeter();
    return {
      x: (point.x - this.canvasWidth / 2 - this.panX) / ppm,
      y: (point.y - this.canvasHeight / 2 - this.panY) / ppm,
    };
  }

  // -----------------------------------------------------------------------
  // Queries
  // -----------------------------------------------------------------------

  /**
   * Return the axis-aligned bounding box of the currently visible world area.
   */
  getVisibleBounds(): {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  } {
    const topLeft = this.screenToWorld({ x: 0, y: 0 });
    const bottomRight = this.screenToWorld({
      x: this.canvasWidth,
      y: this.canvasHeight,
    });
    return {
      minX: topLeft.x,
      minY: topLeft.y,
      maxX: bottomRight.x,
      maxY: bottomRight.y,
    };
  }

  /**
   * Effective pixels per meter at the current zoom level.
   */
  getPixelsPerMeter(): number {
    return this.basePixelsPerMeter * this.zoom;
  }

  // -----------------------------------------------------------------------
  // Canvas context helpers
  // -----------------------------------------------------------------------

  /**
   * Apply the camera transform to a 2D canvas context so that subsequent
   * draw calls can use world coordinates directly.
   *
   * After calling this method:
   *   ctx.moveTo(worldX, worldY)  -- works in meters
   *   ctx.lineWidth = 0.01        -- is 0.01 meters
   *
   * Remember to call `resetTransform` when you need to draw in screen space
   * (e.g. UI overlays, fixed-size text).
   */
  applyTransform(ctx: CanvasRenderingContext2D): void {
    const ppm = this.getPixelsPerMeter();
    ctx.setTransform(
      ppm * this.dpr,                                  // a  (horizontal scale)
      0,                                                // b
      0,                                                // c
      ppm * this.dpr,                                   // d  (vertical scale)
      (this.canvasWidth / 2 + this.panX) * this.dpr,    // e  (translate x)
      (this.canvasHeight / 2 + this.panY) * this.dpr,   // f  (translate y)
    );
  }

  /**
   * Reset the canvas context transform to the default DPR-scaled identity.
   * Use this before drawing screen-space elements (HUD, selection handles, etc.).
   */
  resetTransform(ctx: CanvasRenderingContext2D): void {
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }
}
