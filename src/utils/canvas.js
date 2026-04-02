// ============================================================
// utils/canvas.js
// Generic canvas chart renderer — migrated from index.html
// Used by IndicesPage and GranosPage
// ============================================================

/**
 * Draw a multi-series line chart on a <canvas> element.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {string|null} tooltipId   - optional element id to update on hover
 * @param {Array}  series           - [{label, color, data}]
 * @param {number|null} threshold   - optional reference line value
 * @param {string|null} thresholdLabel
 * @param {number} decimalPlaces
 * @param {string[]} labels         - x-axis labels
 * @returns {() => void}  cleanup function (removes event listeners)
 */
export function makeCanvas(canvas, tooltipId, series, threshold, thresholdLabel, decimalPlaces, labels) {
  if (!canvas) return () => {};

  let hovIdx = null;
  const n = series[0].data.length;

  function hexToRgb(hex) {
    return `${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)}`;
  }

  function colorVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function resolveColor(color) {
    if (color.startsWith('var(')) return colorVar(color.slice(4, -1));
    return color;
  }

  const draw = (hov) => {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return;
    canvas.width  = rect.width  * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    const W = rect.width, H = rect.height;
    const pad = { t: 14, r: 16, b: 28, l: 52 };
    const cW = W - pad.l - pad.r, cH = H - pad.t - pad.b;
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const gridColor  = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    const labelColor = isDark ? 'rgba(154,176,196,0.7)'  : 'rgba(80,100,120,0.8)';

    const allVals = series.flatMap(s => s.data);
    if (threshold != null) allVals.push(threshold);
    const vmin = Math.min(...allVals) * 0.96;
    const vmax = Math.max(...allVals) * 1.04;

    const px = i => pad.l + i * (cW / (n - 1));
    const py = v => pad.t + cH - (v - vmin) / (vmax - vmin) * cH;

    // Y grid
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const v = vmin + (vmax - vmin) * i / steps;
      const y = py(v);
      ctx.strokeStyle = gridColor; ctx.lineWidth = 0.7; ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = labelColor; ctx.font = '8px JetBrains Mono,monospace'; ctx.textAlign = 'right';
      ctx.fillText(v.toFixed(decimalPlaces), pad.l - 4, y + 3);
    }

    // X labels
    if (labels) {
      ctx.fillStyle = labelColor; ctx.font = '8px JetBrains Mono,monospace'; ctx.textAlign = 'center';
      labels.forEach((m, i) => {
        if (i % 3 === 0 || i === n - 1) ctx.fillText(m, px(i), H - pad.b + 12);
      });
    }

    // Threshold line
    if (threshold != null) {
      const ty = py(threshold);
      ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(pad.l, ty); ctx.lineTo(W - pad.r, ty); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)';
      ctx.font = '8px JetBrains Mono,monospace'; ctx.textAlign = 'left';
      ctx.fillText(thresholdLabel, W - pad.r + 2, ty + 3);
    }

    // Series
    series.forEach(s => {
      const rawColor = resolveColor(s.color);
      const rgb = rawColor.startsWith('#') ? hexToRgb(rawColor) : '128,128,128';
      const grad = ctx.createLinearGradient(0, pad.t, 0, H - pad.b);
      grad.addColorStop(0, `rgba(${rgb},0.20)`);
      grad.addColorStop(1, `rgba(${rgb},0.01)`);

      ctx.beginPath();
      s.data.forEach((v, i) => i === 0 ? ctx.moveTo(px(i), py(v)) : ctx.lineTo(px(i), py(v)));
      ctx.lineTo(px(n - 1), H - pad.b); ctx.lineTo(px(0), H - pad.b); ctx.closePath();
      ctx.fillStyle = grad; ctx.fill();

      ctx.beginPath();
      s.data.forEach((v, i) => i === 0 ? ctx.moveTo(px(i), py(v)) : ctx.lineTo(px(i), py(v)));
      ctx.strokeStyle = rawColor; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
    });

    // Hover
    if (hov != null && hov >= 0 && hov < n) {
      const x = px(hov);
      ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, H - pad.b); ctx.stroke();
      ctx.setLineDash([]);
      series.forEach(s => {
        const rawColor = resolveColor(s.color);
        const y = py(s.data[hov]);
        ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = rawColor; ctx.fill();
        ctx.strokeStyle = isDark ? '#181b22' : '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
      });
    }
  };

  const onMouseMove = (e) => {
    const rect = canvas.getBoundingClientRect();
    const cW2 = rect.width - 52 - 16;
    hovIdx = Math.max(0, Math.min(n - 1, Math.round((e.clientX - rect.left - 52) / (cW2 / (n - 1)))));
    draw(hovIdx);
    const tip = tooltipId ? document.getElementById(tooltipId) : null;
    if (tip && labels) {
      const m = labels[hovIdx];
      const vals = series.map(s => `${s.label}: ${s.data[hovIdx].toFixed(decimalPlaces)}`).join(' · ');
      tip.textContent = `${m} · ${vals}`;
    }
  };

  const onMouseLeave = () => {
    hovIdx = null; draw(null);
    const tip = tooltipId ? document.getElementById(tooltipId) : null;
    if (tip) tip.textContent = '';
  };

  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseleave', onMouseLeave);

  draw(null);
  const ro = new ResizeObserver(() => draw(hovIdx));
  ro.observe(canvas);

  const onTheme = () => draw(hovIdx);
  document.addEventListener('themechange', onTheme);

  return () => {
    canvas.removeEventListener('mousemove', onMouseMove);
    canvas.removeEventListener('mouseleave', onMouseLeave);
    ro.disconnect();
    document.removeEventListener('themechange', onTheme);
  };
}
