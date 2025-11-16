import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import MenuLateral from "./layouts/MenuLateral";
import ClientesPage from "./pages/ClientesPage";
import EmpleadosPage from './pages/EmpleadosPage';

// Componente para proteger las rutas
const PrivateRoute = ({ children }) => {
    const { user, isLoading } = useAuth();
    
    if (isLoading) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <p>Cargando...</p>
        </div>; 
    }
    
    return user ? children : <Navigate to="/login" />;
};

function App() {
    return (
        <Routes>
            {/* Login - sin protección */}
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
                <Route index element={<div style={{ padding: '20px' }}><h2>Panel Principal</h2><p>Bienvenido a ANIMALPRINT PETSTYLE</p></div>} />
                <Route path="clientes" element={<ClientesPage />} />
                <Route path="empleados" element={<EmpleadosPage />} />
                <Route path="productos" element={<div style={{ padding: '20px' }}><h2>Productos</h2><p>Productos ✔</p></div>} />
                <Route path="ventas" element={<div style={{ padding: '20px' }}><h2>Ventas</h2><p>Ventas ✔</p></div>} />
                <Route path="reportes" element={<div style={{ padding: '20px' }}><h2>Reporte Ventas</h2><p>Reportes ✔</p></div>} />
            </Route>

            {/* Catch-all - redirige a home */}
            <Route path="*" element={<Navigate to="/" />} />
        </Routes>
    );
}

export default App;