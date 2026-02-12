import { useState, useRef, useEffect, type ReactNode } from 'react';
import { useProjectStore } from '@/store/project-store.ts';
import { useUIStore } from '@/store/ui-store.ts';
import { IconButton } from '@/components/shared/IconButton.tsx';
import { useTranslation } from '@/utils/i18n.ts';
import { useProjectFile } from '@/hooks/useProjectFile.ts';
import type { ViewMode } from '@/types/project.ts';

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

function SectionIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="8" width="20" height="12" rx="1" />
      <line x1="2" y1="14" x2="22" y2="14" />
      <polyline points="6,8 6,4 18,4 18,8" />
      <line x1="10" y1="14" x2="10" y2="8" />
    </svg>
  );
}

function FacadeIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="1" />
      <rect x="7" y="8" width="4" height="4" />
      <rect x="13" y="8" width="4" height="4" />
      <rect x="10" y="15" width="4" height="5" />
      <line x1="12" y1="4" x2="12" y2="2" />
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
  { mode: 'section', labelKey: 'view.section', icon: <SectionIcon /> },
  { mode: 'facade', labelKey: 'view.facade', icon: <FacadeIcon /> },
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
  const isMobile = useUIStore((s) => s.isMobile);

  const language = useUIStore((s) => s.language);
  const setLanguage = useUIStore((s) => s.setLanguage);

  const scale = useProjectStore((s) => s.project.scale);
  const setScale = useProjectStore((s) => s.setScale);

  const t = useTranslation();
  const { saveProject, loadProject: loadProjectFile } = useProjectFile();

  const [scaleOpen, setScaleOpen] = useState(false);
  const [customScaleInput, setCustomScaleInput] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const scaleDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
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
      className="flex items-center justify-between px-4 shrink-0 select-none"
      style={{
        height: 46,
        background: '#ece8e1',
        borderBottom: '1px solid rgba(180,172,160,0.4)',
        minWidth: 0,
        overflow: 'hidden',
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
        className="flex items-center rounded-xl p-1 gap-1"
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
            >
              {icon}
              {t(labelKey)}
            </button>
          );
        })}
      </div>

      {/* Right: controls */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Scale selector */}
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
              {/* Custom scale option */}
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

        {/* Divider */}
        {!isMobile && <div className="w-px h-5" style={{ background: 'rgba(180,172,160,0.35)' }} />}

        {/* Toggle buttons */}
        {!isMobile && (
          <>
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

            {/* Divider */}
            <div className="w-px h-5" style={{ background: 'rgba(180,172,160,0.35)' }} />
          </>
        )}

        {/* Undo/Redo */}
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

        {/* Divider */}
        {!isMobile && <div className="w-px h-5" style={{ background: 'rgba(180,172,160,0.35)' }} />}

        {/* Export / Save / Load */}
        {!isMobile && (
          <>
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
          </>
        )}

        {/* Help / Manual button — uses <a> tag to avoid popup blockers */}
        <a
          href="/manual.html"
          target="_blank"
          rel="noopener noreferrer"
          title={t('tooltip.help')}
          className="ep-btn-ghost flex items-center gap-1 cursor-pointer"
          style={{
            padding: '3px 8px',
            fontSize: 11,
            textDecoration: 'none',
            color: 'var(--ep-text-dim)',
            borderRadius: 'var(--ep-radius-sm)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
          {!isMobile && t('ui.help')}
        </a>

        {/* Suggestions / Email button */}
        <a
          href="mailto:aad1972@gmail.com?subject=EasyPlans%20-%20Suggestion"
          title={t('support.suggestions')}
          className="ep-btn-ghost flex items-center gap-1 cursor-pointer"
          style={{
            padding: '3px 8px',
            fontSize: 11,
            textDecoration: 'none',
            color: 'var(--ep-text-dim)',
            borderRadius: 'var(--ep-radius-sm)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
          {!isMobile && t('support.suggestions')}
        </a>

        {/* Ko-fi Support Button — official Ko-fi orange style */}
        <button
          onClick={() => setSupportDialogOpen(true)}
          title={t('tooltip.support')}
          style={{
            background: '#f07b22',
            border: 'none',
            cursor: 'pointer',
            padding: '5px 14px 5px 10px',
            borderRadius: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.2s',
            boxShadow: '0 1px 4px rgba(240,123,34,0.3)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#e06d15';
            e.currentTarget.style.boxShadow = '0 2px 10px rgba(240,123,34,0.45)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f07b22';
            e.currentTarget.style.boxShadow = '0 1px 4px rgba(240,123,34,0.3)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          {/* Ko-fi coffee cup with heart */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Cup body */}
            <path d="M6 13.5C6 16.5 8 18 10 18H14C16 18 18 16.5 18 13.5V8H6V13.5Z" fill="#ffffff"/>
            {/* Cup handle */}
            <path d="M18 9H19.5C20.88 9 22 10.12 22 11.5C22 12.88 20.88 14 19.5 14H18" stroke="#ffffff" strokeWidth="1.5" fill="none"/>
            {/* Heart inside cup */}
            <path d="M12 10.5C12 10.5 10 9 9.5 10C9 11 10.5 12.5 12 14C13.5 12.5 15 11 14.5 10C14 9 12 10.5 12 10.5Z" fill="#f07b22"/>
          </svg>
          {!isMobile && (
            <span style={{
              color: '#ffffff',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.02em',
              lineHeight: 1,
            }}>
              {t('support.apoyame')}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
