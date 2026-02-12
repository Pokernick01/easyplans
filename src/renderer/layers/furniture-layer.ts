import type { FurnitureItem } from '@/types/elements';
import type { StampDefinition } from '@/types/library';

// ---------------------------------------------------------------------------
// Furniture layer -- draws placed stamp instances
// ---------------------------------------------------------------------------

/**
 * Render all furniture items by delegating to their stamp draw functions.
 *
 * @param ctx            Pre-transformed canvas context (1 unit = 1 m).
 * @param items          All furniture items on the current floor.
 * @param stampRegistry  Map of stampId -> StampDefinition.
 * @param pixelsPerMeter Camera zoom for scale-independent rendering.
 * @param selectedIds    IDs of currently selected elements.
 */
export function renderFurniture(
  ctx: CanvasRenderingContext2D,
  items: FurnitureItem[],
  stampRegistry: Map<string, StampDefinition>,
  pixelsPerMeter: number,
  selectedIds: string[],
): void {
  const px = 1 / pixelsPerMeter;
  const selectedSet = new Set(selectedIds);

  for (const item of items) {
    const stamp = stampRegistry.get(item.stampId);
    if (!stamp) continue;

    const scaledWidth = item.width * item.scale;
    const scaledDepth = item.depth * item.scale;

    ctx.save();

    // Position and rotate
    ctx.translate(item.position.x, item.position.y);
    ctx.rotate((item.rotation * Math.PI) / 180);

    // ------------------------------------------------------------------
    // Draw the stamp
    // ------------------------------------------------------------------
    if (item.color) {
      // Draw the stamp first, then apply a color tint overlay
      stamp.draw(ctx, scaledWidth, scaledDepth);

      // Tint: draw a colored rectangle using 'source-atop' so it only
      // covers the pixels already drawn by the stamp
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = item.color;
      ctx.globalAlpha = 0.35;
      ctx.fillRect(-scaledWidth / 2, -scaledDepth / 2, scaledWidth, scaledDepth);
      ctx.globalAlpha = 1.0;
      ctx.globalCompositeOperation = 'source-over';
    } else {
      stamp.draw(ctx, scaledWidth, scaledDepth);
    }

    // ------------------------------------------------------------------
    // Selection highlight -- dashed bounding box
    // ------------------------------------------------------------------
    if (selectedSet.has(item.id)) {
      ctx.strokeStyle = '#4a9eff';
      ctx.lineWidth = 2 * px;
      ctx.setLineDash([6 * px, 4 * px]);
      ctx.strokeRect(
        -scaledWidth / 2,
        -scaledDepth / 2,
        scaledWidth,
        scaledDepth,
      );
      ctx.setLineDash([]);
    }

    ctx.restore();
  }
}
