import "./LocationSection.css";

const LocationSection = () => {
  // Cambiá el link por la ubicación real de tu barbería:
  const googleMapsUrl =
    "https://www.google.com/maps?q=-34.603684,-58.381559&z=17";

  return (
    <section className="location-section">
      <div className="location-content fade-up">
        <h2 className="location-title">Nuestra Ubicación</h2>

        <p className="location-desc">
          Te invitamos a vivir una experiencia premium donde la barbería clásica
          se encuentra con el diseño moderno. Estás a un paso de tu mejor
          versión.
        </p>

        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="map-button"
        >
          Abrir en Google Maps
        </a>

        <div className="map-container">
          <iframe
            src="https://www.google.com/maps/embed?pb=TU_EMBED_CODE"
            className="map"
            loading="lazy"
          ></iframe>

          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="map-overlay"
          ></a>
        </div>
      </div>
    </section>
  );
};

export default LocationSection;
