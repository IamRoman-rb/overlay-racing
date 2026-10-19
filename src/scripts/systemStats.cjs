// Lectura de consumo de la PC para los marcadores del Panel de Control.
// CPU y RAM salen de `os`. GPU y temperatura requieren Windows: se leen con un único PowerShell
// persistente que cada pocos segundos escribe una línea JSON (así no se lanza un proceso por lectura).
const os = require('os');
const { spawn } = require('child_process');

const GPU_POLL_SECONDS = 2;

// GPU: nvidia-smi si existe (dato exacto); si no, los contadores de WMI (sirven para NVIDIA/AMD/Intel;
// el % se calcula como Task Manager: suma por motor entre procesos y se toma el motor más cargado).
// Temperatura: LibreHardwareMonitor / OpenHardwareMonitor si están abiertos (dato real del CPU);
// si no, las zonas térmicas ACPI de Windows, que en muchas PCs no son del CPU, por eso se filtran
// valores imposibles. Si hay nvidia-smi, también se informa la temperatura de la GPU.
const POWERSHELL_LOOP = `
$ErrorActionPreference = 'SilentlyContinue'
$nv = Get-Command nvidia-smi
while ($true) {
  $gpu = $null; $gpuTemp = $null; $cpuTemp = $null
  if ($nv) {
    $o = (& nvidia-smi --query-gpu=utilization.gpu,temperature.gpu --format=csv,noheader,nounits | Select-Object -First 1)
    if ($o) { $p = $o -split ','; $gpu = [double]$p[0]; $gpuTemp = [double]$p[1] }
  }
  if ($null -eq $gpu) {
    $e = Get-CimInstance Win32_PerfFormattedData_GPUPerformanceCounters_GPUEngine
    if ($e) { $gpu = ($e | Group-Object { $_.Name -replace '^pid_\\d+_', '' } | ForEach-Object { ($_.Group | Measure-Object UtilizationPercentage -Sum).Sum } | Measure-Object -Maximum).Maximum }
  }
  foreach ($ns in 'root/LibreHardwareMonitor', 'root/OpenHardwareMonitor') {
    if ($null -eq $cpuTemp) {
      $s = Get-CimInstance -Namespace $ns -ClassName Sensor | Where-Object { $_.SensorType -eq 'Temperature' -and $_.Name -match 'CPU|Core|Tctl|Tdie|Package' }
      if ($s) { $cpuTemp = ($s | Measure-Object Value -Maximum).Maximum }
    }
  }
  if ($null -eq $cpuTemp) {
    $tz = Get-CimInstance Win32_PerfFormattedData_Counters_ThermalZoneInformation
    if ($tz) { $c = ($tz | ForEach-Object { $_.Temperature - 273.15 } | Where-Object { $_ -ge 25 -and $_ -le 125 } | Measure-Object -Maximum).Maximum; if ($c) { $cpuTemp = $c } }
  }
  @{ gpu = $gpu; gpuTemp = $gpuTemp; cpuTemp = $cpuTemp } | ConvertTo-Json -Compress
  Start-Sleep -Seconds ${GPU_POLL_SECONDS}
}
`;

let child = null;
let buffer = '';
let latestHw = { gpu: null, gpuTemp: null, cpuTemp: null };
let lastCpuTimes = null;

function readCpuTimes() {
  let idle = 0, total = 0;
  for (const c of os.cpus()) {
    for (const k of Object.keys(c.times)) total += c.times[k];
    idle += c.times.idle;
  }
  return { idle, total };
}

function startHardwarePoller() {
  if (child || process.platform !== 'win32') return;
  try {
    child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', POWERSHELL_LOOP], { windowsHide: true });
  } catch (e) { child = null; return; }
  child.stdout.on('data', (chunk) => {
    buffer += chunk.toString();
    let nl;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      try {
        const d = JSON.parse(line);
        latestHw = { gpu: d.gpu ?? null, gpuTemp: d.gpuTemp ?? null, cpuTemp: d.cpuTemp ?? null };
      } catch (e) { /* línea parcial o ruido de PowerShell */ }
    }
  });
  child.stderr.on('data', () => {});
  child.on('error', () => { child = null; });
  child.on('exit', () => { child = null; });
}

function stopHardwarePoller() {
  if (child) { try { child.kill(); } catch (e) {} child = null; }
}

// Devuelve porcentajes (0-100) y temperaturas en °C; null cuando el dato no está disponible.
function getSystemStats() {
  startHardwarePoller();

  const now = readCpuTimes();
  let cpu = null;
  if (lastCpuTimes) {
    const dTotal = now.total - lastCpuTimes.total;
    const dIdle = now.idle - lastCpuTimes.idle;
    if (dTotal > 0) cpu = Math.max(0, Math.min(100, (1 - dIdle / dTotal) * 100));
  }
  lastCpuTimes = now;

  const totalMem = os.totalmem();
  const usedMem = totalMem - os.freemem();

  return {
    cpu,
    ram: (usedMem / totalMem) * 100,
    ramUsedGb: usedMem / 1024 ** 3,
    ramTotalGb: totalMem / 1024 ** 3,
    gpu: latestHw.gpu === null ? null : Math.max(0, Math.min(100, latestHw.gpu)),
    cpuTemp: latestHw.cpuTemp,
    gpuTemp: latestHw.gpuTemp,
  };
}

module.exports = { getSystemStats, stopHardwarePoller };
