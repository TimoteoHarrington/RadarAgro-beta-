// App.jsx — Root component
import React from 'react';
import { Ticker }        from './components/layout/Ticker';
import { Navbar }        from './components/layout/Navbar';
import { Footer }        from './components/layout/Footer';
import { HomePage }      from './components/pages/HomePage';
import { GranosPage }    from './components/pages/GranosPage';
import { HaciendaPage }  from './components/pages/HaciendaPage';
import { FinancieroPage }from './components/pages/FinancieroPage';
import { MacroPage }     from './components/pages/MacroPage';
import { InsumosPage }   from './components/pages/InsumosPage';
import { IndicesPage }   from './components/pages/IndicesPage';
import { ImpuestosPage } from './components/pages/ImpuestosPage';
import { FeriadosPage }  from './components/pages/FeriadosPage';
import { AyudaPage }     from './components/pages/AyudaPage';
import { useNavigation } from './hooks/useNavigation';
import { useLiveData }   from './hooks/useLiveData';

export default function App() {
  const { activePage, goPage } = useNavigation();
  const {
    dolares, inflacion, riesgoPais, feriados, uva, tasas,
    emae, reservas, baseMonetaria, merval, badlar,
    apiStatus, lastUpdate, reloadAll,
  } = useLiveData();

  return (
    <>
      <Ticker />
      <Navbar activePage={activePage} goPage={goPage} />
      <div className="main">
        {activePage === 'home'       && <HomePage      goPage={goPage} dolares={dolares} feriados={feriados} lastUpdate={lastUpdate} />}
        {activePage === 'granos'     && <GranosPage    goPage={goPage} />}
        {activePage === 'hacienda'   && <HaciendaPage  goPage={goPage} />}
        {activePage === 'financiero' && <FinancieroPage goPage={goPage} dolares={dolares} uva={uva} tasas={tasas} />}
        {activePage === 'macro'      && (
          <MacroPage
            goPage={goPage}
            inflacion={inflacion}
            riesgoPais={riesgoPais}
            emae={emae}
            reservas={reservas}
            baseMonetaria={baseMonetaria}
            merval={merval}
            badlar={badlar}
          />
        )}
        {activePage === 'insumos'    && <InsumosPage   goPage={goPage} />}
        {activePage === 'indices'    && <IndicesPage   goPage={goPage} />}
        {activePage === 'impuestos'  && <ImpuestosPage goPage={goPage} />}
        {activePage === 'feriados'   && <FeriadosPage  goPage={goPage} feriados={feriados} />}
        {activePage === 'ayuda'      && <AyudaPage     goPage={goPage} apiStatus={apiStatus} reloadAll={reloadAll} />}
      </div>
      <Footer goPage={goPage} />
    </>
  );
}
