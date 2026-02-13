import { useCallback } from 'react';
import { useProjectStore } from '@/store/project-store';
import { t } from '@/utils/i18n';
import type { Project } from '@/types/project';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LOCAL_STORAGE_KEY = 'easyplans-autosave';
const FILE_EXTENSION = '.easyplan';

// ---------------------------------------------------------------------------
// Security: strip __proto__ and constructor keys to prevent prototype pollution
// ---------------------------------------------------------------------------

function sanitizeJSON(text: string): unknown {
  return JSON.parse(text, (key, value) => {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      return undefined; // strip dangerous keys
    }
    return value;
  });
}

/** Validate that a parsed object looks like a valid Project. */
function isValidProject(data: unknown): data is Project {
  if (data == null || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    Array.isArray(obj.floors) &&
    obj.floors.every(
      (f: unknown) =>
        f != null &&
        typeof f === 'object' &&
        typeof (f as Record<string, unknown>).elements === 'object',
    )
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Hook providing project file I/O operations:
 * - loadProject: open a file picker and load a project JSON file
 * - saveProject: serialize the current project and trigger a file download
 * - autoSave: persist the current project to localStorage
 * - autoLoad: restore a project from localStorage (returns null if none)
 */
export function useProjectFile() {
  const store = useProjectStore;

  // -----------------------------------------------------------------------
  // Load project from file picker
  // -----------------------------------------------------------------------

  const loadProject = useCallback((): void => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = `${FILE_EXTENSION},.json`;
    input.style.display = 'none';

    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        try {
          const text = reader.result as string;
          const data = sanitizeJSON(text);

          if (!isValidProject(data)) {
            console.error('Invalid project file: missing required fields.');
            return;
          }

          store.getState().loadProject(data);
        } catch (err) {
          console.error('Failed to parse project file:', err);
        }
      };
      reader.readAsText(file);
    });

    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  }, []);

  // -----------------------------------------------------------------------
  // Save project to file download
  // -----------------------------------------------------------------------

  const saveProject = useCallback((): void => {
    const json = store.getState().getProjectJSON();
    const project = store.getState().project;

    // Default filename from project name
    const defaultName = project.name.replace(/[^a-zA-Z0-9_\-\s]/g, '').replace(/\s+/g, '_').slice(0, 200) || 'project';

    // Prompt user for filename (translated)
    const userInput = window.prompt(
      t('ui.saveAs'),
      defaultName,
    );
    if (userInput === null) return; // User cancelled

    const safeName = userInput.trim().replace(/[^a-zA-Z0-9_\-\s]/g, '').replace(/\s+/g, '_').slice(0, 200) || defaultName;

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeName}${FILE_EXTENSION}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  // -----------------------------------------------------------------------
  // Auto-save to localStorage
  // -----------------------------------------------------------------------

  const autoSave = useCallback((): void => {
    try {
      const json = store.getState().getProjectJSON();
      localStorage.setItem(LOCAL_STORAGE_KEY, json);
    } catch (err) {
      console.error('Auto-save failed:', err);
    }
  }, []);

  // -----------------------------------------------------------------------
  // Auto-load from localStorage
  // -----------------------------------------------------------------------

  const autoLoad = useCallback((): Project | null => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return null;

      const data = sanitizeJSON(raw);

      if (!isValidProject(data)) {
        return null;
      }

      return data;
    } catch {
      return null;
    }
  }, []);

  return { loadProject, saveProject, autoSave, autoLoad };
}
