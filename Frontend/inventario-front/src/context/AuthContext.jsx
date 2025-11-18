import { createContext, useContext, useState, useEffect } from 'react';
import inventarioApi from "../api/inventarioApi";
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // 1. Cargar el usuario al iniciar la app (si ya hay un token)
    useEffect(() => {
        const token = localStorage.getItem('access_token');
        const isAdminStored = localStorage.getItem('is_admin');

        if (token) {
            try {
                const decodedUser = jwtDecode(token);
                console.log("✅ Token decodificado al iniciar:", decodedUser);
                setUser(decodedUser);
                setIsAdmin(isAdminStored === 'true');
            } catch (error) {
                console.error("❌ Token inválido o expirado al inicio:", error);
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                localStorage.removeItem('is_admin');
            }
        }

        setIsLoading(false);
    }, []);

    // 2. Función de LOGIN
    const login = async (username, password) => {
        try {
            console.log("🔐 Intentando login con:", username);

            // Usamos la instancia configurada con .env
            const response = await inventarioApi.post('/token/', {
                username,
                password,
            });

            const { access, refresh } = response.data;

            console.log("✅ Login exitoso");
            console.log("Token de acceso:", access.substring(0, 20) + "...");

            // Guardar tokens
            localStorage.setItem('access_token', access);
            localStorage.setItem('refresh_token', refresh);

            // Decodificar usuario
            const decodedUser = jwtDecode(access);
            console.log("👤 Usuario decodificado:", decodedUser);

            // Saber si es admin
            const adminStatus = decodedUser.is_staff === true;
            console.log("👨‍💼 ¿Es Admin?:", adminStatus);
            console.log("is_staff en token:", decodedUser.is_staff);

            localStorage.setItem('is_admin', adminStatus ? 'true' : 'false');

            setUser(decodedUser);
            setIsAdmin(adminStatus);

            // Pequeño delay
            await new Promise(resolve => setTimeout(resolve, 100));

            // Ir al panel principal
            navigate("/");

            return true;
        } catch (error) {
            console.error("❌ Error en login:", error.response?.data || error.message);
            return false;
        }
    };

    // 3. Función de LOGOUT
    const logout = () => {
        console.log("🚪 Cerrando sesión...");
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('is_admin');
        setUser(null);
        setIsAdmin(false);
        navigate('/login');
    };

    const contextData = {
        user,
        isAdmin,
        isLoading,
        login,
        logout,
    };

    return (
        <AuthContext.Provider value={contextData}>
            {children}
        </AuthContext.Provider>
    );
};

// Hook personalizado para usar el contexto fácilmente
export const useAuth = () => useContext(AuthContext);