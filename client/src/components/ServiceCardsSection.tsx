import "./ServiceCardsSection.css";
import { useRef, useEffect } from "react";
import { Link } from "react-router-dom"; // 🔥 Importante para la navegación

const ServiceCardsSection = () => {
  const scrollIcons = useRef<HTMLElement | null>(null);

  const serviceCards = [
    {
      id: 1,
      title: "UBICACION",
      iconPath: "/img/location.png",
      subtitle: "descubre donde hacemos nuestros servicios",
      buttonText: "ubicacion",
      linkUrl: "/UBICACION",
    },
    {
      id: 2,
      title: "SERVICIOS",
      iconPath: "/img/servicios.png",
      subtitle: "descubre todos nuestros servicios",
      buttonText: "servicios",
      linkUrl: "/SERVICIOS",
    },
    {
      id: 3,
      title: "RESERVAR",
      iconPath: "/img/reserva.png",
      subtitle: "descubre nuestro calendario de reservas",
      buttonText: "reservar",
      linkUrl: "/RESERVAR",
    },
    {
      id: 4,
      title: "TIENDA",
      iconPath: "/img/shopLogo.png",
      subtitle: "descubre todos nuestros productos",
      buttonText: "tienda",
      linkUrl: "/TIENDA",
    },
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          scrollIcons.current?.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );

    if (scrollIcons.current) observer.observe(scrollIcons.current);

    return () => {
      if (scrollIcons.current) observer.unobserve(scrollIcons.current);
    };
  }, []);

  return (
    <section className="cards-section" ref={scrollIcons}>
      {serviceCards.map((services, index) => (
        <Link
          to={services.linkUrl}
          key={services.id}
          className="tarjeta-link"
          style={{ animationDelay: `${index * 0.2}s` }}
        >
          <div className="tarjeta-servicio">
            <img src={services.iconPath} alt={services.title} />
            <h2>{services.title}</h2>
            <p>{services.subtitle}</p>
            <button>{services.buttonText}</button>
          </div>
        </Link>
      ))}
    </section>
  );
};

export default ServiceCardsSection;
