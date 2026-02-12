import { create } from 'zustand';
import { temporal } from 'zundo';
import { generateId } from '@/utils/id.ts';
import { DEFAULT_FLOOR_HEIGHT } from '@/utils/constants.ts';
import { t } from '@/utils/i18n.ts';
import type { Project, Floor, ScaleRatio } from '@/types/project.ts';
import type {
  Wall,
  Door,
  Window,
  Room,
  FurnitureItem,
  TextLabel,
  DimensionLine,
  ArchLine,
  Stair,
  AnyElement,
} from '@/types/elements.ts';

// ---------------------------------------------------------------------------
// Store state & actions interface
// ---------------------------------------------------------------------------

interface ProjectState {
  project: Project;
}

interface ProjectActions {
  // --- Element creation (returns new ID) ---
  addWall: (wall: Omit<Wall, 'id' | 'type'>) => string;
  addDoor: (door: Omit<Door, 'id' | 'type'>) => string;
  addWindow: (win: Omit<Window, 'id' | 'type'>) => string;
  addRoom: (room: Omit<Room, 'id' | 'type'>) => string;
  addFurniture: (item: Omit<FurnitureItem, 'id' | 'type'>) => string;
  addText: (label: Omit<TextLabel, 'id' | 'type'>) => string;
  addDimension: (dim: Omit<DimensionLine, 'id' | 'type'>) => string;
  addArchLine: (line: Omit<ArchLine, 'id' | 'type'>) => string;
  addStair: (stair: Omit<Stair, 'id' | 'type'>) => string;

  // --- Element mutation ---
  updateElement: (floorIndex: number, id: string, patch: Partial<AnyElement>) => void;
  removeElement: (floorIndex: number, id: string) => void;
  removeElements: (floorIndex: number, ids: string[]) => void;
  moveElement: (floorIndex: number, id: string, dx: number, dy: number) => void;

  // --- Project-level ---
  setScale: (scale: ScaleRatio) => void;
  setProjectMeta: (meta: Partial<{ name: string; author: string }>) => void;
  addFloor: () => void;
  duplicateFloor: (index: number) => void;
  removeFloor: (index: number) => void;
  renameFloor: (index: number, name: string) => void;
  setActiveFloor: (index: number) => void;
  loadProject: (data: Project) => void;
  getProjectJSON: () => string;
  newProject: (name?: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createDefaultProject(name = 'Untitled Project'): Project {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    name,
    author: '',
    createdAt: now,
    updatedAt: now,
    units: 'meters',
    scale: '1:100',
    paperSize: 'A4',
    floors: [
      {
        id: generateId(),
        name: t('floor.ground'),
        level: 0,
        height: DEFAULT_FLOOR_HEIGHT,
        elements: {},
      },
    ],
    activeFloorIndex: 0,
  };
}

/** Return a shallow copy of the floors array with one floor's elements updated. */
function updateFloorElements(
  floors: Floor[],
  floorIndex: number,
  updater: (elements: Record<string, AnyElement>) => Record<string, AnyElement>,
): Floor[] {
  return floors.map((floor, i) =>
    i === floorIndex
      ? { ...floor, elements: updater(floor.elements) }
      : floor,
  );
}

/** Stamp the updatedAt field with current time. */
function touch(project: Project): Project {
  return { ...project, updatedAt: new Date().toISOString() };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useProjectStore = create<ProjectState & ProjectActions>()(
  temporal(
    (set, get) => ({
      // ---- Initial state ----
      project: createDefaultProject(),

      // ----------------------------------------------------------------
      // Element creation
      // ----------------------------------------------------------------

      addWall: (wall) => {
        const id = generateId();
        set((state) => ({
          project: touch({
            ...state.project,
            floors: updateFloorElements(
              state.project.floors,
              wall.floorIndex,
              (els) => ({ ...els, [id]: { ...wall, id, type: 'wall' as const } }),
            ),
          }),
        }));
        return id;
      },

      addDoor: (door) => {
        const id = generateId();
        set((state) => ({
          project: touch({
            ...state.project,
            floors: updateFloorElements(
              state.project.floors,
              door.floorIndex,
              (els) => ({ ...els, [id]: { ...door, id, type: 'door' as const } }),
            ),
          }),
        }));
        return id;
      },

      addWindow: (win) => {
        const id = generateId();
        set((state) => ({
          project: touch({
            ...state.project,
            floors: updateFloorElements(
              state.project.floors,
              win.floorIndex,
              (els) => ({ ...els, [id]: { ...win, id, type: 'window' as const } }),
            ),
          }),
        }));
        return id;
      },

      addRoom: (room) => {
        const id = generateId();
        set((state) => ({
          project: touch({
            ...state.project,
            floors: updateFloorElements(
              state.project.floors,
              room.floorIndex,
              (els) => ({ ...els, [id]: { ...room, id, type: 'room' as const } }),
            ),
          }),
        }));
        return id;
      },

      addFurniture: (item) => {
        const id = generateId();
        set((state) => ({
          project: touch({
            ...state.project,
            floors: updateFloorElements(
              state.project.floors,
              item.floorIndex,
              (els) => ({
                ...els,
                [id]: { ...item, id, type: 'furniture' as const },
              }),
            ),
          }),
        }));
        return id;
      },

      addText: (label) => {
        const id = generateId();
        set((state) => ({
          project: touch({
            ...state.project,
            floors: updateFloorElements(
              state.project.floors,
              label.floorIndex,
              (els) => ({ ...els, [id]: { ...label, id, type: 'text' as const } }),
            ),
          }),
        }));
        return id;
      },

      addDimension: (dim) => {
        const id = generateId();
        set((state) => ({
          project: touch({
            ...state.project,
            floors: updateFloorElements(
              state.project.floors,
              dim.floorIndex,
              (els) => ({
                ...els,
                [id]: { ...dim, id, type: 'dimension' as const },
              }),
            ),
          }),
        }));
        return id;
      },

      addArchLine: (line) => {
        const id = generateId();
        set((state) => ({
          project: touch({
            ...state.project,
            floors: updateFloorElements(
              state.project.floors,
              line.floorIndex,
              (els) => ({
                ...els,
                [id]: { ...line, id, type: 'archline' as const },
              }),
            ),
          }),
        }));
        return id;
      },

      addStair: (stair) => {
        const id = generateId();
        set((state) => ({
          project: touch({
            ...state.project,
            floors: updateFloorElements(
              state.project.floors,
              stair.floorIndex,
              (els) => ({
                ...els,
                [id]: { ...stair, id, type: 'stair' as const },
              }),
            ),
          }),
        }));
        return id;
      },

      // ----------------------------------------------------------------
      // Element mutation
      // ----------------------------------------------------------------

      updateElement: (floorIndex, id, patch) => {
        set((state) => ({
          project: touch({
            ...state.project,
            floors: updateFloorElements(
              state.project.floors,
              floorIndex,
              (els) => {
                const existing = els[id];
                if (!existing) return els;
                return { ...els, [id]: { ...existing, ...patch, id, type: existing.type } as AnyElement };
              },
            ),
          }),
        }));
      },

      removeElement: (floorIndex, id) => {
        set((state) => ({
          project: touch({
            ...state.project,
            floors: updateFloorElements(
              state.project.floors,
              floorIndex,
              (els) => {
                const { [id]: _, ...rest } = els;
                return rest;
              },
            ),
          }),
        }));
      },

      removeElements: (floorIndex, ids) => {
        set((state) => ({
          project: touch({
            ...state.project,
            floors: updateFloorElements(
              state.project.floors,
              floorIndex,
              (els) => {
                const toRemove = new Set(ids);
                const next: Record<string, AnyElement> = {};
                for (const [key, value] of Object.entries(els)) {
                  if (!toRemove.has(key)) {
                    next[key] = value;
                  }
                }
                return next;
              },
            ),
          }),
        }));
      },

      moveElement: (floorIndex, id, dx, dy) => {
        set((state) => ({
          project: touch({
            ...state.project,
            floors: updateFloorElements(
              state.project.floors,
              floorIndex,
              (els) => {
                const el = els[id];
                if (!el) return els;

                let moved: AnyElement;
                switch (el.type) {
                  case 'wall':
                  case 'dimension':
                  case 'archline':
                    moved = {
                      ...el,
                      start: { x: el.start.x + dx, y: el.start.y + dy },
                      end: { x: el.end.x + dx, y: el.end.y + dy },
                    };
                    break;
                  case 'furniture':
                  case 'text':
                  case 'stair':
                    moved = {
                      ...el,
                      position: {
                        x: el.position.x + dx,
                        y: el.position.y + dy,
                      },
                    };
                    break;
                  case 'room':
                    moved = {
                      ...el,
                      polygon: el.polygon.map((p) => ({
                        x: p.x + dx,
                        y: p.y + dy,
                      })),
                    };
                    break;
                  case 'door':
                  case 'window': {
                    // Move door/window along its wall by converting world delta to parametric shift
                    const parentWall = els[el.wallId];
                    if (parentWall && parentWall.type === 'wall') {
                      const wallDx = parentWall.end.x - parentWall.start.x;
                      const wallDy = parentWall.end.y - parentWall.start.y;
                      const wallLenSq = wallDx * wallDx + wallDy * wallDy;
                      if (wallLenSq > 0) {
                        // Project the drag delta onto the wall direction
                        const dot = dx * wallDx + dy * wallDy;
                        const dParam = dot / wallLenSq;
                        const newPos = Math.max(0, Math.min(1, el.position + dParam));
                        moved = { ...el, position: newPos };
                      } else {
                        moved = el;
                      }
                    } else {
                      moved = el;
                    }
                    break;
                  }
                  default:
                    moved = el;
                }

                return { ...els, [id]: moved };
              },
            ),
          }),
        }));
      },

      // ----------------------------------------------------------------
      // Project-level actions
      // ----------------------------------------------------------------

      setScale: (scale) => {
        set((state) => ({
          project: touch({ ...state.project, scale }),
        }));
      },

      setProjectMeta: (meta) => {
        set((state) => ({
          project: touch({ ...state.project, ...meta }),
        }));
      },

      addFloor: () => {
        set((state) => {
          const floorCount = state.project.floors.length;
          const newFloor: Floor = {
            id: generateId(),
            name: `${t('floor.level')} ${floorCount}`,
            level: floorCount,
            height: DEFAULT_FLOOR_HEIGHT,
            elements: {},
          };
          return {
            project: touch({
              ...state.project,
              floors: [...state.project.floors, newFloor],
            }),
          };
        });
      },

      duplicateFloor: (index) => {
        set((state) => {
          if (index < 0 || index >= state.project.floors.length) return state;
          const source = state.project.floors[index];

          // Build old-id → new-id mapping
          const idMap = new Map<string, string>();
          for (const oldId of Object.keys(source.elements)) {
            idMap.set(oldId, generateId());
          }

          // Deep-clone elements with new IDs and remapped references
          const newElements: Record<string, AnyElement> = {};
          for (const [oldId, el] of Object.entries(source.elements)) {
            const newId = idMap.get(oldId)!;
            const cloned = { ...el, id: newId } as AnyElement;

            // Remap wall references on doors, windows, rooms
            if (cloned.type === 'door' || cloned.type === 'window') {
              const mapped = idMap.get(cloned.wallId);
              if (mapped) (cloned as { wallId: string }).wallId = mapped;
            } else if (cloned.type === 'room') {
              (cloned as { wallIds: string[] }).wallIds = cloned.wallIds.map(
                (wid) => idMap.get(wid) ?? wid,
              );
              // Deep-copy polygon array
              (cloned as { polygon: { x: number; y: number }[] }).polygon = cloned.polygon.map(
                (p) => ({ ...p }),
              );
            } else if (cloned.type === 'wall') {
              // Deep-copy start/end points
              (cloned as { start: { x: number; y: number } }).start = { ...cloned.start };
              (cloned as { end: { x: number; y: number } }).end = { ...cloned.end };
            }

            newElements[newId] = cloned;
          }

          const newFloor: Floor = {
            id: generateId(),
            name: `${source.name} (copy)`,
            level: state.project.floors.length,
            height: source.height,
            elements: newElements,
          };

          const newFloors = [
            ...state.project.floors.slice(0, index + 1),
            newFloor,
            ...state.project.floors.slice(index + 1),
          ];

          return {
            project: touch({
              ...state.project,
              floors: newFloors,
              activeFloorIndex: index + 1,
            }),
          };
        });
      },

      removeFloor: (index) => {
        set((state) => {
          // Must keep at least one floor
          if (state.project.floors.length <= 1) return state;
          if (index < 0 || index >= state.project.floors.length) return state;

          const newFloors = state.project.floors.filter((_, i) => i !== index);
          // If the active floor was removed or is now out of bounds, adjust
          let newActiveIndex = state.project.activeFloorIndex;
          if (newActiveIndex >= newFloors.length) {
            newActiveIndex = newFloors.length - 1;
          }

          return {
            project: touch({
              ...state.project,
              floors: newFloors,
              activeFloorIndex: newActiveIndex,
            }),
          };
        });
      },

      renameFloor: (index, name) => {
        set((state) => {
          if (index < 0 || index >= state.project.floors.length) return state;
          const trimmed = name.trim();
          if (!trimmed) return state;

          const newFloors = state.project.floors.map((f, i) =>
            i === index ? { ...f, name: trimmed } : f,
          );
          return {
            project: touch({ ...state.project, floors: newFloors }),
          };
        });
      },

      setActiveFloor: (index) => {
        set((state) => {
          if (index < 0 || index >= state.project.floors.length) return state;
          return {
            project: { ...state.project, activeFloorIndex: index },
          };
        });
      },

      loadProject: (data) => {
        // Backward-compat: ensure walls have fillPattern (added in v1.1)
        for (const floor of data.floors) {
          for (const el of Object.values(floor.elements)) {
            if (el.type === 'wall') {
              const wall = el as Wall;
              if (!wall.fillPattern) {
                wall.fillPattern = 'solid';
              }
            }
          }
        }
        set({ project: data });
      },

      getProjectJSON: () => {
        return JSON.stringify(get().project, null, 2);
      },

      newProject: (name) => {
        set({ project: createDefaultProject(name) });
      },
    }),
    {
      limit: 100,
      partialize: (state) => ({ project: state.project }),
    },
  ),
);
