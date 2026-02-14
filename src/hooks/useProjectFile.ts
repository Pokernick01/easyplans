import { useCallback } from 'react';
import { useProjectStore } from '@/store/project-store';
import { t } from '@/utils/i18n';
import type { Project } from '@/types/project';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LOCAL_STORAGE_KEY = 'easyplans-autosave';
const FILE_EXTENSION = '.easyplan';

// Module-level file handle for "Save" (write to same file without picker)
let currentFileHandle: FileSystemFileHandle | null = null;

/** Check if the File System Access API is available */
function hasFileSystemAccess(): boolean {
  return typeof window !== 'undefined' && 'showSaveFilePicker' in window;
}

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

  const loadProject = useCallback(async (): Promise<void> => {
    // Try File System Access API first (Chrome/Edge)
    if (hasFileSystemAccess()) {
      try {
        const [handle] = await (window as unknown as { showOpenFilePicker: (opts: unknown) => Promise<FileSystemFileHandle[]> }).showOpenFilePicker({
          types: [{
            description: 'EasyPlans Project',
            accept: { 'application/json': [FILE_EXTENSION, '.json'] },
          }],
          multiple: false,
        });
        const file = await handle.getFile();
        const text = await file.text();
        const data = sanitizeJSON(text);
        if (!isValidProject(data)) {
          console.error('Invalid project file: missing required fields.');
          return;
        }
        currentFileHandle = handle; // Store handle so Save can write to the same file
        store.getState().loadProject(data);
        return;
      } catch (err) {
        // User cancelled or API error — fall through to legacy
        if ((err as Error).name === 'AbortError') return;
        console.warn('File System Access API failed, falling back to legacy:', err);
      }
    }

    // Legacy fallback
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

          currentFileHandle = null; // Legacy load has no handle
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

  /** Write JSON content to a FileSystemFileHandle */
  const writeToHandle = useCallback(async (handle: FileSystemFileHandle, json: string): Promise<void> => {
    const writable = await handle.createWritable();
    await writable.write(json);
    await writable.close();
  }, []);

  /** Open the native file picker and return the chosen handle (or null). */
  const pickSaveFile = useCallback(async (defaultName: string): Promise<FileSystemFileHandle | null> => {
    if (!hasFileSystemAccess()) return null;
    try {
      const handle = await (window as unknown as { showSaveFilePicker: (opts: unknown) => Promise<FileSystemFileHandle> }).showSaveFilePicker({
        suggestedName: `${defaultName}${FILE_EXTENSION}`,
        types: [{
          description: 'EasyPlans Project',
          accept: { 'application/json': [FILE_EXTENSION] },
        }],
      });
      return handle;
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.warn('showSaveFilePicker failed:', err);
      }
      return null;
    }
  }, []);

  /** Legacy save: prompt + download */
  const legacySave = useCallback((json: string, defaultName: string): void => {
    const userInput = window.prompt(t('ui.saveAs'), defaultName);
    if (userInput === null) return;
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

  const saveProject = useCallback(async (): Promise<void> => {
    const json = store.getState().getProjectJSON();
    const project = store.getState().project;
    const defaultName = project.name.replace(/[^a-zA-Z0-9_\-\s]/g, '').replace(/\s+/g, '_').slice(0, 200) || 'project';

    // 1. If we have a file handle, write directly (no dialog)
    if (currentFileHandle) {
      try {
        await writeToHandle(currentFileHandle, json);
        return;
      } catch (err) {
        console.warn('Failed to write to existing handle, falling back to picker:', err);
        currentFileHandle = null;
      }
    }

    // 2. Try native file picker
    if (hasFileSystemAccess()) {
      const handle = await pickSaveFile(defaultName);
      if (handle) {
        currentFileHandle = handle;
        await writeToHandle(handle, json);
        return;
      }
      return; // User cancelled
    }

    // 3. Legacy fallback
    legacySave(json, defaultName);
  }, [writeToHandle, pickSaveFile, legacySave]);

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
