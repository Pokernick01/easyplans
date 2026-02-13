import { useState, useRef, useEffect, type ReactNode } from 'react';
import { useUIStore } from '@/store/ui-store.ts';
import { useTranslation } from '@/utils/i18n.ts';
import type { ToolType } from '@/types/tools.ts';
import type { DoorStyle, WindowStyle, StairStyle } from '@/types/elements.ts';

// ---------------------------------------------------------------------------
// SVG Tool Icons — uniform 24×24 line-art style, 1.5px stroke
// ---------------------------------------------------------------------------

const S = 1.5; // consistent stroke width

function SelectIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={S} strokeLinecap="round" strokeLinejoin="round">
      {/* Pointer arrow */}
      <path d="M4 3l8 18 2.5-7.5L22 11z" />
      <path d="M14.5 13.5L20 20" />
    </svg>
  );
}

function WallIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={S} strokeLinecap="round" strokeLinejoin="round">
      {/* Double-line wall with thickness */}
      <rect x="3" y="9" width="18" height="6" rx="0.5" />
      {/* Brick pattern */}
      <line x1="9" y1="9" x2="9" y2="15" />
      <line x1="15" y1="9" x2="15" y2="15" />
      <line x1="3" y1="12" x2="9" y2="12" />
      <line x1="15" y1="12" x2="21" y2="12" />
      {/* Endpoints */}
      <circle cx="3" cy="12" r="1.2" fill="currentColor" />
      <circle cx="21" cy="12" r="1.2" fill="currentColor" />
    </svg>
  );
}

function DoorIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={S} strokeLinecap="round" strokeLinejoin="round">
      {/* Wall segments left and right */}
      <line x1="2" y1="12" x2="7" y2="12" />
      <line x1="17" y1="12" x2="22" y2="12" />
      {/* Door swing arc */}
      <path d="M7 12 A5 5 0 0 1 12 7" />
      {/* Door leaf (line from hinge to tip) */}
      <line x1="7" y1="12" x2="12" y2="7" />
      {/* Hinge point */}
      <circle cx="7" cy="12" r="1" fill="currentColor" />
      {/* Door handle */}
      <circle cx="10.5" cy="8.5" r="0.6" fill="currentColor" />
    </svg>
  );
}

function WindowIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={S} strokeLinecap="round" strokeLinejoin="round">
      {/* Wall segments */}
      <line x1="2" y1="12" x2="7" y2="12" />
      <line x1="17" y1="12" x2="22" y2="12" />
      {/* Window frame outer */}
      <rect x="7" y="8" width="10" height="8" rx="0.5" />
      {/* Window panes - cross divider */}
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="7" y1="12" x2="17" y2="12" />
      {/* Glass lines */}
      <line x1="8.5" y1="9.5" x2="10" y2="11" strokeWidth="0.8" opacity="0.4" />
      <line x1="13.5" y1="9.5" x2="15" y2="11" strokeWidth="0.8" opacity="0.4" />
    </svg>
  );
}

function RoomIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={S} strokeLinecap="round" strokeLinejoin="round">
      {/* Room outline */}
      <rect x="4" y="4" width="16" height="16" rx="0.5" />
      {/* Interior dashed cross for "area" representation */}
      <line x1="4" y1="12" x2="20" y2="12" strokeDasharray="2 2" strokeWidth="0.8" opacity="0.4" />
      <line x1="12" y1="4" x2="12" y2="20" strokeDasharray="2 2" strokeWidth="0.8" opacity="0.4" />
      {/* Corner dots */}
      <circle cx="4" cy="4" r="1" fill="currentColor" />
      <circle cx="20" cy="4" r="1" fill="currentColor" />
      <circle cx="4" cy="20" r="1" fill="currentColor" />
      <circle cx="20" cy="20" r="1" fill="currentColor" />
    </svg>
  );
}

function DimensionIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={S} strokeLinecap="round" strokeLinejoin="round">
      {/* Main dimension line */}
      <line x1="4" y1="14" x2="20" y2="14" />
      {/* Extension lines */}
      <line x1="4" y1="10" x2="4" y2="17" />
      <line x1="20" y1="10" x2="20" y2="17" />
      {/* Arrows */}
      <polyline points="7,12 4,14 7,16" />
      <polyline points="17,12 20,14 17,16" />
      {/* Dimension text placeholder */}
      <text x="12" y="11" textAnchor="middle" fill="currentColor" stroke="none" fontSize="6" fontWeight="600">2.5</text>
    </svg>
  );
}

function TextIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={S} strokeLinecap="round" strokeLinejoin="round">
      {/* T-shape text icon */}
      <line x1="5" y1="5" x2="19" y2="5" />
      <line x1="12" y1="5" x2="12" y2="19" />
      {/* Serifs */}
      <line x1="9" y1="19" x2="15" y2="19" />
      <line x1="5" y1="5" x2="5" y2="7" />
      <line x1="19" y1="5" x2="19" y2="7" />
    </svg>
  );
}

function StampIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={S} strokeLinecap="round" strokeLinejoin="round">
      {/* Sofa / furniture icon */}
      {/* Seat */}
      <rect x="4" y="10" width="16" height="6" rx="1" />
      {/* Back */}
      <path d="M5 10V7a1 1 0 011-1h12a1 1 0 011 1v3" />
      {/* Armrests */}
      <path d="M4 10V9a1 1 0 00-1 1v4a1 1 0 001 1" />
      <path d="M20 10V9a1 1 0 011 1v4a1 1 0 01-1 1" />
      {/* Legs */}
      <line x1="6" y1="16" x2="6" y2="19" />
      <line x1="18" y1="16" x2="18" y2="19" />
    </svg>
  );
}

function ArchLineIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={S} strokeLinecap="round" strokeLinejoin="round">
      {/* Dashed architectural line */}
      <line x1="3" y1="16" x2="21" y2="8" strokeDasharray="4 2.5" />
      {/* Axis symbol circles at endpoints */}
      <circle cx="3" cy="16" r="2" />
      <circle cx="21" cy="8" r="2" />
      {/* Axis labels */}
      <text x="3" y="17.5" textAnchor="middle" fill="currentColor" stroke="none" fontSize="3.5" fontWeight="600">A</text>
      <text x="21" y="9.5" textAnchor="middle" fill="currentColor" stroke="none" fontSize="3.5" fontWeight="600">B</text>
    </svg>
  );
}

function StairIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={S} strokeLinecap="round" strokeLinejoin="round">
      {/* Stair steps */}
      <polyline points="3,20 3,16 8,16 8,12 13,12 13,8 18,8 18,4" />
      {/* Right wall of staircase */}
      <line x1="21" y1="20" x2="21" y2="4" strokeWidth="1" opacity="0.3" />
      {/* Arrow pointing up */}
      <polyline points="16,6 18,4 20,6" />
      {/* Tread lines */}
      <line x1="3" y1="16" x2="8" y2="16" strokeWidth="0.8" />
      <line x1="8" y1="12" x2="13" y2="12" strokeWidth="0.8" />
      <line x1="13" y1="8" x2="18" y2="8" strokeWidth="0.8" />
    </svg>
  );
}

function EraserIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={S} strokeLinecap="round" strokeLinejoin="round">
      {/* Eraser body */}
      <path d="M20 20H7L3 16c-.8-.8-.8-2 0-2.8L14.6 1.6c.8-.8 2-.8 2.8 0l5 5c.8.8.8 2 0 2.8L12 20" />
      {/* Divider */}
      <path d="M6 11l7 7" />
      {/* Base line */}
      <line x1="18" y1="20" x2="22" y2="20" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

interface ToolDef {
  id: ToolType;
  icon: ReactNode;
  labelKey: string;
  shortcut: string;
}

const TOOLS: ToolDef[] = [
  { id: 'select', icon: <SelectIcon />, labelKey: 'tool.select', shortcut: 'V' },
  { id: 'wall', icon: <WallIcon />, labelKey: 'tool.wall', shortcut: 'W' },
  { id: 'door', icon: <DoorIcon />, labelKey: 'tool.door', shortcut: 'D' },
  { id: 'window', icon: <WindowIcon />, labelKey: 'tool.window', shortcut: 'N' },
  { id: 'room', icon: <RoomIcon />, labelKey: 'tool.room', shortcut: 'R' },
  { id: 'dimension', icon: <DimensionIcon />, labelKey: 'tool.dimension', shortcut: 'M' },
  { id: 'text', icon: <TextIcon />, labelKey: 'tool.text', shortcut: 'T' },
  { id: 'stamp', icon: <StampIcon />, labelKey: 'tool.stamp', shortcut: 'F' },
  { id: 'archline', icon: <ArchLineIcon />, labelKey: 'tool.archline', shortcut: 'L' },
  { id: 'stair', icon: <StairIcon />, labelKey: 'tool.stair', shortcut: 'H' },
  { id: 'eraser', icon: <EraserIcon />, labelKey: 'tool.eraser', shortcut: 'E' },
];

// ---------------------------------------------------------------------------
// Style constants for sub-menus
// ---------------------------------------------------------------------------

const DOOR_STYLES: DoorStyle[] = ['single', 'double', 'sliding', 'pocket', 'folding', 'revolving'];
const DOOR_STYLE_KEYS: Record<DoorStyle, string> = {
  single: 'doorStyle.single', double: 'doorStyle.double', sliding: 'doorStyle.sliding',
  pocket: 'doorStyle.pocket', folding: 'doorStyle.folding', revolving: 'doorStyle.revolving',
};
const WINDOW_STYLES: WindowStyle[] = ['single', 'double', 'sliding', 'fixed', 'casement', 'awning'];
const WINDOW_STYLE_KEYS: Record<WindowStyle, string> = {
  single: 'windowStyle.single', double: 'windowStyle.double', sliding: 'windowStyle.sliding',
  fixed: 'windowStyle.fixed', casement: 'windowStyle.casement', awning: 'windowStyle.awning',
};
const STAIR_STYLES: StairStyle[] = ['straight', 'l-shaped', 'u-shaped', 'spiral', 'winder', 'curved'];
const STAIR_STYLE_KEYS: Record<StairStyle, string> = {
  straight: 'stairStyle.straight', 'l-shaped': 'stairStyle.l-shaped', 'u-shaped': 'stairStyle.u-shaped',
  spiral: 'stairStyle.spiral', winder: 'stairStyle.winder', curved: 'stairStyle.curved',
};

// ---------------------------------------------------------------------------
// StyleSubMenu — popout panel next to tool button
// ---------------------------------------------------------------------------

function StyleSubMenu({ toolId }: { toolId: ToolType }) {
  const t = useTranslation();
  const activeDoorStyle = useUIStore((s) => s.activeDoorStyle);
  const activeWindowStyle = useUIStore((s) => s.activeWindowStyle);
  const activeStairStyle = useUIStore((s) => s.activeStairStyle);
  const setDoorStyle = useUIStore((s) => s.setDoorStyle);
  const setWindowStyle = useUIStore((s) => s.setWindowStyle);
  const setStairStyle = useUIStore((s) => s.setStairStyle);

  let items: { key: string; label: string; active: boolean; onClick: () => void }[] = [];

  if (toolId === 'door') {
    items = DOOR_STYLES.map((s) => ({
      key: s, label: t(DOOR_STYLE_KEYS[s]), active: activeDoorStyle === s,
      onClick: () => setDoorStyle(s),
    }));
  } else if (toolId === 'window') {
    items = WINDOW_STYLES.map((s) => ({
      key: s, label: t(WINDOW_STYLE_KEYS[s]), active: activeWindowStyle === s,
      onClick: () => setWindowStyle(s),
    }));
  } else if (toolId === 'stair') {
    items = STAIR_STYLES.map((s) => ({
      key: s, label: t(STAIR_STYLE_KEYS[s]), active: activeStairStyle === s,
      onClick: () => setStairStyle(s),
    }));
  } else {
    return null;
  }

  return (
    <div
      className="absolute z-50"
      style={{
        left: '100%',
        top: 0,
        marginLeft: 4,
      }}
    >
      <div
        className="flex flex-col gap-0.5 py-1.5 px-1"
        style={{
          background: '#ece8e1',
          border: '1px solid #d5cfc6',
          borderRadius: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
          minWidth: 110,
        }}
      >
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={item.onClick}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded cursor-pointer transition-colors text-left"
            style={{
              background: item.active ? '#ddd7cc' : 'transparent',
              color: item.active ? '#2d6a4f' : '#4a4540',
              fontWeight: item.active ? 600 : 400,
              border: 'none',
            }}
          >
            <span
              style={{
                width: 6, height: 6, borderRadius: '50%',
                background: item.active ? '#2d6a4f' : 'transparent',
                border: item.active ? 'none' : '1px solid #b4aca0',
                flexShrink: 0,
              }}
            />
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ToolButton
// ---------------------------------------------------------------------------

const TOOLS_WITH_SUBMENU = new Set<ToolType>(['door', 'window', 'stair']);

function ToolButton({ tool, compact }: { tool: ToolDef; compact?: boolean }) {
  const activeTool = useUIStore((s) => s.activeTool);
  const setTool = useUIStore((s) => s.setTool);
  const [hovered, setHovered] = useState(false);
  const t = useTranslation();

  const isActive = activeTool === tool.id;
  const hasSubmenu = TOOLS_WITH_SUBMENU.has(tool.id);
  const showSubmenu = isActive && hasSubmenu && !compact;
  const btnSize = compact ? 36 : 42;
  const label = t(tool.labelKey);

  return (
    <div className="relative" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <button
        type="button"
        onClick={() => setTool(tool.id)}
        className={`ep-tool-btn transition-all${isActive ? ' active' : ''}`}
        style={{
          width: btnSize,
          height: btnSize,
        }}
        aria-label={label}
      >
        <span className="leading-none flex items-center justify-center">{tool.icon}</span>
      </button>
      {showSubmenu && <StyleSubMenu toolId={tool.id} />}
      {hovered && !isActive && !compact && (
        <div
          className="ep-tooltip absolute z-50"
          style={{
            left: '100%',
            top: '50%',
            transform: 'translateY(-50%) translateX(8px)',
          }}
        >
          {label}
          <span style={{ color: '#9e9590', marginLeft: 8, fontWeight: 500 }}>{tool.shortcut}</span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// LeftSidebar
// ---------------------------------------------------------------------------

export function LeftSidebar() {
  const isMobile = useUIStore((s) => s.isMobile);
  const leftSidebarOpen = useUIStore((s) => s.leftSidebarOpen);
  const toggleLeftSidebar = useUIStore((s) => s.toggleLeftSidebar);

  // On mobile: horizontal scrollable toolbar
  if (isMobile) {
    if (!leftSidebarOpen) {
      return (
        <button
          type="button"
          onClick={toggleLeftSidebar}
          className="ep-btn-ghost absolute top-14 left-2 z-30 w-8 h-8 flex items-center justify-center rounded-lg"
          style={{
            background: '#ece8e1',
            border: '1px solid #d5cfc6',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}
        >
          {'\u2630'}
        </button>
      );
    }

    return (
      <div
        className="absolute top-12 left-0 right-0 z-30 flex items-center gap-1 px-2 py-1.5 overflow-x-auto"
        style={{
          background: '#ece8e1',
          borderBottom: '1px solid #d5cfc6',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}
      >
        {TOOLS.map((tool) => (
          <ToolButton key={tool.id} tool={tool} compact />
        ))}
        <button
          type="button"
          onClick={toggleLeftSidebar}
          className="ep-btn-ghost ml-auto shrink-0 w-7 h-7 flex items-center justify-center rounded"
        >
          {'\u2715'}
        </button>
      </div>
    );
  }

  // Desktop: vertical sidebar
  return (
    <div
      className="flex flex-col items-center py-2 gap-0.5 shrink-0"
      style={{
        width: 56,
        background: '#ece8e1',
        borderRight: '1px solid rgba(180,172,160,0.4)',
      }}
    >
      {TOOLS.map((tool) => (
        <ToolButton key={tool.id} tool={tool} />
      ))}
    </div>
  );
}
