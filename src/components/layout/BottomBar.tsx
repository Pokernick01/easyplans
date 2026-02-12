import { useState } from 'react';
import { useUIStore } from '@/store/ui-store.ts';
import { useProjectStore } from '@/store/project-store.ts';
import { getActiveElements } from '@/store/selectors.ts';
import { useTranslation } from '@/utils/i18n.ts';
import type { ToolType } from '@/types/tools.ts';

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
  deleteTitle: string;
  duplicateTitle: string;
  renameTitle: string;
}) {
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(name);

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

  return (
    <div
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
      {hovered && !editing && (
        <>
          {/* Duplicate button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            title={duplicateTitle}
            style={{
              background: 'none',
              border: 'none',
              color: '#2d6a4f',
              fontSize: 9,
              padding: '0 2px',
              marginLeft: 3,
              cursor: 'pointer',
              lineHeight: '16px',
              opacity: 0.6,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; }}
          >
            ⧉
          </button>
          {/* Delete button (only if more than 1 floor) */}
          {canDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title={deleteTitle}
              style={{
                background: 'none',
                border: 'none',
                color: '#c0392b',
                fontSize: 10,
                padding: '0 2px',
                cursor: 'pointer',
                lineHeight: '16px',
                opacity: 0.7,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; }}
            >
              ×
            </button>
          )}
        </>
      )}
      {/* Spacer to keep consistent width when hover buttons are hidden */}
      {!hovered && !editing && <span style={{ width: canDelete ? 26 : 13, display: 'inline-block' }} />}
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

  const t = useTranslation();

  const toolName = (tool: ToolType) => t(`tool.${tool}`);
  const toolHint = (tool: ToolType) => t(`hint.${tool}`);

  const zoomPercent = Math.round(zoom * 100);

  return (
    <div
      className="flex items-center justify-between px-4 shrink-0 select-none"
      style={{
        height: 28,
        background: '#ece8e1',
        borderTop: '1px solid rgba(180,172,160,0.35)',
        fontSize: 11,
        overflow: 'hidden',
      }}
    >
      {/* Left: Cursor position */}
      <div className="flex items-center gap-3" style={{ color: '#8a8480', minWidth: isMobile ? 100 : 160 }}>
        <span>
          X: <span style={{ color: '#3a3530' }}>{cursorWorldPos.x.toFixed(2)}m</span>
        </span>
        <span>
          Y: <span style={{ color: '#3a3530' }}>{cursorWorldPos.y.toFixed(2)}m</span>
        </span>
      </div>

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
