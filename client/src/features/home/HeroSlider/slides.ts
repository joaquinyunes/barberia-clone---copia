import { paths } from "@/app/router/paths";

export const HERO_SLIDES = [
  {
    id: "ritual",
    eyebrow: "Barbería clásica · Buenos Aires",
    title: "El ritual de la navaja, como se hacía antes",
    text: "Toalla caliente, espuma tibia y doble pasada. Cortes de precisión en tres sedes porteñas.",
    image: "/images/hero/hero-ritual.webp",
    cta: { label: "Reservar turno", to: paths.booking },
    secondary: { label: "Ver servicios", to: paths.services },
  },
  {
    id: "cava",
    eyebrow: "Solo con turno · Recoleta",
    title: "La Cava: el salón privado de la casa",
    text: "Un subsuelo de ladrillo, sillones de cuero y whisky de cortesía. La experiencia completa, sin apuro.",
    image: "/images/hero/hero-cava.webp",
    cta: { label: "Conocer La Cava", to: paths.vip },
    secondary: { label: "Reservar ritual", to: `${paths.booking}?location=recoleta` },
  },
  {
    id: "regalo",
    eyebrow: "Gift cards · Packs · Club Jack",
    title: "Regalá un corte que se recuerde",
    text: "Gift cards para cualquier sede, packs con descuento y una membresía mensual con cortes incluidos.",
    image: "/images/hero/hero-regalo.webp",
    cta: { label: "Ir a la tienda", to: paths.shop },
    secondary: { label: "Club Jack", to: paths.club },
  },
];
