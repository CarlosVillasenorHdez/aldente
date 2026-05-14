'use client';
/**
 * HelpDrawer — Panel lateral de ayuda por módulo
 * Abre con botón ? en el header. Tiene:
 *  - Descripción del módulo
 *  - Glosario de términos
 *  - Flujo recomendado
 *  - Tour guiado (primera vez)
 */
import React, { useState, useEffect } from 'react';
import { X, BookOpen, ArrowRight, CheckCircle, Play } from 'lucide-react';

export interface HelpSection {
  title: string;
  content: string;
}

export interface HelpGlossary {
  term: string;
  definition: string;
}

export interface HelpDrawerConfig {
  moduleId: string;        // clave única para localStorage
  moduleName: string;
  description: string;
  sections: HelpSection[];
  glossary?: HelpGlossary[];
  flow?: string[];         // pasos del flujo recomendado
  tourSteps?: string[];    // pasos del tour (si aplica)
}

interface Props {
  config: HelpDrawerConfig;
}

export default function HelpDrawer({ config }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'guide' | 'glossary' | 'flow'>('guide');
  const [tourDone, setTourDone] = useState(true);
  const [tourStep, setTourStep] = useState(0);
  const [showTour, setShowTour] = useState(false);

  const storageKey = `aldente_help_tour_${config.moduleId}`;

  useEffect(() => {
    const done = localStorage.getItem(storageKey) === 'done';
    setTourDone(done);
    // Auto-abrir tour la primera vez
    if (!done && config.tourSteps && config.tourSteps.length > 0) {
      setTimeout(() => { setOpen(true); setShowTour(true); }, 800);
    }
  }, [config.moduleId, storageKey, config.tourSteps]);

  function completeTour() {
    localStorage.setItem(storageKey, 'done');
    setTourDone(true);
    setShowTour(false);
    setTourStep(0);
  }

  function nextTourStep() {
    if (config.tourSteps && tourStep < config.tourSteps.length - 1) {
      setTourStep(s => s + 1);
    } else {
      completeTour();
    }
  }

  return (
    <>
      {/* Botón ? en el header */}
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '6px 12px', borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.12)',
          background: open ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.04)',
          color: open ? '#f59e0b' : 'rgba(255,255,255,0.4)',
          fontSize: 12, fontWeight: 500, cursor: 'pointer',
          transition: 'all 0.15s',
        }}
        title="Ayuda y guía del módulo"
      >
        <BookOpen size={13} />
        <span>Ayuda</span>
        {!tourDone && (
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#f59e0b', display: 'inline-block', marginLeft: 2,
          }} />
        )}
      </button>

      {/* Drawer */}
      {open && (
        <>
          {/* Overlay */}
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 400 }}
          />

          {/* Panel */}
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0,
            width: 340, background: '#0f1e38',
            borderLeft: '1px solid #243f72',
            zIndex: 401, display: 'flex', flexDirection: 'column',
            boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
            animation: 'slideInRight 0.2s ease-out',
          }}>

            {/* Header */}
            <div style={{ padding: '18px 20px', borderBottom: '1px solid #243f72', display: 'flex', alignItems: 'center', gap: 12 }}>
              <BookOpen size={16} style={{ color: '#f59e0b' }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'white', margin: 0 }}>{config.moduleName}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>Guía del módulo</p>
              </div>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 4 }}>
                <X size={16} />
              </button>
            </div>

            {/* Tour activo */}
            {showTour && config.tourSteps && (
              <div style={{ padding: '16px 20px', background: 'rgba(245,158,11,0.08)', borderBottom: '1px solid rgba(245,158,11,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Play size={13} style={{ color: '#f59e0b' }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                    Tour — Paso {tourStep + 1}/{config.tourSteps.length}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', margin: '0 0 12px', lineHeight: 1.5 }}>
                  {config.tourSteps[tourStep]}
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1, display: 'flex', gap: 3 }}>
                    {config.tourSteps.map((_, i) => (
                      <div key={i} style={{ height: 3, flex: 1, borderRadius: 3, background: i <= tourStep ? '#f59e0b' : 'rgba(255,255,255,0.15)' }} />
                    ))}
                  </div>
                  <button onClick={nextTourStep}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 8, border: 'none', background: '#f59e0b', color: '#1B3A6B', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    {tourStep < config.tourSteps.length - 1 ? <>Siguiente <ArrowRight size={11} /></> : <>Entendido <CheckCircle size={11} /></>}
                  </button>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #243f72' }}>
              {[
                { key: 'guide', label: 'Guía' },
                ...(config.glossary ? [{ key: 'glossary', label: 'Glosario' }] : []),
                ...(config.flow ? [{ key: 'flow', label: 'Flujo' }] : []),
              ].map(t => (
                <button key={t.key} onClick={() => setTab(t.key as any)}
                  style={{ flex: 1, padding: '10px', fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer', background: 'none', color: tab === t.key ? '#f59e0b' : 'rgba(255,255,255,0.4)', borderBottom: `2px solid ${tab === t.key ? '#f59e0b' : 'transparent'}` }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Contenido */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

              {/* Tab: Guía */}
              {tab === 'guide' && (
                <div>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, marginBottom: 20 }}>
                    {config.description}
                  </p>
                  {config.sections.map((s, i) => (
                    <div key={i} style={{ marginBottom: 20 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
                        {s.title}
                      </p>
                      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, margin: 0 }}>
                        {s.content}
                      </p>
                    </div>
                  ))}
                  {!tourDone && config.tourSteps && (
                    <button onClick={() => { setShowTour(true); setTourStep(0); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.08)', color: '#f59e0b', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 8 }}>
                      <Play size={14} /> Ver tour guiado
                    </button>
                  )}
                </div>
              )}

              {/* Tab: Glosario */}
              {tab === 'glossary' && config.glossary && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {config.glossary.map((g, i) => (
                    <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '12px 14px' }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#60a5fa', margin: '0 0 4px' }}>{g.term}</p>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.5 }}>{g.definition}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab: Flujo */}
              {tab === 'flow' && config.flow && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {config.flow.map((step, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, paddingBottom: 16 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#f59e0b' }}>
                          {i + 1}
                        </div>
                        {i < config.flow!.length - 1 && (
                          <div style={{ width: 1, flex: 1, minHeight: 16, background: 'rgba(245,158,11,0.2)', marginTop: 4 }} />
                        )}
                      </div>
                      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, paddingTop: 4, margin: 0 }}>
                        {step}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <style>{`
            @keyframes slideInRight {
              from { transform: translateX(100%); opacity: 0; }
              to   { transform: translateX(0);    opacity: 1; }
            }
          `}</style>
        </>
      )}
    </>
  );
}
