# Script para iniciar o servidor de desenvolvimento Next.js
Write-Host "Iniciando servidor de desenvolvimento..." -ForegroundColor Green

# Verifica se o pnpm está instalado
if (Get-Command pnpm -ErrorAction SilentlyContinue) {
    Write-Host "Usando pnpm..." -ForegroundColor Cyan
    pnpm dev
} elseif (Get-Command npm -ErrorAction SilentlyContinue) {
    Write-Host "Usando npm..." -ForegroundColor Cyan
    npm run dev
} else {
    Write-Host "Erro: pnpm ou npm não encontrado!" -ForegroundColor Red
    exit 1
}





