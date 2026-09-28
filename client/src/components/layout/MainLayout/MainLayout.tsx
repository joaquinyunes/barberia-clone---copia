import { Suspense } from "react";
import { motion } from "framer-motion";
import { Outlet, useLocation } from "react-router-dom";
import { PageLoader } from "@/components/ui";
import { CartDrawer } from "../CartDrawer/CartDrawer";
import { CookieBanner } from "../CookieBanner/CookieBanner";
import { CustomCursor } from "../CustomCursor/CustomCursor";
import { Footer } from "../Footer/Footer";
import { Header } from "../Header/Header";
import { Preloader } from "../Preloader/Preloader";
import { ScrollProgress } from "../ScrollProgress/ScrollProgress";
import { WhatsAppFloat } from "../WhatsAppFloat/WhatsAppFloat";
import styles from "./MainLayout.module.css";

export function MainLayout() {
  const { pathname } = useLocation();
  return (
    <div className={styles.layout}>
      <a href="#contenido" className={styles.skip}>Saltar al contenido</a>
      <Preloader />
      <ScrollProgress />
      <Header />
      <main id="contenido" className={styles.main}>
        <Suspense fallback={<PageLoader />}>
          {/* Transición suave entre páginas */}
          <motion.div key={pathname} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
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
