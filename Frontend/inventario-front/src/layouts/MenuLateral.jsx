import React from "react";
import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";


export default function MenuLateral() {
  const { user, logout } = useAuth();
  
  const nombre = user
    ? `${user.first_name || "Usuario"} ${user.last_name || ""}`
    : "Usuario";

  const fecha = new Date().toLocaleDateString("es-ES");
  const hora = new Date().toLocaleTimeString("es-ES");

  const handleLogout = () => {
    if (window.confirm("¿Estás seguro de que deseas cerrar sesión?")) {
      logout();
    }
  };

  return (
    <div className="menu-container">

      {/* Sidebar */}
      <div className="sidebar">
        <div className="perfil">
          <div className="avatar">🐱</div>
          <h3>¡Hola!</h3>
          <p className="nombre">{nombre}</p>
          <span className="rol">Administrador(a)</span>
        </div>

        <nav className="menu-opciones">
          <Link to="clientes" className="opcion">👤 Clientes</Link>
          <Link to="empleados" className="opcion">🧑‍💼 Empleados</Link>
          <Link to="productos" className="opcion">🛒 Productos</Link>
          <Link to="ventas" className="opcion">💵 Ventas</Link>
          <Link to="reportes" className="opcion">📊 Reporte Ventas</Link>
        </nav>

        {/* Botón de logout */}
        <button className="btn-logout-sidebar" onClick={handleLogout}>
          🚪 Cerrar Sesión
        </button>
      </div>

      {/* CONTENIDO (CON OUTLET) */}
      <div className="contenido">
        <header className="topbar">
          <div className="top-left">
            <h1 className="brand">ANIMALPRINT PETSTYLE 🐾</h1>
          </div>
          <div className="top-right">
            <p>{fecha}</p>
            <p>{hora}</p>
            <span className="admin-tag">ADMIN</span>
          </div>
        </header>

        <main className="contenido-principal">
          <Outlet />  
        </main>
      </div>
    </div>
  );
}