---
version: 2.0
name: New Place — Brisa
description: >
  Inmobiliaria de lujo en Venezuela. Paleta A «Brisa» aprobada por Adolfo el 17/10/2026 (orden 048): blanco roto,
  arena clara, azul mar suave y petróleo. Lujo sobrio con capa Dubái: mucho aire, mucho blanco, tipografía grande y
  fina, esquinas suaves, sombras muy ligeras. Sustituye a Caracas Night (043), AMALI y la azul de la 042-a.
colors:
  canvas: "#FAF8F4"       # blanco roto: fondo de página
  sand: "#EFE6D8"         # arena clara: bandas y superficies secundarias
  sea: "#5B8DB8"          # azul mar suave: marca, filetes, iconos, trazos del mapa (sin texto encima)
  sea-deep: "#3A6A92"     # mar profundo: botones, enlaces, pin activo, insignias (AA: 5,7:1 con blanco; 5,4:1 sobre canvas)
  sea-deep-hover: "#2F5A7E"
  sea-light: "#DCE8F2"    # principal claro: chips, hovers, tarjetas destacadas
  gold: "#C9B48F"         # arena dorada: SOLO detalles (filetes, «Exclusiva», iconos); nunca fondo grande ni texto
  ink: "#1F3A4D"          # azul petróleo profundo: texto (11:1 sobre canvas)
  muted: "#4A6275"        # texto secundario (6:1 sobre canvas, 5,2:1 sobre sand)
  line: "#D6DEE5"         # filetes de campos y tablas
  map-water: "#CFE3F1"
  ok: "#2F6F4E"
  danger: "#B42318"
typography:
  display: "'Jost', ui-sans-serif, system-ui, sans-serif"   # titulares: Light 300 o Regular 400, mayúscula solo la primera letra
  text: "'Inter', ui-sans-serif, system-ui, sans-serif"     # texto e interfaz
  wordmark: "'Lexend Zetta' (solo logotipo)"
  scale:
    hero:  { font: display, size: "clamp(44px, 8vw, 112px)", weight: 300, leading: 1.02, tracking: "-0.015em" }
    band:  { font: display, size: "clamp(36px, 5vw, 68px)", weight: 300, leading: 1.08 }
    h1:    { font: display, size: "clamp(36px, 4.5vw, 56px)", weight: 300 }
    h2:    { font: display, size: "clamp(28px, 3vw, 36px)", weight: 300 }
    lead:  { font: text, size: "20px", weight: 300, leading: 1.5 }
    body:  { font: text, size: "17px", weight: 400, leading: 1.6 }
    small: { font: text, size: "15px" }   # caption 13 px es el mínimo absoluto
rounded: { control: 12px, card: 16px, panel-and-map: 24px, pill: 9999px }
elevation:
  soft: "0 1px 2px rgb(31 58 77/.04), 0 8px 24px rgb(31 58 77/.06) — tarjetas (sube un poco al pasar el ratón)"
  float: "0 10px 30px rgb(31 58 77/.10) — menús, diálogos, hoja inferior, barra pegajosa"
motion: { duration: "180ms / 320ms / 500ms", easing: "cubic-bezier(.2,.7,.2,1)", reduced: "prefers-reduced-motion: todo visible, sin desplazamientos" }
---

# New Place · DESIGN.md (Brisa · 048)

## 0. Cambios de la 048 sobre lo que sigue

1. Paleta Brisa (arriba). Prohibido cualquier marrón y cualquier fondo oscuro pesado en la web pública. Las bandas «night» pasan a canvas o sand; sobre foto, un degradado inferior suave en petróleo (nunca un velo plano).
2. Texto sobre color: nunca blanco sobre #5B8DB8 (3,5:1). Lo que lleva texto usa mar profundo #3A6A92.
3. Tipografía: Jost (titulares) + Inter (texto). Sin mayúsculas en titulares salvo la primera letra.
4. Esquinas suaves: 12 px controles, 16 px tarjetas y fotos, 24 px mapa y paneles grandes.
5. Carruseles nativos (scroll-snap), nunca secuestran el scroll vertical (048-A). Mapa Leaflet en teselas claras, pins píldora (048-B).
6. Fotos reales sin repetir, nada de renders (048-C). Créditos en public/media/048/CREDITOS.txt.
7. Escala tipográfica cerrada (051-G 15): 13 · 15 · 17 · 20 · 28 · 36 · 56 · 68 px, más el hero 112 px. Ningún otro tamaño en la web pública; cada página usa 8 o menos (prueba: e2e/brisa-051g-b2.spec.ts).

Lo que sigue (§1–§11) es la guía 043; donde choque con §0, manda §0. Nombres de color antiguos: night → sea-deep, bone → canvas, stone → muted, gold-deep → sea-deep.


## 1. Idea

Casas verificadas «ENTRE EL ÁVILA Y EL MAR». La foto real del inmueble y del entorno (Ávila, Caribe, marina) es la protagonista; la interfaz se retira (Apple). El buscador es el gesto principal, como en Airbnb, pero con voz de noche caraqueña: night #0E1A2B profundo, papel bone, títulos Cormorant ligeros y texto Jost limpio. Lujo por contención, no por adornos.

## 2. Reglas de color

1. Lienzo bone #F6F2EC; bandas alternas sand #E9E1D3 y night #0E1A2B. El cambio de tono ES el separador (Apple): sin filetes de 1 px entre secciones.
2. Night es la única «voltaje» de acción: botón primario relleno night con texto bone; sobre fondo night, botón primario bone con texto night.
3. Gold #B89A6A solo como acento decorativo (máx. 1 por pantalla: filete corto bajo el hero, sello de Colección Privada). Nunca para texto < 24 px; usa gold-deep si debe leerse.
4. Prohibido: degradados de relleno (excepto el velo night sobre foto), texto con degradado, glow, verde/coral de versiones anteriores, crema amarillenta nueva.
5. Texto de lectura en ink pleno (≥ 7:1); stone solo para notas secundarias.
6. Modo noche: lienzo night, superficies night-2, texto bone, secundario mist. `color-scheme: light dark` y `<meta name="theme-color">` = bone (claro) / night (oscuro). La PWA (manifest, splash, barra de estado) en night.

## 3. Tipografía

1. Cormorant Garamond solo en display/h1/h2 y precio grande de la ficha (≥ 24 px). Por debajo de 24 px, siempre Jost (Cormorant tiene ojo pequeño).
2. Hero en mayúsculas con tracking 0.02em, máx. 2 líneas a 390 px. Títulos de ≈ 5 palabras; el resto va en el lead.
3. Sin «eyebrows»/kickers en mayúsculas espaciadas encima de cada título; sin numeración decorativa 01/02/03. Si la etiqueta aporta información, va dentro del título o del lead.
4. Máximo 6 tamaños (escala de arriba). Nada legible < 13 px.
5. `text-wrap: balance` en títulos, `text-wrap: pretty` en párrafos. Tipografía correcta: «…», comillas «» en ES y “ ” en EN, espacio fino no separable en «USD 235.000», «142 m²».
6. Precios y métricas con tabular-nums e Intl.NumberFormat.

## 4. Composición y retícula

1. Contenido 1280 px; búsqueda y mapa 1440 px. Márgenes clamp(16px,4vw,40px).
2. Secciones a sangre que alternan bone → night → sand → bone (ritmo Apple), una idea por banda, composición distinta en cada una (no tres tarjetas iguales con icono).
3. Alineación a la izquierda por defecto; un único momento centrado (cierre/CTA final).
4. Alturas con svh/dvh, nunca 100vh. `env(safe-area-inset-*)` en cabecera, barra inferior y hoja.

## 5. Componentes

- **Cabecera**: barra plana (no píldora flotante). Sobre el hero, transparente con texto bone; al hacer scroll, sólida bone (o night en modo noche) con un solo blur permitido. Logotipo izquierda, 4 enlaces, ES·EN, «Entrar», CTA «Vender con nosotros» (botón secundario).
- **Botón primario**: relleno night, texto bone, Jost 500 16 px, alto 48 px, radio 2 px, sin sombra. Hover: night-2; foco: anillo 2 px gold-deep con offset 2 px (`:focus-visible`). Nombre por acción: «Ver casas», «Pedir visita», «Hablar con un asesor».
- **Botón secundario**: borde 1 px currentColor (excepción permitida: es un control), fondo transparente.
- **Buscador (Airbnb search-bar)**: superficie sólida bone (no vidrio) con radio 2 px, pestañas Comprar/Alquilar/Vacacional como segmentos de texto con subrayado 2 px night, campo «¿Dónde quieres vivir? Ej.: casa con muelle en El Morro…», orbe circular night 48×48 con icono y `aria-label="Buscar casas"`. En móvil, una pastilla que abre hoja a pantalla completa.
- **Tarjeta de inmueble (Airbnb property-card)**: foto 4:3 a sangre, radio 0, sin borde ni sombra; ♥ circular arriba a la derecha (44×44 hit area); debajo 3 líneas: precio Jost 600 tabular, zona·ciudad en stone (sentence case, no mayúsculas espaciadas), «3 hab · 2 baños · 142 m²». Sello «Verificada» como texto, no píldora.
- **Ficha (Airbnb listing detail)**: galería a sangre; columna izquierda con título Cormorant, datos clave en `<dl>` sin filetes (separación por espacio); rail derecho pegajoso (única sombra «float») con precio Cormorant 44 px, indicador de precio y «Pedir visita». En móvil, barra inferior pegajosa con precio + CTA.
- **Colección Privada**: banda night, foto vertical grande, título Cormorant, sello gold único.
- **Formularios**: inputs sand con borde inferior 1 px stone, alto 48 px, etiqueta visible arriba, error en línea con aria-live.
- **Barra inferior PWA (móvil)**: bone/night sólida, 4 destinos, iconos con texto, objetivo ≥ 44 px.
- **Mapa**: estilo noche (agua #0E1A2B, carreteras #14243A, etiquetas #A9B1BC).
- **Paneles de administración**: Jost en todo, densidad alta, misma paleta, sin Cormorant < 24 px.

## 6. Elevación, bordes, vidrio

Una sola sombra («float») y solo para cosas que flotan de verdad. Separar superficies por tono, no por filete. Máximo un elemento con backdrop-filter (cabecera al hacer scroll). Los filetes de 1 px solo en tablas reales y campos de formulario.

## 7. Movimiento

Un gesto firma: el hero entra con un fundido lento de la foto (600 ms) y el título por opacidad. Nada de fade-up en cada bloque, marquesinas infinitas ni puntos que laten. `transition` con propiedades explícitas (opacity, transform, color, background-color). Todo se anula con prefers-reduced-motion.

## 8. Imagen

Fotos reales (D3-B: fotógrafo con dron + renders solo obra nueva). Hero 16:9 escritorio / 4:5 móvil con priority/`fetchpriority="high"`, el resto `loading="lazy"` con width/height. Un clip de vídeo silencioso opcional (golden hour Ávila–costa) con póster y pausa.

## 9. Responsive y táctil

Móvil < 744 px: cabecera logotipo + menú, buscador pastilla, tarjetas 1 columna, barra inferior. Tablet 744–1128: 2 columnas. Escritorio: 3–4 columnas, rail en ficha. Objetivos táctiles ≥ 44×44 (CTA 48). `touch-action: manipulation`, `-webkit-tap-highlight-color` definido, `overscroll-behavior: contain` en hojas y modales.

## 10. Accesibilidad y voz

WCAG 2.2 AA, enlace «Saltar al contenido», foco visible, aria-label en iconos, `translate="no"` en «New Place» y nombres propios. Voz: segunda persona, frases cortas, sin «desbloquea / eleva / sin esfuerzo», máximo 1–2 rayas por página.

## 11. No hacer

Degradados violeta/coral, texto degradado, glassmorphism en tarjetas, sombras en reposo, kickers, 01/02/03, micro-etiquetas mono, píldoras flotantes con blur como navegación, prueba social inventada, emoji como iconos, `transition: all`, `outline: none` sin reemplazo.
