// Footer.jsx — fiel al MVP HTML
import React from 'react';

const NAV_LINKS = [
  { page: 'home',       label: 'Inicio',         icon: 'M6 1L1 5v6h3V8h4v3h3V5L6 1z' },
  { page: 'granos',     label: 'Granos'         },
  { page: 'hacienda',   label: 'Hacienda'       },
  { page: 'financiero', label: 'Financiero'     },
  { page: 'macro',      label: 'Macro'          },
  { page: 'insumos',    label: 'Insumos'        },
  { page: 'impuestos',  label: 'Impositivo'     },
  { page: 'feriados',   label: 'Feriados'       },
  { page: 'ayuda',      label: 'Ayuda & Glosario' },
];

const CircleIcon = () => (
  <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor" opacity=".5">
    <circle cx="6" cy="6" r="4" fill="none" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);

const HomeIcon = () => (
  <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor" opacity=".5">
    <path d="M6 1L1 5v6h3V8h4v3h3V5L6 1z"/>
  </svg>
);

export function Footer({ goPage }) {
  return (
    <footer>
      <div className="footer-inner">

        {/* Top grid */}
        <div className="footer-top">

          {/* Brand col */}
          <div className="footer-brand-col">
            <div className="footer-logo-row">
              <div>
                <div className="footer-brand-name">RadarAgro</div>
                <div className="footer-brand-tag">Dashboard Agropecuario · v13.0</div>
              </div>
            </div>
            <p className="footer-tagline">
              Inteligencia financiera para el productor agropecuario argentino. Precios, índices y contexto macro en un solo lugar.
            </p>
            <a href="mailto:info@radaragro.com.ar" className="footer-contact">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2 4a1 1 0 011-1h10a1 1 0 011 1v8a1 1 0 01-1 1H3a1 1 0 01-1-1V4zm1 1v.217l5 3.124 5-3.124V5H3zm10 1.383l-4.447 2.779a1 1 0 01-1.106 0L3 6.383V12h10V6.383z"/>
              </svg>
              contactoradaragro@gmail.com
            </a>
          </div>

          {/* Fuentes col 1 */}
          <div>
            <div className="footer-col-title">Fuentes de datos</div>
            <div className="footer-source-list">
              {[
                { name: 'BCR — Bolsa de Cereales Rosario', desc: 'Pizarra de granos disponibles. Precios diarios soja, maíz, trigo y otros.' },
                { name: 'MAG Cañuelas',                    desc: 'Mercado Agroganadero. Invernada, faena y vientres por categoría.' },
                { name: 'MATBA-ROFEX',                     desc: 'Futuros y opciones sobre granos en Argentina. Contratos ARS y USD.' },
              ].map(s => (
                <div key={s.name} className="footer-source-item">
                  <div className="footer-source-dot" />
                  <div>
                    <div className="footer-source-name">{s.name}</div>
                    <div className="footer-source-desc">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fuentes col 2 */}
          <div>
            <div className="footer-col-title">&nbsp;</div>
            <div className="footer-source-list">
              {[
                { name: 'CME Group / CBOT',   desc: 'Chicago Board of Trade. Precios internacionales en USD/bushel.' },
                { name: 'BCRA / Bluelytics',  desc: 'Tipos de cambio en Argentina: oficial, MEP, CCL, blue y variantes.' },
                { name: 'INDEC / JP Morgan',  desc: 'IPC, EMAE, PBI, empleo. EMBI+ riesgo país Argentina.' },
              ].map(s => (
                <div key={s.name} className="footer-source-item">
                  <div className="footer-source-dot" />
                  <div>
                    <div className="footer-source-name">{s.name}</div>
                    <div className="footer-source-desc">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navegación */}
          <div>
            <div className="footer-col-title">Secciones</div>
            <div className="footer-links-list">
              {NAV_LINKS.map(({ page, label, icon }) => (
                <button key={page} className="footer-nav-link" onClick={() => goPage(page)}>
                  {page === 'home' ? <HomeIcon /> : <CircleIcon />}
                  {label}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="footer-bottom">
          <div className="footer-disclaimer">
            Los datos son de carácter informativo y orientativo. No constituyen asesoramiento financiero, comercial ni impositivo. Consulte siempre a un profesional habilitado antes de tomar decisiones de negocio.
          </div>
          <div className="footer-version">
            <span className="footer-v-pill">v13.0</span>
            <span style={{color:'var(--text3)'}}>© 2026 RadarAgro</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
