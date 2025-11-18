import React, { useEffect, useState } from "react";
import inventarioApi from "../api/inventarioApi";
import "./ventas.css";

const METODOS_PAGO = [
  { value: "presencial", label: "Efectivo / Presencial" },
  { value: "nequi", label: "Nequi" },
  { value: "daviplata", label: "Daviplata" },
  { value: "bancolombia", label: "Bancolombia" },
  { value: "tarjeta", label: "Tarjeta" },
];

const VentasPage = () => {
  const [productos, setProductos] = useState([]);
  const [empleado, setEmpleado] = useState(null);

  const [productoId, setProductoId] = useState("");
  const [precioUnitario, setPrecioUnitario] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [metodoPago, setMetodoPago] = useState("presencial");
  const [notas, setNotas] = useState("");

  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [ventasRecientes, setVentasRecientes] = useState([]);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const [empleadoRes, productosRes] = await Promise.all([
          inventarioApi.get("/empleados/me/"),
          inventarioApi.get("/productos/"),
        ]);
        setEmpleado(empleadoRes.data);
        const lista =
          Array.isArray(productosRes.data) && productosRes.data.length > 0
            ? productosRes.data
            : productosRes.data?.results || [];
        setProductos(lista);
      } catch (err) {
        console.error(err);
        setError("No se pudieron cargar productos o datos del empleado.");
      }
    };
    cargarDatos();
  }, []);

  useEffect(() => {
    const prod = productos.find((p) => p.id === Number(productoId));
    if (prod) {
      setPrecioUnitario(String(prod.precio_unitario));
    } else {
      setPrecioUnitario("");
    }
  }, [productoId, productos]);

  const productosLista = Array.isArray(productos) ? productos : [];
  const productoSeleccionado = productosLista.find(
    (p) => p.id === Number(productoId)
  );

  const totalEstimado =
    productoSeleccionado && cantidad > 0
      ? (
          Number(precioUnitario || 0) * Number(cantidad)
        ).toFixed(2)
      : "0.00";

  const manejarSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMensaje("");

    if (!empleado) {
      setError("No se encontró el empleado asociado al usuario.");
      return;
    }
    if (!productoSeleccionado) {
      setError("Selecciona un producto.");
      return;
    }
    if (cantidad <= 0) {
      setError("La cantidad debe ser mayor a 0.");
      return;
    }

    const precioNum = Number(precioUnitario || productoSeleccionado.precio_unitario);
    const subtotal = precioNum * Number(cantidad);
    const descuento = 0; // por ahora
    const total = subtotal - descuento;

    const payload = {
      canal_venta: metodoPago,
      empleado: empleado.id,
      subtotal,
      descuento,
      total,
      notas,
      detalles: [
        {
          producto: productoSeleccionado.id,
          cantidad: Number(cantidad),
          precio_unitario: precioNum,
          subtotal,
        },
      ],
    };

    try {
      const res = await inventarioApi.post("/ventas/", payload);
      setMensaje(`Venta registrada (#${res.data.id})`);
      setVentasRecientes((prev) => [res.data, ...prev].slice(0, 5));

      setProductoId("");
      setCantidad(1);
      setMetodoPago("presencial");
      setNotas("");
      setPrecioUnitario("");
      // refrescar stocks visuales
      const productosRes = await inventarioApi.get("/productos/");
      const lista =
        Array.isArray(productosRes.data) && productosRes.data.length > 0
          ? productosRes.data
          : productosRes.data?.results || [];
      setProductos(lista);
    } catch (err) {
      console.error(err.response?.data || err);
      setError("Error registrando la venta.");
    }
  };

  return (
    <div className="ventas-container">
      <h2>💵 Registro de Ventas</h2>

      <form className="venta-form" onSubmit={manejarSubmit}>
        <div className="campo">
          <label>Producto</label>
          <select
            value={productoId}
            onChange={(e) => setProductoId(e.target.value)}
            required
          >
            <option value="">-- Selecciona un producto --</option>
            {productosLista.map((prod) => (
              <option key={prod.id} value={prod.id}>
                {prod.nombre} (stock: {prod.stock_actual})
              </option>
            ))}
          </select>
        </div>

        <div className="campo">
          <label>Cantidad</label>
          <input
            type="number"
            min="1"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
          />
        </div>

        <div className="campo">
          <label>Precio unitario</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={precioUnitario}
            onChange={(e) => setPrecioUnitario(e.target.value)}
            placeholder={productoSeleccionado ? productoSeleccionado.precio_unitario : "0"}
          />
        </div>

        <div className="campo">
          <label>Método de pago</label>
          <select
            value={metodoPago}
            onChange={(e) => setMetodoPago(e.target.value)}
          >
            {METODOS_PAGO.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div className="campo">
          <label>Notas</label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={3}
          />
        </div>

        <div className="resumen">
          <p>
            <strong>Total estimado:</strong> ${totalEstimado}
          </p>
          {empleado && (
            <p>
              <strong>Empleado:</strong> {empleado.user?.first_name}{" "}
              {empleado.user?.last_name}
            </p>
          )}
        </div>

        {error && <p className="error-msg">{error}</p>}
        {mensaje && <p className="ok-msg">{mensaje}</p>}

        <button type="submit" className="btn-registrar">
          Registrar venta
        </button>
      </form>

      <section className="ventas-recientes">
        <h3>Últimas ventas</h3>
        {ventasRecientes.length === 0 && <p>No hay ventas recientes.</p>}
        {ventasRecientes.map((v) => (
          <div key={v.id} className="venta-card">
            <p>
              <strong>#{v.id}</strong> –{" "}
              {new Date(v.fecha).toLocaleString("es-CO")}
            </p>
            <p>Método: {v.canal_venta}</p>
            <p>Total: ${v.total}</p>
          </div>
        ))}
      </section>
    </div>
  );
};

export default VentasPage;
