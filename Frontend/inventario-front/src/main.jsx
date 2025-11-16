import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css'; // Asegúrate de que este archivo existe e importa Tailwind
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        {/* Usamos BrowserRouter para el manejo de rutas */}
        <BrowserRouter>
            {/* 🌟 Usamos AuthProvider para que toda la app acceda al estado de usuario 🌟 */}
            <AuthProvider> 
                <App />
            </AuthProvider>
        </BrowserRouter>
    </React.StrictMode>,
);