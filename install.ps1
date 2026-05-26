$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path

function Find-Npm {
    $candidate = Get-Command npm -ErrorAction SilentlyContinue
    if ($candidate) {
        return $candidate.Source
    }

    throw "Node.js and npm are required. Install Node.js 20 or newer, then run this installer again."
}

$Npm = Find-Npm

Push-Location $RootDir
try {
    if (Test-Path "package-lock.json") {
        & $Npm ci
    } else {
        & $Npm install
    }

    & $Npm run build
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "Mianotes dashboard installed."
Write-Host "Built files are available in:"
Write-Host "  dist/"
