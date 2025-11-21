@echo off
cd /d %~dp0

if not exist Backend\.env (
    echo Creando Backend\.env desde el ejemplo...
    copy Backend\.env.example Backend\.env >NUL
)

if not exist Frontend\inventario-front\.env (
    echo Creando Frontend\inventario-front\.env desde el ejemplo...
    copy Frontend\inventario-front\.env.example Frontend\inventario-front\.env >NUL
)

docker compose up -d --build
start http://localhost:8080
echo Aplicacion desplegada. Usa stop-app.bat para detenerla.
