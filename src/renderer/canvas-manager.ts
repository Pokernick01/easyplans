// ---------------------------------------------------------------------------
// CanvasManager -- owns the <canvas> element, handles DPR and resize
// ---------------------------------------------------------------------------

export class CanvasManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr: number = 1;
  private width: number = 0;
  private height: number = 0;
  private resizeObserver: ResizeObserver;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('CanvasManager: failed to get 2d rendering context');
    }
    this.ctx = ctx;

    // Set up a ResizeObserver so we react to layout changes automatically.
    this.resizeObserver = new ResizeObserver(() => {
      this.handleResize();
    });
    this.resizeObserver.observe(this.canvas);

    // Initial sizing
    this.handleResize();
  }

  // -----------------------------------------------------------------------
  // Public getters
  // -----------------------------------------------------------------------

  /** The 2D rendering context. */
  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  /** Logical (CSS-pixel) width of the canvas. */
  getWidth(): number {
    return this.width;
  }

  /** Logical (CSS-pixel) height of the canvas. */
  getHeight(): number {
    return this.height;
  }

  /** Current device pixel ratio. */
  getDPR(): number {
    return this.dpr;
  }

  // -----------------------------------------------------------------------
  // Resize handling
  // -----------------------------------------------------------------------

  private handleResize(): void {
    this.dpr = window.devicePixelRatio || 1;

    // Read the CSS layout size
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;

    // Size the backing store to match physical pixels
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);

    // Scale the context so that 1 unit = 1 CSS pixel
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  // -----------------------------------------------------------------------
  // Drawing helpers
  // -----------------------------------------------------------------------

  /** Clear the entire canvas (respects DPR). */
  clear(): void {
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();
  }

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  /** Disconnect the resize observer and release resources. */
  destroy(): void {
    this.resizeObserver.disconnect();
  }
}
