import React, { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

// One block of the daily report: the text plus the buttons that send it on.
export function MessageBlock({ title, text, hint }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const area = document.createElement('textarea');
        area.value = text;
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        document.body.removeChild(area);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.warn('Copy failed:', err);
    }
  };

  const handleShare = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        await Share.share({ title, text, dialogTitle: 'Send report' });
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
      }
    } catch (err) {
      console.warn('Share cancelled or failed:', err);
    }
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
        <div>
          <strong style={{ fontSize: '14px' }}>{title}</strong>
          {hint && <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{hint}</div>}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" className="btn-secondary btn-small" onClick={handleCopy}>
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button type="button" className="btn-primary btn-small" onClick={handleShare}>
            Send to WhatsApp
          </button>
        </div>
      </div>
      <pre
        style={{
          background: 'var(--bg-light)',
          border: '1px solid var(--border-color, #e2e8f0)',
          borderRadius: '8px',
          padding: '14px',
          margin: 0,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: '13px',
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          color: 'var(--text-primary)'
        }}
      >
        {text}
      </pre>
    </div>
  );
}

// The three messages the gym is used to sending, in order.
export default function ReportMessages({ messages }) {
  if (!messages?.summary) return null;

  return (
    <>
      <MessageBlock title="1. Daily summary" text={messages.summary} />
      {messages.details && (
        <MessageBlock
          title="2. Service breakdown"
          hint="Who received what, for services priced individually"
          text={messages.details}
        />
      )}
      {messages.vip && (
        <MessageBlock
          title="3. VIP signatures"
          hint="Card and partner members, with the services they signed for"
          text={messages.vip}
        />
      )}
    </>
  );
}
