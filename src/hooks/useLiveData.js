// hooks/useLiveData.js
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  fetchDolares, fetchInflacion, fetchInflacionInteranual,
  fetchRiesgoPais, fetchRiesgoPaisUltimo, fetchFeriados,
  fetchUVA, fetchTasasPlazoFijo, fetchTasasDepositos,
  fetchMundoData, fetchBCRAData, fetchCotizaciones, fetchINDEC,
} from '../services/api';

const POLL_INTERVAL = 5 * 60 * 1000;  // 5 minutos

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
  const timerRef = useRef(null);

  const setStatus = (key, status) =>
    setApiStatus(prev => ({ ...prev, [key]: status }));

  // ── Dólares ──────────────────────────────────────────────────
  const loadDolares = useCallback(async () => {
    setStatus('dolares', 'loading');
    const [{ data, error }, { data: cotiz }] = await Promise.all([
      fetchDolares(),
      fetchCotizaciones(),
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

    // Delta diario oficial desde Yahoo Finance (via cotizaciones proxy)
    const prevOf = cotiz?.oficial?.prevClose ?? null;
    const deltaOf = pOf && prevOf ? Math.round((pOf - prevOf) * 100) / 100 : null;

    // Delta Blue: compra vs venta como referencia de spread, no hay prevClose
    const cBlu = getCompra('blue');
    const spreadBlu = pBlu && cBlu ? Math.round((pBlu - cBlu) * 100) / 100 : null;

    setDolares({
      pOf, pMep, pCcl, pBlu, pCry, pMay, pTar, pBlend,
      cOf, cBlu,
      spreadOf, spreadBlu,
      deltaOf,
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

  // ── Carga inicial y polling ───────────────────────────────────
  const loadCoreData = useCallback(() => {
    Promise.allSettled([
      loadDolares(), loadInflacion(), loadRiesgoPais(),
      loadFeriados(), loadUva(), loadTasas(),
      loadIndec(),  // EMAE + PBI — se actualiza con el mismo intervalo que el resto
    ]);
  }, [loadDolares, loadInflacion, loadRiesgoPais, loadFeriados, loadUva, loadTasas, loadIndec]);

  // loadAll incluye también los nuevos endpoints (para reloadAll manual)
  const loadAll = useCallback(() => {
    Promise.allSettled([
      loadDolares(), loadInflacion(), loadRiesgoPais(),
      loadFeriados(), loadUva(), loadTasas(),
      loadMundo(), loadBcra(), loadCotizaciones(), loadIndec(),
    ]);
  }, [loadDolares, loadInflacion, loadRiesgoPais, loadFeriados, loadUva, loadTasas,
      loadMundo, loadBcra, loadCotizaciones, loadIndec]);

  useEffect(() => {
    loadCoreData();
    timerRef.current = setInterval(loadCoreData, POLL_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [loadCoreData]);

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
