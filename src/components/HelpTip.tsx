'use client';
/**
 * HelpTip — Tooltip discreto para términos técnicos
 * Uso: <HelpTip text="El punto en que debes pedir más para no quedarte sin stock" />
 */
import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';

interface HelpTipProps {
  text: string;
  title?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  size?: 'sm' | 'md';
}

export default function HelpTip({ text, title, side = 'top', size = 'sm' }: HelpTipProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const posStyles: Record<string, React.CSSProperties> = {
    top:    { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 6 },
    bottom: { top: '100%',   left: '50%', transform: 'translateX(-50%)', marginTop: 6 },
    left:   { right: '100%', top: '50%',  transform: 'translateY(-50%)', marginRight: 6 },
    right:  { left: '100%',  top: '50%',  transform: 'translateY(-50%)', marginLeft: 6 },
  };

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          color: open ? '#f59e0b' : 'rgba(255,255,255,0.3)',
          transition: 'color 0.15s',
          width: size === 'sm' ? 14 : 16,
          height: size === 'sm' ? 14 : 16,
        }}
        onMouseEnter={e => { if (!open) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)'; }}
        onMouseLeave={e => { if (!open) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.3)'; }}
        aria-label={`Ayuda: ${title ?? text.slice(0, 30)}`}
      >
        <HelpCircle size={size === 'sm' ? 13 : 15} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', zIndex: 9999,
          ...posStyles[side],
          background: '#1B3A6B',
          border: '1px solid #243f72',
          borderRadius: 10,
          padding: '10px 14px',
          width: 220,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          pointerEvents: 'auto',
        }}>
          {title && (
            <p style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', margin: '0 0 5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {title}
            </p>
          )}
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', margin: 0, lineHeight: 1.5 }}>
            {text}
          </p>
        </div>
      )}
    </div>
  );
}
