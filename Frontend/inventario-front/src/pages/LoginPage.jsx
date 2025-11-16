import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import "./Login.css"; // Importamos el CSS normal

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const success = await login(username, password);
    if (!success) {
      setError("Credenciales inválidas.");
    }
  };

  return (
    <div className="login-container">

      <h1 className="titulo-principal">ANIMALPRINT PETSTYLE</h1>

      <div className="login-box">
        <h2>Inicio Sesión</h2>

        <form onSubmit={handleSubmit}>
          
          {/* Usuario */}
          <div className="campo">
            <label>
              <span className="icono">👤</span> Usuario
            </label>
            <input 
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required 
            />
          </div>

          {/* Contraseña */}
          <div className="campo">
            <label>
              <span className="icono">🔒</span> Contraseña
            </label>
            <input 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>

          {error && <p className="error">{error}</p>}

          <button className="btn-ingresar" type="submit">Ingresar</button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
