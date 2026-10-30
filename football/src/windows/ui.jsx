import { useEffect, useRef, useState } from 'react';
import { fileToDataURL } from '../utils/images';

export function Field({ label, children, grow }) {
  return (
    <label className="field" style={grow ? { flex: grow } : undefined}>
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

// Elegir una imagen del disco, verla en miniatura y quitarla. Se guarda achicada dentro de los datos.
export function ImagePicker({ value, onChange, label = 'Imagen', max = 320, round, compact }) {
  const input = useRef(null);
  const [error, setError] = useState('');

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try { setError(''); onChange(await fileToDataURL(file, max)); } catch (err) { setError(err.message); }
  };

  // Versión chica para las filas del plantel: la miniatura es el botón y la cruz la quita
  if (compact) {
    return (
      <div className="img-compact">
        <button type="button" className="img-thumb" title={value ? 'Cambiar foto' : 'Cargar foto'} style={{ borderRadius: round ? '50%' : 8 }} onClick={() => input.current.click()}>
          {value ? <img src={value} alt="" /> : <span>+</span>}
        </button>
        {value && <button type="button" className="img-remove" title="Quitar foto" onClick={() => onChange(null)}>×</button>}
        <input ref={input} type="file" accept="image/*" hidden onChange={pick} />
      </div>
    );
  }

  return (
    <div className="img-picker">
      <div className="img-thumb" style={{ borderRadius: round ? '50%' : 8 }}>
        {value ? <img src={value} alt="" /> : <span>—</span>}
      </div>
      <div className="img-actions">
        <button type="button" className="btn small" onClick={() => input.current.click()}>{value ? 'Cambiar' : `Cargar ${label.toLowerCase()}`}</button>
        {value && <button type="button" className="btn small ghost" onClick={() => onChange(null)}>Quitar</button>}
        {error && <span className="err">{error}</span>}
      </div>
      <input ref={input} type="file" accept="image/*" hidden onChange={pick} />
    </div>
  );
}

// Botón de dos pasos para acciones que borran (sin confirm() nativo, que en Windows le saca el foco a los inputs)
export function ConfirmButton({ onConfirm, children, className = 'btn small danger' }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return undefined;
    const timer = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(timer);
  }, [armed]);
  return (
    <button type="button" className={className} onClick={() => { if (armed) { setArmed(false); onConfirm(); } else setArmed(true); }}>
      {armed ? '¿Seguro?' : children}
    </button>
  );
}
