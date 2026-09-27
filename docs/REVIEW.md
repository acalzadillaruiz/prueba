# Revisión experta (sept. 2026)

Cuatro revisores automáticos recorrieron la PWA en producción (`localhost:3001`) con navegador real y leyendo el código: **PWA/rendimiento/accesibilidad**, **flujos de cliente**, **flujos de admin** y **seguridad/API**. Este documento resume qué encontraron y en qué estado queda cada punto.

## Corregido

### Seguridad
- **Crítico:** un usuario podía hacerse superadmin o cambiar de agencia llamando a `/api/auth/session`. Ahora el rol nunca sale del cliente y solo el superadmin puede cambiar de agencia (prueba E2E incluida).
- Rol, agencia y suspensión se comprueban en la base de datos en cada petición (antes vivían 30 días en el JWT).
- Bloqueo de login tras 10 intentos fallidos en 15 min, y límites por IP en leads, registro, IA pública, ofertas y detección de duplicados. Los límites se guardan en Postgres y aplican en producción.
- Páginas de agencia protegidas por rol: captador y fotógrafo ya no ven leads, informes ni datos de propietarios.
- Invitaciones: solo las ven los responsables de la agencia y nunca con su token. Además hay deduplicación, revocación y aceptación real.
- El backoffice no puede degradar al dueño, nadie cambia su propio rol y una agencia siempre conserva un dueño.
- Una agencia suspendida pierde el acceso y sus anuncios desaparecen de la web.
- La agencia no puede deshacer una retirada de moderación, y al restaurar se recupera el estado anterior.
- Otras correcciones:
  - Se bloquea la inyección de fórmulas en el CSV.
  - El login no redirige a webs externas.
  - Las fotos subidas se validan por su contenido real (bytes), no por lo que dice el navegador.
  - Hay cabeceras de seguridad y `nosniff` en `/uploads`.
  - Los anuncios ocultos no se ven por la API.

### Datos y reglas de negocio
- **Crítico:** reservas de visita sin carreras. Hay un bloqueo por agente dentro de una transacción; un horario tiene que existir en la agenda y estar entre 2 h y 8 días en el futuro (prueba E2E con 3 reservas simultáneas).
- Una sola comisión por lead ganado (antes GANADO → PERDIDO → GANADO la contaba dos veces).
- No se aceptan leads ni ofertas en anuncios no publicados, y no se piden visitas en vendidos o alquilados. Solo puede haber una oferta aceptada.
- PlaceEstimate por tipo de inmueble: los terrenos, galpones y locales se comparan solo con su tipo y la cifra se redondea según su tamaño. Antes un terreno de USD 85.000 salía estimado en 1,3 M.
- Estados coherentes:
  - SOLD solo para ventas y RENTED solo para alquileres.
  - El historial no duplica entradas.
  - La calidad de la ficha se calcula igual en todas partes.
- La comisión de alquiler respeta la regla de la agencia.
- Los URLs mal formados ya no rompen la búsqueda (`?type=rent` funciona).

### PWA
- La página offline funciona de verdad: es estática, está precacheada y existe en ES y EN.
- El service worker solo guarda contenido público, y al cerrar sesión se borran las cachés del dispositivo.
- Las actualizaciones se aplican solo cuando el usuario pulsa «Actualizar». La app ya no se recarga sola al recuperar la conexión.
- El precache pasó de 167 a 73 archivos.
- Manifest con `id`, capturas de pantalla y atajos. Hay favicon y soporte para iPhone (notch).

### SEO y accesibilidad
- `lang` correcto en el HTML del servidor.
- Títulos y descripciones por página; canonical y hreflang.
- Imagen para compartir (Open Graph) generada para cada inmueble.
- `robots.txt`, `sitemap.xml` y 404 reales (antes devolvían 200).
- Menú móvil funcional y enlace «Saltar al contenido».
- Landmarks `<main>`, contraste AA en botones y textos, y áreas táctiles de al menos 44 px.
- El cambio de idioma conserva los filtros.

### Experiencia de cliente
- El comparador funciona sin guardar los inmuebles y avisa al llegar al máximo de 3.
- Mover el mapa ya no mueve el pin de la dirección.
- En el registro, marcar y desmarcar «¿Eres agencia?» ya no bloquea el formulario.
- En el asistente:
  - Hay «Comercial · alquiler» y «Galpón».
  - El precio por defecto cambia según la operación.
  - La comprobación de duplicados es honesta.
- Galería con Escape y flechas, y sin «+0 fotos».
- «Compartir» funciona.
- Los errores se muestran en «Mis inmuebles».
- La búsqueda ya no mezcla vendidos ni otros tipos de operación.
- Plurales correctos.
- Textos de la IA más naturales, con las amenidades.
- El buscador en lenguaje natural entiende «Margarita», «3-bed» y «con piscina».

### Experiencia de admin
- En el panel:
  - Ya no aparece «0NaN%».
  - Los leads por día se cuentan en hora de Caracas.
  - El SLA cuenta también los leads sin responder.
  - La columna falsa «Tendencia» se cambió por la conversión real.
- El calendario muestra todas las visitas y las superpuestas quedan lado a lado.
- La campana muestra los leads nuevos reales. Se quitó el buscador que no hacía nada.
- En móvil:
  - Hay «Salir» y «Sitio público».
  - Ya no hay desbordes horizontales.
  - El detalle del lead se desplaza a la vista.
  - Los controles de fotos son táctiles.
- La tabla de inmuebles tiene buscador, más pestañas y estado vacío.
- Los errores son visibles, con reversión cuando la acción falla.
- Moderación enlazada al anuncio.
- Auditoría de etapas, visitas y captaciones.
- Tras el login, cada rol llega a su panel.

## Pendiente (mejoras, no bloquean el uso)
- Captación: botón «Convertir en inmueble» (hoy solo se marca como Captado o Rechazado).
- Fotografía: crear y asignar sesiones desde la app.
- Superadmin:
  - Cambiar el rol de usuarios desde la interfaz.
  - Página de auditoría completa (hoy muestra las últimas 10 entradas).
- Leads:
  - Reasignar a otro agente.
  - Proponer visita en cualquier momento, no solo cuando la IA lo sugiere.
  - Buscador en la bandeja.
- Buscador:
  - Filtros de baños, m² y precio mínimo en la interfaz (la API ya los soporta).
  - Guardar en el URL el orden y la zona dibujada.
- Hub del comprador:
  - Responder mensajes.
  - Hacer ofertas.
  - Guardar la precalificación.
- Rendimiento:
  - Aligerar el HTML de la home, que manda anuncios completos.
  - Hacer estáticas las páginas públicas, que hoy leen la sesión en el layout.
- Envío real de emails (Resend/SES) y notificaciones push (fase 2).
- Antes de tener datos reales en producción:
  - Pasar de `prisma db push` a migraciones (`prisma migrate`).
  - Actualizar dependencias con avisos de `npm audit` (`next`, `sharp`).

## Pruebas
- Vitest: 17 pruebas (IA, RBAC, schemas, geo, filtros incluidos los URLs mal formados).
- Playwright: 18/18. Incluye los 10 criterios §15 más RBAC, escalada de privilegios, reservas simultáneas e invitaciones.
