import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";

// ---- CUSTOM CURSOR HANDLER (GLOBAL) ----
document.addEventListener("mousemove", (e) => {
  const cursor = document.querySelector(".custom-cursor") as HTMLElement;
  if (!cursor) return;

  cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
});
document.addEventListener("mousedown", () => {
  const cursor = document.querySelector(".custom-cursor") as HTMLElement;
  if (cursor) cursor.classList.add("cursor-click");
});
document.addEventListener("mouseup", () => {
  const cursor = document.querySelector(".custom-cursor") as HTMLElement;
  if (cursor) cursor.classList.remove("cursor-click");
});
// -----------------------------------------

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
