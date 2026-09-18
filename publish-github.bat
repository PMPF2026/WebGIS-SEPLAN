@echo off
chcp 65001 > nul
title Publicar WebGIS SEPLAN no GitHub

echo.
echo =========================================================
echo  WEBGIS SEPLAN PASSO FUNDO - Publicar no GitHub
echo =========================================================
echo.

REM Verificar se Git esta instalado
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Git nao esta instalado!
    echo.
    echo Instale o Git em: https://git-scm.com/download/win
    echo.
    echo Ou use o GitHub Desktop: https://desktop.github.com/
    echo.
    pause
    start https://git-scm.com/download/win
    exit /b 1
)

echo [OK] Git detectado.
echo.

REM Verificar se ja existe um repositorio Git
if exist ".git" (
    echo [INFO] Repositorio Git ja inicializado. Atualizando...
    git add .
    git commit -m "update: Atualizacao do WebGIS SEPLAN Passo Fundo"
    git push
) else (
    echo [INFO] Configurando repositorio Git...
    git init
    git remote add origin https://github.com/PMPF2026/WebGIS-SEPLAN.git

    git add .
    git commit -m "feat: Publicacao inicial do WebGIS SEPLAN Passo Fundo"
    git branch -M main
    git push -u origin main
)

echo.
echo =========================================================
echo  SUCESSO! Acesse:
echo  https://github.com/PMPF2026/WebGIS-SEPLAN
echo =========================================================
echo.
pause
