// HomePage.jsx — exactamente igual al HTML de referencia (MVP)
import React, { useState, useRef, useCallback } from 'react';
import { useClock } from '../../hooks/useClock';
import { useWidgets, WIDGET_DEFS } from '../../hooks/useWidgets';
import { WidgetRenderer } from '../widgets/WidgetRenderer';

const SIZE_LABELS = { normal: 'Pequeño', wide: 'Mediano', full: 'Grande' };

export function HomePage({ goPage, dolares, feriados, lastUpdate }) {
  const { dateStr, weekday, timeShort } = useClock();
  const { widgetState, orderedDefs, activateWidget, removeWidget, setWidgetSize, reorderWidgets } = useWidgets();

  const [editMode, setEditMode]       = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  
  const updateTs = lastUpdate
    ? lastUpdate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + ' p. m. hs'
    : '—';

  const visibleWidgets  = orderedDefs.filter(w => widgetState[w.id]?.active);
  const inactiveWidgets = orderedDefs.filter(w => !widgetState[w.id]?.active);

  // ── Drag & Drop ──────────────────────────────────────────
  const dragSrc = useRef(null);
  const onDragStart = useCallback((e, id) => {
    dragSrc.current = id;
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.classList.add('dragging');
  }, []);
  const onDragEnd = useCallback((e) => {
    e.currentTarget.classList.remove('dragging');
    dragSrc.current = null;
  }, []);
  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);
  const onDrop = useCallback((e, targetId) => {
    e.preventDefault();
    const srcId = dragSrc.current;
    if (!srcId || srcId === targetId) return;
    const order = orderedDefs.map(w => w.id);
    const fromIdx = order.indexOf(srcId);
    const toIdx   = order.indexOf(targetId);
    const newOrder = [...order];
    newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, srcId);
    reorderWidgets(newOrder);
  }, [orderedDefs, reorderWidgets]);

  const sizeClass = (size) => {
    if (size === 'wide') return 'widget w-wide';
    if (size === 'full') return 'widget w-full';
    return 'widget';
  };

  return (
    <div className="page-enter">

      {/* ── HOME HERO — idéntico al HTML MVP ── */}
      <div className="home-hero">
        <div className="home-hero-left">
          <div className="home-hero-eyebrow">
            <span className="home-hero-dot" />
            <span style={{ textTransform: 'capitalize' }}>{weekday}</span>
            <span style={{ color: 'var(--text3)' }}>·</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--text3)' }}>{timeShort}</span>
          </div>
          <h1 className="home-hero-date">{dateStr}</h1>
          <p className="home-hero-sub">Cierre pizarra BCR · MAG Cañuelas · MATBA-ROFEX · CBOT</p>
        </div>

        <div className="home-hero-right">
          <div className="home-hero-upd">
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="4.5" stroke="var(--green)" strokeWidth="1.2" />
              <circle cx="6" cy="6" r="2" fill="var(--green)" />
            </svg>
            <span>Actualizado <strong>{updateTs}</strong></span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span className="help-pip" onClick={() => goPage('ayuda')} title="Ayuda">?</span>
            {!editMode && (
              <button className="hero-customize-btn" onClick={() => setEditMode(true)}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M2 4h12v1.5H2zm0 3h12v1.5H2zm0 3h8v1.5H2z" />
                </svg>
                PERSONALIZAR
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── EDIT MODE BAR ── */}
      {editMode && (
        <div style={{ marginBottom: '16px' }}>
          <div className="edit-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 600 }}>Editando</span>
              <span style={{ fontSize: '12px', color: 'var(--text3)' }}>Arrastrá para reordenar · cambiá tamaño con los botones · ✕ para ocultar</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto', alignItems: 'center' }}>
              <button
                onClick={() => setShowCatalog(v => !v)}
                style={{ background: 'var(--bg3)', border: '1px solid var(--line2)', color: 'var(--text2)', fontFamily: 'var(--body)', fontSize: '12px', padding: '7px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
              >
                + Agregar widget
              </button>
              <button
                onClick={() => { setEditMode(false); setShowCatalog(false); }}
                style={{ background: 'var(--accent)', border: 'none', color: '#fff', fontFamily: 'var(--body)', fontSize: '12px', padding: '7px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
              >
                Listo
              </button>
            </div>
          </div>

          {/* CATALOG PANEL */}
          {showCatalog && (
            <div style={{ background: 'var(--bg1)', border: '1px solid var(--line)', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--line)', fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text3)' }}>
                Widgets disponibles
              </div>
              {inactiveWidgets.length === 0 ? (
                <div style={{ padding: '16px 18px', fontSize: '12px', color: 'var(--text3)' }}>Todos los widgets están activos</div>
              ) : (
                <div className="widget-catalog">
                  {inactiveWidgets.map(w => (
                    <div key={w.id} className="wcat-item" onClick={() => { activateWidget(w.id); setShowCatalog(false); }}>
                      <div className="wcat-body">
                        <div className="wcat-name">{w.icon} {w.name}</div>
                        <div className="wcat-desc">{w.desc}</div>
                      </div>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--accent)', letterSpacing: '.06em', flexShrink: 0 }}>+ AGREGAR</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── WIDGET GRID ── */}
      <div className="widget-grid" style={{ marginTop: '20px' }}>
        {visibleWidgets.length === 0 && !editMode && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 20px', color: 'var(--text3)' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>—</div>
            <div style={{ fontFamily: 'var(--display)', fontSize: '16px', color: 'var(--text2)', marginBottom: '8px' }}>No hay widgets activos</div>
            <div>Hacé clic en <strong style={{ color: 'var(--accent)' }}>PERSONALIZAR</strong> para agregar widgets.</div>
          </div>
        )}

        {visibleWidgets.map(w => {
          const size    = widgetState[w.id]?.size || 'normal';
          const allowed = w.allowSizes || ['normal', 'wide', 'full'];

          return (
            <div
              key={w.id}
              className={sizeClass(size)}
              data-id={w.id}
              draggable={editMode}
              onDragStart={editMode ? (e) => onDragStart(e, w.id) : undefined}
              onDragEnd={editMode ? onDragEnd : undefined}
              onDragOver={editMode ? onDragOver : undefined}
              onDrop={editMode ? (e) => onDrop(e, w.id) : undefined}
            >
              {editMode && (
                <>
                  <div className="widget-drag-handle" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '28px', display: 'flex', alignItems: 'center', padding: '0 12px', cursor: 'grab', zIndex: 20, background: 'rgba(77,158,240,.08)', borderBottom: '1px solid rgba(77,158,240,.15)' }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--accent)', letterSpacing: '.08em' }}>⠿ MOVER</span>
                  </div>
                  <button
                    onClick={() => removeWidget(w.id)}
                    style={{ position: 'absolute', top: '6px', right: '8px', zIndex: 30, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: '16px', lineHeight: 1 }}
                    title="Ocultar"
                  >✕</button>
                  <div style={{ position: 'absolute', bottom: '8px', right: '8px', zIndex: 25, display: 'flex', gap: '3px' }}>
                    {allowed.map(s => (
                      <button
                        key={s}
                        onClick={() => setWidgetSize(w.id, s)}
                        className={`wcat-sz${size === s ? ' sel' : ''}`}
                        style={{ fontSize: '8px', padding: '3px 7px' }}
                      >
                        {SIZE_LABELS[s]}
                      </button>
                    ))}
                  </div>
                  <div style={{ position: 'absolute', inset: 0, borderRadius: '14px', background: 'rgba(0,0,0,.35)', pointerEvents: 'none', zIndex: 10 }} />
                </>
              )}
              <WidgetRenderer
                widgetId={w.id}
                size={size}
                goPage={goPage}
                dolares={dolares}
                feriados={feriados}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
