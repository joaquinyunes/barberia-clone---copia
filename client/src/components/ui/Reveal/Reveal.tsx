import { motion } from "framer-motion";
import type { ReactNode } from "react";

/** Aparición suave al entrar en pantalla. */
export const Reveal = ({ children, delay = 0, y = 24, className }: { children: ReactNode; delay?: number; y?: number; className?: string }) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-60px" }}
    transition={{ duration: 0.6, delay, ease: [0.2, 0.7, 0.2, 1] }}
  >
    {children}
  </motion.div>
);
