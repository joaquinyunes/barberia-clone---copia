import { Suspense } from "react";
import { motion } from "framer-motion";
import { Outlet, useLocation } from "react-router-dom";
import { PageLoader } from "@/components/ui";
import { EASE_OUT } from "@/components/ui/Motion/easing";
import { CartDrawer } from "../CartDrawer/CartDrawer";
import { CookieBanner } from "../CookieBanner/CookieBanner";
import { CustomCursor } from "../CustomCursor/CustomCursor";
import { Footer } from "../Footer/Footer";
import { Header } from "../Header/Header";
import { Preloader } from "../Preloader/Preloader";
import { ProximityPump } from "../ProximityPump/ProximityPump";
import { ScrollProgress } from "../ScrollProgress/ScrollProgress";
import { SmoothScroll } from "../SmoothScroll/SmoothScroll";
import { WhatsAppFloat } from "../WhatsAppFloat/WhatsAppFloat";
import styles from "./MainLayout.module.css";

export function MainLayout() {
  const { pathname } = useLocation();
  return (
    <div className={styles.layout}>
      <a href="#contenido" className={styles.skip}>Saltar al contenido</a>
      <SmoothScroll />
      <ProximityPump />
      <Preloader />
      <ScrollProgress />
      <Header />
      <main id="contenido" className={styles.main}>
        <Suspense fallback={<PageLoader />}>
          {/* Transición suave entre páginas */}
          <motion.div key={pathname} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.9, ease: EASE_OUT }}>
            <Outlet />
          </motion.div>
        </Suspense>
      </main>
      <Footer />
      <CartDrawer />
      <WhatsAppFloat />
      <CookieBanner />
      <CustomCursor />
    </div>
  );
}
