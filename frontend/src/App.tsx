import "./App.css";
import { Routes, Route } from "react-router-dom";

// Componentes Reutilizables y de Layout
import Header from "./components/Header";
import FooterSection from "./components/FooterSection";

// Componentes de la Home Page
import HeroSection from "./components/HeroSection";
import ServiceCardsSection from "./components/ServiceCardsSection";
import LocationSection from "./components/LocationSection";

// Páginas Completas (Vistas)
import Locations from "./pages/Locations/Locations";
import LocationDetail from "./pages/Locations/LocationDetail";

// Componente Temporal para Rutas Pendientes
const PaginaTemporal = ({ title }: { title: string }) => (
  <h1 style={{ color: "black", paddingTop: "120px", textAlign: "center" }}>
    {title}
  </h1>
);

function App() {
  return (
    <>
      <Header /> {/* El Header siempre visible */}
      <Routes>
        {/* RUTA DE INICIO (HOME PAGE: /) */}
        <Route
          path="/"
          element={
            <>
              <HeroSection />
              <ServiceCardsSection />
              <LocationSection />
            </>
          }
        />

        {/* 1. RUTA DE UBICACION (Carga la página con todas las tarjetas y promos) */}
        <Route path="/UBICACION" element={<Locations />} />

        {/* 2. RUTA DE DETALLE DE UBICACION (ej. /locations/bow-lane) */}
        <Route path="/locations/:locationId" element={<LocationDetail />} />

        {/* ... (Rutas restantes) ... */}
        <Route
          path="/RESERVA"
          element={<PaginaTemporal title="PÁGINA DE RESERVA" />}
        />
        <Route
          path="/SERVICIOS"
          element={<PaginaTemporal title="PÁGINA DE SERVICIOS" />}
        />
        <Route
          path="/TIENDA"
          element={<PaginaTemporal title="PÁGINA DE TIENDA" />}
        />
        <Route
          path="/CUENTA"
          element={<PaginaTemporal title="PÁGINA DE CUENTA" />}
        />
      </Routes>
      {/* ✅ Footer va AQUÍ. Se ve en TODAS las páginas (incluida /UBICACION). */}
      <FooterSection />
    </>
  );
}

export default App;
