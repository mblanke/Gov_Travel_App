$ErrorActionPreference = "SilentlyContinue"
Write-Host "== DoD Gate =="

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Has-Command($name) {
  return $null -ne (Get-Command $name -ErrorAction SilentlyContinue)
}

$hasNode = Test-Path ".\package.json"
$hasPy = (Test-Path ".\pyproject.toml") -or (Test-Path ".\requirements.txt") -or (Test-Path ".\requirements-dev.txt")

if ($hasNode) {
  if (-not (Has-Command "npm")) { Write-Host "DoD FAIL: npm not found"; exit 1 }
  Write-Host "+ npm ci"; npm ci 2>$null | Out-Host
  if ($LASTEXITCODE -ne 0) { Write-Host "DoD FAIL: npm ci failed"; exit 1 }
  $pkg = Get-Content ".\package.json" | ConvertFrom-Json
  if ($pkg.scripts.lint) {
    Write-Host "+ npm run lint"; npm run lint 2>&1 | Out-Host
    if ($LASTEXITCODE -ne 0) { Write-Host "DoD FAIL: lint failed"; exit 1 }
  }
  if ($pkg.scripts.typecheck) {
    Write-Host "+ npm run typecheck"; npm run typecheck 2>&1 | Out-Host
    if ($LASTEXITCODE -ne 0) { Write-Host "DoD FAIL: typecheck failed"; exit 1 }
  }
  if ($pkg.scripts.test) {
    Write-Host "+ npm test"; npm test 2>&1 | Out-Host
    if ($LASTEXITCODE -ne 0) { Write-Host "DoD FAIL: tests failed"; exit 1 }
  }
  if ($pkg.scripts.build) {
    Write-Host "+ npm run build"; npm run build 2>&1 | Out-Host
    if ($LASTEXITCODE -ne 0) { Write-Host "DoD FAIL: build failed"; exit 1 }
  }
}

if ($hasPy) {
  if (-not (Has-Command "python")) { Write-Host "DoD FAIL: python not found"; exit 1 }
  Write-Host "+ python -m pip install -U pip"; python -m pip install -U pip 2>$null | Out-Host
  if (Test-Path ".\requirements.txt") {
    Write-Host "+ pip install -r requirements.txt"; pip install -r requirements.txt 2>$null | Out-Host
  }
  if (Test-Path ".\requirements-dev.txt") {
    Write-Host "+ pip install -r requirements-dev.txt"; pip install -r requirements-dev.txt 2>$null | Out-Host
  }
  if (Has-Command "ruff") {
    Write-Host "+ ruff check ."; ruff check . 2>&1 | Out-Host
    Write-Host "+ ruff format --check ."; ruff format --check . 2>&1 | Out-Host
  }
  if (Has-Command "pytest") {
    Write-Host "+ pytest -q"; pytest -q 2>&1 | Out-Host
  }
}

if (-not $hasNode -and -not $hasPy) {
  Write-Host "No package.json or Python dependency files detected."
  Write-Host "Customize scripts\dod.ps1 for this repo stack."
}

Write-Host "DoD PASS"
exit 0
