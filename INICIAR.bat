@echo off
title Race Dynamics - Iniciando...
echo =======================================================
echo          INICIANDO RACE DYNAMICS DASHBOARD
echo =======================================================
echo.
echo [1/2] Verificando e instalando dependencias (npm i)...
call npm i

echo.
echo [2/2] Arrancando el sistema (npm start)...
call npm start

pause