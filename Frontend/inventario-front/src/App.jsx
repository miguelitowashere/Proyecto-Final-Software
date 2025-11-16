import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import MenuLateral from "./layouts/MenuLateral";
import ClientesPage from "./pages/ClientesPage";

// Componente para proteger las rutas
const PrivateRoute = ({ children }) => {
    const { user, isLoading } = useAuth();
    
    if (isLoading) {
        return <div className="text-center p-8">Cargando...</div>; 
    }
    
    return user ? children : <Navigate to="/login" />;
};

function App() {
    return (
        <Routes>
            {/* Login */}
            <Route path="/login" element={<LoginPage />} />

            {/* Layout protegido con menú lateral */}
            <Route 
                path="/" 
                element={
                    <PrivateRoute>
                        <MenuLateral />
                    </PrivateRoute>
                }
            >
                {/* Rutas anidadas dentro del layout */}
                <Route path="clientes" element={<ClientesPage />} />
                <Route path="empleados" element={<div>Empleados funcionando ✔</div>} />
                <Route path="productos" element={<div>Productos ✔</div>} />
                <Route path="ventas" element={<div>Ventas ✔</div>} />
                <Route path="reportes" element={<div>Reportes ✔</div>} />
            </Route>

            {/* Catch-all - redirige a home */}
            <Route path="*" element={<Navigate to="/" />} />
        </Routes>
    );
}

export default App;