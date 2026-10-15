---
version: 1.0
name: New Place — Caracas Night
description: >
  Inmobiliaria premium de Venezuela. Fotografía primero (Airbnb), lienzo silencioso y ritmo de bandas
  claro/oscuro (Apple), sobre la paleta aprobada Caracas Night (night #0E1A2B) y la pareja tipográfica
  aprobada Cormorant Garamond + Jost. Este archivo es la fuente de verdad visual; la paleta y las fuentes
  NO se cambian.
sources: awesome-design-md/airbnb (tarjetas, buscador, ficha, objetivos táctiles) + awesome-design-md/apple (bandas alternas, una sola sombra, UI que se retira) + decisiones D1-A / D2-1 / oleada 3 (15-10-2026)
colors:
  night: "#0E1A2B"      # acción principal, superficies oscuras, hero, pie, modo noche
  night-2: "#14243A"    # un paso tonal sobre night (paneles oscuros, hover en oscuro)
  ink: "#1A2026"        # texto principal sobre claro
  bone: "#F6F2EC"       # lienzo claro (fondo de página)
  sand: "#E9E1D3"       # banda clara alterna, superficies de tarjeta, inputs
  stone: "#57534D"      # texto secundario (AA sobre sand y bone)
  mist: "#A9B1BC"       # texto secundario sobre night
  gold: "#B89A6A"       # SOLO decorativo (filetes de marca, iconos de colección); nunca texto pequeño ni fondo de botón
  gold-deep: "#735D3F"  # texto dorado legible (AA) cuando haga falta
  ok: "#2F6F4E"
  warn: "#C9862A"
  danger: "#B42318"
  scrim: "rgba(14,26,43,0.55)"  # velo night sobre fotos y modales
typography:
  display: "'Cormorant Garamond', 'Times New Roman', serif"  # variable, pesos 300/400/500; solo ≥ 24 px
  text: "'Jost', ui-sans-serif, system-ui, sans-serif"       # variable, pesos 300/400/500/600
  wordmark: "'Lexend Zetta' (solo logotipo, sin precarga)"
  scale:  # 6 tamaños, separados (Taste: ≤ 6; Airbnb: display modesto, foto da el peso)
    hero:  { font: display, size: "clamp(44px, 7vw, 96px)", weight: 300, leading: 1.0, tracking: "0.02em", case: upper, wrap: balance }
    h1:    { font: display, size: "clamp(34px, 4.5vw, 56px)", weight: 400, leading: 1.08, wrap: balance }
    h2:    { font: display, size: "clamp(26px, 3vw, 36px)", weight: 400, leading: 1.15, wrap: balance }
    lead:  { font: text, size: "20px", weight: 300, leading: 1.5 }
    body:  { font: text, size: "17px", weight: 400, leading: 1.6, color: ink }
    small: { font: text, size: "14px", weight: 400, leading: 1.45 }  # mínimo absoluto 13 px para texto que se lee
  numerals: "font-variant-numeric: tabular-nums lining-nums en precios, m², tablas y comparador"
rounded:
  none: 0px       # fotos, tarjetas, bandas
  control: 2px    # botones, inputs, chips de filtro
  full: 9999px    # SOLO controles circulares sobre foto (guardar ♥, flechas de galería, orbe de buscar)
spacing: { base: 8px, section: "clamp(64px, 10vw, 128px)", gutter: "clamp(16px, 4vw, 40px)", max-content: 1280px, max-search: 1440px }
elevation:
  flat: "todo por defecto"
  float: "0 8px 24px rgba(14,26,43,0.18) — SOLO menús, diálogos, hoja inferior y barra pegajosa"
motion: { duration: "180ms / 320ms", easing: "cubic-bezier(.2,.7,.2,1)", reduced: "prefers-reduced-motion: sin desplazamientos, solo opacidad" }
---

# New Place · DESIGN.md (Caracas Night)

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
