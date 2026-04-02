// HomePage.jsx
import React, { useState, useRef, useCallback } from 'react';
import { useClock } from '../../hooks/useClock';
import { useWidgets } from '../../hooks/useWidgets';
import { WidgetRenderer } from '../widgets/WidgetRenderer';

const SIZE_LABELS = { normal: 'Pequeño', wide: 'Mediano', full: 'Grande' };

export function HomePage({ goPage, dolares, feriados, lastUpdate, inflacion, riesgoPais, indec, tasas, bcra }) {
  const { dateStr, weekday, timeShort } = useClock();
  const { widgetState, orderedDefs, activateWidget, removeWidget, setWidgetSize, reorderWidgets } = useWidgets();

  const [editMode, setEditMode]       = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const [dragOver, setDragOver]       = useState(null); // id del widget que recibe el drop

  const updateTs = lastUpdate
    ? lastUpdate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + ' p. m. hs'
    : '—';

  const visibleWidgets  = orderedDefs.filter(w => widgetState[w.id]?.active);
  const inactiveWidgets = orderedDefs.filter(w => !widgetState[w.id]?.active);

  // ── Drag & Drop ──────────────────────────────────────────
  const dragSrc      = useRef(null);
  const dragCounter  = useRef({}); // contador por widget para ignorar child events

  const onDragStart = useCallback((e, id) => {
    dragSrc.current = id;
    e.dataTransfer.effectAllowed = 'move';
    // pequeño delay para que el ghost no muestre el estado "editando"
    setTimeout(() => e.currentTarget.classList.add('widget--dragging'), 0);
  }, []);

  const onDragEnd = useCallback((e) => {
    e.currentTarget.classList.remove('widget--dragging');
    dragSrc.current = null;
    dragCounter.current = {};
    setDragOver(null);
  }, []);

  const onDragEnter = useCallback((e, id) => {
    e.preventDefault();
    dragCounter.current[id] = (dragCounter.current[id] || 0) + 1;
    if (dragSrc.current && dragSrc.current !== id) {
      setDragOver(id);
    }
  }, []);

  const onDragLeave = useCallback((e, id) => {
    dragCounter.current[id] = (dragCounter.current[id] || 1) - 1;
    if (dragCounter.current[id] <= 0) {
      dragCounter.current[id] = 0;
      setDragOver(prev => prev === id ? null : prev);
    }
  }, []);

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((e, targetId) => {
    e.preventDefault();
    setDragOver(null);
    dragCounter.current = {};
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

  const sizeClass = (id, size) => {
    let cls = 'widget';
    if (size === 'wide') cls = 'widget w-wide';
    if (size === 'full') cls = 'widget w-full';
    if (editMode) cls += ' widget--editing';
    if (dragOver === id) cls += ' widget--drop-target';
    return cls;
  };

  return (
    <div className="page-enter">

      {/* ── HOME HERO ── */}
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
              <span style={{ fontSize: '12px', color: 'var(--text3)' }}>Arrastrá para reordenar · elegí tamaño · ✕ para ocultar</span>
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
                        <div className="wcat-name">{w.name}</div>
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
              className={sizeClass(w.id, size)}
              data-id={w.id}
              draggable={editMode}
              onDragStart={editMode ? (e) => onDragStart(e, w.id) : undefined}
              onDragEnd={editMode ? onDragEnd : undefined}
              onDragEnter={editMode ? (e) => onDragEnter(e, w.id) : undefined}
              onDragLeave={editMode ? (e) => onDragLeave(e, w.id) : undefined}
              onDragOver={editMode ? onDragOver : undefined}
              onDrop={editMode ? (e) => onDrop(e, w.id) : undefined}
            >
              {editMode && (
                <>
                  {/* Sombra oscura */}
                  <div className="widget-edit-fog" />

                  {/* ✕ cerrar */}
                  <button className="widget-edit-close" onClick={() => removeWidget(w.id)} title="Ocultar">✕</button>

                  {/* Botones de tamaño — centrados en la parte inferior */}
                  <div className="widget-edit-sizes">
                    {allowed.map(s => (
                      <button
                        key={s}
                        className={`widget-sz-btn${size === s ? ' sel' : ''}`}
                        onClick={() => setWidgetSize(w.id, s)}
                      >
                        {SIZE_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </>
              )}
              <WidgetRenderer
                widgetId={w.id}
                size={size}
                goPage={goPage}
                dolares={dolares}
                feriados={feriados}
                inflacion={inflacion}
                riesgoPais={riesgoPais}
                indec={indec}
                tasas={tasas}
                bcra={bcra}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
