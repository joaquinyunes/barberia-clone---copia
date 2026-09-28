import { Navigate } from "react-router-dom";
import { paths } from "@/app/router/paths";

/** El carrito vive en un panel lateral; esta ruta lo abre en el checkout. */
export default function CartPage() {
  return <Navigate to={paths.checkout} replace />;
}
