import type { Point } from '@/types/geometry';
import type {
  Wall,
  Door,
  Window,
  Room,
  FurnitureItem,
  TextLabel,
  DimensionLine,
  AnyElement,
} from '@/types/elements';
import type { StampDefinition } from '@/types/library';
import type { Camera } from '@/renderer/camera';
import type { ToolPreviewData } from '@/renderer/layers/tool-preview-layer';

import { renderGrid } from '@/renderer/layers/grid-layer';
import { renderWalls } from '@/renderer/layers/wall-layer';
import { renderOpenings } from '@/renderer/layers/opening-layer';
import { renderRooms } from '@/renderer/layers/room-layer';
import { renderFurniture } from '@/renderer/layers/furniture-layer';
import { renderDimensions } from '@/renderer/layers/dimension-layer';
import { renderTexts } from '@/renderer/layers/text-layer';
import { renderSelection } from '@/renderer/layers/selection-layer';
import { renderToolPreview } from '@/renderer/layers/tool-preview-layer';

// ---------------------------------------------------------------------------
// Floor plan data bundle -- everything the renderer needs for one frame
// ---------------------------------------------------------------------------

export interface FloorPlanRenderData {
  walls: Wall[];
  doors: Door[];
  windows: Window[];
  rooms: Room[];
  furniture: FurnitureItem[];
  texts: TextLabel[];
  dimensions: DimensionLine[];
  selectedElements: AnyElement[];
  hoveredElement: AnyElement | null;
  stampRegistry: Map<string, StampDefinition>;
  selectedIds: string[];
  showGrid: boolean;
  showDimensions: boolean;
  gridSizeMajor: number;
  gridSizeMinor: number;
  toolPreview: ToolPreviewData | null;
  boxSelect?: { start: Point; end: Point };
}

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------

/**
 * Render a complete floor plan frame.
 *
 * Layers are drawn in strict back-to-front order:
 *   1. Grid
 *   2. Rooms (fills + patterns + labels)
 *   3. Walls (with door/window gaps)
 *   4. Openings (door leaves, swing arcs, window glass)
 *   5. Furniture
 *   6. Dimensions
 *   7. Text labels
 *   8. Selection highlights / handles
 *   9. Tool preview (ghost shapes)
 *
 * @param ctx    The 2D context (identity transform assumed on entry).
 * @param camera Camera providing world-to-screen transform.
 * @param data   All renderable data for the current floor.
 */
export function renderFloorPlan(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  data: FloorPlanRenderData,
): void {
  const ppm = camera.getPixelsPerMeter();
  const visibleBounds = camera.getVisibleBounds();

  // ------------------------------------------------------------------
  // Apply the camera transform so all subsequent draw calls work in
  // world coordinates (meters).
  // ------------------------------------------------------------------
  camera.applyTransform(ctx);

  // ------------------------------------------------------------------
  // 1. Grid
  // ------------------------------------------------------------------
  if (data.showGrid) {
    renderGrid(
      ctx,
      visibleBounds,
      data.gridSizeMajor,
      data.gridSizeMinor,
      ppm,
    );
  }

  // ------------------------------------------------------------------
  // 2. Rooms
  // ------------------------------------------------------------------
  renderRooms(ctx, data.rooms, ppm);

  // ------------------------------------------------------------------
  // 3. Walls (with door/window gap cutting)
  // ------------------------------------------------------------------
  renderWalls(ctx, data.walls, data.doors, data.windows, ppm);

  // ------------------------------------------------------------------
  // 4. Openings (door leaves, arcs, window glass)
  // ------------------------------------------------------------------
  renderOpenings(ctx, data.doors, data.windows, data.walls, ppm);

  // ------------------------------------------------------------------
  // 5. Furniture
  // ------------------------------------------------------------------
  renderFurniture(
    ctx,
    data.furniture,
    data.stampRegistry,
    ppm,
    data.selectedIds,
  );

  // ------------------------------------------------------------------
  // 6. Dimensions
  // ------------------------------------------------------------------
  renderDimensions(
    ctx,
    data.dimensions,
    data.walls,
    data.showDimensions,
    ppm,
  );

  // ------------------------------------------------------------------
  // 7. Text labels
  // ------------------------------------------------------------------
  renderTexts(ctx, data.texts, ppm);

  // ------------------------------------------------------------------
  // 8. Selection highlights / handles
  // ------------------------------------------------------------------
  renderSelection(
    ctx,
    data.selectedElements,
    data.hoveredElement,
    ppm,
    data.boxSelect,
  );

  // ------------------------------------------------------------------
  // 9. Tool preview
  // ------------------------------------------------------------------
  renderToolPreview(ctx, data.toolPreview, ppm);

  // ------------------------------------------------------------------
  // Reset transform so subsequent screen-space drawing (HUD, etc.) is
  // not affected.
  // ------------------------------------------------------------------
  camera.resetTransform(ctx);
}
