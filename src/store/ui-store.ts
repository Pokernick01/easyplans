import { create } from 'zustand';
import type { Point } from '@/types/geometry.ts';
import type { ToolType, ToolState } from '@/types/tools.ts';
import type { ViewMode, FacadeDirection } from '@/types/project.ts';
import type { ArchLineStyle, DoorStyle, WindowStyle, StairStyle } from '@/types/elements.ts';
import type { Language } from '@/utils/i18n.ts';

// ---------------------------------------------------------------------------
// UI state & actions interface
// ---------------------------------------------------------------------------

interface UIState {
  activeTool: ToolType;
  toolState: ToolState;
  viewMode: ViewMode;
  zoom: number;
  panOffset: Point;
  selectedIds: string[];
  hoveredId: string | null;
  showGrid: boolean;
  snapEnabled: boolean;
  gridSize: number; // meters
  cursorWorldPos: Point;
  isDirty: boolean;
  showDimensions: boolean;
  activeStampId: string | null;
  cutLineStart: Point | null;
  cutLineEnd: Point | null;
  facadeDirection: FacadeDirection;
  exportDialogOpen: boolean;
  supportDialogOpen: boolean;
  rightSidebarOpen: boolean;
  leftSidebarOpen: boolean;
  isMobile: boolean;
  activeArchLineStyle: ArchLineStyle;
  activeDoorStyle: DoorStyle;
  activeWindowStyle: WindowStyle;
  activeStairStyle: StairStyle;
  isoRotation: number; // degrees, rotation around vertical axis for isometric view
  clipboard: string | null; // JSON string of copied elements
  language: Language;
}

interface UIActions {
  setTool: (tool: ToolType) => void;
  setToolState: (state: ToolState) => void;
  setViewMode: (mode: ViewMode) => void;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setPan: (offset: Point) => void;
  panBy: (dx: number, dy: number) => void;
  select: (ids: string[]) => void;
  addToSelection: (id: string) => void;
  clearSelection: () => void;
  setHovered: (id: string | null) => void;
  setCursorPos: (pos: Point) => void;
  markDirty: () => void;
  markClean: () => void;
  toggleGrid: () => void;
  toggleSnap: () => void;
  toggleDimensions: () => void;
  setActiveStamp: (stampId: string | null) => void;
  setCutLine: (start: Point | null, end: Point | null) => void;
  setFacadeDirection: (dir: FacadeDirection) => void;
  setExportDialogOpen: (open: boolean) => void;
  setSupportDialogOpen: (open: boolean) => void;
  toggleRightSidebar: () => void;
  toggleLeftSidebar: () => void;
  setIsMobile: (isMobile: boolean) => void;
  setArchLineStyle: (style: ArchLineStyle) => void;
  setDoorStyle: (style: DoorStyle) => void;
  setWindowStyle: (style: WindowStyle) => void;
  setStairStyle: (style: StairStyle) => void;
  setIsoRotation: (angle: number) => void;
  setClipboard: (data: string | null) => void;
  setLanguage: (lang: Language) => void;
}

// ---------------------------------------------------------------------------
// Zoom constants
// ---------------------------------------------------------------------------

const ZOOM_IN_FACTOR = 1.2;
const ZOOM_OUT_FACTOR = 1 / ZOOM_IN_FACTOR;
const MIN_ZOOM = 0.05;
const MAX_ZOOM = 50;

function clampZoom(z: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
}

// ---------------------------------------------------------------------------
// Store (not tracked by undo/redo)
// ---------------------------------------------------------------------------

export const useUIStore = create<UIState & UIActions>()((set) => ({
  // ---- Initial state ----
  activeTool: 'select',
  toolState: 'idle',
  viewMode: 'plan',
  zoom: 1.0,
  panOffset: { x: 0, y: 0 },
  selectedIds: [],
  hoveredId: null,
  showGrid: true,
  snapEnabled: true,
  gridSize: 1.0,
  cursorWorldPos: { x: 0, y: 0 },
  isDirty: true,
  showDimensions: true,
  activeStampId: null,
  cutLineStart: null,
  cutLineEnd: null,
  facadeDirection: 'south',
  exportDialogOpen: false,
  supportDialogOpen: false,
  rightSidebarOpen: true,
  leftSidebarOpen: true,
  isMobile: typeof window !== 'undefined' && window.innerWidth < 768,
  activeArchLineStyle: 'colindancia',
  activeDoorStyle: 'single',
  activeWindowStyle: 'single',
  activeStairStyle: 'straight',
  isoRotation: 45,
  clipboard: null,
  language: 'es',

  // ---- Actions ----

  setTool: (tool) =>
    set({ activeTool: tool, toolState: 'idle' }),

  setToolState: (state) =>
    set({ toolState: state }),

  setViewMode: (mode) =>
    set({ viewMode: mode }),

  setZoom: (zoom) =>
    set({ zoom: clampZoom(zoom) }),

  zoomIn: () =>
    set((s) => ({ zoom: clampZoom(s.zoom * ZOOM_IN_FACTOR) })),

  zoomOut: () =>
    set((s) => ({ zoom: clampZoom(s.zoom * ZOOM_OUT_FACTOR) })),

  setPan: (offset) =>
    set({ panOffset: offset }),

  panBy: (dx, dy) =>
    set((s) => ({
      panOffset: { x: s.panOffset.x + dx, y: s.panOffset.y + dy },
    })),

  select: (ids) =>
    set({ selectedIds: ids }),

  addToSelection: (id) =>
    set((s) => ({
      selectedIds: s.selectedIds.includes(id)
        ? s.selectedIds
        : [...s.selectedIds, id],
    })),

  clearSelection: () =>
    set({ selectedIds: [] }),

  setHovered: (id) =>
    set({ hoveredId: id }),

  setCursorPos: (pos) =>
    set({ cursorWorldPos: pos }),

  markDirty: () =>
    set({ isDirty: true }),

  markClean: () =>
    set({ isDirty: false }),

  toggleGrid: () =>
    set((s) => ({ showGrid: !s.showGrid })),

  toggleSnap: () =>
    set((s) => ({ snapEnabled: !s.snapEnabled })),

  toggleDimensions: () =>
    set((s) => ({ showDimensions: !s.showDimensions })),

  setActiveStamp: (stampId) =>
    set({ activeStampId: stampId }),

  setCutLine: (start, end) =>
    set({ cutLineStart: start, cutLineEnd: end }),

  setFacadeDirection: (dir) =>
    set({ facadeDirection: dir }),

  setExportDialogOpen: (open) =>
    set({ exportDialogOpen: open }),

  setSupportDialogOpen: (open) =>
    set({ supportDialogOpen: open }),

  toggleRightSidebar: () =>
    set((s) => ({ rightSidebarOpen: !s.rightSidebarOpen })),

  toggleLeftSidebar: () =>
    set((s) => ({ leftSidebarOpen: !s.leftSidebarOpen })),

  setIsMobile: (isMobile) =>
    set({ isMobile }),

  setArchLineStyle: (style) =>
    set({ activeArchLineStyle: style }),

  setDoorStyle: (style) =>
    set({ activeDoorStyle: style }),

  setWindowStyle: (style) =>
    set({ activeWindowStyle: style }),

  setStairStyle: (style) =>
    set({ activeStairStyle: style }),

  setIsoRotation: (angle) =>
    set({ isoRotation: angle }),

  setClipboard: (data) =>
    set({ clipboard: data }),

  setLanguage: (lang) =>
    set({ language: lang }),
}));
