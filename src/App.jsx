// ============================================================
// App.jsx — MIGRADO A REACT ROUTER
// ============================================================
// ANTES: usaba {activePage === 'granos' && <GranosPage />}
//        para mostrar/ocultar páginas. Solo funcionaba como
//        estado interno — la URL nunca cambiaba.
//
// AHORA: usa <Routes> + <Route path="/granos"> de React Router.
//        Cada página vive en su propia URL real.
//        La prop goPage sigue funcionando igual en todos los
//        componentes hijos — no hay que tocar ninguna página.
// ============================================================

import React from 'react';
import { Routes, Route } from 'react-router-dom';  // ← NUEVO

import { Ticker }        from './components/layout/Ticker';
import { Navbar }        from './components/layout/Navbar';
import { Footer }        from './components/layout/Footer';
import { HomePage }      from './components/pages/HomePage';
import { GranosPage }    from './components/pages/GranosPage';
import { HaciendaPage }  from './components/pages/HaciendaPage';
import { FinancieroPage }from './components/pages/FinancieroPage';
import { MacroPage }     from './components/pages/MacroPage';
import { MundoPage }     from './components/pages/MundoPage';
import { InsumosPage }   from './components/pages/InsumosPage';
import { IndicesPage }   from './components/pages/IndicesPage';
import { ImpuestosPage } from './components/pages/ImpuestosPage';
import { FeriadosPage }  from './components/pages/FeriadosPage';
import { AyudaPage }     from './components/pages/AyudaPage';
import { useNavigation } from './hooks/useNavigation';
import { useLiveData }   from './hooks/useLiveData';

export default function App() {
  // useNavigation ahora lee/escribe la URL en vez de useState
  const { activePage, goPage } = useNavigation();

  const { dolares, inflacion, riesgoPais, feriados, uva, tasas,
          mundo, bcra, cotizaciones, indec,
          apiStatus, lastUpdate, reloadAll,
          loadMundo, loadBcra, loadCotizaciones, loadIndec } = useLiveData();

  return (
    <>
      <Ticker />
      <Navbar activePage={activePage} goPage={goPage} />
      <div className="main">

        {/*
          ANTES (condicionales manuales):
            {activePage === 'granos' && <GranosPage ... />}

          AHORA (Routes de React Router):
            Cada <Route> renderiza su componente solo cuando la
            URL coincide. Las props son exactamente las mismas.
        */}
        <Routes>
          <Route path="/" element={
            <HomePage
              goPage={goPage} dolares={dolares} feriados={feriados}
              lastUpdate={lastUpdate} inflacion={inflacion}
              riesgoPais={riesgoPais} indec={indec} bcra={bcra} tasas={tasas}
            />}
          />
          <Route path="/granos" element={
            <GranosPage goPage={goPage} apiStatus={apiStatus} reloadAll={reloadAll}
              dolares={dolares} mundo={mundo} loadMundo={loadMundo} />}
          />
          <Route path="/hacienda" element={
            <HaciendaPage goPage={goPage} />}
          />
          <Route path="/financiero" element={
            <FinancieroPage
              goPage={goPage} dolares={dolares} uva={uva} tasas={tasas}
              bcra={bcra} loadBcra={loadBcra} apiStatus={apiStatus} reloadAll={reloadAll}
            />}
          />
          <Route path="/macro" element={
            <MacroPage
              goPage={goPage} inflacion={inflacion} riesgoPais={riesgoPais}
              bcra={bcra} loadBcra={loadBcra} indec={indec} loadIndec={loadIndec}
              apiStatus={apiStatus} reloadAll={reloadAll}
            />}
          />
          <Route path="/mundo" element={
            <MundoPage goPage={goPage} mundo={mundo} loadMundo={loadMundo} />}
          />
          <Route path="/insumos" element={
            <InsumosPage goPage={goPage} />}
          />
          <Route path="/indices" element={
            <IndicesPage goPage={goPage} />}
          />
          <Route path="/impuestos" element={
            <ImpuestosPage goPage={goPage} />}
          />
          <Route path="/feriados" element={
            <FeriadosPage goPage={goPage} feriados={feriados} />}
          />
          <Route path="/ayuda" element={
            <AyudaPage goPage={goPage} apiStatus={apiStatus} reloadAll={reloadAll} />}
          />

          {/* Cualquier ruta desconocida → Inicio */}
          <Route path="*" element={
            <HomePage
              goPage={goPage} dolares={dolares} feriados={feriados}
              lastUpdate={lastUpdate} inflacion={inflacion}
              riesgoPais={riesgoPais} indec={indec} bcra={bcra} tasas={tasas}
            />}
          />
        </Routes>

      </div>
      <Footer goPage={goPage} />
    </>
  );
}
