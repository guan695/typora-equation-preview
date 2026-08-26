param(
  [ValidateSet('Install', 'Uninstall', 'RestoreLegacy')]
  [string]$Action = 'Install',
  [string]$TyporaRoot = 'C:\Program Files\Typora'
)

$ErrorActionPreference = 'Stop'

$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  $arguments = @(
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$PSCommandPath`"",
    '-Action', $Action, '-TyporaRoot', "`"$TyporaRoot`""
  )
  Start-Process -FilePath 'powershell.exe' -Verb RunAs -ArgumentList $arguments -Wait
  exit $LASTEXITCODE
}

$resources = Join-Path $TyporaRoot 'resources'
$windowHtml = Join-Path $resources 'window.html'
$sourceScript = Join-Path $PSScriptRoot 'heading-demoter.js'
$installedScript = Join-Path $resources 'heading-demoter.js'
$frameTag = '<script src="./appsrc/window/frame.js" defer="defer"></script>'
$legacyTag = '<script src="./plugin/index.js" defer="defer"></script>'
$demoterTag = '<script src="./heading-demoter.js" defer="defer"></script>'

if (!(Test-Path -LiteralPath (Join-Path $TyporaRoot 'Typora.exe') -PathType Leaf)) { throw "Typora.exe not found in $TyporaRoot" }
if (!(Test-Path -LiteralPath $windowHtml -PathType Leaf)) { throw "window.html not found in $resources" }
if (@(Get-Process -Name 'Typora' -ErrorAction SilentlyContinue).Count) { throw 'Save your documents and fully exit Typora first.' }

$content = [IO.File]::ReadAllText($windowHtml, [Text.Encoding]::UTF8)
$backup = "$windowHtml.heading-demoter.$(Get-Date -Format 'yyyyMMdd-HHmmss').bak"
Copy-Item -LiteralPath $windowHtml -Destination $backup
$utf8NoBom = New-Object Text.UTF8Encoding($false)

if ($Action -eq 'Install') {
  if (!(Test-Path -LiteralPath $sourceScript -PathType Leaf)) { throw "Missing $sourceScript" }
  if (!$content.Contains($frameTag)) { throw 'Typora frame script tag was not found.' }
  Copy-Item -LiteralPath $sourceScript -Destination $installedScript -Force
  $content = $content.Replace($legacyTag, '').Replace($demoterTag, '')
  $content = $content.Replace($frameTag, $frameTag + $demoterTag)
  [IO.File]::WriteAllText($windowHtml, $content, $utf8NoBom)
  Write-Host "Installed: $installedScript" -ForegroundColor Green
  Write-Host 'The full typora_plugin injection is disabled; its files were kept.'
} elseif ($Action -eq 'RestoreLegacy') {
  $content = $content.Replace($demoterTag, '').Replace($legacyTag, '')
  if (Test-Path -LiteralPath (Join-Path $resources 'plugin\index.js')) {
    $content = $content.Replace($frameTag, $frameTag + $legacyTag)
  }
  [IO.File]::WriteAllText($windowHtml, $content, $utf8NoBom)
  if (Test-Path -LiteralPath $installedScript) { Remove-Item -LiteralPath $installedScript -Force }
  Write-Host 'Restored the previous typora_plugin injection.' -ForegroundColor Green
} else {
  $content = $content.Replace($demoterTag, '')
  [IO.File]::WriteAllText($windowHtml, $content, $utf8NoBom)
  if (Test-Path -LiteralPath $installedScript) { Remove-Item -LiteralPath $installedScript -Force }
  Write-Host 'Heading Demoter was uninstalled.' -ForegroundColor Green
}

Write-Host "Backup: $backup"
