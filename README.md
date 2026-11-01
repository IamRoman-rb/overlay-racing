# Overlay Graphics

Aplicación de escritorio para operar gráficos deportivos en transmisiones. Usa Electron, React y Vite; el lanzador inicia sesión con una licencia y abre los módulos disponibles.

## Módulos

- `race/`: gráficos y panel de control para automovilismo.
- `football/`: gráficos y panel para partidos de fútbol.
- `streaming/`: directorio reservado para el módulo de streaming; todavía no tiene manifiesto publicable.
- `launcher/`: inicio de sesión, selección, descarga y actualización de módulos.

El detector usa los cambios locales de Git dentro de cada directorio y considera solo módulos con `module.json`.

```bash
npm run module:pack
npm run module:publish -- --notes "Mejoras y correcciones"
```

`module:publish` detecta los módulos modificados, los compila, arma sus ZIP y los sube al servidor. Se puede indicar un módulo (`race`, `football`, `racing`) o usar `--all` para incluir todos los módulos configurados.

Para publicar, crea `.env` en la raíz con credenciales de administrador. `.env.example` sirve como plantilla y `.env` está excluido de Git.

```env
OVERLAY_ADMIN_USER=usuario
OVERLAY_ADMIN_PASSWORD=contraseña
OVERLAY_SERVER_URL=https://overlayracing.site
```

El servidor genera y aplica la firma criptográfica al recibir cada paquete.

## Desarrollo

```bash
npm start
```

Esto ejecuta el lanzador y los servidores Vite de Carrera y Fútbol. Para compilar por separado: `npm run race:build` o `npm run football:build`.
