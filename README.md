# RadarAgro — Dashboard Agrícola React + Vite

Proyecto **React 18 + Vite 5**.

---

## 🚀 Inicio rápido

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # dist/
npm run preview   # previsualizar build
```

---

## 📁 Estructura del proyecto

```
radar-agro/
├── index.html                     ← Entry point HTML (Vite)
├── vite.config.js
├── package.json
└── src/
    ├── main.jsx                   ← ReactDOM.createRoot()
    ├── App.jsx                    ← Root: navigation + live data + page router
    │
    ├── components/
    │   ├── layout/
    │   │   ├── Ticker.jsx         ← Banda de precios animada (top)
    │   │   └── Navbar.jsx         ← Navegación sticky + reloj + toggle tema
    │   │
    │   ├── ui/
    │   │   ├── StatCard.jsx       ← Tarjeta estadística reutilizable
    │   │   ├── PageHeader.jsx     ← Header de página (título + subtítulo)
    │   │   └── CanvasChart.jsx    ← Wrapper React para gráficos canvas
    │   │
    │   ├── widgets/
    │   │   └── WidgetRenderer.jsx ← Renderiza cada widget por ID
    │   │
    │   └── pages/
    │       ├── HomePage.jsx       ← Grid de widgets personalizables
    │       ├── GranosPage.jsx     ← BCR + CBOT + gráfico histórico
    │       ├── HaciendaPage.jsx   ← Liniers · Invernada · Feedlot
    │       ├── FinancieroPage.jsx ← Dólares (API live) · Bonos · Tasas
    │       ├── MacroPage.jsx      ← IPC · PBI · Riesgo País · Reservas
    │       ├── InsumosPage.jsx    ← Fertilizantes · Combustibles
    │       ├── IndicesPage.jsx    ← Canvas charts: Feedlot, Cría, Soja/Urea
    │       ├── ImpuestosPage.jsx  ← Retenciones + Calculadora neto productor
    │       ├── FeriadosPage.jsx   ← Calendario 2026
    │       └── AyudaPage.jsx      ← Estado APIs + Glosario
    │
    ├── hooks/
    │   ├── useTheme.js            ← dark/light + localStorage
    │   ├── useClock.js            ← Reloj en tiempo real (actualiza cada 1s)
    │   ├── useNavigation.js       ← Página activa + persistencia
    │   ├── useWidgets.js          ← Estado widgets: visibilidad + tamaño + orden
    │   └── useLiveData.js         ← Polling APIs (dólares, IPC, riesgo país)
    │
    ├── services/
    │   └── api.js                 ← Wrappers fetch → ArgentinaDatos + DolarApi
    │
    ├── data/
    │   ├── ticker.js              ← Items del ticker (mock)
    │   ├── granos.js              ← Pizarra BCR + CBOT + datos históricos
    │   ├── hacienda.js            ← Categorías Liniers (mock)
    │   ├── clima.js               ← Pronóstico 7 días (mock)
    │   ├── indices.js             ← Series feedlot, cría, soja/urea + macro KPIs
    │   └── feriados.js            ← Feriados 2026 + retenciones
    │
    ├── utils/
    │   ├── formatters.js          ← fmt$(), fmtP(), cls(), arrow()
    │   └── canvas.js              ← makeCanvas() — gráfico líneas multi-serie
    │
    └── styles/
        ├── global.css             ← Variables CSS, reset, layout, utilities
        └── components.css         ← Estilos de todos los componentes
```

---

## 🏗️ Decisiones de arquitectura

### ¿Por qué esta estructura?

| Patrón | Razón |
|--------|-------|
| **`/pages`** | Cada sección del nav = 1 componente de página. Fácil de encontrar y modificar. |
| **`/components/ui`** | Componentes atómicos reutilizables (StatCard, Pill, CanvasChart). |
| **`/hooks`** | Separación de lógica pura: el estado no vive en los componentes de página. |
| **`/data`** | Mock data centralizada. Cuando llegue una API, se reemplaza solo el archivo. |
| **`/services/api.js`** | Capa de abstracción para todas las llamadas HTTP. |
| **`/utils`** | Funciones puras sin side-effects (formateadores, canvas renderer). |

### CSS Strategy
Se mantienen los mismos nombres de clase del original. Los dos archivos CSS en `/styles` reemplazan directamente el `<style>` del monolito:
- `global.css` → variables `:root`, reset, layout base, utilities
- `components.css` → estilos de cada patrón de componente

### Temas dark/light
El hook `useTheme` agrega/quita `data-theme="light"` en `<html>` y dispara un evento `themechange` para que los canvas se redibujen.

---

## 🔌 APIs integradas

| API | URL | Estado |
|-----|-----|--------|
| Dólares (live) | `dolarapi.com/v1/dolares` | ✅ Activa |
| IPC Inflación | `api.argentinadatos.com/v1/finanzas/indices/inflacion` | ✅ Activa |
| Riesgo País | `api.argentinadatos.com/v1/finanzas/indices/riesgo-pais` | ✅ Activa |
| Feriados 2026 | `api.argentinadatos.com/v1/feriados/2026` | ✅ Activa |
| Granos BCR | — | 🔶 Mock (API no pública) |
| Hacienda Liniers | — | 🔶 Mock |
| CBOT Chicago | — | 🔶 Mock (requiere suscripción CME) |

---

## 📈 Cómo escalar

### Agregar una nueva página
1. Crear `src/components/pages/MiPagina.jsx`
2. Agregar el ID a `PAGE_IDS` en `useNavigation.js`
3. Agregar botón en el array `NAV_ITEMS` de `Navbar.jsx`
4. Agregar `{activePage === 'mi-pagina' && <MiPagina />}` en `App.jsx`

### Agregar un nuevo widget al Home
1. Agregar entrada en `WIDGET_DEFS` dentro de `useWidgets.js`
2. Agregar `case 'mi-widget': return <MiWidget />` en `WidgetRenderer.jsx`

### Conectar una API real de granos
1. Agregar función en `services/api.js`
2. Agregar el fetch en `useLiveData.js`
3. Pasar el dato como prop a `GranosPage`
4. Reemplazar el import de `data/granos.js` con los datos live

### Variables de entorno
```bash
# .env.local
VITE_DOLAR_API_URL=https://dolarapi.com
VITE_ARG_DATOS_URL=https://api.argentinadatos.com/v1
```

---

## 🧪 Testing (próximos pasos)
- `vitest` para unit tests de hooks y utils
- `@testing-library/react` para componentes
- `playwright` para e2e

---

## 📝 Notas de migración

El monolito original usaba:
- `goPage()` → reemplazado por `useNavigation` hook
- `toggleTheme()` → reemplazado por `useTheme` hook  
- `WIDGET_DEFS.render()` (template strings HTML) → componentes React en `WidgetRenderer.jsx`
- `makeCanvas()` global → `utils/canvas.js` + `CanvasChart.jsx` wrapper
- `loadDolares()` global → `useLiveData` hook con polling automático
- `localStorage` directo → encapsulado en cada hook relevante
