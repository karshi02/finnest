# FitTrack Pro launcher (Windows PowerShell 5.1+, no Git/Python needed)
#   Download + run:  irm https://raw.githubusercontent.com/karshi02/fitt/main/run.ps1 | iex
#   Inside the repo: powershell -ExecutionPolicy Bypass -File run.ps1
# Serves the app on http://localhost:8080 and opens the browser.
# Keep this file ASCII-only: a BOM or non-ASCII text breaks "irm | iex" on PowerShell 5.1.

$ErrorActionPreference = 'Stop'
$Repo   = 'karshi02/fitt'
$Branch = 'main'
# Fixed port: browser data (localStorage) belongs to http://localhost:8080,
# a different port would look like an empty app.
$Port   = 8080
$Url    = "http://localhost:$Port/"

function Test-FitTrackRunning {
  try {
    $r = Invoke-WebRequest -Uri ($Url + 'manifest.json') -UseBasicParsing -TimeoutSec 2
    return $r.Content -match 'FitTrack'
  } catch { return $false }
}

function Get-AppRoot {
  # Run from inside the repo (start.bat / -File): serve the local copy
  if ($PSScriptRoot -and (Test-Path (Join-Path $PSScriptRoot 'index.html'))) { return $PSScriptRoot }

  # Run via "irm | iex": download the latest version from GitHub
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  $base = Join-Path $env:LOCALAPPDATA 'FitTrack'
  $zip  = Join-Path $env:TEMP 'fittrack-download.zip'
  Write-Host 'Downloading FitTrack...' -ForegroundColor Cyan
  $ProgressPreference = 'SilentlyContinue'
  Invoke-WebRequest -Uri "https://github.com/$Repo/archive/refs/heads/$Branch.zip" -OutFile $zip -UseBasicParsing
  # Only app files live here; workout data stays in the browser
  if (Test-Path $base) { Remove-Item $base -Recurse -Force }
  Expand-Archive -Path $zip -DestinationPath $base -Force
  Remove-Item $zip -Force
  return (Get-ChildItem $base -Directory | Select-Object -First 1).FullName
}

if (Test-FitTrackRunning) {
  Write-Host "FitTrack is already running: $Url" -ForegroundColor Green
  Start-Process $Url
  return
}

$root = [IO.Path]::GetFullPath((Get-AppRoot)).TrimEnd('\') + '\'

$types = @{
  '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8';  '.json' = 'application/json; charset=utf-8'
  '.png'  = 'image/png'; '.svg' = 'image/svg+xml'; '.ico' = 'image/x-icon'
  '.md'   = 'text/plain; charset=utf-8'
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($Url)
try {
  $listener.Start()
} catch {
  Write-Host "Port $Port is used by another program. Close it and run again." -ForegroundColor Red
  return
}

Write-Host ''
Write-Host "FitTrack is running: $Url" -ForegroundColor Green
Write-Host 'Keep this window open while using the app. Press Ctrl+C to stop.'
Start-Process $Url

try {
  while ($listener.IsListening) {
    # Async wait so Ctrl+C can stop the loop
    $task = $listener.GetContextAsync()
    while (-not $task.AsyncWaitHandle.WaitOne(250)) { }
    $ctx = $task.GetAwaiter().GetResult()
    $res = $ctx.Response
    try {
      $rel = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
      if (-not $rel) { $rel = 'index.html' }
      $file = [IO.Path]::GetFullPath((Join-Path $root $rel))
      # Block path traversal outside the app folder
      if ($file.StartsWith($root, [StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $file -PathType Leaf)) {
        $bytes = [IO.File]::ReadAllBytes($file)
        $type = $types[[IO.Path]::GetExtension($file).ToLowerInvariant()]
        if (-not $type) { $type = 'application/octet-stream' }
        $res.ContentType = $type
        $res.Headers['Cache-Control'] = 'no-cache'
        $res.ContentLength64 = $bytes.Length
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
      } else {
        $res.StatusCode = 404
      }
    } catch {
      $res.StatusCode = 500
    } finally {
      $res.Close()
    }
  }
} finally {
  $listener.Stop()
  $listener.Close()
  Write-Host 'FitTrack stopped.'
}
