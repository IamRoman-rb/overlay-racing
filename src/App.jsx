import { HashRouter, Routes, Route } from 'react-router-dom';
import ControlPanel from './windows/ControlPanel';
import Overlay from './windows/Overlay';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<ControlPanel />} />
        <Route path="/overlay" element={<Overlay />} />
      </Routes>
    </HashRouter>
  );
}