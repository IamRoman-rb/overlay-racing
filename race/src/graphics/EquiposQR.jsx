// QR DEL PANEL DE EQUIPOS: lleva a overlayracing.site/equipos/:token (clima, viento, temperatura de pista, radar y mapa
// en vivo). El link lo da el servidor al registrar la CLAVE DE EQUIPOS (pestaña CLOUD) y el panel lo guarda en
// config.equiposUrl, así se actualiza solo si cambia el evento o la clave. Mismo diseño y formatos que el QR de votación.
import VotingQR from './VotingQR';

const EQUIPOS_QR_TEXTS = {
  title: 'PANEL DE EQUIPOS',
  compact: ['Equipos: datos', 'de pista en vivo'],
  banner: ['Clima, pista y mapa', 'en vivo para los equipos'],
  minimal: 'PANEL DE EQUIPOS',
  standard: ['CLIMA, PISTA Y', 'MAPA EN VIVO'],
  loading: ['SIN LINK', '(PESTAÑA CLOUD)'],
  loadingShort: 'SIN LINK'
};

export default function EquiposQR({ isVisible, config, id = 'equiposQR' }) {
  return <VotingQR isVisible={isVisible} config={config} id={id} localIp={config?.equiposUrl || ''} texts={EQUIPOS_QR_TEXTS} formatKey="equiposQRFormat" />;
}
