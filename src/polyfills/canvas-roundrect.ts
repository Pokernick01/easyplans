// CanvasRenderingContext2D.roundRect fallback for browsers that do not support it.
if (typeof window !== 'undefined' && typeof CanvasRenderingContext2D !== 'undefined') {
  const proto = CanvasRenderingContext2D.prototype as CanvasRenderingContext2D & {
    roundRect?: (
      x: number,
      y: number,
      w: number,
      h: number,
      radii?: number | number[],
    ) => CanvasRenderingContext2D;
  };

  if (typeof proto.roundRect !== 'function') {
    proto.roundRect = function roundRectFallback(
      this: CanvasRenderingContext2D,
      x: number,
      y: number,
      w: number,
      h: number,
      radii: number | number[] = 0,
    ): CanvasRenderingContext2D {
      const r = Array.isArray(radii) ? (radii[0] ?? 0) : radii;
      const cr = Math.max(0, Math.min(Math.abs(r), Math.min(Math.abs(w), Math.abs(h)) / 2));

      this.moveTo(x + cr, y);
      this.lineTo(x + w - cr, y);
      this.quadraticCurveTo(x + w, y, x + w, y + cr);
      this.lineTo(x + w, y + h - cr);
      this.quadraticCurveTo(x + w, y + h, x + w - cr, y + h);
      this.lineTo(x + cr, y + h);
      this.quadraticCurveTo(x, y + h, x, y + h - cr);
      this.lineTo(x, y + cr);
      this.quadraticCurveTo(x, y, x + cr, y);
      return this;
    };
  }
}
