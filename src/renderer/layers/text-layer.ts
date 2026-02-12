import type { TextLabel } from '@/types/elements';

// ---------------------------------------------------------------------------
// Text layer -- draws user-placed text labels on the floor plan
// ---------------------------------------------------------------------------

/**
 * Render text labels at their world-space positions.
 *
 * Font size in the TextLabel is stored in "plan points" -- a size relative to
 * the architectural drawing (not screen pixels). We convert to screen pixels
 * by dividing by pixelsPerMeter so the text scales correctly with the camera.
 *
 * @param ctx            Pre-transformed canvas context (1 unit = 1 m).
 * @param texts          All text labels on the current floor.
 * @param pixelsPerMeter Camera zoom for scale-independent rendering.
 */
export function renderTexts(
  ctx: CanvasRenderingContext2D,
  texts: TextLabel[],
  pixelsPerMeter: number,
): void {
  for (const label of texts) {
    ctx.save();

    // Move to the label anchor in world space
    ctx.translate(label.position.x, label.position.y);

    // Apply rotation (stored in degrees)
    if (label.rotation !== 0) {
      ctx.rotate((label.rotation * Math.PI) / 180);
    }

    // The fontSize is in "plan points". To render correctly in world
    // coordinates we need to scale to world units (meters), so we flip
    // to screen-pixel space, draw, then restore.
    ctx.scale(1 / pixelsPerMeter, 1 / pixelsPerMeter);

    const screenFontSize = label.fontSize;
    ctx.font = `${screenFontSize}px ${label.fontFamily}`;
    ctx.fillStyle = label.color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Handle multi-line text
    const lines = label.text.split('\n');
    const lineHeight = screenFontSize * 1.2;

    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], 0, i * lineHeight);
    }

    ctx.restore();
  }
}
