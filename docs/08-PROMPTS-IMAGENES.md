# 08 · Prompts para generar las imágenes

El sitio ya funciona sin fotos: mientras un archivo no exista, muestra un placeholder con la marca. Generá cada imagen con el prompt, exportala en **WebP** y guardala en `client/public/images/<ruta>` con **el mismo nombre**. No hace falta tocar código.

**Estilo común** (agregalo al final de cada prompt si tu generador no recuerda contexto):

> *Estilo editorial fotográfico, barbería clásica porteña, luz cálida de tungsteno, tonos madera oscura, cuero marrón, latón envejecido y negro, acentos dorados sutiles, grano de película leve, profundidad de campo corta, sin texto, sin logos, sin marcas de agua, 8k, fotorrealista.*

Negativo sugerido: `texto, letras, logos, marcas, manos deformes, dedos de más, caras deformadas, estilo caricatura, colores saturados, neón`.

> Importante: no uses fotos, logos ni ilustraciones de la barbería londinense de referencia. Por eso se quitaron las que estaban en `public/img`.

## Portada (carrusel)

| Archivo | Tamaño | Prompt |
|---|---|---|
| `hero/hero-ritual.webp` | 2400×1350 | Primer plano lateral de un barbero afeitando con navaja recta a un cliente reclinado en un sillón de barbería de cuero, espuma blanca en la mandíbula, toalla caliente humeando al costado, fondo oscuro desenfocado con espejos de marco de madera, luz cálida lateral. Composición con espacio negativo oscuro a la izquierda para el texto. |
| `hero/hero-cava.webp` | 2400×1350 | Salón privado en un sótano de ladrillo antiguo con bóveda, dos sillones de barbero de cuero Chesterfield, lámparas colgantes de latón, un vaso de whisky con hielo sobre una mesa de madera, tocadiscos en un rincón, ambiente íntimo y lujoso. Espacio oscuro a la izquierda. |
| `hero/hero-regalo.webp` | 2400×1350 | Naturaleza muerta sobre mesa de nogal oscuro: una tarjeta de regalo negra con borde dorado (sin texto), una navaja plegable, una lata de pomada, un peine de carey y una cinta de raso bordó, luz de ventana suave, fondo negro. |

## Home y páginas de contenido

| Archivo | Tamaño | Prompt |
|---|---|---|
| `home/intro-barbero.webp` | 1200×1500 | Retrato vertical de un barbero argentino de unos 35 años con barba prolija y delantal de cuero, afilando una navaja en una correa de cuero frente a un espejo antiguo, mirada concentrada, luz cálida. |
| `story/historia-hero.webp` | 2400×1100 | Interior de una barbería de barrio porteña de mediados del siglo XX restaurada, piso de mosaico calcáreo, sillón de barbero de hierro y cuero, espejos biselados, luz de tarde entrando por una vidriera. |
| `story/fundador.webp` | 1200×1500 | Barbero mayor de pelo canoso y bigote, camisa blanca arremangada y chaleco, afeitando con navaja a un cliente; retrato cálido tipo fotografía documental. |
| `whyus/whyus-hero.webp` | 2400×1100 | Mesa de trabajo de barbero ordenada vista desde arriba: navajas, tijeras, peines, brochas de afeitar, toallas enrolladas y frascos de vidrio ámbar sobre madera oscura. |
| `contact/contacto-hero.webp` | 2400×1100 | Vidriera de una barbería de noche vista desde la vereda de una calle de Palermo, luz cálida interior, reflejos en el vidrio, sin letras legibles. |
| `club/club-hero.webp` | 2400×1100 | Grupo de tres amigos de 30 años riendo en una barbería mientras uno se corta el pelo, ambiente relajado, cervezas artesanales en la mesa, luz cálida. |

## Sedes

| Archivo | Tamaño | Prompt |
|---|---|---|
| `locations/sedes-hero.webp` | 2400×1100 | Esquina de Buenos Aires al atardecer con edificios de estilo francés, calle adoquinada, un local con toldo verde oscuro y luz cálida (sin letreros legibles). |
| `locations/palermo-hero.webp` | 1800×1200 | Barbería en Palermo Soho con ladrillo a la vista, plantas colgantes, cuatro sillones de cuero en fila, espejos redondos, luz natural cálida. |
| `locations/palermo-1.webp` | 1200×900 | Detalle de estación de trabajo en Palermo: espejo redondo, repisa con productos en frascos ámbar, sillón de cuero marrón. |
| `locations/palermo-2.webp` | 1200×900 | Barra de café dentro de la barbería con máquina de espresso, taza humeante y un cliente esperando en un sillón. |
| `locations/recoleta-hero.webp` | 1800×1200 | Salón elegante en una casona antigua de Recoleta, techos altos con molduras, arañas de cristal, piso de madera en espiga, sillones de barbero negros. |
| `locations/recoleta-1.webp` | 1200×900 | Escalera de hierro forjado que baja a un sótano iluminado cálidamente. |
| `locations/recoleta-2.webp` | 1200×900 | Detalle de lavacabezas de cerámica negra con griferías de bronce en un salón de lujo. |
| `locations/microcentro-hero.webp` | 1800×1200 | Barbería moderna y sobria en el microcentro porteño, líneas rectas, madera clara y negro, ejecutivo con traje en el sillón. |
| `locations/microcentro-1.webp` | 1200×900 | Barbero haciendo un corte rápido a un hombre de traje, reloj de pared visible, ambiente de oficina elegante. |

## Servicios

Formato 1200×900, fondo oscuro, plano cercano, sin mostrar caras completas si es posible.

| Archivo | Prompt |
|---|---|
| `services/servicios-hero.webp` (2400×1100) | Plano cenital de herramientas de barbería alineadas sobre una toalla negra: navaja, tijera, máquina, peine y brocha. |
| `services/corte-clasico.webp` | Corte clásico con tijera y peine, raya al costado, vista lateral de la nuca prolija. |
| `services/fade.webp` | Degradé (fade) de piel a corto, vista trasera y lateral, líneas muy limpias, máquina en la mano del barbero. |
| `services/barba.webp` | Perfilado de barba con navaja en la mejilla, línea definida, aceite brillando en la barba. |
| `services/corte-y-barba.webp` | Hombre con corte fresco y barba perfilada mirándose al espejo del barbero, satisfecho. |
| `services/afeitado.webp` | Afeitado ritual: rostro cubierto con toalla caliente humeante, barbero preparando la navaja al lado. |
| `services/padre-hijo.webp` | Padre e hijo de 8 años en sillones contiguos de barbería, el niño con capa, ambiente tierno y cálido. |
| `services/color.webp` | Barbero aplicando decolorante platinado con pincel en el pelo corto de un joven, guantes negros. |
| `services/facial.webp` | Hombre recostado con máscara facial negra de carbón, rodajas de pepino, luz suave. |
| `services/ritual.webp` | Masaje de hombros en sillón de cuero en un sótano de ladrillo, vaso de whisky en primer plano. |
| `services/presidente.webp` | Escena de lujo: cliente recostado con toalla caliente, barbero con guantes, mesa auxiliar con whisky premium, habano apagado y productos de vidrio ámbar. |

## Salón VIP "La Cava"

| Archivo | Tamaño | Prompt |
|---|---|---|
| `vip/cava-hero.webp` | 2400×1100 | Vista amplia del salón subterráneo La Cava: bóveda de ladrillo, dos sillones de barbero de cuero vintage, luz baja cálida, estantería con botellas de whisky. |
| `vip/cava-ambiente.webp` | 2400×1350 | Detalle atmosférico: vaso de whisky sobre posavasos de cuero, sillón de barbero desenfocado detrás, humo suave, luz dorada. |
| `vip/cava-sillon.webp` | 1600×1200 | Sillón de barbero antiguo de cuero marrón capitoné y cromo, iluminado con un spot sobre fondo de ladrillo. |

## Tienda (producto sobre fondo neutro, 1200×1200, cuadrado)

| Archivo | Prompt |
|---|---|
| `shop/tienda-hero.webp` (2400×1100) | Estantería de madera oscura con productos de grooming en frascos ámbar y latas negras sin etiquetas legibles. |
| `shop/pomada-mate.webp` | Lata redonda negra mate de pomada para el pelo, abierta, textura crema visible, sobre piedra oscura, etiqueta dorada sin texto. |
| `shop/cera-brillo.webp` | Frasco de vidrio con cera brillante para el pelo, tapa dorada, sobre madera oscura. |
| `shop/aceite-barba.webp` | Gotero de vidrio ámbar con aceite para barba, gota cayendo, ramitas de sándalo al costado. |
| `shop/shampoo.webp` | Botella de shampoo negra mate con dosificador, hojas de menta frescas, gotas de agua. |
| `shop/perfume.webp` | Frasco de perfume masculino de vidrio facetado ámbar con tapa de latón, hojas de tabaco secas y cuero de fondo. |
| `shop/peine.webp` | Peine de carey sobre un paño de cuero marrón, luz lateral. |
| `shop/giftcard.webp` | Tarjeta de regalo negra con borde dorado dentro de un sobre de papel kraft, lacre bordó, sin texto. |

## Barberos (retratos 800×800, fondo oscuro uniforme, luz Rembrandt, delantal de cuero)

Personas ficticias; no uses caras reales identificables.

| Archivo | Prompt |
|---|---|
| `barbers/lucas.webp` | Barbero de 30 años, pelo con fade y tatuajes en los antebrazos, sonrisa leve, brazos cruzados. |
| `barbers/matias.webp` | Barbero de 40 años, barba tupida canosa, camisa blanca arremangada y tijera en la mano. |
| `barbers/ezequiel.webp` | Barbero de 35 años, elegante, chaleco negro, bigote cuidado, navaja en la mano. |
| `barbers/tomas.webp` | Barbero de 28 años, pelo teñido platinado, estilo moderno, mirada a cámara. |
| `barbers/nicolas.webp` | Barbero de 33 años, camisa negra, reloj, aspecto ejecutivo, peine en el bolsillo. |
| `barbers/santiago.webp` | Barbero de 38 años, barba perfilada perfecta, gorra plana, delantal de jean. |

## Cómo cargar tus propias fotos más adelante

Desde el panel (Configuración → Sedes, Barberos, Servicios, Productos) podés cambiar la URL de cada imagen. Recomendado: WebP, calidad 80, menos de 300 KB.
