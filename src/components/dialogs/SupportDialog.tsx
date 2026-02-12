import { useState } from 'react';
import { useUIStore } from '@/store/ui-store.ts';
import { useTranslation } from '@/utils/i18n.ts';

// ---------------------------------------------------------------------------
// Configuration — replace these URLs when your accounts are ready
// ---------------------------------------------------------------------------

const KOFI_URL = 'https://ko-fi.com/armandoad';
const GITHUB_URL = 'https://github.com/easyplans/easyplans'; // TODO: replace with your repo URL
const APP_VERSION = '1.0.0';
const SHARE_URL = 'https://easyplans.app'; // TODO: replace with your deployed URL
const CONTACT_EMAIL = 'aad1972@gmail.com';

// ---------------------------------------------------------------------------
// SupportDialog
// ---------------------------------------------------------------------------

export default function SupportDialog() {
  const close = useUIStore((s) => s.setSupportDialogOpen);
  const t = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const text = 'EasyPlans — Free architectural floor plan tool';
    if (navigator.share) {
      try {
        await navigator.share({ title: 'EasyPlans', text, url: SHARE_URL });
      } catch {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(SHARE_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="ep-dialog-overlay"
        onClick={() => close(false)}
      />

      {/* Dialog */}
      <div
        className="ep-dialog"
        style={{
          width: 420,
          maxWidth: '92vw',
          padding: 0,
          overflow: 'hidden',
        }}
      >
        {/* Header band */}
        <div
          style={{
            background: 'linear-gradient(135deg, #f0ece5 0%, #ece8e1 50%, #e8e3dc 100%)',
            padding: '28px 28px 22px',
            textAlign: 'center',
            borderBottom: '1px solid rgba(180,172,160,0.4)',
          }}
        >
          {/* Logo / App name */}
          <div style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: '-0.5px',
          }}>
            <span style={{ color: '#2d6a4f' }}>Easy</span>
            <span style={{ color: '#b85c38' }}>Plans</span>
          </div>
          <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.35)', marginTop: 4 }}>
            {t('support.version')} {APP_VERSION}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '22px 28px 24px' }}>
          {/* Made by */}
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <span style={{ color: '#6b6560', fontSize: 13 }}>
              {t('support.madeBy')}
            </span>
            <br />
            <span style={{ color: '#2c2c2c', fontSize: 15, fontWeight: 600 }}>
              Armando Acevedo D.
            </span>
          </div>

          {/* Message */}
          <p style={{
            color: '#6b6560',
            fontSize: 13,
            lineHeight: 1.6,
            textAlign: 'center',
            margin: '0 0 24px',
          }}>
            {t('support.message')}
          </p>

          {/* Action buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Ko-fi — official orange style */}
            <a
              href={KOFI_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '11px 16px',
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: 700,
                borderRadius: 24,
                background: '#f07b22',
                color: '#ffffff',
                border: 'none',
                boxShadow: '0 2px 8px rgba(240,123,34,0.3)',
                transition: 'all 0.2s',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#e06d15';
                e.currentTarget.style.boxShadow = '0 3px 12px rgba(240,123,34,0.4)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f07b22';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(240,123,34,0.3)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {/* Ko-fi cup with heart */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 13.5C6 16.5 8 18 10 18H14C16 18 18 16.5 18 13.5V8H6V13.5Z" fill="#ffffff"/>
                <path d="M18 9H19.5C20.88 9 22 10.12 22 11.5C22 12.88 20.88 14 19.5 14H18" stroke="#ffffff" strokeWidth="1.5" fill="none"/>
                <path d="M12 10.5C12 10.5 10 9 9.5 10C9 11 10.5 12.5 12 14C13.5 12.5 15 11 14.5 10C14 9 12 10.5 12 10.5Z" fill="#f07b22"/>
              </svg>
              {t('support.donate')}
            </a>

            {/* GitHub */}
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="ep-btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '10px 16px',
                textDecoration: 'none',
                fontSize: 13,
                borderRadius: 8,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              {t('support.github')}
            </a>

            {/* Share */}
            <button
              className="ep-btn-secondary"
              onClick={handleShare}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '10px 16px',
                fontSize: 13,
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              {copied ? t('support.copied') : t('support.share')}
            </button>

            {/* User Manual */}
            <a
              href="/manual.html"
              target="_blank"
              rel="noopener noreferrer"
              className="ep-btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '10px 16px',
                textDecoration: 'none',
                fontSize: 13,
                borderRadius: 8,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
              {t('support.manual')}
            </a>

            {/* Suggestions / Email */}
            <a
              href={`mailto:${CONTACT_EMAIL}?subject=EasyPlans%20-%20Suggestion&body=%0A%0A---%0ASent%20from%20EasyPlans%20v${APP_VERSION}`}
              className="ep-btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '10px 16px',
                textDecoration: 'none',
                fontSize: 13,
                borderRadius: 8,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              {t('support.suggestions')}
            </a>
          </div>

          {/* Suggestions hint */}
          <p style={{
            color: '#9e9590',
            fontSize: 11,
            textAlign: 'center',
            margin: '12px 0 0',
          }}>
            {t('support.suggestionsHint')}
          </p>

          {/* Thank you */}
          <p style={{
            color: '#9e9590',
            fontSize: 11,
            textAlign: 'center',
            margin: '20px 0 0',
            fontStyle: 'italic',
          }}>
            {t('support.thankYou')}
          </p>
        </div>

        {/* Close button */}
        <div style={{
          padding: '0 28px 20px',
          display: 'flex',
          justifyContent: 'center',
        }}>
          <button
            className="ep-btn-ghost"
            onClick={() => close(false)}
            style={{ fontSize: 13, padding: '6px 24px' }}
          >
            {t('support.close')}
          </button>
        </div>
      </div>
    </>
  );
}
