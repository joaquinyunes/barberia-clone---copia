import { useEffect } from "react";
import { Link } from "react-router-dom";
import "./Locations.css";
// NOTA: Asegúrate de tener instalado 'react-icons'
// import { FaMapMarkerAlt } from 'react-icons/fa';

// 1. Datos de las Ubicaciones (Simulando lo que se gestionará en el Backend)
const locationsData = [
  {
    id: 1,
    name: "BOW LANE",
    address: "47 Bow Lane, London, EC4M 9DL",
    hours: "Lunes a Viernes: 9:00 - 20:00",
    imageUrl: "/img/bowlane.jpg",
    detailLink: "/locations/bow-lane",
  },
  {
    id: 2,
    name: "MAYFAIR",
    address: "5 Shepherd Market, London, W1J 7PD",
    hours: "Lunes a Sábado: 9:00 - 20:00",
    imageUrl: "/img/mayfair.jpg",
    detailLink: "/locations/mayfair",
  },
  {
    id: 3,
    name: "SPITALFIELDS",
    address: "4 Toynbee Street, London, E1 7NE",
    hours: "Todos los días: 10:00 - 18:00",
    imageUrl: "/img/spitalfields.jpg",
    detailLink: "/locations/spitalfields",
  },
];

const Locations = () => {
  // Arreglo: Asegura que la página siempre empiece desde arriba
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="vip-locations-page">
      {/* 1. HERO SECTION (Banner Superior) */}
      <section className="vip-hero">
        <div className="hero-overlay"></div>
        <div className="vip-hero-content fade-in">
          <h1>UBICACIÓN</h1>
          <p>Donde la precisión, el lujo y el estilo se encuentran.</p>
          <Link to="/RESERVA" className="cta-button-reservar">
            RESERVAR AHORA
          </Link>
        </div>
      </section>

      {/* 2. FRASE INICIAL (La línea divisora que pediste) */}
      <div className="location-phrase-divider">
        <p>
          La precisión no es un acto, sino un hábito. <br />
          **Encuentra tu santuario del estilo.**
        </p>
      </div>

      {/* 3. CUADRÍCULA DE UBICACIONES (El listado de los locales) */}
      <section className="vip-grid">
        {locationsData.map((loc) => (
          <div className="vip-card" key={loc.id}>
            <div className="vip-card-image-container">
              <img
                src={loc.imageUrl}
                className="vip-img"
                alt={`Local en ${loc.name}`}
              />
            </div>

            <div className="vip-card-content">
              <h2>{loc.name}</h2>
              <p>{loc.address}</p>
              <small>{loc.hours}</small>

              <div className="vip-btn-group">
                <Link to="/RESERVA" className="vip-btn-gold">
                  ✂️ Reservar Ahora
                </Link>
                <Link to={loc.detailLink} className="vip-btn-dark detail-btn">
                  VER DETALLE
                </Link>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* 4. PROMO EXCLUSIVA (CHAMBER 88) */}
      <section className="chamber-promo-banner">
        <div className="promo-content">
          <p className="promo-text">
            ¿Quieres llevar tu corte al siguiente nivel? Explora nuestra
            experiencia exclusiva solo con cita: **Salón 88** en Bow Lane.
          </p>
          <Link to="/RESERVA" className="cta-button-gold">
            Visitar Salón 88
          </Link>
        </div>
      </section>

      {/* 5. MAPA (iFrame para el diseño) */}
      <section className="location-map-section">
        <h2>Encuéntranos Aquí</h2>
        <iframe
          title="Ubicaciones de la Barbería"
          src="maps.google.com/maps/api/js?key=AIzaSyBsJANiK5H6p9Hf3mA_X1ZH5KIr4IqEx_w0"
          width="100%"
          height="450"
          style={{ border: 0 }}
          loading="lazy"
        ></iframe>
      </section>
    </div>
  );
};

export default Locations;
