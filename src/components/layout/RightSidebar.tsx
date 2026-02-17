import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { StampDefinition } from '@/types/library.ts';
import { useProjectStore } from '@/store/project-store.ts';
import { useUIStore } from '@/store/ui-store.ts';
import { NumberInput } from '@/components/shared/NumberInput.tsx';
import { UnitNumberInput } from '@/components/shared/UnitNumberInput.tsx';
import { formatAreaInUnit } from '@/utils/units.ts';
import type { DisplayUnit } from '@/utils/units.ts';
import { stampRegistry, getStampsByCategory } from '@/library/index.ts';
import { categories } from '@/library/categories.ts';
import type { CategoryInfo } from '@/library/categories.ts';
import { useTranslation } from '@/utils/i18n.ts';
import type {
  AnyElement,
  Wall,
  Door,
  Window,
  Room,
  FurnitureItem,
  TextLabel,
  DimensionLine,
  ArchLine,
  Stair,
  ArchLineStyle,
  DoorStyle,
  WindowStyle,
  StairStyle,
  StairDirection,
  FillPattern,
  WallFillPattern,
  DoorSwing,
  Shape,
  ShapeKind,
} from '@/types/elements.ts';
import type { StampCategory } from '@/types/library.ts';

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

type TabId = 'properties' | 'library';

const DOOR_STYLES: DoorStyle[] = ['single', 'double', 'sliding', 'pocket', 'folding', 'revolving'];
const DOOR_STYLE_KEYS: Record<DoorStyle, string> = {
  single: 'doorStyle.single',
  double: 'doorStyle.double',
  sliding: 'doorStyle.sliding',
  pocket: 'doorStyle.pocket',
  folding: 'doorStyle.folding',
  revolving: 'doorStyle.revolving',
};

const WINDOW_STYLES: WindowStyle[] = ['single', 'double', 'sliding', 'fixed', 'casement', 'awning'];
const WINDOW_STYLE_KEYS: Record<WindowStyle, string> = {
  single: 'windowStyle.single',
  double: 'windowStyle.double',
  sliding: 'windowStyle.sliding',
  fixed: 'windowStyle.fixed',
  casement: 'windowStyle.casement',
  awning: 'windowStyle.awning',
};

const STAIR_STYLES: StairStyle[] = ['straight', 'l-shaped', 'u-shaped', 'spiral', 'winder', 'curved'];
const STAIR_STYLE_KEYS: Record<StairStyle, string> = {
  straight: 'stairStyle.straight',
  'l-shaped': 'stairStyle.l-shaped',
  'u-shaped': 'stairStyle.u-shaped',
  spiral: 'stairStyle.spiral',
  winder: 'stairStyle.winder',
  curved: 'stairStyle.curved',
};

// ---------------------------------------------------------------------------
// Property panels for each element type
// ---------------------------------------------------------------------------

const WALL_FILL_PATTERNS: WallFillPattern[] = ['solid', 'brick', 'concrete', 'stone', 'hatch', 'crosshatch', 'drywall', 'block', 'stucco', 'plaster'];
const WALL_PATTERN_KEYS: Record<WallFillPattern, string> = {
  solid: 'wallPattern.solid',
  brick: 'wallPattern.brick',
  concrete: 'wallPattern.concrete',
  stone: 'wallPattern.stone',
  hatch: 'wallPattern.hatch',
  crosshatch: 'wallPattern.crosshatch',
  drywall: 'wallPattern.drywall',
  block: 'wallPattern.block',
  stucco: 'wallPattern.stucco',
  plaster: 'wallPattern.plaster',
};

const ROOM_FILL_PATTERNS: FillPattern[] = ['solid', 'hatch', 'tile', 'wood', 'stone', 'brick', 'marble', 'concrete', 'ceramic', 'parquet', 'herringbone', 'hexagonal', 'carpet', 'grass', 'granite'];
const ROOM_PATTERN_KEYS: Record<FillPattern, string> = {
  solid: 'roomPattern.solid',
  hatch: 'roomPattern.hatch',
  tile: 'roomPattern.tile',
  wood: 'roomPattern.wood',
  stone: 'roomPattern.stone',
  brick: 'roomPattern.brick',
  marble: 'roomPattern.marble',
  concrete: 'roomPattern.concrete',
  ceramic: 'roomPattern.ceramic',
  parquet: 'roomPattern.parquet',
  herringbone: 'roomPattern.herringbone',
  hexagonal: 'roomPattern.hexagonal',
  carpet: 'roomPattern.carpet',
  grass: 'roomPattern.grass',
  granite: 'roomPattern.granite',
};

function WallProperties({ element, floorIndex }: { element: Wall; floorIndex: number }) {
  const updateElement = useProjectStore((s) => s.updateElement);
  const setWallDefaults = useUIStore((s) => s.setWallDefaults);
  const t = useTranslation();

  const dx = element.end.x - element.start.x;
  const dy = element.end.y - element.start.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = length > 0 ? Math.atan2(dy, dx) : 0;

  const handleLengthChange = (newLen: number) => {
    if (newLen <= 0) return;
    const newEnd = {
      x: element.start.x + Math.cos(angle) * newLen,
      y: element.start.y + Math.sin(angle) * newLen,
    };
    updateElement(floorIndex, element.id, { end: newEnd });
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="text-xs font-medium mb-1" style={{ color: '#2d6a4f' }}>
        {t('prop.wall')}
      </div>
      <UnitNumberInput
        label={t('field.length')}
        value={length}
        onChange={handleLengthChange}
        min={0.01}
        max={100}
      />
      <UnitNumberInput
        label={t('field.startX')}
        value={element.start.x}
        onChange={(v) => updateElement(floorIndex, element.id, { start: { ...element.start, x: v } })}
      />
      <UnitNumberInput
        label={t('field.startY')}
        value={element.start.y}
        onChange={(v) => updateElement(floorIndex, element.id, { start: { ...element.start, y: v } })}
      />
      <UnitNumberInput
        label={t('field.endX')}
        value={element.end.x}
        onChange={(v) => updateElement(floorIndex, element.id, { end: { ...element.end, x: v } })}
      />
      <UnitNumberInput
        label={t('field.endY')}
        value={element.end.y}
        onChange={(v) => updateElement(floorIndex, element.id, { end: { ...element.end, y: v } })}
      />
      <UnitNumberInput
        label={t('field.thickness')}
        value={element.thickness}
        onChange={(v) => { updateElement(floorIndex, element.id, { thickness: v }); setWallDefaults({ thickness: v }); }}
        min={0.05}
        max={1.0}
      />
      <UnitNumberInput
        label={t('field.height')}
        value={element.height}
        onChange={(v) => { updateElement(floorIndex, element.id, { height: v }); setWallDefaults({ height: v }); }}
        min={0.5}
        max={10}
      />
      <div className="flex items-center justify-between py-1">
        <label className="text-xs" style={{ color: '#6b6560' }}>{t('field.color')}</label>
        <input
          type="color"
          value={element.color}
          onChange={(e) => { updateElement(floorIndex, element.id, { color: e.target.value }); setWallDefaults({ color: e.target.value }); }}
          className="w-8 h-6 rounded cursor-pointer border-0"
          style={{ background: 'transparent' }}
        />
      </div>
      <div className="flex items-center justify-between py-1">
        <label className="text-xs" style={{ color: '#6b6560' }}>{t('field.fillColor')}</label>
        <input
          type="color"
          value={element.fillColor}
          onChange={(e) => { updateElement(floorIndex, element.id, { fillColor: e.target.value }); setWallDefaults({ fillColor: e.target.value }); }}
          className="w-8 h-6 rounded cursor-pointer border-0"
          style={{ background: 'transparent' }}
        />
      </div>
      <div className="flex items-center justify-between py-1">
        <label className="text-xs" style={{ color: '#6b6560' }}>{t('field.wallPattern')}</label>
        <select
          value={element.fillPattern || 'solid'}
          onChange={(e) => {
            updateElement(floorIndex, element.id, { fillPattern: e.target.value as WallFillPattern });
            setWallDefaults({ fillPattern: e.target.value as WallFillPattern });
          }}
          className="px-2 py-1 text-xs rounded cursor-pointer outline-none"
          style={{
            background: '#ece8e1',
            color: '#2c2c2c',
            border: '1px solid #d5cfc6',
          }}
        >
          {WALL_FILL_PATTERNS.map((p) => (
            <option key={p} value={p}>
              {t(WALL_PATTERN_KEYS[p])}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function DoorProperties({ element, floorIndex }: { element: Door; floorIndex: number }) {
  const updateElement = useProjectStore((s) => s.updateElement);
  const t = useTranslation();

  return (
    <div className="flex flex-col gap-1">
      <div className="text-xs font-medium mb-1" style={{ color: '#2d6a4f' }}>
        {t('prop.door')}
      </div>
      <div className="flex items-center justify-between py-1">
        <label className="text-xs" style={{ color: '#6b6560' }}>{t('field.style')}</label>
        <select
          value={element.doorStyle || 'single'}
          onChange={(e) =>
            updateElement(floorIndex, element.id, { doorStyle: e.target.value as DoorStyle })
          }
          className="px-2 py-1 text-xs rounded cursor-pointer outline-none"
          style={{
            background: '#ece8e1',
            color: '#2c2c2c',
            border: '1px solid #d5cfc6',
          }}
        >
          {DOOR_STYLES.map((s) => (
            <option key={s} value={s}>
              {t(DOOR_STYLE_KEYS[s])}
            </option>
          ))}
        </select>
      </div>
      <NumberInput
        label={t('field.position')}
        value={Math.round(element.position * 1000) / 1000}
        onChange={(v) => updateElement(floorIndex, element.id, { position: v })}
        unit=""
        min={0}
        max={1}
        step={0.01}
      />
      <UnitNumberInput
        label={t('field.width')}
        value={element.width}
        onChange={(v) => updateElement(floorIndex, element.id, { width: v })}
        min={0.3}
        max={3.0}
      />
      <UnitNumberInput
        label={t('field.height')}
        value={element.height}
        onChange={(v) => updateElement(floorIndex, element.id, { height: v })}
        min={0.5}
        max={4.0}
      />
      <div className="flex items-center justify-between py-1">
        <label className="text-xs" style={{ color: '#6b6560' }}>{t('field.opening')}</label>
        <div className="flex gap-1">
          {(['left', 'right'] as DoorSwing[]).map((dir) => (
            <button
              key={dir}
              type="button"
              onClick={() => updateElement(floorIndex, element.id, { swing: dir })}
              className="px-2 py-0.5 text-xs rounded cursor-pointer"
              style={{
                background: element.swing === dir ? '#ddd7cc' : '#ece8e1',
                color: element.swing === dir ? '#2d6a4f' : '#6b6560',
                border: `1px solid ${element.swing === dir ? '#2d6a4f' : '#d5cfc6'}`,
              }}
            >
              {t(`swing.${dir}`)}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between py-1">
        <label className="text-xs" style={{ color: '#6b6560' }}>{t('field.side')}</label>
        <div className="flex gap-1">
          {([false, true] as const).map((val) => (
            <button
              key={String(val)}
              type="button"
              onClick={() => updateElement(floorIndex, element.id, { flipSide: val })}
              className="px-2 py-0.5 text-xs rounded cursor-pointer"
              style={{
                background: element.flipSide === val ? '#ddd7cc' : '#ece8e1',
                color: element.flipSide === val ? '#2d6a4f' : '#6b6560',
                border: `1px solid ${element.flipSide === val ? '#2d6a4f' : '#d5cfc6'}`,
              }}
            >
              {t(val ? 'side.exterior' : 'side.interior')}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between py-1">
        <label className="text-xs" style={{ color: '#6b6560' }}>{t('field.hinge')}</label>
        <div className="flex gap-1">
          {(['start', 'end'] as const).map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => updateElement(floorIndex, element.id, { hinge: val })}
              className="px-2 py-0.5 text-xs rounded cursor-pointer"
              style={{
                background: element.hinge === val ? '#ddd7cc' : '#ece8e1',
                color: element.hinge === val ? '#2d6a4f' : '#6b6560',
                border: `1px solid ${element.hinge === val ? '#2d6a4f' : '#d5cfc6'}`,
              }}
            >
              {t(val === 'start' ? 'hinge.left' : 'hinge.right')}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between py-1">
        <label className="text-xs" style={{ color: '#6b6560' }}>
          {t('field.openAngle')}
        </label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={5}
            max={180}
            step={5}
            value={element.openAngle}
            onChange={(e) =>
              updateElement(floorIndex, element.id, { openAngle: Number(e.target.value) })
            }
            className="w-14"
          />
          <input
            type="number"
            min={5}
            max={180}
            step={1}
            value={element.openAngle}
            onChange={(e) => {
              const val = Math.max(5, Math.min(180, Number(e.target.value) || 90));
              updateElement(floorIndex, element.id, { openAngle: val });
            }}
            className="w-12 text-xs text-right rounded px-1 py-0.5"
            style={{ background: '#ece8e1', color: '#2c2c2c', border: '1px solid #d5cfc6' }}
          />
          <span className="text-xs" style={{ color: '#6b6560' }}>&deg;</span>
        </div>
      </div>
    </div>
  );
}

function WindowProperties({ element, floorIndex }: { element: Window; floorIndex: number }) {
  const updateElement = useProjectStore((s) => s.updateElement);
  const t = useTranslation();

  return (
    <div className="flex flex-col gap-1">
      <div className="text-xs font-medium mb-1" style={{ color: '#2d6a4f' }}>
        {t('prop.window')}
      </div>
      <div className="flex items-center justify-between py-1">
        <label className="text-xs" style={{ color: '#6b6560' }}>{t('field.style')}</label>
        <select
          value={element.windowStyle || 'single'}
          onChange={(e) =>
            updateElement(floorIndex, element.id, { windowStyle: e.target.value as WindowStyle })
          }
          className="px-2 py-1 text-xs rounded cursor-pointer outline-none"
          style={{
            background: '#ece8e1',
            color: '#2c2c2c',
            border: '1px solid #d5cfc6',
          }}
        >
          {WINDOW_STYLES.map((s) => (
            <option key={s} value={s}>
              {t(WINDOW_STYLE_KEYS[s])}
            </option>
          ))}
        </select>
      </div>
      <NumberInput
        label={t('field.position')}
        value={Math.round(element.position * 1000) / 1000}
        onChange={(v) => updateElement(floorIndex, element.id, { position: v })}
        unit=""
        min={0}
        max={1}
        step={0.01}
      />
      <UnitNumberInput
        label={t('field.width')}
        value={element.width}
        onChange={(v) => updateElement(floorIndex, element.id, { width: v })}
        min={0.3}
        max={5.0}
      />
      <UnitNumberInput
        label={t('field.height')}
        value={element.height}
        onChange={(v) => updateElement(floorIndex, element.id, { height: v })}
        min={0.3}
        max={4.0}
      />
      <UnitNumberInput
        label={t('field.sillHeight')}
        value={element.sillHeight}
        onChange={(v) => updateElement(floorIndex, element.id, { sillHeight: v })}
        min={0}
        max={3.0}
      />
    </div>
  );
}

function RoomProperties({ element, floorIndex }: { element: Room; floorIndex: number }) {
  const updateElement = useProjectStore((s) => s.updateElement);
  const du: DisplayUnit = useProjectStore((s) => s.project.displayUnit) || 'm';
  const t = useTranslation();

  return (
    <div className="flex flex-col gap-1">
      <div className="text-xs font-medium mb-1" style={{ color: '#2d6a4f' }}>
        {t('prop.room')}
      </div>
      <div className="flex items-center justify-between py-1">
        <label className="text-xs" style={{ color: '#6b6560' }}>{t('field.label')}</label>
        <input
          type="text"
          value={element.label}
          onChange={(e) => updateElement(floorIndex, element.id, { label: e.target.value })}
          className="w-28 px-2 py-1 text-xs rounded outline-none"
          style={{
            background: '#ece8e1',
            color: '#2c2c2c',
            border: '1px solid #d5cfc6',
          }}
        />
      </div>
      <div className="flex items-center justify-between py-1">
        <label className="text-xs" style={{ color: '#6b6560' }}>{t('field.color')}</label>
        <input
          type="color"
          value={element.color}
          onChange={(e) => updateElement(floorIndex, element.id, { color: e.target.value })}
          className="w-8 h-6 rounded cursor-pointer border-0"
          style={{ background: 'transparent' }}
        />
      </div>
      <div className="flex items-center justify-between py-1">
        <label className="text-xs" style={{ color: '#6b6560' }}>{t('field.pattern')}</label>
        <select
          value={element.fillPattern || 'solid'}
          onChange={(e) =>
            updateElement(floorIndex, element.id, { fillPattern: e.target.value as FillPattern })
          }
          className="px-2 py-1 text-xs rounded cursor-pointer outline-none"
          style={{
            background: '#ece8e1',
            color: '#2c2c2c',
            border: '1px solid #d5cfc6',
          }}
        >
          {ROOM_FILL_PATTERNS.map((p) => (
            <option key={p} value={p}>
              {t(ROOM_PATTERN_KEYS[p])}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center justify-between py-1">
        <label className="text-xs" style={{ color: '#6b6560' }}>{t('field.area')}</label>
        <span className="text-xs" style={{ color: '#2c2c2c' }}>
          {formatAreaInUnit(element.area, du)}
        </span>
      </div>
    </div>
  );
}

function FurnitureProperties({ element, floorIndex }: { element: FurnitureItem; floorIndex: number }) {
  const updateElement = useProjectStore((s) => s.updateElement);
  const t = useTranslation();
  const lang = useUIStore((s) => s.language);
  const stamp = stampRegistry.get(element.stampId);
  const stampName = stamp ? (lang === 'en' ? stamp.name : stamp.nameEs) : '';

  return (
    <div className="flex flex-col gap-1">
      <div className="text-xs font-medium mb-1" style={{ color: '#2d6a4f' }}>
        {t('prop.furniture')}{stampName ? ` - ${stampName}` : ''}
      </div>
      <UnitNumberInput
        label="X"
        value={element.position.x}
        onChange={(v) => updateElement(floorIndex, element.id, { position: { ...element.position, x: v } })}
      />
      <UnitNumberInput
        label="Y"
        value={element.position.y}
        onChange={(v) => updateElement(floorIndex, element.id, { position: { ...element.position, y: v } })}
      />
      <NumberInput
        label={t('field.rotation')}
        value={element.rotation}
        onChange={(v) => updateElement(floorIndex, element.id, { rotation: v })}
        unit="\u00B0"
        min={0}
        max={360}
        step={5}
      />
      <div className="flex items-center justify-between py-1">
        <label className="text-xs" style={{ color: '#6b6560' }}>{t('field.scale')}</label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0.1}
            max={3}
            step={0.1}
            value={element.scale}
            onChange={(e) =>
              updateElement(floorIndex, element.id, { scale: Number(e.target.value) })
            }
            className="w-16"
          />
          <span className="text-xs w-8 text-right" style={{ color: '#2c2c2c' }}>
            {element.scale.toFixed(1)}x
          </span>
        </div>
      </div>
      <UnitNumberInput
        label={t('field.width')}
        value={element.width}
        onChange={(v) => updateElement(floorIndex, element.id, { width: v })}
        min={0.1}
        max={10}
      />
      <UnitNumberInput
        label={t('field.depth')}
        value={element.depth}
        onChange={(v) => updateElement(floorIndex, element.id, { depth: v })}
        min={0.1}
        max={10}
      />
      <div className="flex items-center justify-between py-1">
        <label className="text-xs" style={{ color: '#6b6560' }}>{t('field.color')}</label>
        <div className="flex items-center gap-1">
          <input
            type="color"
            value={element.color || '#000000'}
            onChange={(e) => updateElement(floorIndex, element.id, { color: e.target.value })}
            className="w-8 h-6 rounded cursor-pointer border-0"
            style={{ background: 'transparent' }}
          />
          {element.color && (
            <button
              type="button"
              onClick={() => updateElement(floorIndex, element.id, { color: undefined })}
              className="px-1.5 py-0.5 text-xs rounded cursor-pointer"
              style={{
                background: '#ece8e1',
                color: '#6b6560',
                border: '1px solid #d5cfc6',
              }}
            >
              {t('ui.reset')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function TextProperties({ element, floorIndex }: { element: TextLabel; floorIndex: number }) {
  const updateElement = useProjectStore((s) => s.updateElement);
  const t = useTranslation();

  return (
    <div className="flex flex-col gap-1">
      <div className="text-xs font-medium mb-1" style={{ color: '#2d6a4f' }}>
        {t('prop.text')}
      </div>
      <UnitNumberInput
        label="X"
        value={element.position.x}
        onChange={(v) => updateElement(floorIndex, element.id, { position: { ...element.position, x: v } })}
      />
      <UnitNumberInput
        label="Y"
        value={element.position.y}
        onChange={(v) => updateElement(floorIndex, element.id, { position: { ...element.position, y: v } })}
      />
      <NumberInput
        label={t('field.rotation')}
        value={element.rotation}
        onChange={(v) => updateElement(floorIndex, element.id, { rotation: v })}
        unit={'\u00B0'}
        min={0}
        max={360}
        step={5}
      />
      <div className="flex items-center justify-between py-1">
        <label className="text-xs" style={{ color: '#6b6560' }}>{t('field.text')}</label>
        <input
          type="text"
          value={element.text}
          onChange={(e) => updateElement(floorIndex, element.id, { text: e.target.value })}
          className="w-28 px-2 py-1 text-xs rounded outline-none"
          style={{
            background: '#ece8e1',
            color: '#2c2c2c',
            border: '1px solid #d5cfc6',
          }}
        />
      </div>
      <NumberInput
        label={t('field.fontSize')}
        value={element.fontSize}
        onChange={(v) => updateElement(floorIndex, element.id, { fontSize: v })}
        unit="pt"
        min={6}
        max={72}
        step={1}
      />
      <div className="flex items-center justify-between py-1">
        <label className="text-xs" style={{ color: '#6b6560' }}>{t('field.color')}</label>
        <input
          type="color"
          value={element.color}
          onChange={(e) => updateElement(floorIndex, element.id, { color: e.target.value })}
          className="w-8 h-6 rounded cursor-pointer border-0"
          style={{ background: 'transparent' }}
        />
      </div>
    </div>
  );
}

function DimensionProperties({ element, floorIndex }: { element: DimensionLine; floorIndex: number }) {
  const updateElement = useProjectStore((s) => s.updateElement);
  const t = useTranslation();

  const dx = element.end.x - element.start.x;
  const dy = element.end.y - element.start.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = length > 0 ? Math.atan2(dy, dx) : 0;

  const handleLengthChange = (newLen: number) => {
    if (newLen <= 0) return;
    const newEnd = {
      x: element.start.x + Math.cos(angle) * newLen,
      y: element.start.y + Math.sin(angle) * newLen,
    };
    updateElement(floorIndex, element.id, { end: newEnd });
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="text-xs font-medium mb-1" style={{ color: '#2d6a4f' }}>
        {t('prop.dimension')}
      </div>
      <UnitNumberInput
        label={t('field.length')}
        value={length}
        onChange={handleLengthChange}
        min={0.01}
        max={100}
      />
      <UnitNumberInput
        label={t('field.startX')}
        value={element.start.x}
        onChange={(v) => updateElement(floorIndex, element.id, { start: { ...element.start, x: v } })}
      />
      <UnitNumberInput
        label={t('field.startY')}
        value={element.start.y}
        onChange={(v) => updateElement(floorIndex, element.id, { start: { ...element.start, y: v } })}
      />
      <UnitNumberInput
        label={t('field.endX')}
        value={element.end.x}
        onChange={(v) => updateElement(floorIndex, element.id, { end: { ...element.end, x: v } })}
      />
      <UnitNumberInput
        label={t('field.endY')}
        value={element.end.y}
        onChange={(v) => updateElement(floorIndex, element.id, { end: { ...element.end, y: v } })}
      />
      <UnitNumberInput
        label={t('field.offset')}
        value={element.offset}
        onChange={(v) => updateElement(floorIndex, element.id, { offset: v })}
        min={0}
        max={5}
      />
    </div>
  );
}

function StairProperties({ element, floorIndex }: { element: Stair; floorIndex: number }) {
  const updateElement = useProjectStore((s) => s.updateElement);
  const t = useTranslation();

  return (
    <div className="flex flex-col gap-1">
      <div className="text-xs font-medium mb-1" style={{ color: '#2d6a4f' }}>
        {t('prop.stair')}
      </div>
      <div className="flex items-center justify-between py-1">
        <label className="text-xs" style={{ color: '#6b6560' }}>{t('field.style')}</label>
        <select
          value={element.stairStyle}
          onChange={(e) =>
            updateElement(floorIndex, element.id, { stairStyle: e.target.value as StairStyle })
          }
          className="px-2 py-1 text-xs rounded cursor-pointer outline-none"
          style={{
            background: '#ece8e1',
            color: '#2c2c2c',
            border: '1px solid #d5cfc6',
          }}
        >
          {STAIR_STYLES.map((s) => (
            <option key={s} value={s}>
              {t(STAIR_STYLE_KEYS[s])}
            </option>
          ))}
        </select>
      </div>
      <UnitNumberInput
        label="X"
        value={element.position.x}
        onChange={(v) => updateElement(floorIndex, element.id, { position: { ...element.position, x: v } })}
      />
      <UnitNumberInput
        label="Y"
        value={element.position.y}
        onChange={(v) => updateElement(floorIndex, element.id, { position: { ...element.position, y: v } })}
      />
      <NumberInput
        label={t('field.rotation')}
        value={element.rotation}
        onChange={(v) => updateElement(floorIndex, element.id, { rotation: v })}
        unit={'\u00B0'}
        min={0}
        max={360}
        step={5}
      />
      <UnitNumberInput
        label={t('field.width')}
        value={element.width}
        onChange={(v) => updateElement(floorIndex, element.id, { width: v })}
        min={0.5}
        max={5.0}
      />
      <UnitNumberInput
        label={t('field.length')}
        value={element.length}
        onChange={(v) => updateElement(floorIndex, element.id, { length: v })}
        min={0.5}
        max={10.0}
      />
      <NumberInput
        label={t('field.treads')}
        value={element.treads}
        onChange={(v) => updateElement(floorIndex, element.id, { treads: Math.round(v) })}
        unit=""
        min={3}
        max={30}
        step={1}
      />
      <UnitNumberInput
        label={t('field.riserHeight')}
        value={element.riserHeight}
        onChange={(v) => updateElement(floorIndex, element.id, { riserHeight: v })}
        min={0.1}
        max={0.3}
      />
      <div className="flex items-center justify-between py-1">
        <label className="text-xs" style={{ color: '#6b6560' }}>{t('field.direction')}</label>
        <div className="flex gap-1">
          {(['up', 'down'] as StairDirection[]).map((dir) => (
            <button
              key={dir}
              type="button"
              onClick={() => updateElement(floorIndex, element.id, { direction: dir })}
              className="px-2 py-0.5 text-xs rounded cursor-pointer"
              style={{
                background: element.direction === dir ? '#ddd7cc' : '#ece8e1',
                color: element.direction === dir ? '#2d6a4f' : '#6b6560',
                border: `1px solid ${element.direction === dir ? '#2d6a4f' : '#d5cfc6'}`,
              }}
            >
              {t(`stairDir.${dir}`)}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between py-1">
        <label className="text-xs" style={{ color: '#6b6560' }}>{t('field.flip')}</label>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => updateElement(floorIndex, element.id, { flipH: !element.flipH })}
            className="px-2 py-0.5 text-xs rounded cursor-pointer"
            style={{
              background: element.flipH ? '#ddd7cc' : '#ece8e1',
              color: element.flipH ? '#2d6a4f' : '#6b6560',
              border: `1px solid ${element.flipH ? '#2d6a4f' : '#d5cfc6'}`,
            }}
          >
            {t('ui.flipH')}
          </button>
          <button
            type="button"
            onClick={() => updateElement(floorIndex, element.id, { flipV: !element.flipV })}
            className="px-2 py-0.5 text-xs rounded cursor-pointer"
            style={{
              background: element.flipV ? '#ddd7cc' : '#ece8e1',
              color: element.flipV ? '#2d6a4f' : '#6b6560',
              border: `1px solid ${element.flipV ? '#2d6a4f' : '#d5cfc6'}`,
            }}
          >
            {t('ui.flipV')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Line style display names
// ---------------------------------------------------------------------------

const ARCH_LINE_STYLE_KEYS: Record<ArchLineStyle, string> = {
  colindancia: 'archStyle.colindancia',
  'limite-lote': 'archStyle.limite-lote',
  eje: 'archStyle.eje',
  setback: 'archStyle.setback',
  center: 'archStyle.center',
};

const ARCH_LINE_STYLES: ArchLineStyle[] = ['colindancia', 'limite-lote', 'eje', 'setback', 'center'];

function ArchLineProperties({ element, floorIndex }: { element: ArchLine; floorIndex: number }) {
  const updateElement = useProjectStore((s) => s.updateElement);
  const markDirty = useUIStore((s) => s.markDirty);
  const t = useTranslation();

  const dx = element.end.x - element.start.x;
  const dy = element.end.y - element.start.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angleRad = length > 0 ? Math.atan2(dy, dx) : 0;
  const angleDeg = ((angleRad * 180) / Math.PI + 360) % 360;

  const handleLengthChange = (newLen: number) => {
    if (newLen <= 0) return;
    const newEnd = {
      x: element.start.x + Math.cos(angleRad) * newLen,
      y: element.start.y + Math.sin(angleRad) * newLen,
    };
    updateElement(floorIndex, element.id, { end: newEnd });
    markDirty();
  };

  const handleAngleChange = (newDeg: number) => {
    const newRad = (newDeg * Math.PI) / 180;
    const newEnd = {
      x: element.start.x + Math.cos(newRad) * length,
      y: element.start.y + Math.sin(newRad) * length,
    };
    updateElement(floorIndex, element.id, { end: newEnd });
    markDirty();
  };

  const update = (patch: Partial<ArchLine>) => {
    updateElement(floorIndex, element.id, patch);
    markDirty();
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="text-xs font-medium mb-1" style={{ color: '#2d6a4f' }}>
        {t('prop.archline')}
      </div>
      <UnitNumberInput
        label={t('field.length')}
        value={length}
        onChange={handleLengthChange}
        min={0.01}
        max={100}
      />
      <NumberInput
        label={t('field.angle')}
        value={Math.round(angleDeg * 10) / 10}
        onChange={handleAngleChange}
        unit="\u00B0"
        min={0}
        max={360}
        step={1}
      />
      <UnitNumberInput
        label={t('field.startX')}
        value={element.start.x}
        onChange={(v) => update({ start: { ...element.start, x: v } })}
      />
      <UnitNumberInput
        label={t('field.startY')}
        value={element.start.y}
        onChange={(v) => update({ start: { ...element.start, y: v } })}
      />
      <UnitNumberInput
        label={t('field.endX')}
        value={element.end.x}
        onChange={(v) => update({ end: { ...element.end, x: v } })}
      />
      <UnitNumberInput
        label={t('field.endY')}
        value={element.end.y}
        onChange={(v) => update({ end: { ...element.end, y: v } })}
      />
      <div className="flex items-center justify-between py-1">
        <label className="text-xs" style={{ color: '#6b6560' }}>{t('field.style')}</label>
        <select
          value={element.lineStyle}
          onChange={(e) => {
            update({ lineStyle: e.target.value as ArchLineStyle });
          }}
          className="px-2 py-1 text-xs rounded cursor-pointer outline-none"
          style={{
            background: '#ece8e1',
            color: '#2c2c2c',
            border: '1px solid #d5cfc6',
          }}
        >
          {ARCH_LINE_STYLES.map((s) => (
            <option key={s} value={s}>
              {t(ARCH_LINE_STYLE_KEYS[s])}
            </option>
          ))}
        </select>
      </div>
      <NumberInput
        label={t('field.lineWeight')}
        value={element.lineWeight}
        onChange={(v) => update({ lineWeight: v })}
        min={0.5}
        max={10}
        step={0.5}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shape kind constants
// ---------------------------------------------------------------------------

const SHAPE_KINDS: ShapeKind[] = ['rectangle', 'circle', 'triangle'];
const SHAPE_KIND_KEYS: Record<ShapeKind, string> = {
  rectangle: 'shapeKind.rectangle',
  circle: 'shapeKind.circle',
  triangle: 'shapeKind.triangle',
};

function ShapeProperties({ element, floorIndex }: { element: Shape; floorIndex: number }) {
  const updateElement = useProjectStore((s) => s.updateElement);
  const setShapeDefaults = useUIStore((s) => s.setShapeDefaults);
  const t = useTranslation();

  return (
    <div className="flex flex-col gap-1">
      <div className="text-xs font-medium mb-1" style={{ color: '#2d6a4f' }}>
        {t('prop.shape')}
      </div>
      <div className="flex items-center justify-between py-1">
        <label className="text-xs" style={{ color: '#6b6560' }}>{t('field.shapeKind')}</label>
        <select
          value={element.shapeKind}
          onChange={(e) =>
            updateElement(floorIndex, element.id, { shapeKind: e.target.value as ShapeKind })
          }
          className="px-2 py-1 text-xs rounded cursor-pointer outline-none"
          style={{
            background: '#ece8e1',
            color: '#2c2c2c',
            border: '1px solid #d5cfc6',
          }}
        >
          {SHAPE_KINDS.map((s) => (
            <option key={s} value={s}>
              {t(SHAPE_KIND_KEYS[s])}
            </option>
          ))}
        </select>
      </div>
      <UnitNumberInput
        label="X"
        value={element.position.x}
        onChange={(v) => updateElement(floorIndex, element.id, { position: { ...element.position, x: v } })}
      />
      <UnitNumberInput
        label="Y"
        value={element.position.y}
        onChange={(v) => updateElement(floorIndex, element.id, { position: { ...element.position, y: v } })}
      />
      <UnitNumberInput
        label={t('field.width')}
        value={element.width}
        onChange={(v) => updateElement(floorIndex, element.id, { width: v })}
        min={0.05}
        max={50}
      />
      <UnitNumberInput
        label={t('field.height')}
        value={element.height}
        onChange={(v) => updateElement(floorIndex, element.id, { height: v })}
        min={0.05}
        max={50}
      />
      <NumberInput
        label={t('field.rotation')}
        value={element.rotation}
        onChange={(v) => updateElement(floorIndex, element.id, { rotation: v })}
        unit={'\u00B0'}
        min={0}
        max={360}
        step={5}
      />
      <div className="flex items-center justify-between py-1">
        <label className="text-xs" style={{ color: '#6b6560' }}>{t('field.filled')}</label>
        <input
          type="checkbox"
          checked={element.filled}
          onChange={(e) => {
            updateElement(floorIndex, element.id, { filled: e.target.checked });
            setShapeDefaults({ filled: e.target.checked });
          }}
          className="w-4 h-4 cursor-pointer"
        />
      </div>
      {element.filled && (
        <div className="flex items-center justify-between py-1">
          <label className="text-xs" style={{ color: '#6b6560' }}>{t('field.fillColor')}</label>
          <input
            type="color"
            value={element.fillColor}
            onChange={(e) => {
              updateElement(floorIndex, element.id, { fillColor: e.target.value });
              setShapeDefaults({ fillColor: e.target.value });
            }}
            className="w-8 h-6 rounded cursor-pointer border-0"
            style={{ background: 'transparent' }}
          />
        </div>
      )}
      <div className="flex items-center justify-between py-1">
        <label className="text-xs" style={{ color: '#6b6560' }}>{t('field.strokeColor')}</label>
        <input
          type="color"
          value={element.strokeColor}
          onChange={(e) => {
            updateElement(floorIndex, element.id, { strokeColor: e.target.value });
            setShapeDefaults({ strokeColor: e.target.value });
          }}
          className="w-8 h-6 rounded cursor-pointer border-0"
          style={{ background: 'transparent' }}
        />
      </div>
      <UnitNumberInput
        label={t('field.strokeWidth')}
        value={element.strokeWidth}
        onChange={(v) => {
          updateElement(floorIndex, element.id, { strokeWidth: v });
          setShapeDefaults({ strokeWidth: v });
        }}
        min={0.005}
        max={0.5}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Line style selector (shown when archline tool is active)
// ---------------------------------------------------------------------------

function ArchLineStyleSelector() {
  const activeArchLineStyle = useUIStore((s) => s.activeArchLineStyle);
  const setArchLineStyle = useUIStore((s) => s.setArchLineStyle);
  const t = useTranslation();

  return (
    <div
      className="p-3 shrink-0"
      style={{ borderBottom: '1px solid #d5cfc6' }}
    >
      <div className="text-xs font-medium mb-2" style={{ color: '#2d6a4f' }}>
        {t('selector.lineStyle')}
      </div>
      <div className="flex flex-col gap-1">
        {ARCH_LINE_STYLES.map((style) => (
          <button
            key={style}
            type="button"
            onClick={() => setArchLineStyle(style)}
            className="flex items-center gap-2 px-2 py-1.5 text-xs rounded cursor-pointer transition-colors"
            style={{
              background: activeArchLineStyle === style ? '#ddd7cc' : '#ece8e1',
              color: activeArchLineStyle === style ? '#2d6a4f' : '#6b6560',
              border: `1px solid ${activeArchLineStyle === style ? '#2d6a4f' : '#d5cfc6'}`,
              textAlign: 'left',
            }}
          >
            <span style={{ color: '#2c2c2c' }}>{t(ARCH_LINE_STYLE_KEYS[style])}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Door style selector (shown when door tool is active)
// ---------------------------------------------------------------------------

function DoorStyleSelector() {
  const activeDoorStyle = useUIStore((s) => s.activeDoorStyle);
  const setDoorStyle = useUIStore((s) => s.setDoorStyle);
  const t = useTranslation();

  return (
    <div
      className="p-3 shrink-0"
      style={{ borderBottom: '1px solid #d5cfc6' }}
    >
      <div className="text-xs font-medium mb-2" style={{ color: '#2d6a4f' }}>
        {t('selector.doorStyle')}
      </div>
      <div className="flex flex-col gap-1">
        {DOOR_STYLES.map((style) => (
          <button
            key={style}
            type="button"
            onClick={() => setDoorStyle(style)}
            className="flex items-center gap-2 px-2 py-1.5 text-xs rounded cursor-pointer transition-colors"
            style={{
              background: activeDoorStyle === style ? '#ddd7cc' : '#ece8e1',
              color: activeDoorStyle === style ? '#2d6a4f' : '#6b6560',
              border: `1px solid ${activeDoorStyle === style ? '#2d6a4f' : '#d5cfc6'}`,
              textAlign: 'left',
            }}
          >
            <span style={{ color: '#2c2c2c' }}>{t(DOOR_STYLE_KEYS[style])}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Window style selector (shown when window tool is active)
// ---------------------------------------------------------------------------

function WindowStyleSelector() {
  const activeWindowStyle = useUIStore((s) => s.activeWindowStyle);
  const setWindowStyle = useUIStore((s) => s.setWindowStyle);
  const t = useTranslation();

  return (
    <div
      className="p-3 shrink-0"
      style={{ borderBottom: '1px solid #d5cfc6' }}
    >
      <div className="text-xs font-medium mb-2" style={{ color: '#2d6a4f' }}>
        {t('selector.windowStyle')}
      </div>
      <div className="flex flex-col gap-1">
        {WINDOW_STYLES.map((style) => (
          <button
            key={style}
            type="button"
            onClick={() => setWindowStyle(style)}
            className="flex items-center gap-2 px-2 py-1.5 text-xs rounded cursor-pointer transition-colors"
            style={{
              background: activeWindowStyle === style ? '#ddd7cc' : '#ece8e1',
              color: activeWindowStyle === style ? '#2d6a4f' : '#6b6560',
              border: `1px solid ${activeWindowStyle === style ? '#2d6a4f' : '#d5cfc6'}`,
              textAlign: 'left',
            }}
          >
            <span style={{ color: '#2c2c2c' }}>{t(WINDOW_STYLE_KEYS[style])}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stair style selector (shown when stair tool is active)
// ---------------------------------------------------------------------------

function StairStyleSelector() {
  const activeStairStyle = useUIStore((s) => s.activeStairStyle);
  const setStairStyle = useUIStore((s) => s.setStairStyle);
  const t = useTranslation();

  return (
    <div
      className="p-3 shrink-0"
      style={{ borderBottom: '1px solid #d5cfc6' }}
    >
      <div className="text-xs font-medium mb-2" style={{ color: '#2d6a4f' }}>
        {t('selector.stairStyle')}
      </div>
      <div className="flex flex-col gap-1">
        {STAIR_STYLES.map((style) => (
          <button
            key={style}
            type="button"
            onClick={() => setStairStyle(style)}
            className="flex items-center gap-2 px-2 py-1.5 text-xs rounded cursor-pointer transition-colors"
            style={{
              background: activeStairStyle === style ? '#ddd7cc' : '#ece8e1',
              color: activeStairStyle === style ? '#2d6a4f' : '#6b6560',
              border: `1px solid ${activeStairStyle === style ? '#2d6a4f' : '#d5cfc6'}`,
              textAlign: 'left',
            }}
          >
            <span style={{ color: '#2c2c2c' }}>{t(STAIR_STYLE_KEYS[style])}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shape kind selector (shown when shape tool is active)
// ---------------------------------------------------------------------------

function ShapeKindSelector() {
  const activeShapeKind = useUIStore((s) => s.activeShapeKind);
  const setShapeKind = useUIStore((s) => s.setShapeKind);
  const shapeDefaults = useUIStore((s) => s.shapeDefaults);
  const setShapeDefaults = useUIStore((s) => s.setShapeDefaults);
  const t = useTranslation();

  return (
    <div
      className="p-3 shrink-0"
      style={{ borderBottom: '1px solid #d5cfc6' }}
    >
      <div className="text-xs font-medium mb-2" style={{ color: '#2d6a4f' }}>
        {t('selector.shapeKind')}
      </div>
      <div className="flex flex-col gap-1">
        {SHAPE_KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => setShapeKind(kind)}
            className="flex items-center gap-2 px-2 py-1.5 text-xs rounded cursor-pointer transition-colors"
            style={{
              background: activeShapeKind === kind ? '#ddd7cc' : '#ece8e1',
              color: activeShapeKind === kind ? '#2d6a4f' : '#6b6560',
              border: `1px solid ${activeShapeKind === kind ? '#2d6a4f' : '#d5cfc6'}`,
              textAlign: 'left',
            }}
          >
            <span style={{ color: '#2c2c2c' }}>{t(SHAPE_KIND_KEYS[kind])}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-1 mt-3">
        <div className="flex items-center justify-between py-1">
          <label className="text-xs" style={{ color: '#6b6560' }}>{t('field.filled')}</label>
          <input
            type="checkbox"
            checked={shapeDefaults.filled}
            onChange={(e) => setShapeDefaults({ filled: e.target.checked })}
            className="w-4 h-4 cursor-pointer"
          />
        </div>
        {shapeDefaults.filled && (
          <div className="flex items-center justify-between py-1">
            <label className="text-xs" style={{ color: '#6b6560' }}>{t('field.fillColor')}</label>
            <input
              type="color"
              value={shapeDefaults.fillColor}
              onChange={(e) => setShapeDefaults({ fillColor: e.target.value })}
              className="w-8 h-6 rounded cursor-pointer border-0"
              style={{ background: 'transparent' }}
            />
          </div>
        )}
        <div className="flex items-center justify-between py-1">
          <label className="text-xs" style={{ color: '#6b6560' }}>{t('field.strokeColor')}</label>
          <input
            type="color"
            value={shapeDefaults.strokeColor}
            onChange={(e) => setShapeDefaults({ strokeColor: e.target.value })}
            className="w-8 h-6 rounded cursor-pointer border-0"
            style={{ background: 'transparent' }}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Element property router
// ---------------------------------------------------------------------------

function ElementProperties({ element, floorIndex }: { element: AnyElement; floorIndex: number }) {
  switch (element.type) {
    case 'wall':
      return <WallProperties element={element} floorIndex={floorIndex} />;
    case 'door':
      return <DoorProperties element={element} floorIndex={floorIndex} />;
    case 'window':
      return <WindowProperties element={element} floorIndex={floorIndex} />;
    case 'room':
      return <RoomProperties element={element} floorIndex={floorIndex} />;
    case 'furniture':
      return <FurnitureProperties element={element} floorIndex={floorIndex} />;
    case 'text':
      return <TextProperties element={element} floorIndex={floorIndex} />;
    case 'dimension':
      return <DimensionProperties element={element} floorIndex={floorIndex} />;
    case 'archline':
      return <ArchLineProperties element={element} floorIndex={floorIndex} />;
    case 'stair':
      return <StairProperties element={element} floorIndex={floorIndex} />;
    case 'shape':
      return <ShapeProperties element={element} floorIndex={floorIndex} />;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Properties Tab Content
// ---------------------------------------------------------------------------

function PropertiesPanel() {
  const selectedIds = useUIStore((s) => s.selectedIds);
  const activeTool = useUIStore((s) => s.activeTool);
  const floorIndex = useProjectStore((s) => s.project.activeFloorIndex);
  const elements = useProjectStore((s) => {
    const floor = s.project.floors[s.project.activeFloorIndex];
    if (!floor) return {};
    return floor.elements;
  });
  const removeElement = useProjectStore((s) => s.removeElement);
  const removeElements = useProjectStore((s) => s.removeElements);
  const clearSelection = useUIStore((s) => s.clearSelection);
  const t = useTranslation();

  if (selectedIds.length === 0) {
    return (
      <div className="flex flex-col flex-1">
        {activeTool === 'archline' && <ArchLineStyleSelector />}
        {activeTool === 'door' && <DoorStyleSelector />}
        {activeTool === 'window' && <WindowStyleSelector />}
        {activeTool === 'stair' && <StairStyleSelector />}
        {activeTool === 'shape' && <ShapeKindSelector />}
        <div className="flex-1 flex items-center justify-center p-6">
          <span className="text-xs text-center" style={{ color: '#6b6560', wordWrap: 'break-word', overflowWrap: 'break-word', maxWidth: '100%', padding: '0 8px' }}>
            {t('ui.selectToEdit')}
          </span>
        </div>
      </div>
    );
  }

  const selectedElement = elements[selectedIds[0]];
  if (!selectedElement) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <span className="text-xs text-center" style={{ color: '#6b6560' }}>
          {t('ui.elementNotFound')}
        </span>
      </div>
    );
  }

  const handleDelete = () => {
    if (selectedIds.length === 1) {
      removeElement(floorIndex, selectedIds[0]);
    } else {
      removeElements(floorIndex, selectedIds);
    }
    clearSelection();
  };

  return (
    <div className="flex flex-col flex-1 overflow-y-auto">
      {activeTool === 'archline' && <ArchLineStyleSelector />}
      {activeTool === 'door' && <DoorStyleSelector />}
      {activeTool === 'window' && <WindowStyleSelector />}
      {activeTool === 'stair' && <StairStyleSelector />}
      {activeTool === 'shape' && <ShapeKindSelector />}
      <div className="flex flex-col flex-1 px-5 py-3">
      {/* Element ID */}
      <div className="text-xs mb-2" style={{ color: '#6b6560' }}>
        ID: <span style={{ color: '#2c2c2c' }}>{selectedElement.id.slice(0, 8)}...</span>
        {selectedIds.length > 1 && (
          <span style={{ color: '#6b6560' }}> (+{selectedIds.length - 1} more)</span>
        )}
      </div>

      {/* Properties */}
      <ElementProperties element={selectedElement} floorIndex={floorIndex} />

      {/* Delete button */}
      <div className="mt-auto pt-4">
        <button
          type="button"
          onClick={handleDelete}
          className="ep-btn-danger cursor-pointer w-full"
        >
          {t('ui.delete')} {selectedIds.length > 1 ? `(${selectedIds.length})` : ''}
        </button>
      </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// StampThumbnail — renders the stamp draw() onto a small canvas
// ---------------------------------------------------------------------------

function StampThumbnail({ stamp, size = 48 }: { stamp: StampDefinition; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);

    // Compute scale to fit stamp into the thumbnail with some padding
    const padding = 4;
    const availW = size - padding * 2;
    const availH = size - padding * 2;
    const scaleX = availW / stamp.width;
    const scaleY = availH / stamp.depth;
    const sc = Math.min(scaleX, scaleY);

    // Center the stamp
    const drawW = stamp.width * sc;
    const drawH = stamp.depth * sc;
    const offX = padding + (availW - drawW) / 2;
    const offY = padding + (availH - drawH) / 2;

    ctx.save();
    ctx.translate(offX, offY);
    ctx.scale(sc, sc);
    stamp.draw(ctx, stamp.width, stamp.depth);
    ctx.restore();
  }, [stamp, size]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: size,
        height: size,
        borderRadius: 4,
        background: '#fff',
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Library Tab Content
// ---------------------------------------------------------------------------

function LibraryPanel() {
  const [activeCategory, setActiveCategory] = useState<StampCategory>('furniture');
  const setTool = useUIStore((s) => s.setTool);
  const setActiveStamp = useUIStore((s) => s.setActiveStamp);
  const activeStampId = useUIStore((s) => s.activeStampId);
  const lang = useUIStore((s) => s.language);
  const t = useTranslation();

  const stamps = useMemo(
    () => getStampsByCategory(activeCategory),
    [activeCategory],
  );

  const handleStampClick = useCallback(
    (stampId: string) => {
      setActiveStamp(stampId);
      setTool('stamp');
    },
    [setActiveStamp, setTool],
  );

  const catName = (cat: CategoryInfo) => lang === 'en' ? cat.name : cat.nameEs;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Category tabs */}
      <div
        className="flex overflow-x-auto shrink-0 gap-0.5 p-1"
        style={{ borderBottom: '1px solid #d5cfc6' }}
      >
        {categories.map((cat: CategoryInfo) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            className={`ep-tab px-2 py-1 text-xs shrink-0 ${activeCategory === cat.id ? 'active' : ''}`}
            title={catName(cat)}
          >
            <span className="mr-1">{cat.icon}</span>
            {catName(cat)}
          </button>
        ))}
      </div>

      {/* Stamp grid */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-2 gap-2">
          {stamps.map((stamp) => (
            <button
              key={stamp.id}
              type="button"
              onClick={() => handleStampClick(stamp.id)}
              className={`ep-stamp-item flex flex-col items-center gap-1 p-2 rounded transition-colors ${activeStampId === stamp.id ? 'selected' : ''}`}
            >
              <StampThumbnail stamp={stamp} size={48} />
              <span
                className="text-xs text-center leading-tight"
                style={{ color: '#2c2c2c' }}
              >
                {lang === 'en' ? stamp.name : stamp.nameEs}
              </span>
            </button>
          ))}
          {stamps.length === 0 && (
            <div className="col-span-2 text-center py-4">
              <span className="text-xs" style={{ color: '#6b6560' }}>
                {t('ui.noItems')}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RightSidebar
// ---------------------------------------------------------------------------

export function RightSidebar() {
  const [activeTab, setActiveTab] = useState<TabId>('properties');
  const rightSidebarOpen = useUIStore((s) => s.rightSidebarOpen);
  const toggleRightSidebar = useUIStore((s) => s.toggleRightSidebar);
  const t = useTranslation();

  if (!rightSidebarOpen) {
    return (
      <div
        className="flex flex-col items-center pt-2 shrink-0"
        style={{
          width: 24,
          background: '#ece8e1',
          borderLeft: '1px solid #d5cfc6',
        }}
      >
        <button
          type="button"
          onClick={toggleRightSidebar}
          className="text-xs cursor-pointer"
          style={{ color: '#6b6560' }}
          title="Open sidebar"
        >
          &laquo;
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col shrink-0 overflow-hidden"
      style={{
        width: 280,
        minWidth: 0,
        background: '#ffffff',
        borderLeft: '1px solid #d5cfc6',
      }}
    >
      {/* Tab header */}
      <div
        className="flex items-center shrink-0"
        style={{ borderBottom: '1px solid #d5cfc6' }}
      >
        {(['properties', 'library'] as TabId[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`ep-tab flex-1 py-2 text-xs text-center ${activeTab === tab ? 'active' : ''}`}
          >
            {t(`tab.${tab}`)}
          </button>
        ))}
        <button
          type="button"
          onClick={toggleRightSidebar}
          className="px-2 py-2 text-xs cursor-pointer"
          style={{ color: '#6b6560', background: '#ece8e1' }}
          title="Close sidebar"
        >
          &raquo;
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'properties' ? <PropertiesPanel /> : <LibraryPanel />}
    </div>
  );
}
