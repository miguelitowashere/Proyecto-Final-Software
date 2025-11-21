# Proyecto Final - Animal Print

Este repo incluye el backend en **Django** y el frontend en **React (Vite)** para administrar inventario, ventas y reportes de Animal Print.

## Despliegue sin terminal

1. Instala [Docker Desktop](https://www.docker.com/products/docker-desktop).
2. Clona este repositorio o descarga el ZIP y descomprímelo.
3. *(Opcional)* Si quieres personalizar variables, copia los archivos `.env` desde los ejemplos:
   ```bash
   cp Backend/.env.example Backend/.env
   cp Frontend/inventario-front/.env.example Frontend/inventario-front/.env
   ```
   > Si no los copias, `start-app.bat` lo hará automáticamente con los valores por defecto.
4. En Windows basta con **doble clic en `start-app.bat`**. El script levanta los contenedores y abre `http://localhost:8080`.
   - Si prefieres usar la terminal: `docker compose up -d`.
5. Para detener todo usa `stop-app.bat` o `docker compose down`.

### Servicios

| Servicio | URL | Descripción |
|----------|-----|-------------|
| Frontend | http://localhost:8080 | Panel web |
| Backend API | http://localhost:8000/api/ | Endpoints Django REST |

## Desarrollo local tradicional

Si deseas ejecutar cada proyecto manualmente:

### Backend
```bash
cd Backend
python -m venv .venv
.\\.venv\\Scripts\\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Frontend
```bash
cd Frontend/inventario-front
npm install
npm run dev
```

## Variables de entorno relevantes

| Variable | Ubicación | Descripción |
|----------|-----------|-------------|
| `DJANGO_SECRET_KEY` | `Backend/.env` | Clave usada por Django y JWT. |
| `DJANGO_ALLOWED_HOSTS` | `Backend/.env` | Hosts permitidos, separados por coma. |
| `DJANGO_CORS_ALLOWED_ORIGINS` | `Backend/.env` | Orígenes que pueden consumir la API. |
| `VITE_API_BASE_URL` | `Frontend/inventario-front/.env` | URL base del backend para el frontend. |

Con estos archivos cualquier persona puede clonar el repo, hacer doble clic en `start-app.bat` y usar la aplicación sin tocar la terminal.
