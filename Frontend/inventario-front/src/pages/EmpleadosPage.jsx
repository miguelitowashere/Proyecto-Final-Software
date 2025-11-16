import React, { useEffect, useState } from "react";
import inventarioApi from "../api/inventarioApi";
import AgregarEmpleadoModal from "../components/AgregarEmpleadoModal";
import "./empleados.css";

export default function EmpleadosPage() {
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalEditOpen, setModalEditOpen] = useState(false);
  const [empleadoEditando, setEmpleadoEditando] = useState(null);
  const [formEditData, setFormEditData] = useState({
    user: { first_name: "", last_name: "" },
    telefono: "",
    is_staff: false,
    activo: true,  // ✅ NUEVO
  });
  const [loadingEdit, setLoadingEdit] = useState(false);

  // Cargar empleados desde el backend
  const cargarEmpleados = async () => {
    try {
      setError(null);
      setLoading(true);
      console.log("Intentando cargar empleados...");
      
      // ✅ CAMBIO: Agregar ?activo= para obtener todos (activos e inactivos)
      const res = await inventarioApi.get("/empleados/?activo=");
      console.log("Respuesta completa del servidor:", res.data);
      
      let empleadosData = [];
      
      if (res.data.results) {
        empleadosData = res.data.results;
      } else if (Array.isArray(res.data)) {
        empleadosData = res.data;
      }
      
      setEmpleados(empleadosData);
    } catch (err) {
      console.error("Error:", err);
      const mensajeError = err.response?.data?.detail || "Error cargando empleados";
      setError(mensajeError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarEmpleados();
  }, []);

  const handleAgregar = () => {
    setModalOpen(true);
  };

  const handleEditar = (empleado) => {
    console.log("Editar empleado:", empleado.id);
    setEmpleadoEditando(empleado);
    setFormEditData({
      user: {
        first_name: empleado.user.first_name,
        last_name: empleado.user.last_name,
      },
      telefono: empleado.telefono || "",
      is_staff: empleado.user.is_staff,
      activo: empleado.activo,  // ✅ NUEVO
    });
    setModalEditOpen(true);
  };

  const handleChangeEdit = (e) => {
    const { name, value } = e.target;
    
    console.log(`Cambiando ${name} a ${value}`);  // ✅ DEBUG
    
    if (name.startsWith("user_")) {
      const fieldName = name.replace("user_", "");
      console.log(`Actualizando user.${fieldName}`);  // ✅ DEBUG
      setFormEditData(prev => ({
        ...prev,
        user: {
          ...prev.user,
          [fieldName]: value
        }
      }));
    } else {
      setFormEditData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    setLoadingEdit(true);

    try {
      const response = await inventarioApi.put(`/empleados/${empleadoEditando.id}/`, formEditData);
      console.log("✅ Empleado actualizado:", response.data);
      
      cargarEmpleados();
      setModalEditOpen(false);
    } catch (err) {
      console.error("❌ Error actualizando:", err.response?.data);
      setError(err.response?.data?.detail || "Error actualizando empleado");
    } finally {
      setLoadingEdit(false);
    }
  };

  const handleEliminar = async (id) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar este empleado?")) {
      try {
        await inventarioApi.delete(`/empleados/${id}/`);
        cargarEmpleados();
      } catch (err) {
        console.error("Error al eliminar:", err);
        setError("Error eliminando empleado");
      }
    }
  };

  return (
    <div className="empleados-container">
      <h1 className="titulo">Empleados</h1>

      {loading && <p className="cargando">Cargando empleados...</p>}
      {error && <p className="error">❌ {error}</p>}

      {/* Botón para agregar */}
      <div className="acciones-superiores">
        <button className="btn-agregar" onClick={handleAgregar}>
          ➕ Agregar Empleado
        </button>
      </div>

      {/* DEBUG: Mostrar datos */}
      {!loading && (
        <p style={{ color: '#666', marginBottom: '10px' }}>
          Total empleados: {empleados.length}
        </p>
      )}

      {/* Tabla */}
      {!loading && empleados && empleados.length > 0 && (
        <table className="tabla-empleados">
          <thead>
            <tr>
              <th>#</th>
              <th>Nombre</th>
              <th>Teléfono</th>
              <th>Rol de Usuario</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {empleados.map((e, idx) => (
              <tr key={e.id}>
                <td>{idx + 1}</td>
                <td>{e.user.first_name} {e.user.last_name}</td>
                <td>{e.telefono || "—"}</td>
                <td>
                  <span className="rol-badge">
                    {e.user.is_staff ? "Admin" : "Usuario"}
                  </span>
                </td>
                <td>
                  <span className={`estado ${e.activo ? "activo" : "inactivo"}`}>
                    {e.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="acciones">
                  <button 
                    className="btn-editar" 
                    onClick={() => handleEditar(e)}
                    title="Editar empleado"
                  >
                    ✏️
                  </button>
                  <button 
                    className="btn-borrar" 
                    onClick={() => handleEliminar(e.id)}
                    title="Eliminar empleado"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!loading && empleados.length === 0 && !error && (
        <p className="sin-datos">No hay empleados registrados. ¡Crea uno nuevo!</p>
      )}

      {/* Modal para agregar empleado */}
      <AgregarEmpleadoModal 
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onEmpleadoAgregado={cargarEmpleados}
      />

      {/* Modal para editar empleado */}
      {modalEditOpen && (
        <div className="modal-overlay" onClick={() => setModalEditOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>✏️ Editar Empleado</h2>
              <button className="btn-close" onClick={() => setModalEditOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmitEdit} className="modal-form">
              {/* Campo usuario */}
              <div className="form-group">
                <label htmlFor="user_username">Usuario</label>
                <input
                  type="text"
                  id="user_username"
                  name="user_username"
                  value={formEditData.user.username}
                  onChange={handleChangeEdit}
                  placeholder="Nombre de usuario"
                />
              </div>

              {/* Campo nombre */}
              <div className="form-group">
                <label htmlFor="user_first_name">Nombre *</label>
                <input
                  type="text"
                  id="user_first_name"
                  name="user_first_name"
                  value={formEditData.user.first_name}
                  onChange={handleChangeEdit}
                  placeholder="Nombre"
                  required
                />
              </div>

              {/* Campo apellido */}
              <div className="form-group">
                <label htmlFor="user_last_name">Apellido *</label>
                <input
                  type="text"
                  id="user_last_name"
                  name="user_last_name"
                  value={formEditData.user.last_name}
                  onChange={handleChangeEdit}
                  placeholder="Apellido"
                  required
                />
              </div>

              {/* Campo teléfono */}
              <div className="form-group">
                <label htmlFor="telefono">Teléfono</label>
                <input
                  type="tel"
                  id="telefono"
                  name="telefono"
                  value={formEditData.telefono}
                  onChange={handleChangeEdit}
                  placeholder="Ej: 3005551234"
                />
              </div>

              {/* Campo contraseña */}
              <div className="form-group">
                <label htmlFor="user_password">Contraseña (dejar vacío para no cambiar)</label>
                <input
                  type="password"
                  id="user_password"
                  name="user_password"
                  value={formEditData.user.password}
                  onChange={handleChangeEdit}
                  placeholder="Nueva contraseña (opcional)"
                />
              </div>

              {/* Rol de Usuario */}
              <div className="form-group">
                <label htmlFor="is_staff">Rol de Usuario</label>
                <select
                  id="is_staff"
                  name="is_staff"
                  value={formEditData.is_staff ? "true" : "false"}
                  onChange={(e) => setFormEditData(prev => ({
                    ...prev,
                    is_staff: e.target.value === "true"
                  }))}
                  style={{
                    padding: '12px 14px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    cursor: 'pointer'
                  }}
                >
                  <option value="false">Usuario</option>
                  <option value="true">Admin</option>
                </select>
              </div>

              {/* Estado */}
              <div className="form-group">
                <label htmlFor="activo">Estado</label>
                <select
                  id="activo"
                  name="activo"
                  value={formEditData.activo ? "true" : "false"}
                  onChange={(e) => setFormEditData(prev => ({
                    ...prev,
                    activo: e.target.value === "true"
                  }))}
                  style={{
                    padding: '12px 14px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    cursor: 'pointer'
                  }}
                >
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
              </div>

              {/* Botones */}
              <div className="modal-buttons">
                <button
                  type="button"
                  className="btn-cancelar"
                  onClick={() => setModalEditOpen(false)}
                  disabled={loadingEdit}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-guardar"
                  disabled={loadingEdit}
                >
                  {loadingEdit ? "Guardando..." : "✓ Actualizar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}