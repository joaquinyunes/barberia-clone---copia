export interface LocationData {
  id: number;
  slug: string;
  name: string;
  address: string;
  hours: string;
  phone: string;
  description: string;
  imageUrl: string;
  heroImageUrl: string;
}

// 1. Datos de las Ubicaciones (Simulando lo que se gestionará en el Backend)
export const locationsData: LocationData[] = [
  {
    id: 1,
    slug: "bow-lane",
    name: "BOW LANE",
    address: "47 Bow Lane, London, EC4M 9DL",
    hours: "Lunes a Viernes: 9:00 - 20:00",
    phone: "+44 20 7946 0958",
    description:
      "En el corazón de la City de Londres, nuestro salón de Bow Lane combina la elegancia clásica con un servicio de barbería de precisión, ideal para quienes buscan una experiencia premium entre reuniones.",
    imageUrl: "/img/bowlane.jpg",
    heroImageUrl: "/img/bowlane-hero.jpg",
  },
  {
    id: 2,
    slug: "mayfair",
    name: "MAYFAIR",
    address: "5 Shepherd Market, London, W1J 7PD",
    hours: "Lunes a Sábado: 9:00 - 20:00",
    phone: "+44 20 7946 0123",
    description:
      "Ubicado en una de las zonas más exclusivas de Londres, el salón de Mayfair ofrece un ambiente sofisticado y un equipo de barberos expertos dedicados a realzar tu estilo.",
    imageUrl: "/img/mayfair.jpg",
    heroImageUrl: "/img/mayfair.jpg",
  },
  {
    id: 3,
    slug: "spitalfields",
    name: "SPITALFIELDS",
    address: "4 Toynbee Street, London, E1 7NE",
    hours: "Todos los días: 10:00 - 18:00",
    phone: "+44 20 7946 0456",
    description:
      "En el vibrante barrio de Spitalfields, nuestro salón fusiona el espíritu creativo del East End con la tradición de la barbería clásica, en un espacio diseñado para relajarte y renovar tu look.",
    imageUrl: "/img/spitalfields.jpg",
    heroImageUrl: "/img/spitalfields.jpg",
  },
];

export const getLocationBySlug = (slug: string) =>
  locationsData.find((loc) => loc.slug === slug);
