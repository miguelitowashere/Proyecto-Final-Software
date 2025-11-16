import axios from 'axios';

// Obtiene la URL base del archivo .env
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

console.log("🌐 API Base URL:", API_BASE_URL);

// Crea una instancia de Axios con la URL base
const inventarioApi = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    }
});

// Interceptor para inyectar el JWT en cada petición
inventarioApi.interceptors.request.use(
    config => {
        // Obtenemos el token de acceso del almacenamiento local
        const token = localStorage.getItem('access_token');
        
        console.log("🔑 Token encontrado:", token ? "✅ Sí" : "❌ No");
        
        // Si el token existe, lo añadimos al header 'Authorization'
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            console.log("✅ Token inyectado en header Authorization");
        }
        
        return config;
    }, 
    error => {
        console.error("❌ Error en interceptor de request:", error);
        return Promise.reject(error);
    }
);

// Interceptor para manejar errores 401 (token expirado)
inventarioApi.interceptors.response.use(
    response => response,
    async error => {
        const originalRequest = error.config;

        // Si es 401 y no hemos intentado refrescar aún
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            
            try {
                const refreshToken = localStorage.getItem('refresh_token');
                
                if (!refreshToken) {
                    console.log("❌ No hay refresh token, redirigiendo a login");
                    localStorage.removeItem('access_token');
                    window.location.href = '/login';
                    return Promise.reject(error);
                }

                console.log("🔄 Intentando refrescar token...");
                
                const response = await axios.post(
                    `${API_BASE_URL}/token/refresh/`,
                    { refresh: refreshToken }
                );

                const { access } = response.data;
                localStorage.setItem('access_token', access);
                
                console.log("✅ Token refrescado exitosamente");
                
                // Reintentar la petición original con el nuevo token
                originalRequest.headers.Authorization = `Bearer ${access}`;
                return inventarioApi(originalRequest);
                
            } catch (refreshError) {
                console.error("❌ Error refrescando token:", refreshError);
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default inventarioApi;