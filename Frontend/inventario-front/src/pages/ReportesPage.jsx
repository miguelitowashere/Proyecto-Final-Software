import { useEffect, useState } from "react";
import inventarioApi from "../api/inventarioApi";
import "./reportes.css";

const PERIODOS = [
  { value: "1m", label: "Último mes" },
  { value: "3m", label: "3 meses" },
  { value: "6m", label: "6 meses" },
  { value: "12m", label: "Último año" },
];

const ReportesPage = () => {
  const [periodo, setPeriodo] = useState("1m");
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const cargarDatos = async (p) => {
    setCargando(true);
    setError("");
    try {
      const res = await inventarioApi.get(`/ventas/reportes/resumen/?periodo=${p}`);
      setDatos(res.data);
    } catch (err) {
      console.error(err.response?.data || err);
      setError("No se pudieron cargar los reportes.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos(periodo);
  }, [periodo]);

  return (
    <div className="reportes-container">
      <div className="reportes-header">
        <h2>Reportes de ventas</h2>
        <select value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
          {PERIODOS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {cargando && <p>Cargando...</p>}
      {error && <p className="error-msg">{error}</p>}

      {datos && !cargando && (
        <>
          <div className="cards">
            <div className="card">
              <p>Ingresos</p>
              <h3>${Number(datos.totales.ingresos || 0).toLocaleString("es-CO")}</h3>
            </div>
            <div className="card">
              <p>Descuentos</p>
              <h3>${Number(datos.totales.descuentos || 0).toLocaleString("es-CO")}</h3>
            </div>
            <div className="card">
              <p>Rango</p>
              <h4>
                {datos.rango_desde} - {datos.rango_hasta}
              </h4>
            </div>
          </div>

          <div className="reportes-grid">
            <div className="panel">
              <h4>Productos más vendidos</h4>
              {datos.top_productos.length === 0 && <p>No hay ventas en este periodo.</p>}
              {datos.top_productos.map((prod) => (
                <div key={prod.producto__id} className="barra">
                  <div className="barra-info">
                    <span>{prod.producto__nombre}</span>
                    <span>{prod.cantidad_vendida} uds</span>
                  </div>
                  <div className="barra-track">
                    <div
                      className="barra-fill"
                      style={{ width: `${Math.min(prod.cantidad_vendida * 10, 100)}%` }}
                    />
                  </div>
                  <small>Ingresos: ${Number(prod.ingresos || 0).toLocaleString("es-CO")}</small>
                </div>
              ))}
            </div>

            <div className="panel">
              <h4>Ingresos por mes</h4>
              {datos.serie_temporal.length === 0 && <p>No hay datos en el rango.</p>}
              <div className="linea">
                {datos.serie_temporal.map((punto) => (
                  <div key={punto.mes} className="linea-item">
                    <span className="linea-bar" style={{ height: `${Math.min(Number(punto.total) / 1000, 100)}%` }} />
                    <small>{punto.mes}</small>
                    <small>${Number(punto.total || 0).toLocaleString("es-CO")}</small>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ReportesPage;
