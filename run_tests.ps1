param(
    [switch]$Coverage,
    [switch]$SonarQube,
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"
$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AeroRutas - Test Suite Runner" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$exitCode = 0

function Run-Tests {
    param($ServiceName, $ServicePath)

    Write-Host "----------------------------------------" -ForegroundColor Yellow
    Write-Host "  Testing: $ServiceName" -ForegroundColor Yellow
    Write-Host "----------------------------------------" -ForegroundColor Yellow

    Set-Location -LiteralPath $ServicePath

    if ($Coverage) {
        $cmd = "pytest --cov=$ServiceName --cov-report=term --cov-report=xml --cov-report=html --junitxml=test-results.xml -v"
    } elseif ($Verbose) {
        $cmd = "pytest -v"
    } else {
        $cmd = "pytest"
    }

    Write-Host "Running: $cmd" -ForegroundColor Gray
    Invoke-Expression $cmd

    if ($LASTEXITCODE -ne 0) {
        Write-Host "FAILED: $ServiceName (exit code: $LASTEXITCODE)" -ForegroundColor Red
        $script:exitCode = $LASTEXITCODE
    } else {
        Write-Host "PASSED: $ServiceName" -ForegroundColor Green
    }
    Write-Host ""
}

Run-Tests "airport_service" (Join-Path $ROOT "airport_service")
Run-Tests "itinerary_service" (Join-Path $ROOT "itinerary_service")

Set-Location -LiteralPath $ROOT

if ($SonarQube -and $Coverage) {
    Write-Host "----------------------------------------" -ForegroundColor Yellow
    Write-Host "  Merging coverage reports..." -ForegroundColor Yellow
    Write-Host "----------------------------------------" -ForegroundColor Yellow
    if (Get-Command "coverage" -ErrorAction SilentlyContinue) {
        coverage combine airport_service/.coverage itinerary_service/.coverage
        coverage xml -o coverage.xml
        Write-Host "Merged coverage -> coverage.xml" -ForegroundColor Green
    } else {
        Write-Host "coverage tool not found, skipping merge" -ForegroundColor DarkYellow
    }
}

Write-Host "========================================" -ForegroundColor Cyan
if ($exitCode -eq 0) {
    Write-Host "  ALL TESTS PASSED" -ForegroundColor Green
} else {
    Write-Host "  SOME TESTS FAILED (exit code: $exitCode)" -ForegroundColor Red
}
Write-Host "========================================" -ForegroundColor Cyan

exit $exitCode
