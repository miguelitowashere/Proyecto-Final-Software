import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import inventarioApi from "../api/inventarioApi";
import "./clientes.css";

export default function ClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Cargar clientes desde el backend
  const cargarClientes = async () => {
    try {
      setError(null);
      setLoading(true);
      console.log("Intentando cargar clientes...");
      
      const res = await inventarioApi.get("/clientes/");
      console.log("Respuesta del servidor:", res.data);
      console.log("Tipo de datos:", typeof res.data);
      console.log("Es array:", Array.isArray(res.data));
      
      // Asegúrate de que res.data sea un array
      const clientesData = Array.isArray(res.data) ? res.data : [];
      console.log("Clientes a mostrar:", clientesData);
      
      setClientes(clientesData);
    } catch (err) {
      console.error("Error completo:", err);
      console.error("Respuesta del error:", err.response?.data);
      console.error("Status:", err.response?.status);
      
      const mensajeError = err.response?.data?.detail || "Error cargando clientes";
      setError(mensajeError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarClientes();
  }, []);

  const handleAgregar = () => {
    navigate("/clientes/nuevo");
  };

  const handleEditar = (id) => {
    navigate(`/clientes/editar/${id}`);
  };

  const handleEliminar = async (id) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar este cliente?")) {
      try {
        await inventarioApi.delete(`/clientes/${id}/`);
        // Recarga la lista
        cargarClientes();
      } catch (err) {
        console.error("Error al eliminar:", err);
        setError("Error eliminando cliente");
      }
    }
  };

  return (
    <div className="clientes-container">
      <h1 className="titulo">Clientes</h1>

      {loading && <p className="cargando">Cargando clientes...</p>}
      {error && <p className="error">❌ {error}</p>}

      {/* Botón para agregar */}
      <div className="acciones-superiores">
        <button className="btn-agregar" onClick={handleAgregar}>
          ➕ Agregar Cliente
        </button>
      </div>

      {/* Tabla */}
      {!loading && clientes.length > 0 && (
        <table className="tabla-clientes">
          <thead>
            <tr>
              <th>#</th>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Teléfono</th>
              <th>Correo</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {clientes.map((c, idx) => (
              <tr key={c.id}>
                <td>{idx + 1}</td>
                <td>{c.nombre}</td>
                <td>{c.tipo_cliente || "—"}</td>
                <td>{c.telefono || "—"}</td>
                <td>{c.correo || "—"}</td>
                <td className="acciones">
                  <button 
                    className="btn-editar" 
                    onClick={() => handleEditar(c.id)}
                    title="Editar cliente"
                  >
                    ✏️
                  </button>
                  <button 
                    className="btn-borrar" 
                    onClick={() => handleEliminar(c.id)}
                    title="Eliminar cliente"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!loading && clientes.length === 0 && !error && (
        <p className="sin-datos">No hay clientes registrados. ¡Crea uno nuevo!</p>
      )}
    </div>
  );
}