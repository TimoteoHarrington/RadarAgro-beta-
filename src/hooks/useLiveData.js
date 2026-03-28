// hooks/useLiveData.js
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  fetchDolares, fetchInflacion, fetchInflacionInteranual,
  fetchRiesgoPais, fetchRiesgoPaisUltimo, fetchFeriados,
  fetchUVA, fetchTasasPlazoFijo, fetchTasasDepositos,
  fetchEmae, fetchReservas, fetchBaseMonetaria,
  fetchMerval, fetchMervalUSD, fetchTasaBADLAR, fetchTasaPoliticaMonetaria,
} from '../services/api';

const POLL_INTERVAL = 5 * 60 * 1000;

// Helpers
const last = arr => arr?.[arr.length - 1];
const prev = arr => arr?.[arr.length - 2];
const fv   = (obj, key = 'v') => parseFloat(obj?.[key] ?? obj?.valor ?? 0);

export function useLiveData() {
  const [dolares,     setDolares]     = useState(null);
  const [inflacion,   setInflacion]   = useState(null);
  const [riesgoPais,  setRiesgoPais]  = useState(null);
  const [feriados,    setFeriados]    = useState(null);
  const [uva,         setUva]         = useState(null);
  const [tasas,       setTasas]       = useState(null);
  // nuevos
  const [emae,        setEmae]        = useState(null);
  const [reservas,    setReservas]    = useState(null);
  const [baseMonetaria, setBaseMonetaria] = useState(null);
  const [merval,      setMerval]      = useState(null);
  const [badlar,      setBadlar]      = useState(null);

  const [apiStatus, setApiStatus] = useState({
    dolares: 'loading', inflacion: 'loading', riesgoPais: 'loading',
    feriados: 'loading', uva: 'loading', tasas: 'loading',
    emae: 'loading', reservas: 'loading', baseMonetaria: 'loading',
    merval: 'loading', badlar: 'loading',
  });
  const [lastUpdate, setLastUpdate] = useState(null);
  const timerRef = useRef(null);

  const setStatus = (key, status) =>
    setApiStatus(prev => ({ ...prev, [key]: status }));

  // ── Dólares ───────────────────────────────────────────────
  const loadDolares = useCallback(async () => {
    setStatus('dolares', 'loading');
    const { data, error } = await fetchDolares();
    if (error || !Array.isArray(data)) { setStatus('dolares', 'error'); return; }
    const by = {};
    data.forEach(d => {
      const key = (d.casa || d.nombre || '').toLowerCase().replace(/\s+/g, '');
      by[key] = d;
    });
    const getVenta = (...keys) => {
      for (const k of keys) {
        const d = by[k];
        if (d) { const v = parseFloat(d.venta ?? d.compra ?? 0); if (v > 0) return v; }
      }
      return null;
    };
    const pOf  = getVenta('oficial');
    const pMep = getVenta('bolsa', 'mep');
    const pCcl = getVenta('contadoconliqui', 'ccl', 'contado');
    const pBlu = getVenta('blue');
    const pMay = getVenta('mayorista');
    const pCry = getVenta('cripto', 'usdt', 'crypto');
    const pTar = getVenta('tarjeta');
    const pBlend = pOf && pMep ? pOf * 0.8 + pMep * 0.2 : null;
    const pct = (a, b) => a && b ? ((b - a) / a * 100) : null;
    setDolares({ pOf, pMep, pCcl, pBlu, pCry, pMay, pTar, pBlend,
      bMep: pct(pOf, pMep), bCcl: pct(pOf, pCcl),
      bBlu: pct(pOf, pBlu), bCry: pct(pOf, pCry) });
    setStatus('dolares', 'ok');
    setLastUpdate(new Date());
  }, []);

  // ── Inflación ─────────────────────────────────────────────
  const loadInflacion = useCallback(async () => {
    setStatus('inflacion', 'loading');
    const [{ data: mens }, { data: ia }] = await Promise.all([
      fetchInflacion(), fetchInflacionInteranual(),
    ]);
    if (!Array.isArray(mens) || mens.length === 0) { setStatus('inflacion', 'error'); return; }
    const lastItem = mens[mens.length - 1];
    let valIA = null, iaHistory = [];
    if (Array.isArray(ia) && ia.length) {
      valIA = parseFloat(ia[ia.length - 1]?.valor ?? 0);
      iaHistory = ia;
    } else {
      const ult12 = mens.slice(-12);
      valIA = (ult12.reduce((acc, d) => acc * (1 + parseFloat(d.valor || 0) / 100), 1) - 1) * 100;
    }
    setInflacion({ valor: valIA, fecha: lastItem?.fecha, history: mens, iaHistory });
    setStatus('inflacion', 'ok');
  }, []);

  // ── Riesgo País ───────────────────────────────────────────
  const loadRiesgoPais = useCallback(async () => {
    setStatus('riesgoPais', 'loading');
    const [{ data: ultimo }, { data: historial }] = await Promise.all([
      fetchRiesgoPaisUltimo(), fetchRiesgoPais(),
    ]);
    const hasData = ultimo || (Array.isArray(historial) && historial.length > 0);
    if (!hasData) { setStatus('riesgoPais', 'error'); return; }
    const hist = Array.isArray(historial) ? historial : [];
    const lastItem = ultimo || hist[hist.length - 1];
    const prevItem = hist[hist.length - 2];
    const val  = parseFloat(lastItem?.valor ?? 0);
    const prvV = prevItem ? parseFloat(prevItem.valor ?? 0) : null;
    setRiesgoPais({ valor: val, delta: prvV != null ? val - prvV : null,
      fecha: lastItem?.fecha, history: hist.slice(-365) });
    setStatus('riesgoPais', 'ok');
  }, []);

  // ── Feriados ─────────────────────────────────────────────
  const loadFeriados = useCallback(async () => {
    setStatus('feriados', 'loading');
    const { data, error } = await fetchFeriados(2026);
    if (error || !Array.isArray(data)) { setStatus('feriados', 'error'); return; }
    setFeriados(data);
    setStatus('feriados', 'ok');
  }, []);

  // ── UVA ──────────────────────────────────────────────────
  const loadUva = useCallback(async () => {
    setStatus('uva', 'loading');
    const { data, error } = await fetchUVA();
    if (error || !Array.isArray(data) || data.length === 0) { setStatus('uva', 'error'); return; }
    const l = data[data.length - 1];
    const p = data[data.length - 2];
    setUva({ valor: parseFloat(l?.valor ?? 0), prev: parseFloat(p?.valor ?? 0),
      fecha: l?.fecha, history: data.slice(-30) });
    setStatus('uva', 'ok');
  }, []);

  // ── Tasas ────────────────────────────────────────────────
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

  // ── EMAE (datos.gob.ar INDEC) ────────────────────────────
  // Respuesta: { data: [["2024-11-01", 5.3], ...], meta: [...] }
  const loadEmae = useCallback(async () => {
    setStatus('emae', 'loading');
    const { data: raw, error } = await fetchEmae();
    if (error || !raw?.data?.length) { setStatus('emae', 'error'); return; }

    const history = raw.data.map(([fecha, valor]) => ({
      fecha: fecha.slice(0, 7), // YYYY-MM
      valor: valor ?? 0,
    })).filter(d => d.valor !== null);

    const lastItem = history[history.length - 1];
    const prevItem = history[history.length - 2];
    const val  = parseFloat(lastItem?.valor ?? 0);
    const prvV = prevItem ? parseFloat(prevItem.valor ?? 0) : null;
    const delta = prvV != null ? val - prvV : null;

    // Acumulado del año en curso desde el historial mensual (aproximación)
    const thisYear = new Date().getFullYear().toString();
    const thisYearData = history.filter(d => d.fecha.startsWith(thisYear));

    setEmae({
      valor: val,
      delta,
      fecha: lastItem?.fecha,
      history,
      thisYearData,
    });
    setStatus('emae', 'ok');
  }, []);

  // ── Reservas Internacionales (estadisticasbcra) ───────────
  // Respuesta: [{d: "2024-03-01", v: 27500}]  (en millones USD)
  const loadReservas = useCallback(async () => {
    setStatus('reservas', 'loading');
    const { data, error } = await fetchReservas();
    if (error || !Array.isArray(data) || !data.length) { setStatus('reservas', 'error'); return; }

    const history = data.map(d => ({ fecha: d.d, valor: d.v }));
    const l = history[history.length - 1];
    const p = history[history.length - 2];
    // Variación en 30 días
    const d30 = history.length >= 30 ? history[history.length - 30] : null;

    setReservas({
      valor: l?.valor ?? null,
      prev:  p?.valor ?? null,
      delta: p ? (l.valor - p.valor) : null,
      delta30: d30 ? (l.valor - d30.valor) : null,
      fecha: l?.fecha,
      history: history.slice(-365),
    });
    setStatus('reservas', 'ok');
  }, []);

  // ── Base Monetaria (estadisticasbcra) ────────────────────
  // Respuesta: [{d: "2024-03-01", v: 12500000}]  (en millones ARS)
  const loadBaseMonetaria = useCallback(async () => {
    setStatus('baseMonetaria', 'loading');
    const { data, error } = await fetchBaseMonetaria();
    if (error || !Array.isArray(data) || !data.length) { setStatus('baseMonetaria', 'error'); return; }

    const history = data.map(d => ({ fecha: d.d, valor: d.v }));
    const l = history[history.length - 1];
    const p = history[history.length - 2];
    const d30 = history.length >= 30 ? history[history.length - 30] : null;

    setBaseMonetaria({
      valor: l?.valor ?? null,
      prev:  p?.valor ?? null,
      delta: p ? (l.valor - p.valor) : null,
      delta30: d30 ? (l.valor - d30.valor) : null,
      fecha: l?.fecha,
      history: history.slice(-365),
    });
    setStatus('baseMonetaria', 'ok');
  }, []);

  // ── Merval (estadisticasbcra) ─────────────────────────────
  const loadMerval = useCallback(async () => {
    setStatus('merval', 'loading');
    const [{ data: ars }, { data: usd }] = await Promise.all([
      fetchMerval(), fetchMervalUSD(),
    ]);
    if (!Array.isArray(ars) || !ars.length) { setStatus('merval', 'error'); return; }

    const historyARS = ars.map(d => ({ fecha: d.d, valor: d.v }));
    const historyUSD = Array.isArray(usd) ? usd.map(d => ({ fecha: d.d, valor: d.v })) : [];
    const l   = historyARS[historyARS.length - 1];
    const p   = historyARS[historyARS.length - 2];
    const lu  = historyUSD[historyUSD.length - 1];
    const d30 = historyARS.length >= 30 ? historyARS[historyARS.length - 30] : null;

    setMerval({
      valor: l?.valor ?? null,
      valorUSD: lu?.valor ?? null,
      delta: p ? l.valor - p.valor : null,
      deltaPct: p ? ((l.valor - p.valor) / p.valor) * 100 : null,
      delta30Pct: d30 ? ((l.valor - d30.valor) / d30.valor) * 100 : null,
      fecha: l?.fecha,
      historyARS: historyARS.slice(-365),
      historyUSD: historyUSD.slice(-365),
    });
    setStatus('merval', 'ok');
  }, []);

  // ── BADLAR (estadisticasbcra) ─────────────────────────────
  const loadBadlar = useCallback(async () => {
    setStatus('badlar', 'loading');
    const [{ data: badlarData }, { data: pmData }] = await Promise.all([
      fetchTasaBADLAR(), fetchTasaPoliticaMonetaria(),
    ]);
    if (!Array.isArray(badlarData) || !badlarData.length) { setStatus('badlar', 'error'); return; }

    const historyBadlar = badlarData.map(d => ({ fecha: d.d, valor: d.v }));
    const historyPM     = Array.isArray(pmData) ? pmData.map(d => ({ fecha: d.d, valor: d.v })) : [];
    const l   = historyBadlar[historyBadlar.length - 1];
    const p   = historyBadlar[historyBadlar.length - 2];
    const lpm = historyPM[historyPM.length - 1];

    setBadlar({
      badlar:    l?.valor ?? null,
      badlarPrev: p?.valor ?? null,
      politicaMonetaria: lpm?.valor ?? null,
      fecha: l?.fecha,
      historyBadlar: historyBadlar.slice(-180),
      historyPM: historyPM.slice(-180),
    });
    setStatus('badlar', 'ok');
  }, []);

  const loadAll = useCallback(() => {
    Promise.allSettled([
      loadDolares(), loadInflacion(), loadRiesgoPais(),
      loadFeriados(), loadUva(), loadTasas(),
      loadEmae(), loadReservas(), loadBaseMonetaria(),
      loadMerval(), loadBadlar(),
    ]);
  }, [
    loadDolares, loadInflacion, loadRiesgoPais,
    loadFeriados, loadUva, loadTasas,
    loadEmae, loadReservas, loadBaseMonetaria,
    loadMerval, loadBadlar,
  ]);

  useEffect(() => {
    loadAll();
    timerRef.current = setInterval(loadAll, POLL_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [loadAll]);

  return {
    dolares, inflacion, riesgoPais, feriados, uva, tasas,
    emae, reservas, baseMonetaria, merval, badlar,
    apiStatus, lastUpdate, reloadAll: loadAll,
  };
}
