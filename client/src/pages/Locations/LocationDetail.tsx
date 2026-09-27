import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import "./Locations.css";
import "./LocationDetail.css";
import { getLocationBySlug } from "../../data/locations";

const LocationDetail = () => {
  const { locationId } = useParams<{ locationId: string }>();
  const location = locationId ? getLocationBySlug(locationId) : undefined;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [locationId]);

  if (!location) {
    return (
      <div className="vip-locations-page location-detail-page">
        <section className="location-detail-notfound">
          <h1>Ubicación no encontrada</h1>
          <p>No pudimos encontrar el local que estás buscando.</p>
          <Link to="/UBICACION" className="vip-btn-gold">
            Ver todas las ubicaciones
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="vip-locations-page location-detail-page">
      {/* 1. HERO SECTION */}
      <section
        className="vip-hero location-detail-hero"
        style={{ backgroundImage: `url(${location.heroImageUrl})` }}
      >
        <div className="hero-overlay"></div>
        <div className="vip-hero-content fade-in">
          <h1>{location.name}</h1>
          <p>{location.address}</p>
          <Link to="/RESERVA" className="cta-button-reservar">
            RESERVAR AHORA
          </Link>
        </div>
      </section>

      {/* 2. DETALLE */}
      <section className="location-detail-content">
        <div className="location-detail-info">
          <h2>Sobre este local</h2>
          <p>{location.description}</p>

          <ul className="location-detail-list">
            <li>
              <strong>Dirección:</strong> {location.address}
            </li>
            <li>
              <strong>Horario:</strong> {location.hours}
            </li>
            <li>
              <strong>Teléfono:</strong> {location.phone}
            </li>
          </ul>

          <div className="vip-btn-group location-detail-actions">
            <Link to="/RESERVA" className="vip-btn-gold">
              ✂️ Reservar Ahora
            </Link>
            <Link to="/UBICACION" className="vip-btn-dark">
              Volver a Ubicaciones
            </Link>
          </div>
        </div>

        <div className="location-detail-image-container">
          <img
            src={location.imageUrl}
            alt={`Local en ${location.name}`}
            className="location-detail-image"
          />
        </div>
      </section>
    </div>
  );
};

export default LocationDetail;
