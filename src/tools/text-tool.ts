import type { Point } from '@/types/geometry';
import type { BaseTool } from './base-tool';
import { useProjectStore } from '@/store/project-store';
import { useUIStore } from '@/store/ui-store';

/**
 * Text placement tool.
 *
 * Click anywhere on the canvas to place a text label with a default value.
 * The user can then edit the text content via the properties panel.
 */
export class TextTool implements BaseTool {
  readonly name = 'text';
  readonly cursor = 'text';

  onActivate(): void {
    useUIStore.getState().setToolState('idle');
  }

  onDeactivate(): void {
    // Nothing to clean up.
  }

  onMouseDown(worldPos: Point, _screenPos: Point, _event: MouseEvent): void {
    const project = useProjectStore.getState();
    const ui = useUIStore.getState();
    const floorIndex = project.project.activeFloorIndex;

    project.addText({
      floorIndex,
      locked: false,
      visible: true,
      position: { x: worldPos.x, y: worldPos.y },
      text: 'Text',
      fontSize: 14,
      fontFamily: 'sans-serif',
      color: '#ffffff',
      rotation: 0,
    });

    ui.markDirty();
  }

  onMouseMove(_worldPos: Point, _screenPos: Point, _event: MouseEvent): void {
    // No preview needed for text placement.
  }

  onMouseUp(_worldPos: Point, _screenPos: Point, _event: MouseEvent): void {
    // Nothing to do on mouse-up.
  }

  onKeyDown(_event: KeyboardEvent): void {
    // No keyboard shortcuts for this tool.
  }

  getPreview(): { type: string; data: unknown } | null {
    return null;
  }
}
