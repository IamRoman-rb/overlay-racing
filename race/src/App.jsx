import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';

// Cada ventana descarga sólo su código: el overlay que abre vMix / OBS por IP no necesita el panel de
// control (personalización, editor, mapas, traducciones...) y el panel no necesita el código del overlay.
// Las gráficas que usan los dos (vista previa del panel y overlay) quedan en un archivo compartido.
const ControlPanel = lazy(() => import('./windows/ControlPanel'));
const Overlay = lazy(() => import('./windows/Overlay'));

export default function App() {
  return (
    <HashRouter>
      {/* Mientras llega el código de la ventana no se pinta nada (el overlay sigue transparente). */}
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<ControlPanel />} />
          <Route path="/overlay" element={<Overlay />} />
        </Routes>
      </Suspense>
    </HashRouter>
  );
}
