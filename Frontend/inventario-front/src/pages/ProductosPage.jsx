import React, { useEffect, useState } from "react";
import inventarioApi from "../api/inventarioApi";
import AgregarProductoModal from "../components/AgregarProductoModal";
import ColoresDisplay from "../components/ColoresDisplay";
import "./productos.css";

export default function ProductosPage() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalEditOpen, setModalEditOpen] = useState(false);
  const [productoEditando, setProductoEditando] = useState(null);
  const [formEditData, setFormEditData] = useState({
    nombre: "",
    categoria: "",
    coleccion: "",
    tallas: "",
    colores: "",
    descripcion: "",
    precio_unitario: "",
    stock_actual: "",
    stock_minimo: 5,
  });
  const [categorias, setCategorias] = useState([]);
  const [colecciones, setColecciones] = useState([]);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [filtros, setFiltros] = useState({
    nombre: "",
    categoria: "",
    coleccion: "",
    precioMin: "",
    precioMax: "",
    stockMin: "",
    stockMax: "",
    tallas: "",
    colores: "",
  });

  // Cargar productos
  const cargarProductos = async (params = {}) => {
    try {
      setError(null);
      setLoading(true);
      console.log("Cargando productos...");
      
      const res = await inventarioApi.get("/productos/", { params });
      console.log("Respuesta productos:", res.data);
      
      let productosData = [];
      if (res.data.results) {
        productosData = res.data.results;
      } else if (Array.isArray(res.data)) {
        productosData = res.data;
      }
      
      setProductos(productosData);
    } catch (err) {
      console.error("Error:", err);
      const mensajeError = err.response?.data?.detail || "Error cargando productos";
      setError(mensajeError);
    } finally {
      setLoading(false);
    }
  };

  // Cargar categorías y colecciones
  const cargarDatos = async () => {
    try {
      const [catRes, colRes] = await Promise.all([
        inventarioApi.get("/categorias/"),
        inventarioApi.get("/colecciones/"),
      ]);

      setCategorias(catRes.data.results || catRes.data);
      setColecciones(colRes.data.results || colRes.data);
    } catch (err) {
      console.error("Error cargando datos:", err);
    }
  };

  useEffect(() => {
    cargarProductos();
    cargarDatos();
  }, []);

  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    setFiltros((prev) => ({ ...prev, [name]: value }));
  };

  const normalizarNumero = (valor) => {
    if (valor === "" || valor === null || typeof valor === "undefined") return null;
    const numero = Number(valor);
    return Number.isNaN(numero) ? null : numero;
  };

  const aplicarFiltros = () => {
    setError(null);
    const params = {};

    if (filtros.nombre.trim()) params.nombre = filtros.nombre.trim();
    if (filtros.categoria) params.categoria = filtros.categoria;
    if (filtros.coleccion) params.coleccion = filtros.coleccion;

    const precioMin = normalizarNumero(filtros.precioMin);
    if (filtros.precioMin && precioMin === null) {
      setError("Precio mínimo inválido");
      return;
    }
    const precioMax = normalizarNumero(filtros.precioMax);
    if (filtros.precioMax && precioMax === null) {
      setError("Precio máximo inválido");
      return;
    }
    if (precioMin !== null && precioMax !== null && precioMin > precioMax) {
      setError("El precio mínimo no puede ser mayor al máximo");
      return;
    }
    if (precioMin !== null) params.precio_min = precioMin;
    if (precioMax !== null) params.precio_max = precioMax;

    const stockMin = normalizarNumero(filtros.stockMin);
    if (filtros.stockMin && stockMin === null) {
      setError("Stock mínimo inválido");
      return;
    }
    const stockMax = normalizarNumero(filtros.stockMax);
    if (filtros.stockMax && stockMax === null) {
      setError("Stock máximo inválido");
      return;
    }
    if (stockMin !== null && stockMax !== null && stockMin > stockMax) {
      setError("El stock mínimo no puede ser mayor al máximo");
      return;
    }
    if (stockMin !== null) params.stock_min = stockMin;
    if (stockMax !== null) params.stock_max = stockMax;

    if (filtros.tallas.trim()) params.tallas = filtros.tallas.trim();
    if (filtros.colores.trim()) params.colores = filtros.colores.trim();

    cargarProductos(params);
  };

  const limpiarFiltros = () => {
    setFiltros({
      nombre: "",
      categoria: "",
      coleccion: "",
      precioMin: "",
      precioMax: "",
      stockMin: "",
      stockMax: "",
      tallas: "",
      colores: "",
    });
    cargarProductos();
    setError(null);
  };

  const handleAgregar = () => {
    setModalOpen(true);
  };

  const handleEditar = (producto) => {
    console.log("Editar producto:", producto.id);
    setProductoEditando(producto);
    setFormEditData({
      nombre: producto.nombre,
      categoria: producto.categoria,
      coleccion: producto.coleccion || "",
      tallas: producto.tallas || "",
      colores: producto.colores || "",
      descripcion: producto.descripcion || "",
      precio_unitario: producto.precio_unitario,
      stock_actual: producto.stock_actual,
      stock_minimo: producto.stock_minimo,
    });
    setModalEditOpen(true);
  };

  const handleChangeEdit = (e) => {
    const { name, value } = e.target;
    setFormEditData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    setLoadingEdit(true);

    try {
      const dataToSend = {
        nombre: formEditData.nombre,
        categoria: parseInt(formEditData.categoria),
        coleccion: formEditData.coleccion ? parseInt(formEditData.coleccion) : null,
        tallas: formEditData.tallas,
        colores: formEditData.colores,
        descripcion: formEditData.descripcion,
        precio_unitario: parseFloat(formEditData.precio_unitario),
        stock_actual: parseInt(formEditData.stock_actual),
        stock_minimo: parseInt(formEditData.stock_minimo),
      };

      const response = await inventarioApi.put(`/productos/${productoEditando.id}/`, dataToSend);
      console.log("✅ Producto actualizado:", response.data);
      
      cargarProductos();
      setModalEditOpen(false);
    } catch (err) {
      console.error("❌ Error actualizando:", err.response?.data);
      setError(err.response?.data?.detail || "Error actualizando producto");
    } finally {
      setLoadingEdit(false);
    }
  };

  const handleEliminar = async (id) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar este producto?")) {
      try {
        await inventarioApi.delete(`/productos/${id}/`);
        cargarProductos();
      } catch (err) {
        console.error("Error al eliminar:", err);
        setError("Error eliminando producto");
      }
    }
  };

  const getEstadoBadge = (producto) => {
    switch(producto.estado) {
      case 'en_stock':
        return <span className="estado en-stock">📦 En Stock</span>;
      case 'bajo_stock':
        return <span className="estado bajo-stock">⚠️ Stock Bajo</span>;
      case 'agotado':
        return <span className="estado agotado">❌ Agotado</span>;
      default:
        return <span className="estado">{producto.estado}</span>;
    }
  };

  return (
    <div className="productos-container">
      <h1 className="titulo">🛒 Inventario de Productos</h1>

      {loading && <p className="cargando">Cargando productos...</p>}
      {error && <p className="error">❌ {error}</p>}

      <div className="acciones-superiores">
        <button className="btn-agregar" onClick={handleAgregar}>
          ➕ Agregar Producto
        </button>
      </div>

      <div className="filtros-productos">
        <div className="filtro-item">
          <label>Nombre</label>
          <input
            type="text"
            name="nombre"
            value={filtros.nombre}
            onChange={handleFiltroChange}
            placeholder="Buscar por nombre"
          />
        </div>
        <div className="filtro-item">
          <label>Categoría</label>
          <select name="categoria" value={filtros.categoria} onChange={handleFiltroChange}>
            <option value="">Todas</option>
            {categorias.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.nombre}</option>
            ))}
          </select>
        </div>
        <div className="filtro-item">
          <label>Colección</label>
          <select name="coleccion" value={filtros.coleccion} onChange={handleFiltroChange}>
            <option value="">Todas</option>
            {colecciones.map((col) => (
              <option key={col.id} value={col.id}>{col.nombre}</option>
            ))}
          </select>
        </div>
        <div className="filtro-item">
          <label>Precio mín.</label>
          <input
            type="number"
            name="precioMin"
            min="0"
            step="0.01"
            value={filtros.precioMin}
            onChange={handleFiltroChange}
          />
        </div>
        <div className="filtro-item">
          <label>Precio máx.</label>
          <input
            type="number"
            name="precioMax"
            min="0"
            step="0.01"
            value={filtros.precioMax}
            onChange={handleFiltroChange}
          />
        </div>
        <div className="filtro-item">
          <label>Stock mín.</label>
          <input
            type="number"
            name="stockMin"
            min="0"
            value={filtros.stockMin}
            onChange={handleFiltroChange}
          />
        </div>
        <div className="filtro-item">
          <label>Stock máx.</label>
          <input
            type="number"
            name="stockMax"
            min="0"
            value={filtros.stockMax}
            onChange={handleFiltroChange}
          />
        </div>
        <div className="filtro-item">
          <label>Tallas</label>
          <input
            type="text"
            name="tallas"
            value={filtros.tallas}
            onChange={handleFiltroChange}
            placeholder="Ej: S,M"
          />
        </div>
        <div className="filtro-item">
          <label>Colores</label>
          <input
            type="text"
            name="colores"
            value={filtros.colores}
            onChange={handleFiltroChange}
            placeholder="Ej: rojo"
          />
        </div>
        <div className="filtro-item botones">
          <button className="btn-filtrar" onClick={aplicarFiltros}>Aplicar</button>
          <button className="btn-limpiar" onClick={limpiarFiltros}>Limpiar</button>
        </div>
      </div>

      {!loading && (
        <p style={{ color: '#666', marginBottom: '10px' }}>
          Total productos: {productos.length}
        </p>
      )}

      {!loading && productos && productos.length > 0 && (
        <div className="tabla-responsive">
          <table className="tabla-productos">
            <thead>
              <tr>
                <th>#</th>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Colores</th>
                <th>Tallas</th>
                <th>Precio</th>
                <th>Stock Actual</th>
                <th>Stock Mínimo</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {productos.map((p, idx) => (
                <tr key={p.id}>
                  <td>{idx + 1}</td>
                  <td><strong>{p.nombre}</strong></td>
                  <td>{p.categoria_nombre}</td>
                  <td>
                    <ColoresDisplay colores={p.colores}/>
                  </td>
                  <td>
                    <span className="tallas-badge">
                      {p.tallas || "—"}
                    </span>
                  </td>
                  <td>
                    <strong className="precio">
                      ${parseFloat(p.precio_unitario).toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                    </strong>
                  </td>
                  <td>
                    <span className={`stock ${p.stock_actual === 0 ? 'cero' : p.stock_actual <= p.stock_minimo ? 'bajo' : 'bueno'}`}>
                      {p.stock_actual}
                    </span>
                  </td>
                  <td>{p.stock_minimo}</td>
                  <td>{getEstadoBadge(p)}</td>
                  <td className="acciones">
                    <button 
                      className="btn-editar" 
                      onClick={() => handleEditar(p)}
                      title="Editar producto"
                    >
                      ✏️
                    </button>
                    <button 
                      className="btn-borrar" 
                      onClick={() => handleEliminar(p.id)}
                      title="Eliminar producto"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && productos.length === 0 && !error && (
        <p className="sin-datos">No hay productos registrados. ¡Crea uno nuevo!</p>
      )}

      {/* Modal para agregar */}
      <AgregarProductoModal 
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onProductoAgregado={cargarProductos}
      />

      {/* Modal para editar */}
      {modalEditOpen && (
        <div className="modal-overlay" onClick={() => setModalEditOpen(false)}>
          <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>✏️ Editar Producto</h2>
              <button className="btn-close" onClick={() => setModalEditOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmitEdit} className="modal-form">
              <div className="form-group">
                <label htmlFor="nombre">Nombre del Producto *</label>
                <input
                  type="text"
                  id="nombre"
                  name="nombre"
                  value={formEditData.nombre}
                  onChange={handleChangeEdit}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="categoria">Categoría *</label>
                <select
                  id="categoria"
                  name="categoria"
                  value={formEditData.categoria}
                  onChange={handleChangeEdit}
                  required
                >
                  {categorias.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="coleccion">Colección</label>
                <select
                  id="coleccion"
                  name="coleccion"
                  value={formEditData.coleccion}
                  onChange={handleChangeEdit}
                >
                  <option value="">Sin colección</option>
                  {colecciones.map(col => (
                    <option key={col.id} value={col.id}>{col.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="tallas">Tallas (separadas por comas)</label>
                <input
                  type="text"
                  id="tallas"
                  name="tallas"
                  value={formEditData.tallas}
                  onChange={handleChangeEdit}
                  placeholder="S,M,L,XL"
                />
              </div>

              <div className="form-group">
                <label htmlFor="colores">Colores (separados por comas)</label>
                <input
                  type="text"
                  id="colores"
                  name="colores"
                  value={formEditData.colores}
                  onChange={handleChangeEdit}
                  placeholder="Rojo,Azul,Negro,Blanco"
                />
                <small style={{ color: '#666', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  Ejemplos: Rojo, Azul, Negro, Blanco, Rosa, Verde, Amarillo, Gris
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="descripcion">Descripción</label>
                <textarea
                  id="descripcion"
                  name="descripcion"
                  value={formEditData.descripcion}
                  onChange={handleChangeEdit}
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label htmlFor="precio_unitario">Precio Unitario *</label>
                <input
                  type="number"
                  id="precio_unitario"
                  name="precio_unitario"
                  value={formEditData.precio_unitario}
                  onChange={handleChangeEdit}
                  step="0.01"
                  min="0"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="stock_actual">Stock Actual *</label>
                <input
                  type="number"
                  id="stock_actual"
                  name="stock_actual"
                  value={formEditData.stock_actual}
                  onChange={handleChangeEdit}
                  min="0"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="stock_minimo">Stock Mínimo</label>
                <input
                  type="number"
                  id="stock_minimo"
                  name="stock_minimo"
                  value={formEditData.stock_minimo}
                  onChange={handleChangeEdit}
                  min="1"
                />
              </div>

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
