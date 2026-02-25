# Installa dipendenze Flutter (pub get).
# Se Flutter e gia nel PATH: esegue solo "flutter pub get".
# Altrimenti prova a usare flutter_sdk\bin\flutter.bat se presente (dopo installazione manuale).

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$flutterCmd = $null
if (Get-Command flutter -ErrorAction SilentlyContinue) {
    $flutterCmd = "flutter"
}
if (-not $flutterCmd -and (Test-Path "flutter_sdk\bin\flutter.bat")) {
    $flutterCmd = ".\flutter_sdk\bin\flutter.bat"
}

if ($flutterCmd) {
    Write-Host "Esecuzione: $flutterCmd pub get"
    Invoke-Expression "$flutterCmd pub get"
    Write-Host "Fatto."
} else {
    Write-Host "Flutter non trovato. Installalo da: https://docs.flutter.dev/get-started/install/windows"
    Write-Host "Poi in questa cartella esegui: flutter pub get"
    exit 1
}
