// ============================================================
// components/ui/PageHeader.jsx
// Reusable page header with title, subtitle, and optional right slot
// ============================================================

import React from 'react';

export function PageHeader({ title, subtitle, children, onHelp }) {
  return (
    <div className="ph">
      <div>
        <div className="ph-title">
          {title}
          {onHelp && (
            <span className="help-pip" onClick={onHelp} title="Ayuda">?</span>
          )}
        </div>
        {subtitle && <div className="ph-sub">{subtitle}</div>}
      </div>
      {children && <div className="ph-right">{children}</div>}
    </div>
  );
}
