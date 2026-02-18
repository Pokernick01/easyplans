import { useEffect, useMemo, useRef, useState } from 'react';
import { useUIStore } from '@/store/ui-store.ts';
import { useProjectStore } from '@/store/project-store.ts';
import { getActiveElements } from '@/store/selectors.ts';
import { useTranslation } from '@/utils/i18n.ts';
import type { ToolType } from '@/types/tools.ts';
import { formatAreaInUnit, formatInUnit, metersToUnit, unitDecimals, UNIT_LABELS } from '@/utils/units.ts';
import { polygonArea, polygonPerimeter } from '@/engine/math/polygon.ts';
import type { Room } from '@/types/elements.ts';

// ---------------------------------------------------------------------------
// FloorTab - individual floor tab with hover delete button
// ---------------------------------------------------------------------------

function FloorTab({
  name,
  isActive,
  canDelete,
  onSelect,
  onDelete,
  onDuplicate,
  onRename,
  actionsTitle,
  deleteTitle,
  duplicateTitle,
  renameTitle,
}: {
  name: string;
  isActive: boolean;
  canDelete: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onRename: (newName: string) => void;
  actionsTitle: string;
  deleteTitle: string;
  duplicateTitle: string;
  renameTitle: string;
}) {
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(name);
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const startRename = () => {
    setEditValue(name);
    setEditing(true);
  };

  const commitRename = () => {
    setEditing(false);
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== name) {
      onRename(trimmed);
    }
  };

  useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [menuOpen]);

  return (
    <div
      ref={rootRef}
      className="flex items-center relative cursor-pointer"
      style={{
        background: isActive ? 'rgba(45,106,79,0.08)' : hovered ? 'rgba(0,0,0,0.03)' : 'transparent',
        borderBottom: isActive ? '2px solid #2d6a4f' : '2px solid transparent',
        padding: '2px 4px 2px 8px',
        lineHeight: '20px',
        whiteSpace: 'nowrap',
        borderRadius: '3px 3px 0 0',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {editing ? (
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitRename();
            if (e.key === 'Escape') setEditing(false);
          }}
          autoFocus
          style={{
            background: '#ece8e1',
            border: '1px solid #2d6a4f',
            color: '#2c2c2c',
            fontSize: 11,
            padding: '0 4px',
            width: Math.max(50, editValue.length * 7 + 16),
            outline: 'none',
            borderRadius: 2,
          }}
        />
      ) : (
        <button
          type="button"
          onClick={onSelect}
          onDoubleClick={(e) => {
            e.stopPropagation();
            startRename();
          }}
          title={renameTitle}
          style={{
            background: 'none',
            border: 'none',
            color: isActive ? '#2d6a4f' : hovered ? '#2c2c2c' : '#8a8480',
            fontSize: 11,
            padding: 0,
            cursor: 'pointer',
          }}
        >
          {name}
        </button>
      )}
      {!editing && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
          title={actionsTitle}
          className="ep-btn-ghost cursor-pointer"
          style={{
            width: 18,
            height: 18,
            marginLeft: 4,
            borderRadius: 4,
            fontSize: 12,
            lineHeight: '18px',
            color: menuOpen ? '#2d6a4f' : '#8a8480',
            background: menuOpen ? 'rgba(45,106,79,0.10)' : 'transparent',
          }}
        >
          {'\u22EF'}
        </button>
      )}
      {menuOpen && !editing && (
        <div
          className="ep-inline-menu absolute z-40"
          style={{
            top: '100%',
            right: 0,
            marginTop: 4,
            minWidth: 128,
          }}
        >
          <button
            type="button"
            className="ep-dropdown-item"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(false);
              startRename();
            }}
          >
            {renameTitle}
          </button>
          <button
            type="button"
            className="ep-dropdown-item"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(false);
              onDuplicate();
            }}
          >
            {duplicateTitle}
          </button>
          {canDelete && (
            <button
              type="button"
              className="ep-dropdown-item"
              style={{ color: '#b85c38', fontWeight: 600 }}
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                onDelete();
              }}
            >
              {deleteTitle}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// BottomBar
// ---------------------------------------------------------------------------

export function BottomBar() {
  const cursorWorldPos = useUIStore((s) => s.cursorWorldPos);
  const activeTool = useUIStore((s) => s.activeTool);
  const zoom = useUIStore((s) => s.zoom);
  const zoomIn = useUIStore((s) => s.zoomIn);
  const zoomOut = useUIStore((s) => s.zoomOut);
  const isMobile = useUIStore((s) => s.isMobile);

  const floors = useProjectStore((s) => s.project.floors);
  const activeFloorIndex = useProjectStore((s) => s.project.activeFloorIndex);
  const displayUnit = useProjectStore((s) => s.project.displayUnit) || 'm';
  const activeFloor = useProjectStore((s) => s.project.floors[s.project.activeFloorIndex]);
  const roomMetrics = useMemo(() => {
    const floor = activeFloor;
    if (!floor || !floor.elements || typeof floor.elements !== 'object') {
      return { area: 0, perimeter: 0, roomCount: 0 };
    }

    const rooms = Object.values(floor.elements).filter((el): el is Room => {
      if (!el || typeof el !== 'object') return false;
      if (!('type' in el) || (el as { type?: string }).type !== 'room') return false;
      if (!('visible' in el) || (el as { visible?: boolean }).visible === false) return false;
      return true;
    });

    let totalArea = 0;
    let totalPerimeter = 0;
    for (const room of rooms) {
      if (!Array.isArray(room.polygon) || room.polygon.length < 3) continue;
      const polygon = room.polygon.filter(
        (pt): pt is { x: number; y: number } =>
          pt != null
          && typeof pt === 'object'
          && typeof (pt as { x?: unknown }).x === 'number'
          && typeof (pt as { y?: unknown }).y === 'number',
      );
      if (polygon.length < 3) continue;
      totalArea += polygonArea(polygon);
      totalPerimeter += polygonPerimeter(polygon);
    }

    return { area: totalArea, perimeter: totalPerimeter, roomCount: rooms.length };
  }, [activeFloor]);

  const t = useTranslation();

  const toolName = (tool: ToolType) => t(`tool.${tool}`);
  const toolHint = (tool: ToolType) => t(`hint.${tool}`);

  const zoomPercent = Math.round(zoom * 100);
  const dec = unitDecimals(displayUnit);
  const uLabel = UNIT_LABELS[displayUnit];
  const cx = metersToUnit(cursorWorldPos.x, displayUnit);
  const cy = metersToUnit(cursorWorldPos.y, displayUnit);

  return (
    <div
      className="flex items-center justify-between shrink-0 select-none"
      style={{
        height: isMobile ? 26 : 28,
        background: '#ece8e1',
        borderTop: '1px solid rgba(180,172,160,0.35)',
        fontSize: isMobile ? 10 : 11,
        overflow: 'hidden',
        padding: isMobile ? '0 4px' : '0 16px',
      }}
    >
      {/* Left: Cursor position — hidden on mobile */}
      {!isMobile && (
        <div className="flex items-center gap-3" style={{ color: '#8a8480', minWidth: 160 }}>
          <span>
            X: <span style={{ color: '#3a3530' }}>{cx.toFixed(dec)}{uLabel}</span>
          </span>
          <span>
            Y: <span style={{ color: '#3a3530' }}>{cy.toFixed(dec)}{uLabel}</span>
          </span>
        </div>
      )}

      {/* Floor tabs */}
      <div className="flex items-center gap-1" style={{ marginLeft: 8, marginRight: 8 }}>
        {floors.map((floor, index) => {
          const isActive = index === activeFloorIndex;
          const canDelete = floors.length > 1;
          return (
            <FloorTab
              key={floor.id}
              name={floor.name}
              isActive={isActive}
              canDelete={canDelete}
              onSelect={() => useProjectStore.getState().setActiveFloor(index)}
              onDelete={() => {
                if (confirm(t('ui.removeFloor') + ` "${floor.name}"?`)) {
                  useProjectStore.getState().removeFloor(index);
                }
              }}
              onDuplicate={() => useProjectStore.getState().duplicateFloor(index)}
              onRename={(newName) => useProjectStore.getState().renameFloor(index, newName)}
              actionsTitle={t('ui.floorActions')}
              deleteTitle={t('ui.removeFloor')}
              duplicateTitle={t('ui.duplicateFloor')}
              renameTitle={t('ui.renameFloor')}
            />
          );
        })}
        <button
          type="button"
          onClick={() => useProjectStore.getState().addFloor()}
          className="ep-btn-ghost flex items-center justify-center cursor-pointer"
          style={{ padding: '2px 4px', fontSize: 13, lineHeight: '20px' }}
          title={t('ui.addFloor')}
        >
          +
        </button>
      </div>

      {/* Center: Tool name and hint */}
      {!isMobile && (
        <div className="flex items-center gap-2 flex-1 justify-center" style={{ color: '#8a8480', minWidth: 0, overflow: 'hidden' }}>
          <span style={{ color: '#2d6a4f', fontWeight: 500, whiteSpace: 'nowrap' }}>
            {toolName(activeTool)}
          </span>
          <span style={{ color: '#b5afa8' }}>{'\u2022'}</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{toolHint(activeTool)}</span>
          <span style={{ color: '#b5afa8' }}>{'\u2022'}</span>
          <span style={{ whiteSpace: 'nowrap' }}>
            {`${t('ui.totalArea')}: `}
            <span style={{ color: '#3a3530' }}>{formatAreaInUnit(roomMetrics.area, displayUnit)}</span>
          </span>
          <span style={{ color: '#b5afa8' }}>{'\u2022'}</span>
          <span style={{ whiteSpace: 'nowrap' }}>
            {`${t('ui.totalPerimeter')}: `}
            <span style={{ color: '#3a3530' }}>{formatInUnit(roomMetrics.perimeter, displayUnit)}</span>
          </span>
        </div>
      )}

      {/* Right: Zoom */}
      <div className="flex items-center gap-1" style={{ minWidth: 120, justifyContent: 'flex-end' }}>
        {/* Zoom-to-fit button */}
        <button
          type="button"
          onClick={() => {
            const state = useProjectStore.getState();
            const elements = getActiveElements(state);
            const all = Object.values(elements);
            if (all.length === 0) return;

            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (const el of all) {
              if (el.type === 'wall') {
                for (const p of [el.start, el.end]) {
                  if (p.x < minX) minX = p.x;
                  if (p.x > maxX) maxX = p.x;
                  if (p.y < minY) minY = p.y;
                  if (p.y > maxY) maxY = p.y;
                }
              } else if (el.type === 'room') {
                for (const p of el.polygon) {
                  if (p.x < minX) minX = p.x;
                  if (p.x > maxX) maxX = p.x;
                  if (p.y < minY) minY = p.y;
                  if (p.y > maxY) maxY = p.y;
                }
              } else if ('position' in el) {
                const pos = el.position as { x: number; y: number };
                if (pos.x < minX) minX = pos.x;
                if (pos.x > maxX) maxX = pos.x;
                if (pos.y < minY) minY = pos.y;
                if (pos.y > maxY) maxY = pos.y;
              } else if ('start' in el && 'end' in el) {
                const s = el.start as { x: number; y: number };
                const e = el.end as { x: number; y: number };
                if (s.x < minX) minX = s.x;
                if (s.x > maxX) maxX = s.x;
                if (s.y < minY) minY = s.y;
                if (s.y > maxY) maxY = s.y;
                if (e.x < minX) minX = e.x;
                if (e.x > maxX) maxX = e.x;
                if (e.y < minY) minY = e.y;
                if (e.y > maxY) maxY = e.y;
              }
            }
            if (minX === Infinity) return;

            // Add padding
            const pad = 1; // 1 meter padding
            minX -= pad; minY -= pad; maxX += pad; maxY += pad;

            const contentW = maxX - minX;
            const contentH = maxY - minY;
            if (contentW <= 0 || contentH <= 0) return;

            // Estimate canvas size from window (approximate)
            const canvasW = window.innerWidth - 120; // minus sidebars
            const canvasH = window.innerHeight - 80; // minus bars

            // base pixels per meter = 100
            const zoomX = canvasW / (contentW * 100);
            const zoomY = canvasH / (contentH * 100);
            const newZoom = Math.min(zoomX, zoomY);

            // Center of content in world coords
            const cx = (minX + maxX) / 2;
            const cy = (minY + maxY) / 2;

            // Pan so world center maps to screen center
            const ppm = 100 * newZoom;
            const panX = -cx * ppm;
            const panY = -cy * ppm;

            useUIStore.getState().setZoom(newZoom);
            useUIStore.getState().setPan({ x: panX, y: panY });
          }}
          className="ep-zoom-btn cursor-pointer"
          style={{ fontSize: 10 }}
          title={t('ui.zoomToFit')}
        >
          {'⊡'}
        </button>
        <button
          type="button"
          onClick={zoomOut}
          className="ep-zoom-btn cursor-pointer"
        >
          -
        </button>
        <span style={{ color: '#3a3530', minWidth: 36, textAlign: 'center' }}>
          {zoomPercent}%
        </span>
        <button
          type="button"
          onClick={zoomIn}
          className="ep-zoom-btn cursor-pointer"
        >
          +
        </button>

      </div>
    </div>
  );
}
