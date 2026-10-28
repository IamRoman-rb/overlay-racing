import { useState } from 'react';
import Icon from '../components/Icon';
import { withIcons } from '../components/withIcons';

function Section({ id, icon, title, children, colors, openId, setOpenId }) {
  const isOpen = openId === id;
  const sectionStyle = { backgroundColor: colors.bgPanel, border: `1px solid ${colors.border}`, borderRadius: '8px', marginBottom: '12px', overflow: 'hidden' };
  const headerStyle = {
    padding: '16px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: isOpen ? colors.bgInput : colors.bgPanel, borderBottom: isOpen ? `1px solid ${colors.border}` : 'none',
    fontSize: '14px', fontWeight: 'bold', color: isOpen ? colors.yellow : colors.textMain
  };
  const bodyStyle = { padding: '18px 22px', fontSize: '13px', lineHeight: '1.7', color: colors.textMain };

  return (
    <div style={sectionStyle}>
      <div style={headerStyle} onClick={() => setOpenId(isOpen ? null : id)}>
        <span>{withIcons(icon)} {title}</span>
        <span style={{ color: colors.textMuted }}><Icon name={isOpen ? 'arrow_drop_up' : 'arrow_drop_down'} size="1.6em" /></span>
      </div>
      {isOpen && <div style={bodyStyle}>{children}</div>}
    </div>
  );
}

export default function UserManual({ colors, t, language }) {
  const [openId, setOpenId] = useState('intro');

  const h4 = { color: colors.yellow, fontSize: '13px', marginTop: '18px', marginBottom: '8px' };
  const code = { backgroundColor: colors.bgInput, border: `1px solid ${colors.border}`, borderRadius: '4px', padding: '2px 6px', fontFamily: 'monospace', color: '#7ee787', fontSize: '12px' };
  const ol = { paddingLeft: '20px', margin: '6px 0' };
  const li = { marginBottom: '8px' };
  const note = { backgroundColor: 'rgba(241, 196, 15, 0.1)', border: `1px solid ${colors.yellow}`, borderRadius: '6px', padding: '10px 14px', marginTop: '10px', fontSize: '12px', color: colors.textMain };
  const table = { width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginTop: '8px' };
  const th = { textAlign: 'left', padding: '8px 10px', backgroundColor: colors.bgInput, color: colors.textMuted, borderBottom: `2px solid ${colors.border}` };
  const td = { padding: '8px 10px', borderBottom: `1px solid ${colors.border}` };
  const sectionProps = { colors, openId, setOpenId };

  return (
    <div style={{ padding: '30px', flex: 1, backgroundColor: colors.bgApp, overflowY: 'auto' }}>
      <h2 style={{ color: colors.yellow, marginTop: 0, borderBottom: `1px solid ${colors.border}`, paddingBottom: '10px' }}>
        {t.i('manual.title')}
      </h2>
      <p style={{ color: colors.textMuted, fontSize: '13px', marginBottom: '10px', maxWidth: '800px' }}>
        {t('manual.intro')}
      </p>
      {language && language !== 'es' && (
        <div style={{ ...note, marginBottom: '20px', maxWidth: '800px' }}>{t.i('manual.contentSpanishOnly')}</div>
      )}

      <Section id="intro" icon="🎬" title={t('manual.sections.intro')} {...sectionProps}>
        <p>
          Este programa tiene <b>dos ventanas</b>: el <b>Panel de Control</b> (donde estás ahora, para manejar todo)
          y la ventana <b>Overlay</b> (las gráficas que se ven al aire), que se abre por separado.
        </p>
        <p>
          Además, al iniciar levanta un pequeño servidor local (puerto <span style={code}>8080</span>) que se
          encarga de la página de votación pública, el panel de comisarios deportivos y las fotos de los pilotos.
          Todo esto se explica en detalle más abajo.
        </p>
      </Section>

      <Section id="vmix" icon="📡" title={t('manual.sections.vmix')} {...sectionProps}>
        <p>Hay dos formas de meter la gráfica en vMix. La <b>Opción A</b> es la recomendada y funciona siempre.</p>

        <div style={h4}>Opción A — Capturar la ventana + Chroma Key (recomendado)</div>
        <ol style={ol}>
          <li style={li}>Andá a la pestaña <b>AJUSTES</b> y elegí el "COLOR DE FONDO (CHROMA KEY)" que vas a usar (por defecto es verde).</li>
          <li style={li}>Dejá la ventana <b>Overlay</b> abierta en un monitor, idealmente a 1920×1080 (o la medida que definas en PERSONALIZAR) sin escalar.</li>
          <li style={li}>En vMix, agregá un input de tipo <b>Capture</b> (o capturá directamente el monitor/pantalla) apuntando a la ventana "Overlay".</li>
          <li style={li}>Aplicále a ese input el filtro <b>Chroma Key</b> de vMix, seleccionando el mismo color que elegiste en AJUSTES.</li>
        </ol>

        <div style={h4}>Opción B — Web Browser Input (solo con la app instalada, no en modo desarrollo)</div>
        <ol style={ol}>
          <li style={li}>En vMix, agregá un input <b>Web Browser</b>.</li>
          <li style={li}>Como URL usá: <span style={code}>http://localhost:8080/#/overlay</span> (si vMix está en esta misma PC) o{' '}
            <span style={code}>http://[IP-de-esta-PC]:8080/#/overlay</span> (si vMix está en otra PC de la misma red).</li>
        </ol>
        <div style={{ ...note, backgroundColor: 'rgba(52, 152, 219, 0.1)', borderColor: '#3498db' }}>
          🖧 <b>¿vMix está en otra PC?</b> (por ejemplo, conectadas por cable de red RJ45): <b>no se puede usar localhost</b>, porque ahí
          "localhost" es la PC de vMix y no esta. Usá la dirección con la IP de esta PC, que figura lista para copiar en la pestaña
          <b> AJUSTES</b>, sección "CONEXIÓN CON VMIX" (por ejemplo <span style={code}>http://192.168.1.10:8080/#/overlay</span>). Ambas PC
          tienen que estar en la misma red; si las conectás con un cable directo, asignale una IP fija a cada una (por ejemplo 192.168.1.10 y
          192.168.1.11, máscara 255.255.255.0). Si no conecta, permití Overlay Studio en el Firewall de Windows para redes privadas.
        </div>
        <div style={note}>
          <Icon name="warning" color="#f1c40f" /> La Opción B solo funciona con el programa ya instalado (el .exe empaquetado), no mientras se está
          ejecutando en modo desarrollo. Ahí sí es transparente de verdad y no necesita Chroma Key. Si tenés dudas
          sobre cuál opción te conviene, probá primero la Opción A.
        </div>
      </Section>

      <Section id="server" icon="🖧" title={t('manual.sections.server')} {...sectionProps}>
        <p>Apenas arranca el programa, se levanta un servidor en esta PC que expone, dentro de tu red local:</p>
        <table style={table}>
          <thead><tr><th style={th}>Dirección</th><th style={th}>Para qué sirve</th></tr></thead>
          <tbody>
            <tr><td style={{ ...td, fontFamily: 'monospace' }}>/votar</td><td style={td}>Página pública de votación (a la que apunta el código QR de la pestaña VOTACIONES).</td></tr>
            <tr><td style={{ ...td, fontFamily: 'monospace' }}>/comisarios</td><td style={td}>Panel público para que un comisario deportivo, desde su celular, emita o quite sanciones/investigaciones.</td></tr>
            <tr><td style={{ ...td, fontFamily: 'monospace' }}>/photo/(número)</td><td style={td}>Sirve la foto del piloto con ese número, si cargaste una carpeta de fotos (ver sección de fotos más abajo).</td></tr>
          </tbody>
        </table>
        <p style={{ marginTop: '10px' }}>
          Para que la votación o el panel de comisarios sean accesibles desde <b>fuera de tu red</b> (por ejemplo,
          para que el público vote desde el celular con datos móviles), el programa genera automáticamente un{' '}
          <b>túnel público temporal</b> apenas arranca. Vas a ver un aviso "TÚNEL LISTO" en las pestañas VOTACIONES
          y SANCIONES cuando ya esté disponible — recién ahí conviene mostrar el QR al aire.
        </p>
      </Section>

      <Section id="cloud" icon="☁️" title={t('manual.sections.cloud')} {...sectionProps}>
        <p>
          El túnel automático de la sección anterior es temporal y cambia cada vez que abrís el programa. Si querés
          un link <b>fijo</b> para votación y comisarios (por ejemplo para imprimir el QR con anticipación), usá el
          servidor propio:
        </p>
        <ol style={ol}>
          <li style={li}>Entrá a <span style={code}>overlayracing.site/dashboard</span> y creá tu evento.</li>
          <li style={li}>Ahí te van a aparecer dos links: uno de votación (<span style={code}>/qr/&lt;token&gt;</span>) y otro de comisarios (<span style={code}>/comisario/&lt;token&gt;</span>). Copiá solo el <b>token</b> (el código al final de cada URL).</li>
          <li style={li}>Pegá cada token en su campo correspondiente en la pestaña <b>CLOUD</b> y tocá "GUARDAR Y CONECTAR".</li>
        </ol>
        <p>
          Una vez conectado, vas a ver "CONECTADO AL SERVIDOR CLOUD" en esa pestaña. A partir de ahí, la votación y
          el panel de comisarios usan siempre ese link fijo en vez del túnel temporal, y todo lo que pase ahí (votos,
          sanciones) se sincroniza automáticamente con esta PC en tiempo real.
        </p>
      </Section>

      <Section id="timing" icon="⏱️" title={t('manual.sections.timing')} {...sectionProps}>
        <ol style={ol}>
          <li style={li}>Andá a la pestaña <b>AJUSTES</b> y elegí el proveedor: <b>Speedhive (MyLaps)</b> o <b>Race Monitor</b>.</li>
          <li style={li}>Pegá el código de la carrera, o directamente la URL completa de Speedhive/Race Monitor — el programa reconoce ambos formatos igual.</li>
          <li style={li}>Tocá "<Icon name="refresh" /> CARGAR DATOS AHORA" para traer los datos una sola vez, o activá "<Icon name="play_arrow" /> AUTO-CARGA" en la pestaña PANEL para que se actualice solo cada 1 segundo mientras dura la sesión.</li>
        </ol>
        <div style={note}>Si intentás hacer auto-carga sin haber cargado antes un código, el programa te va a avisar que primero completes el código en AJUSTES.</div>
      </Section>

      <Section id="excel" icon="📊" title={t('manual.sections.excel')} {...sectionProps}>
        <p>
          En la pestaña <b>CAMPEONATO</b>, el botón "CARGAR EXCEL" acepta un archivo <span style={code}>.xlsx</span>{' '}
          o <span style={code}>.xls</span>. Solo lee la <b>primera hoja</b> del archivo, y busca estas columnas
          exactas (los nombres tienen que estar escritos tal cual, con mayúsculas y guion bajo donde corresponde):
        </p>
        <table style={table}>
          <thead><tr><th style={th}>Columna</th><th style={th}>Qué es</th></tr></thead>
          <tbody>
            <tr><td style={{ ...td, fontFamily: 'monospace' }}>Numero</td><td style={td}>Número de auto del piloto. Sin esta columna completa, esa fila se ignora.</td></tr>
            <tr><td style={{ ...td, fontFamily: 'monospace' }}>Nombre</td><td style={td}>Nombre del piloto.</td></tr>
            <tr><td style={{ ...td, fontFamily: 'monospace' }}>Puntos</td><td style={td}>Puntaje base que trae el piloto <i>antes</i> de esta carrera (de fechas anteriores).</td></tr>
            <tr><td style={{ ...td, fontFamily: 'monospace' }}>Posicion</td><td style={td}>Posición de llegada (1, 2, 3...) para la escala de puntos.</td></tr>
            <tr><td style={{ ...td, fontFamily: 'monospace' }}>Puntos_Escala</td><td style={td}>Cuántos puntos otorga esa posición de llegada.</td></tr>
          </tbody>
        </table>
        <p style={{ marginTop: '10px' }}>
          Podés poner ambos grupos de columnas (pilotos y escala de puntos) en la misma hoja, aunque no coincidan
          en la misma fila — el programa arma por separado la lista de pilotos y la escala de puntos. Mientras corre
          la sesión, el programa suma automáticamente al puntaje base los puntos que le corresponden a cada piloto
          según la posición en la que va llegando, y recalcula la tabla en vivo.
        </p>
        <div style={note}>
          <Icon name="lightbulb" color="#f1c40f" /> No hace falta armar el archivo de cero: en la pestaña <b>CAMPEONATO</b>, el botón "DESCARGAR PLANTILLA EXCEL" guarda un
          <span style={code}>.xlsx</span> con las columnas correctas, datos de ejemplo y una hoja de instrucciones. Completalo y cargalo con "CARGAR EXCEL".
        </div>
        <p style={{ color: colors.textMuted, fontStyle: 'italic' }}>
          Ejemplo de filas válidas: una fila con <span style={code}>Numero=12, Nombre=Juan Pérez, Puntos=45</span>{' '}
          y, en cualquier otra fila, <span style={code}>Posicion=1, Puntos_Escala=25</span>.
        </p>
      </Section>

      <Section id="photos" icon="🖼️" title={t('manual.sections.photos')} {...sectionProps}>
        <ol style={ol}>
          <li style={li}>En la pestaña <b>PERSONALIZAR</b>, sección "CARPETA FOTOS DE PILOTOS", elegí la carpeta donde tenés las fotos.</li>
          <li style={li}>
            Cada foto tiene que llamarse <b>exactamente igual al número de auto</b> del piloto, sin espacios ni texto
            extra, con alguna de estas extensiones: <span style={code}>.png</span> <span style={code}>.jpg</span>{' '}
            <span style={code}>.jpeg</span> <span style={code}>.PNG</span> <span style={code}>.JPG</span>.
            Por ejemplo, el piloto del auto #12 necesita un archivo <span style={code}>12.png</span> (o <span style={code}>12.jpg</span>, etc.) directo dentro de esa carpeta, no en subcarpetas.
          </li>
        </ol>
        <p>
          Si un piloto no tiene foto (o no cargaste ninguna carpeta), se va a mostrar una silueta genérica en su
          lugar. Las fotos se usan en los formatos "Foto" de Info del Piloto, Ganador y en la Grilla de Partida.
        </p>
      </Section>

      <Section id="backup" icon="💾" title={t('manual.sections.backup')} {...sectionProps}>
        <p>
          Antes de actualizar el programa a una versión nueva, conviene guardar una copia de tu configuración
          actual para no perderla: colores, textos, formatos de cada gráfica, y las posiciones/tamaños que
          ajustaste en PERSONALIZAR.
        </p>
        <ol style={ol}>
          <li style={li}>Andá a la pestaña <b>AJUSTES</b>, sección "COPIA DE SEGURIDAD DE LA CONFIGURACIÓN", y tocá "GUARDAR CONFIGURACIÓN".</li>
          <li style={li}>Elegí una carpeta <b>fuera</b> de la carpeta del programa (por ejemplo, tu Escritorio o Documentos). Ahí se copian los archivos <span style={code}>database.json</span> y <span style={code}>posiciones.json</span>.</li>
          <li style={li}>Actualizá el programa normalmente.</li>
          <li style={li}>Si al abrir la nueva versión no ves tu configuración anterior, volvé a AJUSTES, tocá "CARGAR CONFIGURACIÓN" y elegí esa misma carpeta.</li>
        </ol>
        <div style={note}>
          <Icon name="warning" color="#f1c40f" /> Cargar una configuración reemplaza la actual por completo (colores, textos, formatos y posiciones). No afecta los datos de la carrera en vivo (tabla de pilotos, tiempos), que vienen de Speedhive/Race Monitor.
        </div>
      </Section>

      <Section id="tabs" icon="🗂️" title={t('manual.sections.tabs')} {...sectionProps}>
        <table style={table}>
          <tbody>
            <tr><td style={{ ...td, fontWeight: 'bold', whiteSpace: 'nowrap' }}>PANEL</td><td style={td}>El control principal al aire: banderas (roja, tricolor, azul, verde, cuadros y negra), zócalos de relator/comentarista/noteros/circuito/clima, alertas de curva, grilla de partida, auto-carga de tiempos, semáforo de largada (con su secuencia de luces en vivo), torre de posiciones, batalla, campeonato virtual, evolución de tiempos, votación, resultados finales (con botones ANT / SIG para pasar las páginas a mano) y ganador. A la derecha está la tabla de pilotos en vivo.</td></tr>
            <tr><td style={{ ...td, fontWeight: 'bold' }}>CAMPEONATO</td><td style={td}>Cargar el Excel del campeonato y ver la tabla completa de puntos en vivo (ver sección de Excel más arriba).</td></tr>
            <tr><td style={{ ...td, fontWeight: 'bold' }}>VOTACIONES</td><td style={td}>Estado del túnel público, link/QR de votación, mostrar/ocultar QR y resultados al aire, reiniciar votos, y ranking de votos en vivo.</td></tr>
            <tr><td style={{ ...td, fontWeight: 'bold' }}>SANCIONES</td><td style={td}>QR y link del panel de comisarios, estado de la sanción/investigación activa, y controles para emitirla o quitarla manualmente.</td></tr>
            <tr><td style={{ ...td, fontWeight: 'bold' }}>CLOUD</td><td style={td}>Conexión al servidor propio overlayracing.site (ver sección Cloud más arriba).</td></tr>
            <tr><td style={{ ...td, fontWeight: 'bold' }}>ZÓCALOS</td><td style={td}>Seis zócalos de texto libre preseteados (título + texto), para poner al aire cuando haga falta.</td></tr>
            <tr><td style={{ ...td, fontWeight: 'bold' }}>DISEÑOS</td><td style={td}>Subir una imagen propia (PNG/SVG) que reemplace el diseño estándar de cualquier gráfica, gráfica por gráfica.</td></tr>
            <tr><td style={{ ...td, fontWeight: 'bold' }}>CIRCUITO</td><td style={td}>Cargar la imagen del circuito y marcar las curvas (arrastrando puntos), para usarlas en las alertas de curva del PANEL.</td></tr>
            <tr><td style={{ ...td, fontWeight: 'bold' }}>AJUSTES</td><td style={td}>Idioma del programa, color de Chroma Key para vMix, configuración del proveedor de timing en vivo (Speedhive/Race Monitor), y copia de seguridad de la configuración (database.json + posiciones.json).</td></tr>
            <tr><td style={{ ...td, fontWeight: 'bold' }}>PERSONALIZAR</td><td style={td}>Colores del tema, tipografía, formato visual de cada gráfica, bordes, animaciones de entrada, posición/escala con vista previa arrastrable, logos y carpeta de fotos.</td></tr>
            <tr><td style={{ ...td, fontWeight: 'bold' }}>EDITOR</td><td style={td}>Elegir una gráfica y arrastrar sus objetos (logo, título, tabla…) de un lugar a otro con el mouse para personalizarla. Los cambios se guardan solos y se ven en el overlay al instante. Se puede deshacer, restablecer un objeto o toda la gráfica.</td></tr>
          </tbody>
        </table>
      </Section>

      <div style={{ ...note, marginTop: '10px', backgroundColor: 'rgba(52, 152, 219, 0.1)', borderColor: '#3498db' }}>
        {t.i('manual.feedbackNote')}
      </div>
    </div>
  );
}
