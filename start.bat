@echo off
title WebGIS SEPLAN Passo Fundo
echo =========================================================
echo  INICIANDO WEBGIS SEPLAN PASSO FUNDO / RS
echo =========================================================
powershell -ExecutionPolicy Bypass -File "%~dp0server.ps1"
pause
