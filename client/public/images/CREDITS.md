# Créditos de imágenes

**Octubre 2026:** todas las fotos del sitio (portada, home, sedes, servicios, La Cava, tienda y barberos) fueron
**generadas con IA (Google Gemini)** a partir de los prompts de `docs/09-PROMPTS-GEMINI.md`, y luego recortadas y
convertidas a WebP con `tools/image-convert/convert.mjs`. Representan situaciones y personas ficticias.
Los textos grandes de la portada (`hero/texto-*.png`) se generan con `tools/hero-lockups/generate.mjs`.

Las fotos de stock que se usaban antes (abajo) quedaron reemplazadas, salvo `gallery/*` y `home/card-*`, `home/cta-sillon`,
`home/intro-detalle`, que siguen siendo las originales.

---

## Fotos de stock anteriores (referencia)

Las fotos provienen del repositorio público [pavlo-myskov/barber-shop](https://github.com/pavlo-myskov/barber-shop),
cuyo README indica: *"All photos used in the project were downloaded from sources with a free license and do not require attribution."*
Los nombres de archivo originales indican la fuente (Pexels, Unsplash, Pixabay); igual dejamos el crédito:

| Archivo original | Autor / fuente | Usado en |
|---|---|---|
| `pexels-nikolaos-dimou.webp` | Nikolaos Dimou · Pexels | hero-ritual, galeria-2, servicios-hero, recoleta-2, presidente |
| `theo-rivierenlaan-pixabay.webp` | Theo Rivierenlaan · Pixabay | hero-cava, cava-*, historia-hero, recoleta-hero, ritual |
| `pexels-gonzalo-guzman.webp` | Gonzalo Guzmán · Pexels | hero-regalo, card-tienda, tienda-hero |
| `pexels-lisa-fotios.webp` | Lisa Fotios · Pexels | card-sedes, sedes-hero, cava-sillon, palermo-hero |
| `pexels-thgusstavo-santana-*.webp` | Thgusstavo Santana · Pexels | intro, cards, galería, servicios, barberos |
| `nathan-fertig-unsplash-*.webp` | Nathan Fertig · Unsplash | cta-sillon, galeria-4, contacto-hero, padre-hijo, ezequiel |
| `joseph-gonzalez-unsplash-*.webp` | Joseph Gonzalez · Unsplash | galeria-1, lucas |
| `pexels-alex-urezkov-verdi.webp` | Alex Urezkov · Pexels | galeria-6, recoleta-1, corte-y-barba |
| `pexels-andrea-piacquadio-faux-hawk.webp` | Andrea Piacquadio · Pexels | club-hero, microcentro-hero, color, nicolas |
| `pixabay-goatee.webp` | Pixabay | galeria-7, tomas |
| `pexels-safa-bakirci-stubble-beard.webp` | Safa Bakirci · Pexels | galeria-8, facial, matias |

Los productos de `shop/*.svg` son ilustraciones propias del proyecto.

Son fotos de stock de ejemplo: para producción conviene reemplazarlas por fotos reales de las sedes y del equipo
(mismas rutas y nombres, así no hay que tocar código) — ver `docs/08-PROMPTS-IMAGENES.md`.
