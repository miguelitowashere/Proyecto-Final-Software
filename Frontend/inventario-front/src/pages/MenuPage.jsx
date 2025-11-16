import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./menu.css";

const MenuPage = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    if (window.confirm("¿Estás seguro de que deseas cerrar sesión?")) {
      logout();
    }
  };

  const nombre = user
    ? `${user.first_name || "Usuario"} ${user.last_name || ""}`
    : "Usuario";

  return (
    <div className="menu-container">
      {/* Sidebar */}
      <aside className="sidebar">
        {/* Perfil del usuario */}
        <div className="perfil-section">
          <div className="avatar">🐱</div>
          <h3>¡Hola!</h3>
          <p className="nombre">{nombre}</p>
          <span className="rol">Administrador(a)</span>
        </div>

        {/* Menú de opciones */}
        <nav className="menu-opciones">
          <Link to="/clientes" className="opcion">
            👤 Clientes
          </Link>
          <Link to="/empleados" className="opcion">
            👧‍💼 Empleados
          </Link>
          <Link to="/productos" className="opcion">
            🛍 Productos
          </Link>
          <Link to="/ventas" className="opcion">
            💵 Ventas
          </Link>
          <Link to="/reportes" className="opcion">
            📊 Reporte Ventas
          </Link>
        </nav>

        {/* Botón de logout */}
        <button className="btn-logout" onClick={handleLogout}>
          🚪 Cerrar Sesión
        </button>
      </aside>

      {/* Contenido principal */}
      <main className="contenido">
        <div className="header-content">
          <h1>ANIMALPRINT PETSTYLE 🐾</h1>
          <p className="info-date">
            {new Date().toLocaleDateString("es-ES")} - {new Date().toLocaleTimeString("es-ES")}
          </p>
          <p className="info-role">ADMIN</p>
        </div>

        <div className="panel-content">
          <h2>Panel Principal</h2>
          <p>Bienvenido a ANIMALPRINT PETSTYLE</p>
          <p>Selecciona una opción del menú para comenzar.</p>
        </div>
      </main>
    </div>
  );
};

export default MenuPage;