import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { PageLoader } from "@/components/ui";
import { CartDrawer } from "../CartDrawer/CartDrawer";
import { CookieBanner } from "../CookieBanner/CookieBanner";
import { Footer } from "../Footer/Footer";
import { Header } from "../Header/Header";
import { WhatsAppFloat } from "../WhatsAppFloat/WhatsAppFloat";
import styles from "./MainLayout.module.css";

export function MainLayout() {
  return (
    <div className={styles.layout}>
      <a href="#contenido" className={styles.skip}>Saltar al contenido</a>
      <Header />
      <main id="contenido" className={styles.main}>
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <CartDrawer />
      <WhatsAppFloat />
      <CookieBanner />
    </div>
  );
}
