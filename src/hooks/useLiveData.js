// hooks/useLiveData.js — corregido con parsing correcto de DolarApi
import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchDolares, fetchInflacion, fetchInflacionInteranual, fetchRiesgoPais, fetchRiesgoPaisUltimo, fetchFeriados, fetchUVA, fetchTasasPlazoFijo, fetchTasasDepositos } from '../services/api';

const POLL_INTERVAL = 5 * 60 * 1000;

export function useLiveData() {
  const [dolares,    setDolares]    = useState(null);
  const [inflacion,  setInflacion]  = useState(null);
  const [riesgoPais, setRiesgoPais] = useState(null);
  const [feriados,   setFeriados]   = useState(null);
  const [uva,        setUva]        = useState(null);
  const [tasas,      setTasas]      = useState(null);
  const [apiStatus,  setApiStatus]  = useState({
    dolares: 'loading', inflacion: 'loading', riesgoPais: 'loading',
    feriados: 'loading', uva: 'loading', tasas: 'loading',
  });
  const [lastUpdate, setLastUpdate] = useState(null);
  const timerRef = useRef(null);

  const setStatus = (key, status) =>
    setApiStatus(prev => ({ ...prev, [key]: status }));

  // ── Dólares (DolarApi.com) — array de casas ───────────────
  const loadDolares = useCallback(async () => {
    setStatus('dolares', 'loading');
    const { data, error } = await fetchDolares();
    if (error || !Array.isArray(data)) { setStatus('dolares', 'error'); return; }

    // DolarApi devuelve [{casa:'oficial',nombre:'...',compra,venta}, ...]
    const by = {};
    data.forEach(d => {
      const key = (d.casa || d.nombre || '').toLowerCase().replace(/\s+/g,'');
      by[key] = d;
    });

    const getVenta = (...keys) => {
      for (const k of keys) {
        const d = by[k];
        if (d) {
          const v = parseFloat(d.venta ?? d.compra ?? 0);
          if (v > 0) return v;
        }
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
    const bMep = pct(pOf, pMep);
    const bCcl = pct(pOf, pCcl);
    const bBlu = pct(pOf, pBlu);
    const bCry = pct(pOf, pCry);

    setDolares({ pOf, pMep, pCcl, pBlu, pCry, pMay, pTar, pBlend, bMep, bCcl, bBlu, bCry });
    setStatus('dolares', 'ok');
    setLastUpdate(new Date());
  }, []);

  // ── Inflación ─────────────────────────────────────────────
  const loadInflacion = useCallback(async () => {
    setStatus('inflacion', 'loading');
    const [{ data: mens }, { data: ia }] = await Promise.all([
      fetchInflacion(),
      fetchInflacionInteranual(),
    ]);
    if (!Array.isArray(mens) || mens.length === 0) { setStatus('inflacion', 'error'); return; }
    const last = mens[mens.length - 1];
    // Interanual: usar endpoint si disponible, sino calcular rolling 12m
    let valIA = null;
    let iaHistory = [];
    if (Array.isArray(ia) && ia.length) {
      const lastIA = ia[ia.length - 1];
      valIA = parseFloat(lastIA?.valor ?? 0);
      iaHistory = ia;
    } else {
      const ult12 = mens.slice(-12);
      valIA = (ult12.reduce((acc, d) => acc * (1 + parseFloat(d.valor || 0) / 100), 1) - 1) * 100;
    }
    setInflacion({
      valor: valIA,
      fecha: last?.fecha,
      history: mens,
      iaHistory,
    });
    setStatus('inflacion', 'ok');
  }, []);

  // ── Riesgo País ───────────────────────────────────────────
  const loadRiesgoPais = useCallback(async () => {
    setStatus('riesgoPais', 'loading');
    const [{ data: ultimo }, { data: historial }] = await Promise.all([
      fetchRiesgoPaisUltimo(),
      fetchRiesgoPais(),
    ]);
    const hasData = ultimo || (Array.isArray(historial) && historial.length > 0);
    if (!hasData) { setStatus('riesgoPais', 'error'); return; }

    const hist = Array.isArray(historial) ? historial : [];
    const last = ultimo || hist[hist.length - 1];
    const prev = hist.length > 1 ? hist[hist.length - 2] : null;
    const val  = parseFloat(last?.valor ?? 0);
    const prvV = prev ? parseFloat(prev.valor ?? 0) : null;
    const delta = prvV != null ? val - prvV : null;

    setRiesgoPais({ valor: val, delta, fecha: last?.fecha, history: hist.slice(-365) });
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
    if (error || !Array.isArray(data) || data.length === 0) {
      setStatus('uva', 'error'); return;
    }
    const last = data[data.length - 1];
    const prev = data[data.length - 2];
    setUva({
      valor: parseFloat(last?.valor ?? 0),
      prev:  parseFloat(prev?.valor ?? 0),
      fecha: last?.fecha,
      history: data.slice(-30),
    });
    setStatus('uva', 'ok');
  }, []);

  // ── Tasas ────────────────────────────────────────────────
  const loadTasas = useCallback(async () => {
    setStatus('tasas', 'loading');
    const [{ data: pf }, { data: dep }] = await Promise.all([
      fetchTasasPlazoFijo(),
      fetchTasasDepositos(),
    ]);
    const hasPf  = Array.isArray(pf)  && pf.length > 0;
    const hasDep = Array.isArray(dep) && dep.length > 0;
    if (!hasPf && !hasDep) { setStatus('tasas', 'error'); return; }
    setTasas({ plazoFijo: hasPf ? pf : [], depositos: hasDep ? dep : [] });
    setStatus('tasas', 'ok');
  }, []);

  const loadAll = useCallback(() => {
    Promise.allSettled([
      loadDolares(), loadInflacion(), loadRiesgoPais(),
      loadFeriados(), loadUva(), loadTasas(),
    ]);
  }, [loadDolares, loadInflacion, loadRiesgoPais, loadFeriados, loadUva, loadTasas]);

  useEffect(() => {
    loadAll();
    timerRef.current = setInterval(loadAll, POLL_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [loadAll]);

  return { dolares, inflacion, riesgoPais, feriados, uva, tasas, apiStatus, lastUpdate, reloadAll: loadAll };
}
