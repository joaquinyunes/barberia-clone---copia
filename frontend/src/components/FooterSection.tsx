import "./FooterSection.css";

const FooterSection = () => {
  const googleMapsUrl =
    "https://www.google.com/maps?q=-34.603684,-58.381559&z=17"; // <-- Cambia coordenadas

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-col">
          <img src="/img/logo-footer.png" className="footer-logo" alt="logo" />
          <p className="footer-tagline">La barbería que define tu estilo.</p>
        </div>

        <div className="footer-col">
          <h3>Contacto</h3>
          <p>Calle Ejemplo 123, Buenos Aires</p>
          <p>+54 11 1234 5678</p>
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="map-link"
          >
            Ver en Maps
          </a>
        </div>

        <div className="footer-col">
          <h3>Links</h3>
          <a href="/SERVICIOS">Servicios</a>
          <a href="/RESERVAR">Reservar</a>
          <a href="/TIENDA">Tienda</a>
          <a href="/UBICACION">Ubicación</a>
        </div>
      </div>

      <div className="footer-bottom">
        © {new Date().getFullYear()} Tu Barbería — Todos los derechos
        reservados.
      </div>
    </footer>
  );
};

export default FooterSection;
