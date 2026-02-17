import { useState, useRef, useEffect, type ReactNode } from 'react';
import { useProjectStore } from '@/store/project-store.ts';
import { useUIStore } from '@/store/ui-store.ts';
import { IconButton } from '@/components/shared/IconButton.tsx';
import { useTranslation } from '@/utils/i18n.ts';
import { useProjectFile } from '@/hooks/useProjectFile.ts';
import type { ViewMode } from '@/types/project.ts';
import { DISPLAY_UNITS, UNIT_LABELS } from '@/utils/units.ts';

// ---------------------------------------------------------------------------
// View mode icons (SVG)
// ---------------------------------------------------------------------------

function PlanIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="1" />
      <line x1="3" y1="12" x2="14" y2="12" />
      <line x1="14" y1="3" x2="14" y2="12" />
      <line x1="3" y1="18" x2="14" y2="18" />
    </svg>
  );
}

function Iso3DIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// View mode configuration
// ---------------------------------------------------------------------------

const VIEW_MODES: { mode: ViewMode; labelKey: string; icon: ReactNode }[] = [
  { mode: 'plan', labelKey: 'view.plan', icon: <PlanIcon /> },
  { mode: 'isometric', labelKey: 'view.isometric', icon: <Iso3DIcon /> },
];

const SCALES: string[] = [
  '1:10',
  '1:20',
  '1:25',
  '1:50',
  '1:75',
  '1:100',
  '1:150',
  '1:200',
  '1:250',
  '1:500',
];

// ---------------------------------------------------------------------------
// TopBar
// ---------------------------------------------------------------------------

export function TopBar() {
  const viewMode = useUIStore((s) => s.viewMode);
  const setViewMode = useUIStore((s) => s.setViewMode);
  const showGrid = useUIStore((s) => s.showGrid);
  const snapEnabled = useUIStore((s) => s.snapEnabled);
  const showDimensions = useUIStore((s) => s.showDimensions);
  const toggleGrid = useUIStore((s) => s.toggleGrid);
  const toggleSnap = useUIStore((s) => s.toggleSnap);
  const toggleDimensions = useUIStore((s) => s.toggleDimensions);
  const setExportDialogOpen = useUIStore((s) => s.setExportDialogOpen);
  const setSupportDialogOpen = useUIStore((s) => s.setSupportDialogOpen);
  const setSuggestionDialogOpen = useUIStore((s) => s.setSuggestionDialogOpen);
  const isMobile = useUIStore((s) => s.isMobile);

  const language = useUIStore((s) => s.language);
  const setLanguage = useUIStore((s) => s.setLanguage);

  const scale = useProjectStore((s) => s.project.scale);
  const setScale = useProjectStore((s) => s.setScale);
  const displayUnit = useProjectStore((s) => s.project.displayUnit);
  const setDisplayUnit = useProjectStore((s) => s.setDisplayUnit);

  const t = useTranslation();
  const {
    saveProject,
    loadProject: loadProjectFile,
    createNewProjectWithPrompt,
    clearCanvasWithConfirm,
  } = useProjectFile();

  const [scaleOpen, setScaleOpen] = useState(false);
  const [customScaleInput, setCustomScaleInput] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const scaleDropdownRef = useRef<HTMLDivElement>(null);
  const [unitOpen, setUnitOpen] = useState(false);
  const unitDropdownRef = useRef<HTMLDivElement>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Close scale dropdown when clicking outside
  useEffect(() => {
    if (!scaleOpen) return;
    const handler = (e: Event) => {
      if (scaleDropdownRef.current && !scaleDropdownRef.current.contains(e.target as Node)) {
        setScaleOpen(false);
        setShowCustom(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [scaleOpen]);

  // Close unit dropdown when clicking outside
  useEffect(() => {
    if (!unitOpen) return;
    const handler = (e: Event) => {
      if (unitDropdownRef.current && !unitDropdownRef.current.contains(e.target as Node)) {
        setUnitOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [unitOpen]);

  useEffect(() => {
    if (!moreOpen) return;
    const handler = (e: Event) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [moreOpen]);

  const handleUndo = () => {
    const { undo } = useProjectStore.temporal.getState();
    undo();
  };

  const handleRedo = () => {
    const { redo } = useProjectStore.temporal.getState();
    redo();
  };

  return (
    <div
      className="flex items-center justify-between shrink-0 select-none"
      style={{
        height: isMobile ? 40 : 46,
        background: '#ece8e1',
        borderBottom: '1px solid rgba(180,172,160,0.4)',
        minWidth: 0,
        overflow: 'visible',
        position: 'relative',
        zIndex: 50,
        padding: isMobile ? '0 6px' : '0 16px',
      }}
    >
      {/* Left: Logo + Language toggle */}
      <div className="flex items-center gap-3 shrink-0">
        <span
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 18,
            fontWeight: 700,
            color: '#2d6a4f',
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
        >
          Easy<span style={{ color: '#b85c38' }}>Plans</span>
        </span>
        {/* Language toggle */}
        <div
          className="flex items-center rounded-md overflow-hidden"
          style={{ border: '1px solid var(--ep-border-light)', fontSize: 10, lineHeight: '18px' }}
        >
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={`ep-pill px-1.5 cursor-pointer ${language === 'en' ? 'active' : ''}`}
            style={{ borderRadius: 0 }}
          >
            EN
          </button>
          <div style={{ width: 1, height: 14, background: 'var(--ep-border-light)' }} />
          <button
            type="button"
            onClick={() => setLanguage('es')}
            className={`ep-pill px-1.5 cursor-pointer ${language === 'es' ? 'active' : ''}`}
            style={{ borderRadius: 0 }}
          >
            ES
          </button>
        </div>
      </div>

      {/* Center: View mode tabs */}
      <div
        className="flex items-center rounded-xl p-1 gap-0.5"
        style={{
          background: 'rgba(0,0,0,0.04)',
          border: '1px solid rgba(180,172,160,0.35)',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)',
          flexShrink: 1,
          overflow: 'hidden',
        }}
      >
        {VIEW_MODES.map(({ mode, labelKey, icon }) => {
          const isActive = viewMode === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={`ep-view-tab ${isActive ? 'active' : ''}`}
              title={t(labelKey)}
            >
              {icon}
              {!isMobile && t(labelKey)}
            </button>
          );
        })}
      </div>

      {/* Right: controls */}
      <div className="flex items-center shrink-0" style={{ gap: isMobile ? 4 : 8 }}>
        {!isMobile && (
          <div className="ep-toolbar-group">
            <div className="relative" ref={scaleDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setScaleOpen(!scaleOpen);
                  setShowCustom(false);
                }}
                className="ep-btn-secondary px-2.5 py-1 text-xs cursor-pointer"
                style={{ background: 'rgba(0,0,0,0.04)' }}
              >
                {scale}
              </button>
              {scaleOpen && (
                <div
                  className="ep-dropdown absolute top-full right-0 mt-1 z-50"
                  style={{ maxHeight: 320, overflowY: 'auto', minWidth: 100 }}
                >
                  {SCALES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setScale(s);
                        setScaleOpen(false);
                      }}
                      className={`ep-dropdown-item ${s === scale ? 'selected' : ''}`}
                    >
                      {s}
                    </button>
                  ))}
                  <div style={{ borderTop: '1px solid var(--ep-border)' }}>
                    {showCustom ? (
                      <div className="flex items-center gap-1 p-1.5">
                        <span className="text-xs" style={{ color: 'var(--ep-text-dim)' }}>1:</span>
                        <input
                          type="number"
                          min={1}
                          max={10000}
                          value={customScaleInput}
                          onChange={(e) => setCustomScaleInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const num = parseInt(customScaleInput, 10);
                              if (num > 0 && num <= 10000) {
                                setScale(`1:${num}`);
                                setScaleOpen(false);
                                setShowCustom(false);
                                setCustomScaleInput('');
                              }
                            }
                            if (e.key === 'Escape') {
                              setShowCustom(false);
                            }
                          }}
                          autoFocus
                          className="ep-input w-16 px-1 py-0.5 text-xs"
                          placeholder="ej. 75"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const num = parseInt(customScaleInput, 10);
                            if (num > 0 && num <= 10000) {
                              setScale(`1:${num}`);
                              setScaleOpen(false);
                              setShowCustom(false);
                              setCustomScaleInput('');
                            }
                          }}
                          className="ep-btn-primary px-1.5 py-0.5 text-xs cursor-pointer"
                        >
                          OK
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowCustom(true)}
                        className="ep-dropdown-item"
                        style={{ color: 'var(--ep-text-dim)' }}
                      >
                        {t('ui.custom')}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="relative" ref={unitDropdownRef}>
              <button
                type="button"
                onClick={() => setUnitOpen(!unitOpen)}
                className="ep-btn-secondary px-2.5 py-1 text-xs cursor-pointer"
                style={{ background: 'rgba(0,0,0,0.04)' }}
                title={t('tooltip.units')}
              >
                {UNIT_LABELS[displayUnit || 'm']}
              </button>
              {unitOpen && (
                <div
                  className="ep-dropdown absolute top-full right-0 mt-1 z-50"
                  style={{ maxHeight: 280, overflowY: 'auto', minWidth: 150 }}
                >
                  {DISPLAY_UNITS.map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => {
                        setDisplayUnit(u);
                        setUnitOpen(false);
                      }}
                      className={`ep-dropdown-item ${u === (displayUnit || 'm') ? 'selected' : ''}`}
                    >
                      {t(`unit.${u}`)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="ep-toolbar-divider" />

            <IconButton
              icon={'\u229E'}
              label={t('ui.grid')}
              active={showGrid}
              onClick={toggleGrid}
              size="sm"
              tooltip={t('tooltip.grid')}
            />
            <IconButton
              icon={'\u2295'}
              label={t('ui.snap')}
              active={snapEnabled}
              onClick={toggleSnap}
              size="sm"
              tooltip={t('tooltip.snap')}
            />
            <IconButton
              icon={'\u2194'}
              label={t('ui.dimensions')}
              active={showDimensions}
              onClick={toggleDimensions}
              size="sm"
              tooltip={t('tooltip.dimensions')}
            />
          </div>
        )}

        <div className="ep-toolbar-group">
          <IconButton
            icon={'\u21A9'}
            label={t('ui.undo')}
            onClick={handleUndo}
            size="sm"
            tooltip={t('tooltip.undo')}
          />
          <IconButton
            icon={'\u21AA'}
            label={t('ui.redo')}
            onClick={handleRedo}
            size="sm"
            tooltip={t('tooltip.redo')}
          />
        </div>

        <div className="ep-toolbar-group">
          <IconButton
            icon={'+'}
            label={t('ui.newProject')}
            onClick={() => {
              void createNewProjectWithPrompt();
            }}
            size="sm"
            tooltip={t('tooltip.newProject')}
          />
          <IconButton
            icon={'\u232B'}
            label={t('ui.clearCanvas')}
            onClick={clearCanvasWithConfirm}
            size="sm"
            tooltip={t('tooltip.clearCanvas')}
          />
          <IconButton
            icon={'\u2B07'}
            label={t('ui.export')}
            onClick={() => setExportDialogOpen(true)}
            size="sm"
            tooltip={t('tooltip.export')}
          />
          <IconButton
            icon={'\uD83D\uDCBE'}
            label={t('ui.save')}
            onClick={saveProject}
            size="sm"
            tooltip={t('tooltip.save')}
          />
          <IconButton
            icon={'\uD83D\uDCC2'}
            label={t('ui.load')}
            onClick={loadProjectFile}
            size="sm"
            tooltip={t('tooltip.load')}
          />
        </div>

        <button
          type="button"
          onClick={() => setSupportDialogOpen(true)}
          className="ep-support-btn"
          title={t('support.apoyame')}
        >
          {isMobile ? '\u2665' : t('support.apoyame')}
        </button>

        <div className="relative" ref={moreMenuRef}>
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            className="ep-btn-secondary cursor-pointer"
            style={{ padding: '4px 10px', fontSize: 11 }}
            title={t('ui.more')}
          >
            {isMobile ? '\u22EF' : t('ui.more')}
          </button>
          {moreOpen && (
            <div className="ep-dropdown absolute top-full right-0 mt-1 z-50" style={{ minWidth: 180 }}>
              <a
                href={`/manual.html?lang=${language}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ep-dropdown-item"
                style={{ textDecoration: 'none', display: 'block' }}
                onClick={() => setMoreOpen(false)}
              >
                {t('ui.help')}
              </a>
              <button
                type="button"
                onClick={() => {
                  setSuggestionDialogOpen(true);
                  setMoreOpen(false);
                }}
                className="ep-dropdown-item"
              >
                {t('support.suggestions')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSupportDialogOpen(true);
                  setMoreOpen(false);
                }}
                className="ep-dropdown-item"
                style={{ color: '#b85c38', fontWeight: 600 }}
              >
                {t('support.apoyame')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
