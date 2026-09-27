import { useState, useEffect } from "react";
import { Link } from "react-router-dom"; // Necesario para el logo cliqueable
import "./HeroSection.css"; // Importamos los estilos
import { FaArrowLeft, FaArrowRight } from "react-icons/fa";
// 1. DATOS DE LOS SLIDES (CON LOGOS Y ENLACES, inspirados en JTC)
const slides = [
  {
    id: 1,
    title: "CORTES Y TRATAMIENTOS", // Usado para 'alt' text
    logoImage: "/img/CORTES.png", // Ruta a tu imagen de logo
    linkUrl: "/SERVICIOS", // Enlace a la página de servicios
    subtitle: "Maestros en el arte clásico y moderno.",
    buttonText: "VER SERVICIOS",
    className: "slide-cortes", // Clase para el fondo (usada en el CSS)
  },
  {
    id: 2,
    title: "NUESTRA TIENDA",
    logoImage: "/img/shop.png",
    linkUrl: "/TIENDA",
    subtitle: "Descubre nuestros productos de grooming.",
    buttonText: "IR A LA TIENDA",
    className: "slide-shop",
  },
  {
    id: 3,
    title: "UBICACIONES",
    logoImage: "/img/encuentranos.png",
    linkUrl: "/UBICACION",
    subtitle: "Visita nuestras sucursales en [Tu Ciudad].",
    buttonText: "VER UBICACIONES",
    className: "slide-location",
  },
];

// 2. EL COMPONENTE
const HeroSection = () => {
  // Estado que guarda el índice actual del slide (0, 1 o 2)
  const [currentIndex, setCurrentIndex] = useState(0);

  // 3. LÓGICA DEL CARRUSEL (Automático e Infinito)
  useEffect(() => {
    const intervalId = setInterval(() => {
      // Usamos el operador módulo (%) para el loop infinito (0, 1, 2, 0, 1, 2...)
      setCurrentIndex((prevIndex) => (prevIndex + 1) % slides.length);
    }, 5000); // Cambia cada 5 segundos

    // Función de limpieza obligatoria. Detiene el temporizador si el componente desaparece.
    return () => {
      clearInterval(intervalId);
    };
  }, []); // El [] vacío asegura que esto solo se ejecute UNA VEZ al cargar.
  // En src/components/HeroSection.tsx (después de useState)

  // Función para AVANZAR
  const goToNext = () => {
    // Usamos la lógica de módulo (%) para el loop infinito
    setCurrentIndex((prevIndex) => (prevIndex + 1) % slides.length);
  };

  // Función para RETROCEDER
  const goToPrev = () => {
    setCurrentIndex((prevIndex) => {
      // Si estamos en el primer slide (0), vamos al último (slides.length - 1)
      // Si no, solo restamos 1
      return prevIndex === 0 ? slides.length - 1 : prevIndex - 1;
    });
  };
  // 4. Selecciona el slide actual basado en el estado
  const currentSlide = slides[currentIndex];

  // 5. RENDERIZADO (El JSX)
  // En HeroSection.tsx
  return (
    <main className="hero-section">
      {/*
        1. Usamos 'slide' (singular) para el ítem.
        2. Usamos 'index' para saber cuál es el slide actual.
      */}
      {slides.map((slide, index) => (
        <div
          // 2. La KEY debe ser única (usamos el id del slide)
          key={slide.id}
          // 3. (VER EXPLICACIÓN ABAJO)
          // Comparamos el 'index' (0, 1, o 2) con el 'currentIndex' (el estado)
          className={`
            slide-item ${slide.className} 
            ${index === currentIndex ? "is-visible" : ""}
          `}
        >
          {/* El resto del código ahora usa 'slide' (singular) */}
          <div className="slide-overlay"></div>
          <div className="slide-content">
            <Link to={slide.linkUrl} className="slide-logo-link">
              <img
                src={slide.logoImage}
                alt={slide.title}
                className="slide-logo"
              />
            </Link>
            <p className="hero-subtitle">{slide.subtitle}</p>
            <Link to={slide.linkUrl} className="cta-button-link">
              <button className="cta-button">{slide.buttonText}</button>
            </Link>
          </div>
        </div>
      ))}
      <button className="carousel-arrow next" onClick={goToNext}>
        <FaArrowRight />
      </button>

      <button className="carousel-arrow prev" onClick={goToPrev}>
        <FaArrowLeft />
      </button>
    </main>
  );
};

export default HeroSection;
