# 09 · Prompts para Gemini (uno por uno)

Cada bloque es **un prompt completo**: copialo tal cual en Gemini (Nano Banana / "Crear imágenes"). Debajo de cada uno están el **archivo** donde guardarla, la **relación de aspecto** que conviene elegir y el **tamaño final**.

## Cómo trabajar con Gemini

1. Pegá el prompt y, si la interfaz lo permite, elegí la **relación de aspecto** indicada. Si no, agregá al final: *"Formato horizontal 16:9"* (o la que corresponda).
2. Gemini entrega imágenes de ~1024–2048 px de lado largo. Para llegar al **tamaño final**, escalá/recortá con cualquier editor (Squoosh, Photopea) y exportá en **WebP, calidad 80, menos de 300 KB**.
3. Guardala en `client/public/images/<archivo>` con **exactamente el mismo nombre**: el código no se toca.
4. Si sale con texto, letras o manos raras, pedí: *"Regenerá sin ningún texto ni letras y con manos naturales"*.
5. Personas: usá siempre personas ficticias; no pidas ni subas fotos de personas reales.

> **Importante:** el texto grande de la portada (título, bajada) ya no se genera con IA: son las imágenes `hero/texto-*.png` creadas por `tools/hero-lockups/generate.mjs`. Para el carrusel solo hacen falta las 3 fotos de fondo, con la **mitad izquierda oscura y vacía** (ahí va el texto).

Total: **46 imágenes**.


---

## Portada (carrusel)

### 1. `hero/hero-ritual.webp`

- **Tamaño final:** 2400×1350  ·  **Relación de aspecto en Gemini:** 16:9

```text
Generá una imagen: Primer plano lateral de un barbero afeitando con navaja recta a un cliente reclinado en un sillón de barbería de cuero, espuma blanca en la mandíbula, toalla caliente humeando sobre el hombro. El sujeto ocupa el tercio derecho de la imagen; el tercio izquierdo es oscuro, desenfocado y casi vacío (espejos de marco de madera apenas visibles). Luz cálida lateral desde la derecha, vapor visible. Estilo editorial fotográfico, barbería clásica porteña, luz cálida de tungsteno, tonos madera oscura, cuero marrón, latón envejecido y negro, acentos dorados sutiles, grano de película leve, profundidad de campo corta, sin texto, sin logos, sin marcas de agua, fotorrealista.
```

### 2. `hero/hero-cava.webp`

- **Tamaño final:** 2400×1350  ·  **Relación de aspecto en Gemini:** 16:9

```text
Generá una imagen: Salón privado en un sótano de ladrillo antiguo con bóveda, dos sillones de barbero de cuero Chesterfield a la derecha de la imagen, lámparas colgantes de latón, un vaso de whisky con hielo sobre una mesa de madera en primer plano, tocadiscos en un rincón. Ambiente íntimo y lujoso. La mitad izquierda queda en sombra profunda, con ladrillo oscuro y casi sin detalle. Estilo editorial fotográfico, barbería clásica porteña, luz cálida de tungsteno, tonos madera oscura, cuero marrón, latón envejecido y negro, acentos dorados sutiles, grano de película leve, profundidad de campo corta, sin texto, sin logos, sin marcas de agua, fotorrealista.
```

### 3. `hero/hero-regalo.webp`

- **Tamaño final:** 2400×1350  ·  **Relación de aspecto en Gemini:** 16:9

```text
Generá una imagen: Naturaleza muerta sobre mesa de nogal oscuro, vista a 30 grados: una tarjeta de regalo negra con borde dorado (sin texto), una navaja plegable, una lata de pomada, un peine de carey y una cinta de raso bordó, todo agrupado en el lado derecho. Luz suave de ventana desde arriba a la derecha, fondo negro profundo, la mitad izquierda vacía y oscura. Estilo editorial fotográfico, barbería clásica porteña, luz cálida de tungsteno, tonos madera oscura, cuero marrón, latón envejecido y negro, acentos dorados sutiles, grano de película leve, profundidad de campo corta, sin texto, sin logos, sin marcas de agua, fotorrealista.
```


---

## Home y páginas de contenido

### 4. `home/intro-barbero.webp`

- **Tamaño final:** 1200×1500  ·  **Relación de aspecto en Gemini:** 4:5

```text
Generá una imagen: Retrato vertical de un barbero argentino de unos 35 años con barba prolija y delantal de cuero, afilando una navaja en una correa de cuero frente a un espejo antiguo, mirada concentrada, luz cálida. Estilo editorial fotográfico, barbería clásica porteña, luz cálida de tungsteno, tonos madera oscura, cuero marrón, latón envejecido y negro, acentos dorados sutiles, grano de película leve, profundidad de campo corta, sin texto, sin logos, sin marcas de agua, fotorrealista.
```

### 5. `story/historia-hero.webp`

- **Tamaño final:** 2400×1100  ·  **Relación de aspecto en Gemini:** 21:9
- Gemini no ofrece este formato exacto: generá en 21:9 y recortá a 2400×1100.

```text
Generá una imagen: Interior de una barbería de barrio porteña de mediados del siglo XX restaurada, piso de mosaico calcáreo, sillón de barbero de hierro y cuero, espejos biselados, luz de tarde entrando por una vidriera. Estilo editorial fotográfico, barbería clásica porteña, luz cálida de tungsteno, tonos madera oscura, cuero marrón, latón envejecido y negro, acentos dorados sutiles, grano de película leve, profundidad de campo corta, sin texto, sin logos, sin marcas de agua, fotorrealista.
```

### 6. `story/fundador.webp`

- **Tamaño final:** 1200×1500  ·  **Relación de aspecto en Gemini:** 4:5

```text
Generá una imagen: Barbero mayor de pelo canoso y bigote, camisa blanca arremangada y chaleco, afeitando con navaja a un cliente; retrato cálido tipo fotografía documental. Estilo editorial fotográfico, barbería clásica porteña, luz cálida de tungsteno, tonos madera oscura, cuero marrón, latón envejecido y negro, acentos dorados sutiles, grano de película leve, profundidad de campo corta, sin texto, sin logos, sin marcas de agua, fotorrealista.
```

### 7. `whyus/whyus-hero.webp`

- **Tamaño final:** 2400×1100  ·  **Relación de aspecto en Gemini:** 21:9
- Gemini no ofrece este formato exacto: generá en 21:9 y recortá a 2400×1100.

```text
Generá una imagen: Mesa de trabajo de barbero ordenada vista desde arriba: navajas, tijeras, peines, brochas de afeitar, toallas enrolladas y frascos de vidrio ámbar sobre madera oscura. Estilo editorial fotográfico, barbería clásica porteña, luz cálida de tungsteno, tonos madera oscura, cuero marrón, latón envejecido y negro, acentos dorados sutiles, grano de película leve, profundidad de campo corta, sin texto, sin logos, sin marcas de agua, fotorrealista.
```

### 8. `contact/contacto-hero.webp`

- **Tamaño final:** 2400×1100  ·  **Relación de aspecto en Gemini:** 21:9
- Gemini no ofrece este formato exacto: generá en 21:9 y recortá a 2400×1100.

```text
Generá una imagen: Vidriera de una barbería de noche vista desde la vereda de una calle de Palermo, luz cálida interior, reflejos en el vidrio, sin letras legibles. Estilo editorial fotográfico, barbería clásica porteña, luz cálida de tungsteno, tonos madera oscura, cuero marrón, latón envejecido y negro, acentos dorados sutiles, grano de película leve, profundidad de campo corta, sin texto, sin logos, sin marcas de agua, fotorrealista.
```

### 9. `club/club-hero.webp`

- **Tamaño final:** 2400×1100  ·  **Relación de aspecto en Gemini:** 21:9
- Gemini no ofrece este formato exacto: generá en 21:9 y recortá a 2400×1100.

```text
Generá una imagen: Grupo de tres amigos de 30 años riendo en una barbería mientras uno se corta el pelo, ambiente relajado, cervezas artesanales en la mesa, luz cálida. Estilo editorial fotográfico, barbería clásica porteña, luz cálida de tungsteno, tonos madera oscura, cuero marrón, latón envejecido y negro, acentos dorados sutiles, grano de película leve, profundidad de campo corta, sin texto, sin logos, sin marcas de agua, fotorrealista.
```


---

## Sedes

### 10. `locations/sedes-hero.webp`

- **Tamaño final:** 2400×1100  ·  **Relación de aspecto en Gemini:** 21:9
- Gemini no ofrece este formato exacto: generá en 21:9 y recortá a 2400×1100.

```text
Generá una imagen: Esquina de Buenos Aires al atardecer con edificios de estilo francés, calle adoquinada, un local con toldo verde oscuro y luz cálida (sin letreros legibles). Estilo editorial fotográfico, barbería clásica porteña, luz cálida de tungsteno, tonos madera oscura, cuero marrón, latón envejecido y negro, acentos dorados sutiles, grano de película leve, profundidad de campo corta, sin texto, sin logos, sin marcas de agua, fotorrealista.
```

### 11. `locations/palermo-hero.webp`

- **Tamaño final:** 1800×1200  ·  **Relación de aspecto en Gemini:** 3:2

```text
Generá una imagen: Barbería en Palermo Soho con ladrillo a la vista, plantas colgantes, cuatro sillones de cuero en fila, espejos redondos, luz natural cálida. Estilo editorial fotográfico, barbería clásica porteña, luz cálida de tungsteno, tonos madera oscura, cuero marrón, latón envejecido y negro, acentos dorados sutiles, grano de película leve, profundidad de campo corta, sin texto, sin logos, sin marcas de agua, fotorrealista.
```

### 12. `locations/palermo-1.webp`

- **Tamaño final:** 1200×900  ·  **Relación de aspecto en Gemini:** 4:3

```text
Generá una imagen: Detalle de estación de trabajo en Palermo: espejo redondo, repisa con productos en frascos ámbar, sillón de cuero marrón. Estilo editorial fotográfico, barbería clásica porteña, luz cálida de tungsteno, tonos madera oscura, cuero marrón, latón envejecido y negro, acentos dorados sutiles, grano de película leve, profundidad de campo corta, sin texto, sin logos, sin marcas de agua, fotorrealista.
```

### 13. `locations/palermo-2.webp`

- **Tamaño final:** 1200×900  ·  **Relación de aspecto en Gemini:** 4:3

```text
Generá una imagen: Barra de café dentro de la barbería con máquina de espresso, taza humeante y un cliente esperando en un sillón. Estilo editorial fotográfico, barbería clásica porteña, luz cálida de tungsteno, tonos madera oscura, cuero marrón, latón envejecido y negro, acentos dorados sutiles, grano de película leve, profundidad de campo corta, sin texto, sin logos, sin marcas de agua, fotorrealista.
```

### 14. `locations/recoleta-hero.webp`

- **Tamaño final:** 1800×1200  ·  **Relación de aspecto en Gemini:** 3:2

```text
Generá una imagen: Salón elegante en una casona antigua de Recoleta, techos altos con molduras, arañas de cristal, piso de madera en espiga, sillones de barbero negros. Estilo editorial fotográfico, barbería clásica porteña, luz cálida de tungsteno, tonos madera oscura, cuero marrón, latón envejecido y negro, acentos dorados sutiles, grano de película leve, profundidad de campo corta, sin texto, sin logos, sin marcas de agua, fotorrealista.
```

### 15. `locations/recoleta-1.webp`

- **Tamaño final:** 1200×900  ·  **Relación de aspecto en Gemini:** 4:3

```text
Generá una imagen: Escalera de hierro forjado que baja a un sótano iluminado cálidamente. Estilo editorial fotográfico, barbería clásica porteña, luz cálida de tungsteno, tonos madera oscura, cuero marrón, latón envejecido y negro, acentos dorados sutiles, grano de película leve, profundidad de campo corta, sin texto, sin logos, sin marcas de agua, fotorrealista.
```

### 16. `locations/recoleta-2.webp`

- **Tamaño final:** 1200×900  ·  **Relación de aspecto en Gemini:** 4:3

```text
Generá una imagen: Detalle de lavacabezas de cerámica negra con griferías de bronce en un salón de lujo. Estilo editorial fotográfico, barbería clásica porteña, luz cálida de tungsteno, tonos madera oscura, cuero marrón, latón envejecido y negro, acentos dorados sutiles, grano de película leve, profundidad de campo corta, sin texto, sin logos, sin marcas de agua, fotorrealista.
```

### 17. `locations/microcentro-hero.webp`

- **Tamaño final:** 1800×1200  ·  **Relación de aspecto en Gemini:** 3:2

```text
Generá una imagen: Barbería moderna y sobria en el microcentro porteño, líneas rectas, madera clara y negro, ejecutivo con traje en el sillón. Estilo editorial fotográfico, barbería clásica porteña, luz cálida de tungsteno, tonos madera oscura, cuero marrón, latón envejecido y negro, acentos dorados sutiles, grano de película leve, profundidad de campo corta, sin texto, sin logos, sin marcas de agua, fotorrealista.
```

### 18. `locations/microcentro-1.webp`

- **Tamaño final:** 1200×900  ·  **Relación de aspecto en Gemini:** 4:3

```text
Generá una imagen: Barbero haciendo un corte rápido a un hombre de traje, reloj de pared visible, ambiente de oficina elegante. Estilo editorial fotográfico, barbería clásica porteña, luz cálida de tungsteno, tonos madera oscura, cuero marrón, latón envejecido y negro, acentos dorados sutiles, grano de película leve, profundidad de campo corta, sin texto, sin logos, sin marcas de agua, fotorrealista.
```


---

## Servicios

### 19. `services/servicios-hero.webp`

- **Tamaño final:** 2400×1100  ·  **Relación de aspecto en Gemini:** 21:9
- Gemini no ofrece este formato exacto: generá en 21:9 y recortá a 2400×1100.

```text
Generá una imagen: Plano cenital de herramientas de barbería alineadas sobre una toalla negra: navaja recta, tijera, máquina de cortar, peine de carey y brocha de afeitar, con espacio libre a la izquierda. Estilo editorial fotográfico, barbería clásica porteña, luz cálida de tungsteno, tonos madera oscura, cuero marrón, latón envejecido y negro, acentos dorados sutiles, grano de película leve, profundidad de campo corta, sin texto, sin logos, sin marcas de agua, fotorrealista.
```

### 20. `services/corte-clasico.webp`

- **Tamaño final:** 1200×900  ·  **Relación de aspecto en Gemini:** 4:3

```text
Generá una imagen: Barbero cortando con tijera y peine el pelo de un hombre de unos 30 años, con la raya al costado marcada, vista de tres cuartos por detrás; se ven la tijera abierta y mechones de pelo cayendo, capa negra sobre el cliente. La acción del servicio es claramente visible; el protagonista es el servicio y no el retrato. Estilo editorial fotográfico, barbería clásica porteña, luz cálida de tungsteno, tonos madera oscura, cuero marrón, latón envejecido y negro, acentos dorados sutiles, grano de película leve, profundidad de campo corta, sin texto, sin logos, sin marcas de agua, fotorrealista.
```

### 21. `services/fade.webp`

- **Tamaño final:** 1200×900  ·  **Relación de aspecto en Gemini:** 4:3

```text
Generá una imagen: Barbero pasando la máquina por la nuca y los costados de un cliente, degradé de piel a pelo largo con transición muy limpia, vista lateral trasera; la máquina en acción y el degradé bien definido son lo más visible. La acción del servicio es claramente visible; el protagonista es el servicio y no el retrato. Estilo editorial fotográfico, barbería clásica porteña, luz cálida de tungsteno, tonos madera oscura, cuero marrón, latón envejecido y negro, acentos dorados sutiles, grano de película leve, profundidad de campo corta, sin texto, sin logos, sin marcas de agua, fotorrealista.
```

### 22. `services/barba.webp`

- **Tamaño final:** 1200×900  ·  **Relación de aspecto en Gemini:** 4:3

```text
Generá una imagen: Primer plano de la mejilla de un hombre con barba tupida mientras un barbero perfila el contorno con navaja recta; línea de la barba nítida, aceite brillando en el vello, guantes negros. La acción del servicio es claramente visible; el protagonista es el servicio y no el retrato. Estilo editorial fotográfico, barbería clásica porteña, luz cálida de tungsteno, tonos madera oscura, cuero marrón, latón envejecido y negro, acentos dorados sutiles, grano de película leve, profundidad de campo corta, sin texto, sin logos, sin marcas de agua, fotorrealista.
```

### 23. `services/corte-y-barba.webp`

- **Tamaño final:** 1200×900  ·  **Relación de aspecto en Gemini:** 4:3

```text
Generá una imagen: Hombre de 35 años con corte recién hecho y barba perfilada, sentado en el sillón de barbero mirándose al espejo con gesto satisfecho; el barbero detrás con un peine, se ven las dos cosas: pelo y barba impecables. La acción del servicio es claramente visible; el protagonista es el servicio y no el retrato. Estilo editorial fotográfico, barbería clásica porteña, luz cálida de tungsteno, tonos madera oscura, cuero marrón, latón envejecido y negro, acentos dorados sutiles, grano de película leve, profundidad de campo corta, sin texto, sin logos, sin marcas de agua, fotorrealista.
```

### 24. `services/afeitado.webp`

- **Tamaño final:** 1200×900  ·  **Relación de aspecto en Gemini:** 4:3

```text
Generá una imagen: Cliente recostado en el sillón con la cara cubierta de espuma blanca y una toalla caliente humeante sobre la frente, mientras el barbero afila o sostiene la navaja recta junto a su mejilla; vapor visible. La acción del servicio es claramente visible; el protagonista es el servicio y no el retrato. Estilo editorial fotográfico, barbería clásica porteña, luz cálida de tungsteno, tonos madera oscura, cuero marrón, latón envejecido y negro, acentos dorados sutiles, grano de película leve, profundidad de campo corta, sin texto, sin logos, sin marcas de agua, fotorrealista.
```

### 25. `services/padre-hijo.webp`

- **Tamaño final:** 1200×900  ·  **Relación de aspecto en Gemini:** 4:3

```text
Generá una imagen: **Dos personas:** un padre de 38 años sentado en un sillón de barbería y su hijo de 8 años en el sillón de al lado, con capa de corte a su medida, mientras uno de los barberos le corta el pelo al niño; ambos sonríen y se miran entre sí, ambiente tierno y cálido. La acción del servicio es claramente visible; el protagonista es el servicio y no el retrato. Estilo editorial fotográfico, barbería clásica porteña, luz cálida de tungsteno, tonos madera oscura, cuero marrón, latón envejecido y negro, acentos dorados sutiles, grano de película leve, profundidad de campo corta, sin texto, sin logos, sin marcas de agua, fotorrealista.
```

### 26. `services/color.webp`

- **Tamaño final:** 1200×900  ·  **Relación de aspecto en Gemini:** 4:3

```text
Generá una imagen: Joven de unos 25 años con el pelo corto **decolorado platinado casi blanco**, de perfil, con un barbero con guantes negros aplicando decolorante o matizante con pincel sobre la parte superior; se ve claramente el contraste entre el rubio platino y las raíces oscuras o la cara de cliente satisfecho con el resultado final. La acción del servicio es claramente visible; el protagonista es el servicio y no el retrato. Estilo editorial fotográfico, barbería clásica porteña, luz cálida de tungsteno, tonos madera oscura, cuero marrón, latón envejecido y negro, acentos dorados sutiles, grano de película leve, profundidad de campo corta, sin texto, sin logos, sin marcas de agua, fotorrealista.
```

### 27. `services/facial.webp`

- **Tamaño final:** 1200×900  ·  **Relación de aspecto en Gemini:** 4:3

```text
Generá una imagen: Hombre recostado y relajado con **máscara facial negra de carbón** cubriendo el rostro, rodajas de pepino sobre los ojos y una toalla blanca en el cuello; luz suave, vapor de un vaporizador, frascos de vidrio ámbar al fondo. La acción del servicio es claramente visible; el protagonista es el servicio y no el retrato. Estilo editorial fotográfico, barbería clásica porteña, luz cálida de tungsteno, tonos madera oscura, cuero marrón, latón envejecido y negro, acentos dorados sutiles, grano de película leve, profundidad de campo corta, sin texto, sin logos, sin marcas de agua, fotorrealista.
```

### 28. `services/ritual.webp`

- **Tamaño final:** 1200×900  ·  **Relación de aspecto en Gemini:** 4:3

```text
Generá una imagen: Sillón de cuero en un sótano de ladrillo, cliente con toalla caliente sobre el rostro mientras el barbero le da un **masaje de hombros**; en primer plano, desenfocado, un vaso de whisky con hielo sobre una mesa auxiliar de madera. La acción del servicio es claramente visible; el protagonista es el servicio y no el retrato. Estilo editorial fotográfico, barbería clásica porteña, luz cálida de tungsteno, tonos madera oscura, cuero marrón, latón envejecido y negro, acentos dorados sutiles, grano de película leve, profundidad de campo corta, sin texto, sin logos, sin marcas de agua, fotorrealista.
```

### 29. `services/presidente.webp`

- **Tamaño final:** 1200×900  ·  **Relación de aspecto en Gemini:** 4:3

```text
Generá una imagen: Escena de lujo máximo: cliente recostado con toalla caliente y máscara de ojos, barbero con guantes trabajando con una navaja, mesa auxiliar con botella de whisky premium, vaso, hilo de depilación y frascos de vidrio ámbar; iluminación cálida dramática. La acción del servicio es claramente visible; el protagonista es el servicio y no el retrato. Estilo editorial fotográfico, barbería clásica porteña, luz cálida de tungsteno, tonos madera oscura, cuero marrón, latón envejecido y negro, acentos dorados sutiles, grano de película leve, profundidad de campo corta, sin texto, sin logos, sin marcas de agua, fotorrealista.
```


---

## Salón VIP "La Cava"

### 30. `vip/cava-hero.webp`

- **Tamaño final:** 2400×1100  ·  **Relación de aspecto en Gemini:** 21:9
- Gemini no ofrece este formato exacto: generá en 21:9 y recortá a 2400×1100.

```text
Generá una imagen: Vista amplia del salón subterráneo La Cava: bóveda de ladrillo, dos sillones de barbero de cuero vintage, luz baja cálida, estantería con botellas de whisky. Estilo editorial fotográfico, barbería clásica porteña, luz cálida de tungsteno, tonos madera oscura, cuero marrón, latón envejecido y negro, acentos dorados sutiles, grano de película leve, profundidad de campo corta, sin texto, sin logos, sin marcas de agua, fotorrealista.
```

### 31. `vip/cava-ambiente.webp`

- **Tamaño final:** 2400×1350  ·  **Relación de aspecto en Gemini:** 16:9

```text
Generá una imagen: Detalle atmosférico: vaso de whisky sobre posavasos de cuero, sillón de barbero desenfocado detrás, humo suave, luz dorada. Estilo editorial fotográfico, barbería clásica porteña, luz cálida de tungsteno, tonos madera oscura, cuero marrón, latón envejecido y negro, acentos dorados sutiles, grano de película leve, profundidad de campo corta, sin texto, sin logos, sin marcas de agua, fotorrealista.
```

### 32. `vip/cava-sillon.webp`

- **Tamaño final:** 1600×1200  ·  **Relación de aspecto en Gemini:** 4:3

```text
Generá una imagen: Sillón de barbero antiguo de cuero marrón capitoné y cromo, iluminado con un spot sobre fondo de ladrillo. Estilo editorial fotográfico, barbería clásica porteña, luz cálida de tungsteno, tonos madera oscura, cuero marrón, latón envejecido y negro, acentos dorados sutiles, grano de película leve, profundidad de campo corta, sin texto, sin logos, sin marcas de agua, fotorrealista.
```


---

## Tienda (producto sobre fondo neutro, 1200×1200, cuadrado)

### 33. `shop/tienda-hero.webp`

- **Tamaño final:** 2400×1100  ·  **Relación de aspecto en Gemini:** 21:9
- Gemini no ofrece este formato exacto: generá en 21:9 y recortá a 2400×1100.

```text
Generá una imagen: Estantería de madera oscura con productos de grooming en frascos ámbar y latas negras sin etiquetas legibles. Estilo editorial fotográfico, barbería clásica porteña, luz cálida de tungsteno, tonos madera oscura, cuero marrón, latón envejecido y negro, acentos dorados sutiles, grano de película leve, profundidad de campo corta, sin texto, sin logos, sin marcas de agua, fotorrealista.
```

### 34. `shop/pomada-mate.webp`

- **Tamaño final:** 1200×1200  ·  **Relación de aspecto en Gemini:** 1:1

```text
Generá una imagen: Lata redonda negra mate de pomada para el pelo, abierta, textura crema visible, sobre piedra oscura, etiqueta dorada sin texto. Fotografía de producto de estudio, fondo oscuro neutro, luz cálida lateral suave, reflejos sutiles, sin texto, sin logos, sin marcas de agua, fotorrealista, alta definición.
```

### 35. `shop/cera-brillo.webp`

- **Tamaño final:** 1200×1200  ·  **Relación de aspecto en Gemini:** 1:1

```text
Generá una imagen: Frasco de vidrio con cera brillante para el pelo, tapa dorada, sobre madera oscura. Fotografía de producto de estudio, fondo oscuro neutro, luz cálida lateral suave, reflejos sutiles, sin texto, sin logos, sin marcas de agua, fotorrealista, alta definición.
```

### 36. `shop/aceite-barba.webp`

- **Tamaño final:** 1200×1200  ·  **Relación de aspecto en Gemini:** 1:1

```text
Generá una imagen: Gotero de vidrio ámbar con aceite para barba, gota cayendo, ramitas de sándalo al costado. Fotografía de producto de estudio, fondo oscuro neutro, luz cálida lateral suave, reflejos sutiles, sin texto, sin logos, sin marcas de agua, fotorrealista, alta definición.
```

### 37. `shop/shampoo.webp`

- **Tamaño final:** 1200×1200  ·  **Relación de aspecto en Gemini:** 1:1

```text
Generá una imagen: Botella de shampoo negra mate con dosificador, hojas de menta frescas, gotas de agua. Fotografía de producto de estudio, fondo oscuro neutro, luz cálida lateral suave, reflejos sutiles, sin texto, sin logos, sin marcas de agua, fotorrealista, alta definición.
```

### 38. `shop/perfume.webp`

- **Tamaño final:** 1200×1200  ·  **Relación de aspecto en Gemini:** 1:1

```text
Generá una imagen: Frasco de perfume masculino de vidrio facetado ámbar con tapa de latón, hojas de tabaco secas y cuero de fondo. Fotografía de producto de estudio, fondo oscuro neutro, luz cálida lateral suave, reflejos sutiles, sin texto, sin logos, sin marcas de agua, fotorrealista, alta definición.
```

### 39. `shop/peine.webp`

- **Tamaño final:** 1200×1200  ·  **Relación de aspecto en Gemini:** 1:1

```text
Generá una imagen: Peine de carey sobre un paño de cuero marrón, luz lateral. Fotografía de producto de estudio, fondo oscuro neutro, luz cálida lateral suave, reflejos sutiles, sin texto, sin logos, sin marcas de agua, fotorrealista, alta definición.
```

### 40. `shop/giftcard.webp`

- **Tamaño final:** 1200×1200  ·  **Relación de aspecto en Gemini:** 1:1

```text
Generá una imagen: Tarjeta de regalo negra con borde dorado dentro de un sobre de papel kraft, lacre bordó, sin texto. Fotografía de producto de estudio, fondo oscuro neutro, luz cálida lateral suave, reflejos sutiles, sin texto, sin logos, sin marcas de agua, fotorrealista, alta definición.
```


---

## Barberos (retratos 800×800, fondo oscuro uniforme, luz Rembrandt, delantal de cuero)

### 41. `barbers/lucas.webp`

- **Tamaño final:** 800×800  ·  **Relación de aspecto en Gemini:** 1:1

```text
Generá una imagen: Barbero de 30 años, pelo con fade y tatuajes en los antebrazos, sonrisa leve, brazos cruzados. Retrato fotográfico de estudio, fondo oscuro uniforme, luz Rembrandt, delantal de cuero, persona ficticia (no una persona real), sin texto, sin logos, sin marcas de agua, fotorrealista, alta definición.
```

### 42. `barbers/matias.webp`

- **Tamaño final:** 800×800  ·  **Relación de aspecto en Gemini:** 1:1

```text
Generá una imagen: Barbero de 40 años, barba tupida canosa, camisa blanca arremangada y tijera en la mano. Retrato fotográfico de estudio, fondo oscuro uniforme, luz Rembrandt, delantal de cuero, persona ficticia (no una persona real), sin texto, sin logos, sin marcas de agua, fotorrealista, alta definición.
```

### 43. `barbers/ezequiel.webp`

- **Tamaño final:** 800×800  ·  **Relación de aspecto en Gemini:** 1:1

```text
Generá una imagen: Barbero de 35 años, elegante, chaleco negro, bigote cuidado, navaja en la mano. Retrato fotográfico de estudio, fondo oscuro uniforme, luz Rembrandt, delantal de cuero, persona ficticia (no una persona real), sin texto, sin logos, sin marcas de agua, fotorrealista, alta definición.
```

### 44. `barbers/tomas.webp`

- **Tamaño final:** 800×800  ·  **Relación de aspecto en Gemini:** 1:1

```text
Generá una imagen: Barbero de 28 años, pelo teñido platinado, estilo moderno, mirada a cámara. Retrato fotográfico de estudio, fondo oscuro uniforme, luz Rembrandt, delantal de cuero, persona ficticia (no una persona real), sin texto, sin logos, sin marcas de agua, fotorrealista, alta definición.
```

### 45. `barbers/nicolas.webp`

- **Tamaño final:** 800×800  ·  **Relación de aspecto en Gemini:** 1:1

```text
Generá una imagen: Barbero de 33 años, camisa negra, reloj, aspecto ejecutivo, peine en el bolsillo. Retrato fotográfico de estudio, fondo oscuro uniforme, luz Rembrandt, delantal de cuero, persona ficticia (no una persona real), sin texto, sin logos, sin marcas de agua, fotorrealista, alta definición.
```

### 46. `barbers/santiago.webp`

- **Tamaño final:** 800×800  ·  **Relación de aspecto en Gemini:** 1:1

```text
Generá una imagen: Barbero de 38 años, barba perfilada perfecta, gorra plana, delantal de jean. Retrato fotográfico de estudio, fondo oscuro uniforme, luz Rembrandt, delantal de cuero, persona ficticia (no una persona real), sin texto, sin logos, sin marcas de agua, fotorrealista, alta definición.
```


## Negativo (si tu herramienta lo permite)

```text
texto, letras, logos, marcas de agua, manos deformes, dedos de más, caras deformadas, estilo caricatura, colores saturados, neón
```
