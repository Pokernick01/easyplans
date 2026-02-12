import { useState } from 'react';
import { useUIStore } from '@/store/ui-store.ts';
import { useTranslation } from '@/utils/i18n.ts';

// ---------------------------------------------------------------------------
// SuggestionDialog — In-app feedback form powered by Netlify Forms
// ---------------------------------------------------------------------------

export default function SuggestionDialog() {
  const close = useUIStore((s) => s.setSuggestionDialogOpen);
  const t = useTranslation();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setStatus('sending');
    try {
      const body = new URLSearchParams({
        'form-name': 'suggestions',
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
      });

      const res = await fetch('/form-thank-you.html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });

      if (res.ok) {
        setStatus('sent');
        setTimeout(() => close(false), 2500);
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    fontSize: 13,
    border: '1px solid rgba(180,172,160,0.5)',
    borderRadius: 6,
    background: 'rgba(255,255,255,0.8)',
    color: '#2c2c2c',
    fontFamily: "'DM Sans', system-ui, sans-serif",
    outline: 'none',
    transition: 'border-color 0.2s',
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
          width: 440,
          maxWidth: '92vw',
          padding: 0,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #f0ece5 0%, #ece8e1 50%, #e8e3dc 100%)',
            padding: '22px 28px 18px',
            borderBottom: '1px solid rgba(180,172,160,0.4)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2d6a4f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#2c2c2c' }}>
              {t('suggestion.title')}
            </span>
          </div>
          <p style={{ fontSize: 12, color: '#6b6560', marginTop: 6 }}>
            {t('suggestion.subtitle')}
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: '22px 28px 24px' }}>
          {status === 'sent' ? (
            <div style={{ textAlign: 'center', padding: '30px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>&#10003;</div>
              <p style={{ fontSize: 16, fontWeight: 600, color: '#2d6a4f' }}>
                {t('suggestion.thankYou')}
              </p>
              <p style={{ fontSize: 13, color: '#6b6560', marginTop: 6 }}>
                {t('suggestion.received')}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Honeypot for bots */}
              <input type="hidden" name="form-name" value="suggestions" />
              <p style={{ display: 'none' }}>
                <label>
                  Don&apos;t fill this out: <input name="bot-field" />
                </label>
              </p>

              {/* Name (optional) */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#6b6560', display: 'block', marginBottom: 4 }}>
                  {t('suggestion.name')} <span style={{ fontWeight: 400, opacity: 0.6 }}>({t('suggestion.optional')})</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('suggestion.namePlaceholder')}
                  style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#2d6a4f'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(180,172,160,0.5)'; }}
                />
              </div>

              {/* Email (optional) */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#6b6560', display: 'block', marginBottom: 4 }}>
                  {t('suggestion.email')} <span style={{ fontWeight: 400, opacity: 0.6 }}>({t('suggestion.optional')})</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('suggestion.emailPlaceholder')}
                  style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#2d6a4f'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(180,172,160,0.5)'; }}
                />
              </div>

              {/* Message (required) */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#6b6560', display: 'block', marginBottom: 4 }}>
                  {t('suggestion.message')} <span style={{ color: '#b85c38' }}>*</span>
                </label>
                <textarea
                  name="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t('suggestion.messagePlaceholder')}
                  required
                  rows={4}
                  style={{
                    ...inputStyle,
                    resize: 'vertical',
                    minHeight: 90,
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#2d6a4f'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(180,172,160,0.5)'; }}
                />
              </div>

              {/* Error message */}
              {status === 'error' && (
                <p style={{ color: '#b85c38', fontSize: 12, marginBottom: 12, textAlign: 'center' }}>
                  {t('suggestion.error')}
                </p>
              )}

              {/* Buttons */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  className="ep-btn-ghost"
                  onClick={() => close(false)}
                  style={{ flex: 1, fontSize: 13, padding: '9px 16px' }}
                >
                  {t('dialog.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={status === 'sending' || !message.trim()}
                  style={{
                    flex: 1,
                    fontSize: 13,
                    fontWeight: 700,
                    padding: '9px 16px',
                    background: '#2d6a4f',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    cursor: status === 'sending' || !message.trim() ? 'not-allowed' : 'pointer',
                    opacity: status === 'sending' || !message.trim() ? 0.5 : 1,
                    fontFamily: "'DM Sans', system-ui, sans-serif",
                    transition: 'opacity 0.2s',
                  }}
                >
                  {status === 'sending' ? t('suggestion.sending') : t('suggestion.send')}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
