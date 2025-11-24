import "./Header.css";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";

const Header = () => {
  // 1. ESTADO: Rastrea la posición del scroll (true si se ha movido)
  const [scrolled, setScrolled] = useState(false); // <-- ¡ESTO YA ESTÁ DENTRO DE LA FUNCIÓN!

  // 2. EFECTO: Escucha el evento de scroll
  useEffect(() => {
    const handleScroll = () => {
      // Si la posición vertical es mayor a 50px...
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);

    // Limpieza: Quita el evento cuando el componente desaparece.
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // 3. APLICA LA CLASE CONDICIONALMENTE
  // Si 'scrolled' es true, la clase es "scrolled", sino es vacía.
  // También combinamos la clase "scrolled" con la clase base "header" (aunque no la necesitamos, es más seguro)
  const headerClasses = scrolled ? "scrolled" : "";

  return (
    // 4. USAMOS LAS CLASES CONDICIONALES EN LA ETIQUETA <header>
    <header className={headerClasses}>
      <div className="header-left">
        <Link to="/">
          <img src="/img/logo.png" alt="Logo de la Barbería" />
        </Link>
      </div>

      <div className="header-center">
        <nav>
          <Link to="/UBICACION" className="menu-link">
            UBICACION
          </Link>
          <Link to="/SERVICIOS" className="menu-link">
            SERVICIOS
          </Link>
          <Link to="/TIENDA" className="menu-link">
            TIENDA
          </Link>
        </nav>
      </div>

      <div className="header-actions">
        <Link to="/CUENTA">
          <button className="btb-cuenta">CUENTA</button>
        </Link>
        <Link to="/RESERVA">
          <button className="btn-reserva">RESERVA</button>
        </Link>
      </div>
    </header>
  );
};

export default Header;
