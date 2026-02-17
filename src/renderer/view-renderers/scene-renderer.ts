import type { DerivedSceneGeometry } from '@/engine/geometry/geometry-engine.ts';
import { renderCrossSection } from '@/renderer/view-renderers/cross-section-renderer.ts';
import { renderFacade } from '@/renderer/view-renderers/facade-renderer.ts';
import { renderIsometric } from '@/renderer/isometric-renderer.ts';
import type { FurnitureItem } from '@/types/elements.ts';
import type { FacadeDirection } from '@/types/project.ts';

const DIR_LABELS: Record<FacadeDirection, string> = {
  north: 'Norte / North',
  south: 'Sur / South',
  east: 'Este / East',
  west: 'Oeste / West',
};

/**
 * Render any non-plan derived scene geometry using a single dispatch path.
 */
export function renderDerivedScene(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  scene: Exclude<DerivedSceneGeometry, { kind: 'plan' }>,
  pixelsPerMeter: number,
  furniture: FurnitureItem[],
  frontDirection: FacadeDirection,
  northAngle: number,
): void {
  if (scene.kind === 'facade') {
    renderFacade(
      ctx,
      canvasWidth,
      canvasHeight,
      scene.elements,
      pixelsPerMeter,
      DIR_LABELS[scene.direction],
    );
    return;
  }

  if (scene.kind === 'section') {
    renderCrossSection(
      ctx,
      canvasWidth,
      canvasHeight,
      scene.elements,
      pixelsPerMeter,
      furniture,
      scene.cutCoordinate,
      DIR_LABELS[scene.direction],
      scene.cutAxis,
      scene.cutLine,
    );
    return;
  }

  renderIsometric(ctx, canvasWidth, canvasHeight, scene.faces, frontDirection, northAngle);
}
