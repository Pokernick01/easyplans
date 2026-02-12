import { useEffect } from 'react';
import { useUIStore } from '@/store/ui-store';
import { useProjectStore } from '@/store/project-store';
import { useProjectFile } from '@/hooks/useProjectFile';
import type { ToolType } from '@/types/tools';

// ---------------------------------------------------------------------------
// Keyboard shortcut map
// ---------------------------------------------------------------------------

/**
 * Map of key identifiers to tool types.
 * Supports both letter shortcuts and number keys.
 */
const TOOL_KEYS: Record<string, ToolType> = {
  v: 'select',
  '1': 'select',
  w: 'wall',
  '2': 'wall',
  d: 'door',
  '3': 'door',
  n: 'window',
  '4': 'window',
  r: 'room',
  '5': 'room',
  m: 'dimension',
  '6': 'dimension',
  t: 'text',
  '7': 'text',
  f: 'stamp',
  '8': 'stamp',
  e: 'eraser',
  '9': 'eraser',
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Register global keyboard shortcuts for the EasyPlans application.
 *
 * Call this hook once at the top level of the app (e.g. in App.tsx).
 * It attaches a `keydown` listener to `window` and dispatches actions
 * to the UI store and project store accordingly.
 */
export function useKeyboardShortcuts(): void {
  const { saveProject, loadProject } = useProjectFile();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      // Ignore shortcuts when the user is typing in an input or textarea
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      const ctrl = event.ctrlKey || event.metaKey;
      const shift = event.shiftKey;

      // ----- Ctrl+Z: Undo -----
      if (ctrl && key === 'z' && !shift) {
        event.preventDefault();
        useProjectStore.temporal.getState().undo();
        return;
      }

      // ----- Ctrl+Y or Ctrl+Shift+Z: Redo -----
      if ((ctrl && key === 'y') || (ctrl && shift && key === 'z')) {
        event.preventDefault();
        useProjectStore.temporal.getState().redo();
        return;
      }

      // ----- Ctrl+S: Save -----
      if (ctrl && key === 's') {
        event.preventDefault();
        saveProject();
        return;
      }

      // ----- Ctrl+O: Open -----
      if (ctrl && key === 'o') {
        event.preventDefault();
        loadProject();
        return;
      }

      // ----- Ctrl+N: New project -----
      if (ctrl && key === 'n') {
        event.preventDefault();
        useProjectStore.getState().newProject();
        return;
      }

      // Skip modifier combos for remaining shortcuts
      if (ctrl || event.altKey) return;

      // ----- Delete / Backspace: Remove selected -----
      if (key === 'delete' || key === 'backspace') {
        event.preventDefault();
        const { selectedIds, clearSelection } = useUIStore.getState();
        if (selectedIds.length > 0) {
          const { project, removeElements } = useProjectStore.getState();
          removeElements(project.activeFloorIndex, selectedIds);
          clearSelection();
        }
        return;
      }

      // ----- Escape: Cancel / Deselect -----
      if (key === 'escape') {
        event.preventDefault();
        const ui = useUIStore.getState();
        if (ui.selectedIds.length > 0) {
          ui.clearSelection();
        }
        if (ui.toolState !== 'idle') {
          ui.setToolState('idle');
        }
        ui.setTool('select');
        return;
      }

      // ----- G: Toggle grid -----
      if (key === 'g') {
        event.preventDefault();
        useUIStore.getState().toggleGrid();
        return;
      }

      // ----- S: Toggle snap -----
      if (key === 's') {
        event.preventDefault();
        useUIStore.getState().toggleSnap();
        return;
      }

      // ----- +/=: Zoom in -----
      if (key === '+' || key === '=') {
        event.preventDefault();
        useUIStore.getState().zoomIn();
        return;
      }

      // ----- -: Zoom out -----
      if (key === '-') {
        event.preventDefault();
        useUIStore.getState().zoomOut();
        return;
      }

      // ----- 0: Reset zoom -----
      if (key === '0') {
        event.preventDefault();
        useUIStore.getState().setZoom(1.0);
        return;
      }

      // ----- Tool shortcuts (letter + number keys) -----
      const tool = TOOL_KEYS[key];
      if (tool) {
        event.preventDefault();
        useUIStore.getState().setTool(tool);
        return;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [saveProject, loadProject]);
}
