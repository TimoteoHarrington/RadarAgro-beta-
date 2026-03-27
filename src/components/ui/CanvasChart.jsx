// ============================================================
// components/ui/CanvasChart.jsx
// React wrapper for the canvas line chart utility
// ============================================================

import React, { useRef, useEffect } from 'react';
import { makeCanvas } from '../../utils/canvas';

/**
 * @param {Array}  series         [{label, color, data}]
 * @param {string} tooltipId      optional DOM id for hover tooltip
 * @param {number} threshold      optional reference line
 * @param {string} thresholdLabel label for threshold
 * @param {number} decimalPlaces
 * @param {string[]} labels       x-axis labels
 * @param {string} height         CSS height e.g. '220px'
 */
export function CanvasChart({
  series,
  tooltipId,
  threshold = null,
  thresholdLabel = '',
  decimalPlaces = 1,
  labels,
  height = '220px',
  style,
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !series?.length) return;
    const cleanup = makeCanvas(
      canvas, tooltipId, series, threshold, thresholdLabel, decimalPlaces, labels
    );
    return cleanup;
  }, [series, tooltipId, threshold, thresholdLabel, decimalPlaces, labels]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height, display: 'block', cursor: 'crosshair', ...style }}
    />
  );
}
