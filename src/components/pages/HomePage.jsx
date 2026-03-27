// HomePage.jsx — Inicio profesional · RadarAgro
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useClock } from '../../hooks/useClock';
import { useWidgets, WIDGET_DEFS } from '../../hooks/useWidgets';
import { WidgetRenderer } from '../widgets/WidgetRenderer';

const SIZE_LABELS = { normal: 'Pequeño', wide: 'Mediano', full: 'Grande' };

export function HomePage({ goPage, dolares, feriados, lastUpdate }) {
  const { dateStr, weekday, timeShort } = useClock();
  const { widgetState, orderedDefs, activateWidget, removeWidget, setWidgetSize, reorderWidgets } = useWidgets();

  const [editMode, setEditMode]       = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const [mounted, setMounted]         = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  const updateTs = lastUpdate
    ? lastUpdate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + ' hs'
    : null;

  const visibleWidgets  = orderedDefs.filter(w => widgetState[w.id]?.active);
  const inactiveWidgets = orderedDefs.filter(w => !widgetState[w.id]?.active);

  // Drag & Drop
  const dragSrc = useRef(null);
  const onDragStart = useCallback((e, id) => {
    dragSrc.current = id;
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.style.opacity = '0.5';
  }, []);
  const onDragEnd = useCallback((e) => {
    e.currentTarget.style.opacity = '';
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

  const D = dolares || {};
  const f$ = v => v ? '$' + Math.round(v).toLocaleString('es-AR') : '—';
  const hasData = !!D.pOf;

  return (
    <div className={`page-enter home-root${mounted ? ' home-root--in' : ''}`}>

      {/* HERO */}
      <div className="hh">
        <div className="hh-left">
          <div className="hh-eyebrow">
            <span className="hh-dot" />
            <span className="hh-live">EN VIVO</span>
            <span className="hh-sep">·</span>
            <span className="hh-weekday">{weekday}</span>
            <span className="hh-sep">·</span>
            <span className="hh-time">{timeShort}</span>
          </div>
          <h1 className="hh-date">{dateStr}</h1>
          <p className="hh-sub">Pizarra BCR · MAG Cañuelas · MATBA-ROFEX · CBOT</p>
        </div>

        <div className="hh-center">
          {hasData ? (
            <div className="hh-kpi-strip">
              <HeroKPI label="OFICIAL" val={f$(D.pOf)} cls="fl" />
              <div className="hh-kpi-div" />
              <HeroKPI label="MEP" val={f$(D.pMep)} cls={kpiCls(D.bMep)} note={D.bMep != null ? fmtPct(D.bMep) : null} />
              <div className="hh-kpi-div" />
              <HeroKPI label="BLUE" val={f$(D.pBlu)} cls={kpiCls(D.bBlu)} note={D.bBlu != null ? fmtPct(D.bBlu) : null} />
              <div className="hh-kpi-div" />
              <HeroKPI label="CCL" val={f$(D.pCcl)} cls={kpiCls(D.bCcl)} note={D.bCcl != null ? fmtPct(D.bCcl) : null} />
            </div>
          ) : (
            <div className="hh-loading-strip">
              <div className="hh-loading-dot" />
              <span>Cargando datos…</span>
            </div>
          )}
        </div>

        <div className="hh-right">
          {updateTs && (
            <div className="hh-upd">
              <svg width="8" height="8" viewBox="0 0 8 8">
                <circle cx="4" cy="4" r="3" fill="none" stroke="var(--green)" strokeWidth="1.2" />
                <circle cx="4" cy="4" r="1.5" fill="var(--green)" />
              </svg>
              <span>Act. <strong>{updateTs}</strong></span>
            </div>
          )}
          <div className="hh-actions">
            <button className="hh-help-btn" onClick={() => goPage('ayuda')} title="Ayuda">?</button>
            {!editMode && (
              <button className="hh-edit-btn" onClick={() => setEditMode(true)}>
                <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="1" y="3" width="14" height="1.5" rx=".75"/>
                  <rect x="1" y="7.25" width="14" height="1.5" rx=".75"/>
                  <rect x="1" y="11.5" width="9" height="1.5" rx=".75"/>
                </svg>
                Personalizar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* QUICK NAV */}
      <div className="hh-quicknav">
        {[
          { id: 'granos',     ico: '🌾', lbl: 'Granos' },
          { id: 'hacienda',   ico: '🐄', lbl: 'Hacienda' },
          { id: 'financiero', ico: '💵', lbl: 'Financiero' },
          { id: 'macro',      ico: '📊', lbl: 'Macro' },
          { id: 'insumos',    ico: '⚗️', lbl: 'Insumos' },
          { id: 'indices',    ico: '📈', lbl: 'Índices' },
          { id: 'impuestos',  ico: '📋', lbl: 'Impositivo' },
          { id: 'feriados',   ico: '📅', lbl: 'Feriados' },
        ].map(it => (
          <button key={it.id} className="hh-qn-btn" onClick={() => goPage(it.id)}>
            <span className="hh-qn-ico">{it.ico}</span>
            <span className="hh-qn-lbl">{it.lbl}</span>
          </button>
        ))}
      </div>

      {/* EDIT MODE BAR */}
      {editMode && (
        <div className="em-wrap">
          <div className="em-bar">
            <div className="em-bar-left">
              <span className="em-badge">✦ EDITANDO</span>
              <span className="em-hint">Arrastrá para reordenar · cambiá tamaño · ✕ para ocultar</span>
            </div>
            <div className="em-bar-right">
              <button className="em-add-btn" onClick={() => setShowCatalog(v => !v)}>
                + Agregar widget
              </button>
              <button className="em-done-btn" onClick={() => { setEditMode(false); setShowCatalog(false); }}>
                Listo
              </button>
            </div>
          </div>

          {showCatalog && (
            <div className="em-catalog">
              <div className="em-catalog-hd">Widgets disponibles</div>
              {inactiveWidgets.length === 0 ? (
                <div className="em-catalog-empty">Todos los widgets están activos</div>
              ) : (
                <div className="em-catalog-grid">
                  {inactiveWidgets.map(w => (
                    <div key={w.id} className="em-cat-item" onClick={() => { activateWidget(w.id); setShowCatalog(false); }}>
                      <span className="em-cat-ico">{w.icon}</span>
                      <div className="em-cat-body">
                        <div className="em-cat-name">{w.name}</div>
                        <div className="em-cat-desc">{w.desc}</div>
                      </div>
                      <span className="em-cat-add">+ AGREGAR</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* WIDGET GRID */}
      <div className="widget-grid" style={{ marginTop: editMode ? '0' : '20px' }}>
        {visibleWidgets.length === 0 && !editMode && (
          <div className="wg-empty">
            <div className="wg-empty-icon">—</div>
            <div className="wg-empty-title">No hay widgets activos</div>
            <div className="wg-empty-sub">
              Hacé clic en <strong>Personalizar</strong> para agregar widgets.
            </div>
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
                <div className="widget-edit-overlay">
                  <div className="widget-drag-bar">
                    <span className="widget-drag-icon">⠿</span>
                    <span className="widget-drag-label">MOVER</span>
                    <div className="widget-sz-btns">
                      {allowed.map(s => (
                        <button
                          key={s}
                          className={`widget-sz-btn${size === s ? ' active' : ''}`}
                          onClick={() => setWidgetSize(w.id, s)}
                        >
                          {SIZE_LABELS[s]}
                        </button>
                      ))}
                    </div>
                    <button className="widget-rm-btn" onClick={() => removeWidget(w.id)}>✕</button>
                  </div>
                  <div className="widget-edit-fog" />
                </div>
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

// Helpers
function HeroKPI({ label, val, cls, note }) {
  const colorMap = { up: 'var(--green)', dn: 'var(--red)', fl: 'var(--text2)' };
  return (
    <div className="hh-kpi">
      <div className="hh-kpi-label">{label}</div>
      <div className="hh-kpi-val" style={{ color: colorMap[cls] || 'var(--white)' }}>{val}</div>
      {note && <div className={`hh-kpi-note ${cls}`}>{note}</div>}
    </div>
  );
}

function kpiCls(v) { return v == null ? 'fl' : v > 0 ? 'up' : v < 0 ? 'dn' : 'fl'; }
function fmtPct(v) { return (v > 0 ? '+' : '') + v.toFixed(1).replace('.', ',') + '% br.'; }
