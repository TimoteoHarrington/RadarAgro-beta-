// hooks/useLiveData.js
import { useState, useEffect, useCallback } from 'react';
import {
  fetchDolares, fetchInflacion, fetchInflacionInteranual,
  fetchRiesgoPais, fetchRiesgoPaisUltimo, fetchFeriados,
  fetchUVA, fetchTasasPlazoFijo, fetchTasasDepositos,
  fetchMundoData, fetchBCRAData, fetchCotizaciones, fetchINDEC,
  fetchDolarHistorial,
} from '../services/api';

// Intervalos de polling por tipo de dato
const POLL_FAST  =  5 * 60 * 1000;  //  5 min — dólares (cambian cada hora)
const POLL_SLOW  = 60 * 60 * 1000;  // 60 min — UVA, tasas, riesgo país (diarios)
const POLL_DAILY = 24 * 60 * 60 * 1000; // 24 hs — BCRA, INDEC, inflación, feriados

// Devuelve true si han pasado más de `ms` desde el último fetch guardado en sessionStorage
function isStale(key, ms) {
  try {
    const last = parseInt(sessionStorage.getItem('ra-fetch-' + key) || '0', 10);
    return Date.now() - last > ms;
  } catch { return true; }
}

function markFresh(key) {
  try { sessionStorage.setItem('ra-fetch-' + key, String(Date.now())); } catch {}
}

export function useLiveData() {
  const [dolares,     setDolares]     = useState(null);
  const [inflacion,   setInflacion]   = useState(null);
  const [riesgoPais,  setRiesgoPais]  = useState(null);
  const [feriados,    setFeriados]    = useState(null);
  const [uva,         setUva]         = useState(null);
  const [tasas,       setTasas]       = useState(null);
  const [mundo,       setMundo]       = useState(null);   // ← nuevo
  const [bcra,        setBcra]        = useState(null);   // ← nuevo
  const [cotizaciones,setCotizaciones]= useState(null);   // ← nuevo
  const [indec,       setIndec]       = useState(null);   // ← nuevo
  const [apiStatus,   setApiStatus]   = useState({
    dolares: 'loading', inflacion: 'loading', riesgoPais: 'loading',
    feriados: 'loading', uva: 'loading', tasas: 'loading',
    mundo: 'idle', bcra: 'idle', cotizaciones: 'idle', indec: 'loading',
  });
  const [lastUpdate, setLastUpdate] = useState(null);
  const setStatus = (key, status) =>
    setApiStatus(prev => ({ ...prev, [key]: status }));

  // ── Dólares ──────────────────────────────────────────────────
  const loadDolares = useCallback(async () => {
    setStatus('dolares', 'loading');

    // Cargamos cotización actual + historial reciente de cada tipo (últimos 5 días)
    // para calcular delta vs cierre anterior
    const [{ data, error }, { data: cotiz }, histResults] = await Promise.all([
      fetchDolares(),
      fetchCotizaciones(),
      Promise.all([
        fetchDolarHistorial('oficial'),
        fetchDolarHistorial('blue'),
        fetchDolarHistorial('bolsa'),
        fetchDolarHistorial('contadoconliqui'),
        fetchDolarHistorial('mayorista'),
        fetchDolarHistorial('cripto'),
      ]),
    ]);
    if (error || !Array.isArray(data)) { setStatus('dolares', 'error'); return; }

    const by = {};
    data.forEach(d => {
      const key = (d.casa || d.nombre || '').toLowerCase().replace(/\s+/g, '');
      by[key] = d;
    });
    const getVenta  = (...keys) => {
      for (const k of keys) {
        const d = by[k];
        if (d) { const v = parseFloat(d.venta ?? d.compra ?? 0); if (v > 0) return v; }
      }
      return null;
    };
    const getCompra = (...keys) => {
      for (const k of keys) {
        const d = by[k];
        if (d) { const v = parseFloat(d.compra ?? 0); if (v > 0) return v; }
      }
      return null;
    };

    const pOf    = getVenta('oficial');
    const pMep   = getVenta('bolsa', 'mep');
    const pCcl   = getVenta('contadoconliqui', 'ccl', 'contado');
    const pBlu   = getVenta('blue');
    const pMay   = getVenta('mayorista');
    const pCry   = getVenta('cripto', 'usdt', 'crypto');
    const pTar   = getVenta('tarjeta');
    const pBlend = pOf && pMep ? pOf * 0.8 + pMep * 0.2 : null;
    const pct    = (a, b) => a && b ? ((b - a) / a * 100) : null;

    // Spread compra/venta para el oficial
    const cOf = getCompra('oficial');
    const spreadOf = pOf && cOf ? Math.round((pOf - cOf) * 100) / 100 : null;

    // Delta Blue: compra vs venta como referencia de spread
    const cBlu = getCompra('blue');
    const spreadBlu = pBlu && cBlu ? Math.round((pBlu - cBlu) * 100) / 100 : null;

    // Helper: obtiene el penúltimo valor de cierre del historial (último cierre anterior)
    // El historial de ArgentinaDatos ya viene ordenado por fecha ASC
    const getPrevClose = (histData) => {
      if (!Array.isArray(histData) || histData.length < 2) return null;
      // El último registro es hoy (o el más reciente), el penúltimo es el cierre anterior
      const last   = histData[histData.length - 1];
      const prev   = histData[histData.length - 2];
      const vLast  = parseFloat(last?.venta ?? last?.compra ?? 0);
      const vPrev  = parseFloat(prev?.venta ?? prev?.compra ?? 0);
      return vPrev > 0 ? vPrev : null;
    };

    const [hOf, hBlu, hMep, hCcl, hMay, hCry] = histResults.map(r => r.data);

    // Calculamos prevClose desde historial de ArgentinaDatos (más fiable que Yahoo para tipos AR)
    const prevOf  = getPrevClose(hOf)  ?? cotiz?.oficial?.prevClose ?? null;
    const prevBlu = getPrevClose(hBlu);
    const prevMep = getPrevClose(hMep);
    const prevCcl = getPrevClose(hCcl);
    const prevMay = getPrevClose(hMay);
    const prevCry = getPrevClose(hCry);

    const calcDelta = (precio, prev) =>
      precio && prev ? Math.round((precio - prev) * 100) / 100 : null;

    setDolares({
      pOf, pMep, pCcl, pBlu, pCry, pMay, pTar, pBlend,
      cOf, cBlu,
      spreadOf, spreadBlu,
      deltaOf:  calcDelta(pOf,  prevOf),
      deltaMep: calcDelta(pMep, prevMep),
      deltaCcl: calcDelta(pCcl, prevCcl),
      deltaBlu: calcDelta(pBlu, prevBlu),
      deltaMay: calcDelta(pMay, prevMay),
      deltaCry: calcDelta(pCry, prevCry),
      bMep: pct(pOf, pMep), bCcl: pct(pOf, pCcl),
      bBlu: pct(pOf, pBlu), bCry: pct(pOf, pCry),
    });
    setStatus('dolares', 'ok');
    setLastUpdate(new Date());
  }, []);

  // ── Inflación ────────────────────────────────────────────────
  const loadInflacion = useCallback(async () => {
    setStatus('inflacion', 'loading');
    const [{ data: mens }, { data: ia }] = await Promise.all([
      fetchInflacion(), fetchInflacionInteranual(),
    ]);
    if (!Array.isArray(mens) || mens.length === 0) { setStatus('inflacion', 'error'); return; }
    const last = mens[mens.length - 1];
    let valIA = null, iaHistory = [];
    if (Array.isArray(ia) && ia.length) {
      valIA = parseFloat(ia[ia.length - 1]?.valor ?? 0);
      iaHistory = ia;
    } else {
      const ult12 = mens.slice(-12);
      valIA = (ult12.reduce((acc, d) => acc * (1 + parseFloat(d.valor || 0) / 100), 1) - 1) * 100;
    }
    setInflacion({ valor: valIA, fecha: last?.fecha, history: mens, iaHistory });
    setStatus('inflacion', 'ok');
  }, []);

  // ── Riesgo País ──────────────────────────────────────────────
  const loadRiesgoPais = useCallback(async () => {
    setStatus('riesgoPais', 'loading');
    const [{ data: ultimo }, { data: historial }] = await Promise.all([
      fetchRiesgoPaisUltimo(), fetchRiesgoPais(),
    ]);
    const hist = Array.isArray(historial) ? historial : [];
    const last = ultimo || hist[hist.length - 1];
    if (!last) { setStatus('riesgoPais', 'error'); return; }
    const prev  = hist.length > 1 ? hist[hist.length - 2] : null;
    const val   = parseFloat(last?.valor ?? 0);
    const prvV  = prev ? parseFloat(prev.valor ?? 0) : null;
    setRiesgoPais({ valor: val, delta: prvV != null ? val - prvV : null, fecha: last?.fecha, history: hist.slice(-365) });
    setStatus('riesgoPais', 'ok');
  }, []);

  // ── Feriados ─────────────────────────────────────────────────
  const loadFeriados = useCallback(async () => {
    setStatus('feriados', 'loading');
    const { data, error } = await fetchFeriados(2026);
    if (error || !Array.isArray(data)) { setStatus('feriados', 'error'); return; }
    setFeriados(data);
    setStatus('feriados', 'ok');
  }, []);

  // ── UVA ──────────────────────────────────────────────────────
  const loadUva = useCallback(async () => {
    setStatus('uva', 'loading');
    const { data, error } = await fetchUVA();
    if (error || !Array.isArray(data) || data.length === 0) { setStatus('uva', 'error'); return; }
    const last = data[data.length - 1];
    const prev = data[data.length - 2];
    setUva({ valor: parseFloat(last?.valor ?? 0), prev: parseFloat(prev?.valor ?? 0), fecha: last?.fecha, history: data.slice(-30) });
    setStatus('uva', 'ok');
  }, []);

  // ── Tasas ────────────────────────────────────────────────────
  const loadTasas = useCallback(async () => {
    setStatus('tasas', 'loading');
    const [{ data: pf }, { data: dep }] = await Promise.all([
      fetchTasasPlazoFijo(), fetchTasasDepositos(),
    ]);
    const hasPf  = Array.isArray(pf)  && pf.length > 0;
    const hasDep = Array.isArray(dep) && dep.length > 0;
    if (!hasPf && !hasDep) { setStatus('tasas', 'error'); return; }
    setTasas({ plazoFijo: hasPf ? pf : [], depositos: hasDep ? dep : [] });
    setStatus('tasas', 'ok');
  }, []);

  // ── Precios Globales (Yahoo Finance via proxy) ────────────────
  const loadMundo = useCallback(async () => {
    setStatus('mundo', 'loading');
    const { data, error } = await fetchMundoData();
    if (error || !data?.data) { setStatus('mundo', 'error'); return; }
    // Organizar por grupo para fácil consumo en el componente
    const byGroup = {};
    data.data.forEach(item => {
      if (!byGroup[item.group]) byGroup[item.group] = [];
      byGroup[item.group].push(item);
    });
    setMundo({ items: data.data, byGroup, updated: data.updated });
    setStatus('mundo', 'ok');
  }, []);

  // ── Indicadores BCRA ─────────────────────────────────────────
  const loadBcra = useCallback(async () => {
    setStatus('bcra', 'loading');
    const { data, error } = await fetchBCRAData();
    if (error || !data?.data) { setStatus('bcra', 'error'); return; }
    // Organizar por categoría y también por key para acceso rápido
    const byCat = {};
    const byKey = {};
    data.data.forEach(item => {
      if (!byCat[item.categoria]) byCat[item.categoria] = [];
      byCat[item.categoria].push(item);
      byKey[item.key] = item;
    });
    setBcra({ items: data.data, byCat, byKey, timestamp: data.timestamp });
    setStatus('bcra', 'ok');
  }, []);

  // ── Cotizaciones (CCL, MEP) ───────────────────────────────────
  const loadCotizaciones = useCallback(async () => {
    setStatus('cotizaciones', 'loading');
    const { data, error } = await fetchCotizaciones();
    if (error || !data) { setStatus('cotizaciones', 'error'); return; }
    setCotizaciones(data);
    setStatus('cotizaciones', 'ok');
  }, []);

  // ── INDEC — EMAE + PBI (datos.gob.ar) ────────────────────────
  const loadIndec = useCallback(async () => {
    setStatus('indec', 'loading');
    const { data, error } = await fetchINDEC();
    if (error || !data?.emae) { setStatus('indec', 'error'); return; }
    setIndec(data);
    setStatus('indec', 'ok');
  }, []);

  // ── Carga inicial y polling con TTL por fuente ───────────────
  //
  // Rápido  (5 min):  dólares — cambian durante el día
  // Lento   (60 min): UVA, tasas, riesgo país — datos diarios
  // Diario  (24 hs):  BCRA, INDEC, inflación, feriados — no cambian en el día
  //
  // sessionStorage guarda el timestamp del último fetch para que
  // recargar la pestaña no repida datos que ya están frescos.

  const loadFast = useCallback(() => {
    // Dólares siempre — son el dato más dinámico
    loadDolares();
  }, [loadDolares]);

  const loadSlow = useCallback(() => {
    if (isStale('uva',        POLL_SLOW))  { loadUva();        markFresh('uva'); }
    if (isStale('tasas',      POLL_SLOW))  { loadTasas();      markFresh('tasas'); }
    if (isStale('riesgoPais', POLL_SLOW))  { loadRiesgoPais(); markFresh('riesgoPais'); }
  }, [loadUva, loadTasas, loadRiesgoPais]);

  const loadDaily = useCallback(() => {
    if (isStale('bcra',      POLL_DAILY)) { loadBcra();      markFresh('bcra'); }
    if (isStale('inflacion', POLL_DAILY)) { loadInflacion(); markFresh('inflacion'); }
    if (isStale('indec',     POLL_DAILY)) { loadIndec();     markFresh('indec'); }
    if (isStale('feriados',  POLL_DAILY)) { loadFeriados();  markFresh('feriados'); }
  }, [loadBcra, loadInflacion, loadIndec, loadFeriados]);

  // loadAll forzado — ignora TTL, para el botón Reintentar
  const loadAll = useCallback(() => {
    Promise.allSettled([
      loadDolares(), loadInflacion(), loadRiesgoPais(),
      loadFeriados(), loadUva(), loadTasas(),
      loadMundo(), loadBcra(), loadCotizaciones(), loadIndec(),
    ]);
  }, [loadDolares, loadInflacion, loadRiesgoPais, loadFeriados, loadUva, loadTasas,
      loadMundo, loadBcra, loadCotizaciones, loadIndec]);

  useEffect(() => {
    // Carga inicial — forzar todo sin importar TTL
    // (sessionStorage puede tener timestamps de sesiones anteriores)
    loadDolares();
    loadUva();        markFresh('uva');
    loadTasas();      markFresh('tasas');
    loadRiesgoPais(); markFresh('riesgoPais');
    loadBcra();       markFresh('bcra');
    loadInflacion();  markFresh('inflacion');
    loadIndec();      markFresh('indec');
    loadFeriados();   markFresh('feriados');

    // Polling diferenciado — con TTL a partir de la segunda vez
    const fastTimer  = setInterval(loadFast,  POLL_FAST);
    const slowTimer  = setInterval(loadSlow,  POLL_SLOW);
    const dailyTimer = setInterval(loadDaily, POLL_DAILY);

    return () => {
      clearInterval(fastTimer);
      clearInterval(slowTimer);
      clearInterval(dailyTimer);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Enriquecimiento de inflacion con valores BCRA ───────────
  // Cuando ambos estados cargan, resuelve la fuente primaria (BCRA)
  // con fallback a ArgentinaDatos. Así los componentes consumen un
  // objeto limpio sin lógica de fallback interna.
  useEffect(() => {
    if (!inflacion || !bcra?.byKey) return;

    const byKey = bcra.byKey;

    const mensual = byKey.inflacion_mensual?.valor != null
      ? parseFloat(byKey.inflacion_mensual.valor)
      : inflacion.valor ?? null;

    const interanual = byKey.inflacion_interanual?.valor != null
      ? parseFloat(byKey.inflacion_interanual.valor)
      : inflacion.valor ?? null;

    const esperada = byKey.inflacion_esperada?.valor != null
      ? parseFloat(byKey.inflacion_esperada.valor)
      : null;

    const fechaMensual = byKey.inflacion_mensual?.fecha
      ?? inflacion.fecha
      ?? null;

    // Solo actualizar si hay algo nuevo para agregar
    if (
      inflacion.ipcMensual    === mensual &&
      inflacion.ipcInteranual === interanual &&
      inflacion.ipcEsperado   === esperada
    ) return;

    setInflacion(prev => prev ? {
      ...prev,
      ipcMensual:    mensual,
      ipcInteranual: interanual,
      ipcEsperado:   esperada,
      ipcFecha:      fechaMensual,
    } : prev);
  }, [inflacion, bcra]);

  return {
    // Datos existentes
    dolares, inflacion, riesgoPais, feriados, uva, tasas,
    // Nuevos datos
    mundo, bcra, cotizaciones, indec,
    // Estado y control
    apiStatus, lastUpdate, reloadAll: loadAll,
    // Loaders individuales para carga bajo demanda
    loadMundo, loadBcra, loadCotizaciones, loadIndec,
  };
}
