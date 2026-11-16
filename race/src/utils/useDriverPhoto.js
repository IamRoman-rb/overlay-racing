import { useEffect, useState } from 'react';

// URL de la foto de un piloto en el mini-servidor del módulo (puerto 8080), o null si no corresponde.
export function driverPhotoUrl(number, enabled) {
  if (!enabled || number === undefined || number === null || number === '') return null;
  const host = (typeof window !== 'undefined' && window.location.hostname) || 'localhost';
  return `http://${host}:8080/photo/${encodeURIComponent(number)}`;
}

// Foto de un piloto con imagen de respaldo:
// - sin carpeta de fotos (enabled = false) o sin piloto -> `fallback` en el acto;
// - mientras se descarga una foto nueva se sigue mostrando la última que se resolvió;
// - si la foto no existe o falla -> `fallback`.
// La respuesta de una descarga vieja (piloto anterior) se descarta para no pisar la actual.
export function useDriverPhoto(number, enabled, fallback) {
  const url = driverPhotoUrl(number, enabled);
  const [shown, setShown] = useState(fallback);

  // Sin foto que buscar, se vuelve al respaldo (ajuste de estado durante el render: no hay efecto en cascada)
  if (!url && shown !== fallback) setShown(fallback);

  useEffect(() => {
    if (!url) return undefined;
    let alive = true;
    const img = new Image();
    img.onload = () => { if (alive) setShown(url); };
    img.onerror = () => { if (alive) setShown(fallback); };
    img.src = url;
    return () => { alive = false; };
  }, [url, fallback]);

  return url ? shown : fallback;
}
