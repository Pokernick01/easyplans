// ---------------------------------------------------------------------------
// RenderLoop -- requestAnimationFrame loop with dirty-flag batching
// ---------------------------------------------------------------------------

export class RenderLoop {
  private frameId: number = 0;
  private renderFn: () => void;
  private running: boolean = false;
  private dirty: boolean = false;

  constructor(renderFn: () => void) {
    this.renderFn = renderFn;
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /** Begin the animation-frame loop. */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.dirty = true; // render at least once on start
    this.tick();
  }

  /** Cancel the animation-frame loop. */
  stop(): void {
    this.running = false;
    if (this.frameId !== 0) {
      cancelAnimationFrame(this.frameId);
      this.frameId = 0;
    }
  }

  /**
   * Mark that a render is needed.
   *
   * The actual render will happen on the next animation frame -- multiple
   * calls between frames are coalesced into a single render.
   */
  requestFrame(): void {
    this.dirty = true;
  }

  // -----------------------------------------------------------------------
  // Internal
  // -----------------------------------------------------------------------

  private tick = (): void => {
    if (!this.running) return;

    if (this.dirty) {
      this.dirty = false;
      this.renderFn();
    }

    this.frameId = requestAnimationFrame(this.tick);
  };
}
