# PROMPT MAESTRO — NEW PLACE
## Entregar este documento INTEGRO a un Grok Bot / agente de código. No resumir. No reinterpretar la marca.

---

## 0. MISIÓN

Construye **New Place**: plataforma híbrida global de real estate.

Es a la vez:
1. Marketplace público (comprador / inquilino / inversor).
2. Sistema operativo de inmobiliaria (agente, captador, fotógrafo, backoffice, dueño de agencia).
3. Consola SaaS multi-tenant (superadmin de la plataforma).

Entrega un producto **realmente ejecutables**: monorepo con frontend, backend, PWA instalable, wrapper de app (Capacitor), seed de Venezuela, i18n ES/EN, auth Google + email, Google Maps, 4 módulos de IA con proveedor intercambiable. **Sin pasarela de pagos.**

No entregues mockups sueltos ni un README vacío. Entrega código que arranca.

---

## 1. MARCA VISUAL — DIRECCIÓN B «CARACAS NIGHT» (INAMOVIBLE)

Nombre: **New Place**  
Tagline ES: «Un nuevo lugar.»  
Tagline EN: «Real estate. Redefined.»  
Logo v1: **wordmark + pin geométrico** (no hoja, no sol). El pin es un triángulo redondeado con un punto interior. Wordmark en Outfit Bold, tracking -0.02em, color Midnight Navy en fondos claros e Ivory en fondos navy.

### 1.1 Tokens CSS (usar exactamente estos nombres)

```css
:root {
  --np-navy: #0B1220;
  --np-navy-2: #111827;
  --np-coral: #F26B4D;
  --np-coral-hover: #E25538;
  --np-ivory: #F7F4EF;
  --np-mist: #8AA4B5;
  --np-gold: #D4AF77;
  --np-ink: #111827;
  --np-line: #E6E1D8;
  --np-ok: #2F6F4E;
  --np-warn: #C9862A;
  --np-danger: #B42318;
  --np-map-dark: #0B1220;
  --font-display: "Outfit", ui-sans-serif, system-ui;
  --font-body: "Source Sans 3", ui-sans-serif, system-ui;
  --radius: 14px;
  --shadow: 0 12px 40px rgba(11,18,32,.12);
}
```

### 1.2 Reglas de UI
- Público: fondo Ivory, texto Navy, CTA Coral, acentos Gold solo en Luxury y badges.
- Mapa por defecto en Venezuela: estilo **night** (navy, labels mist, pin coral). Toggle a mapa claro.
- Admin / cockpit: fondo navy-2, cards #152033, texto ivory, CTA coral. Densidad alta, no editorial.
- Colección Luxury: misma paleta, más aire, gold en marco de foto, no Playfair (la marca B es sans).
- Nunca usar verde bosque, serif Didone, ni terracota de las direcciones descartadas.
- Tipografía: Outfit para H1–H3, nav, precios; Source Sans 3 para cuerpo, tablas, formularios.
- Cargar fuentes con `next/font/google`: Outfit (400/500/600/700) + Source_Sans_3 (400/600).
- Dark mode: admin siempre dark. Público: light default + toggle; el mapa puede quedar night aunque la UI sea light.
- Iconos: Lucide. Pin custom SVG de marca para el mapa.
- Fotos: object-fit cover, ratio 4/3 en cards, 16/9 en hero. Placeholder navy con wordmark.
- Motion: 180ms ease-out. No animaciones gratuitas.

### 1.3 Copy de marca
Tono: directo, urbano, bilingüe, sin humo («sinergias», «ecosistema disruptivo»).  
ES neutro (no voseo, no tuteo excesivo en legal). EN US.

---

## 2. QUÉ ROBAR DE CADA PLATAFORMA (SOLO LO MEJOR)

Implementa estas capacidades, no copies marcas ajenas.

**Zillow**
- Búsqueda mapa-primero con clustering.
- Valoración automática + rango (PlaceEstimate).
- Saved searches + alertas.
- Homebuyer Hub: guardados, visitas, preaprobación mock, siguientes pasos.
- App como superficie principal (PWA + Capacitor).

**Rightmove**
- Engagement: ficha que invita a 15+ interacciones (galería, floorplan, mapa, calle, schools, sold-nearby).
- Cuota de tiempo del agente: dashboard de rendimiento por anuncio (impresiones, saves, leads, tiempo medio).
- Historial de precio del anuncio (subidas/bajadas).

**Idealista**
- Dibujar área en el mapa (polygon search).
- Ficha multi-idioma ES/EN en el mismo listing.
- Informes de zona (precio m², oferta activa, días en mercado) a nivel municipio/urbanización VE.

**Realtor.com**
- Estados de listing estrictos y visibles: DRAFT, COMING_SOON, ACTIVE, UNDER_OFFER, SOLD, RENTED, WITHDRAWN, EXPIRED.
- Reloj de frescura: «actualizado hace 12 min».
- Datos de colegio / commute cuando existan; si no, ocultar el bloque (nunca fake).

**Redfin**
- Tour scheduler con slots reales del agente.
- Estimación que muestra comparables usados.
- Lista «nuevos hoy» ordenada por publishedAt desc.

**Beike / Ke.com**
- Verificación de agente (badge VERIFIED con documento en review).
- Diccionario de inmueble: un listing = una unidad física (evita duplicados; fingerprint por lat/lng+m2+addressHash).

**JamesEdition (solo colección Luxury)**
- Galería full-bleed, menos chips, más foto. Filtro «Luxury» en nav.

**NO implementar en v1**
- Pagos, escrow, tokenización, iBuying, hipoteca real originada, chat tipo WhatsApp Business API (sí inbox interno).
- Scraping de portales terceros.
- MLS norteamericano.

---

## 3. STACK CERRADO (NO CAMBIAR SIN ROTURA)

Monorepo recomendado (npm workspaces o pnpm):

```
apps/web          Next.js 15 App Router + TS
apps/mobile       Capacitor wrapper sobre la PWA
packages/db       Prisma schema + seed
packages/ai       AIProvider interface
packages/config   tokens, i18n messages
```

- **Next.js 15** App Router, TypeScript strict.
- **Tailwind CSS 3.4+** + CSS variables de §1.
- **shadcn/ui** (New York, radius 14) tematizado a Caracas Night.
- **Prisma + PostgreSQL**. En local: Docker `postgres:16`. Si no hay Docker, documentar Neon/Supabase y usar `.env`.
- **NextAuth v5 (Auth.js)**: providers `Google` + `Credentials` (email+password). Email = Gmail u otro; no hay magic-link obligatorio en v1, sí verificación de email flag.
- **Google Maps JavaScript API + Places + Geometry** (polygon). Keys en `NEXT_PUBLIC_GOOGLE_MAPS_KEY`.
- **TanStack Query** para client fetch.
- **Zod** en API y forms.
- **Upload**: local disk `/uploads` en dev; interface `StorageProvider` (Local | S3) para prod. Sin Cloudinary obligatorio.
- **PWA**: Serwist o `@ducanh2912/next-pwa`. Manifest, icons 192/512, offline shell (home + saved).
- **Capacitor 6**: android + ios folders, splash navy, statusBar navy, allowNavigation al mismo origin.
- **i18n**: `next-intl`. Default locale `es`. Locales `es`, `en`. Rutas ` /[locale]/... `.
- **Realtime liviano**: no Socket.io obligatorio. Polling 15s en inbox y slots. Opcional SSE si da tiempo.
- **Tests**: Vitest unitario del dominio (estimate, search filters, RBAC). Playwright smoke: login, search map, create listing.
- **Lint**: ESLint + Prettier. `npm run dev`, `npm run db:seed`, `npm run build` deben funcionar.

Si una lib no resuelve, sustituye por la más cercana **y déjalo escrito en /docs/DEVIATIONS.md**. No cambies el stack entero.

---

## 4. MULTI-TENANT Y ROLES

### Tenants
- `Platform` (un solo registro).
- `Agency` (inmobiliaria cliente del SaaS). White-label light: logo + color coral override opcional. Marca New Place siempre visible en footer público («Listed on New Place»).
- Un usuario puede pertenecer a 0..n agencies (owner particular no tiene agency).

### Roles (enum)
`SUPERADMIN | AGENCY_OWNER | AGENT | CAPTOR | PHOTOGRAPHER | BACKOFFICE | OWNER_PRIVATE | SEEKER`

Permisos mínimos (matriz en código `packages/config/rbac.ts`):

| Acción | Seeker | Owner priv. | Agent | Captor | Photo | Backoffice | Agency owner | Superadmin |
|---|---|---|---|---|---|---|---|---|
| Buscar / guardar | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Pedir visita / lead | ✓ | ✓ | | | | | | |
| Publicar FSBO | | ✓ | | | | | | |
| Encargar a agencia | | ✓ | | | | | | |
| CRUD listing agencia | | | ✓ propia | captación | fotos | ✓ | ✓ | ✓ |
| Asignar agente | | | | | | ✓ | ✓ | ✓ |
| Ver comisiones | | | propias | | | ✓ | ✓ | ✓ |
| Billing flags SaaS | | | | | | | ✓ lectura | ✓ |
| Impersonate tenant | | | | | | | | ✓ |

Toda API valida sesión + rol + `agencyId`. Nunca confíes en el client.

---

## 5. TIPOS DE OPERACIÓN Y LISTING

`listingType`: `SALE | LONG_RENT | SHORT_RENT | COMMERCIAL_SALE | COMMERCIAL_RENT`  
`category`: `RESIDENTIAL | COMMERCIAL | LAND | LUXURY` (Luxury es flag + categoría; un residencial puede ser luxury=true).

Campos comunes: title_es, title_en, body_es, body_en, address, city, state, countryCode, lat, lng, polygon?, priceAmount, priceCurrency, areaM2, plotM2?, beds, baths, parking, yearBuilt, amenities[], status, publishedAt, updatedAt, agencyId?, agentId?, ownerUserId?, photos[], floorplanUrl?, videoUrl?, virtualTourUrl?, placeEstimate, daysOnMarket.

Corto plazo (SHORT_RENT): calendar, minNights, maxGuests, cleaningFee (número; no cobro).  
Comercial: ceilingHeight, loadingDock, zoning, capRate optional.  
Lujo: brochurePdf, privateListing boolean (no sale en search público salvo link).

Monedas v1: `USD` default (Venezuela inmobiliario se publica en USD), `VES` opcional visible, `EUR`. Mostrar precio principal + conversión display (tasa en tabla `fx_rates` seed, no API de pagos).

País default: `VE`. Mapa inicial: **Caracas** center `{ lat: 10.4806, lng: -66.9036 }`, zoom 12. Seed también: Valencia, Maracaibo, Barquisimeto, Mérida, Lechería/Pto. La Cruz, Isla de Margarita.

---

## 6. MÓDULOS FUNCIONALES (v1 OBLIGATORIA)

### 6.1 Público (Seeker)
- Home: search hero + mapa night + chips (Comprar, Alquilar, Vacacional, Comercial, Luxury).
- Search: mapa 60% + lista 40% desktop; móvil mapa full con sheet inferior.
- Filtros: tipo, precio, m², beds, baths, amenities, published (24h/7d), luxury, furnished, pets, agency verified.
- Polygon draw y radio-desde-punto.
- Ficha: galería, PlaceEstimate, mapa, street (Google), amenities, tour CTA, chat/lead form, listings similares, price history.
- Saved + comparador (max 3).
- Alertas de búsqueda (email stub: escribe en tabla `email_outbox`, no hace falta SMTP real; UI de «enviados»).
- Perfil seeker.

### 6.2 Propietario particular
- Wizard de encargo o FSBO (6 pasos: tipo, dirección Maps Places, características, fotos, precio, revisión).
- Estado del encargo: REQUESTED → ASSIGNED → ACTIVE.
- Chat con agente asignado.
- Ofertas recibidas (registro, no firma digital).

### 6.3 Agente
- Inbox de leads (nuevo, contactado, visita, oferta, ganado, perdido) con SLA visual 15 min.
- Cartera, calendario de visitas, slots.
- CRUD listings asignados.
- PlaceEstimate + comparables en la ficha interna.
- Scoring de lead (0-100) + «siguiente mejor acción».
- Comisiones estimadas (regla simple % configurable por agency).

### 6.4 Captador
- Cola de captación: direcciones, dueños, resultado (captado / rechazado / duplicado).
- Fingerprint anti-duplicado.

### 6.5 Fotógrafo
- Jobs: listing, fecha, checklist (20 fotos, portada, plano, video).
- Upload masivo con orden y cover.

### 6.6 Backoffice
- Asignación de roles, aprobación de publicaciones, calidad de ficha (score 0-100: fotos≥8, bilingüe, geo, plano).

### 6.7 Dueño de inmobiliaria
- Dashboard: listings activos, leads 7d, conversión, tiempo medio a visita, agentes ranking.
- Equipo (invitar email).
- Reglas de comisión.
- Marca de agencia (logo, teléfono, WhatsApp display string — solo número mostrado, no API).
- Informe export CSV.

### 6.8 Superadmin
- Agencies CRUD, users, flags de plan (free/pro/enterprise) **sin cobrar**.
- Moderación listings (takedown).
- FX rates.
- AI provider switch.
- Seed tools.
- Métricas globales.

### 6.9 IA — `packages/ai` (las 4, proveedor intercambiable)

```ts
interface AIProvider {
  id: string;
  estimate(input: EstimateInput): Promise<EstimateResult>;
  searchParse(nl: string, locale: 'es'|'en'): Promise<SearchQuery>;
  writeListing(brief: ListingBrief): Promise<{ title_es:string; title_en:string; body_es:string; body_en:string }>;
  leadScore(lead: LeadContext): Promise<{ score:number; nextAction:string; reason:string }>;
}
```

Implementaciones:
1. `HeuristicProvider` (default, **sin API key**): regressión simple por m² * precio_zona * amenities; parser de regex para NL; plantillas de copy; score por recency+budget-fit+source.
2. `OpenAICompatibleProvider` (opcional): `AI_BASE_URL` + `AI_API_KEY` + `AI_MODEL`. Compatible con OpenAI, Groq, xAI, etc.

UI nunca debe romperse si no hay key: usa Heuristic y muestra badge «Estimación New Place (modelo local)».

**PlaceEstimate**: mid, low, high, confidence 0-1, comparables[3-6], method. Guardar snapshot al publicar.

**NL search**: input «ático con luz en Los Palos Grandes por menos de 180 mil» → filters.

**Copy**: botón en wizard «Redactar con IA».

**Lead score**: visible al agente; nextAction enum `CALL | WHATSAPP_NOTE | PROPOSE_TOUR | SEND_SIMILARS | NURSE`.

---

## 7. ARQUITECTURA DE RUTAS

```
/[locale]
  /                     home
  /search               mapa+lista
  /listing/[slug]       ficha pública
  /luxury
  /saved
  /alerts
  /login  /register
  /account
  /owner/new            wizard particular
  /owner/listings
  /app                  hub seeker (Homebuyer Hub)

/[locale]/agency
  /                     dashboard owner/agent redirect by role
  /leads
  /listings
  /listings/[id]/edit
  /calendar
  /team
  /reports
  /capture              captador
  /media                fotógrafo
  /settings

/[locale]/platform
  /                     superadmin
  /agencies
  /users
  /moderation
  /ai
```

API Route Handlers bajo `app/api/v1/...` REST JSON. Convención: `GET/POST /api/v1/listings`, query filters, pagination cursor.

---

## 8. MODELO DE DATOS (Prisma — entidades mínimas)

User, Account, Session (Auth.js).  
Agency, AgencyMember (role).  
Listing, ListingPhoto, ListingPriceHistory, PlaceEstimateSnapshot.  
Lead, LeadEvent.  
TourSlot, Tour.  
SavedListing, SavedSearch.  
MessageThread, Message.  
CaptureLead.  
MediaJob.  
Offer.  
CommissionRule, CommissionEntry.  
FxRate.  
EmailOutbox.  
AuditLog.  
DuplicateFingerprint.

Índices: Listing (status, countryCode, city, listingType, priceAmount, publishedAt, geo).  
Usar `Unsupported("geography")` solo si PostGIS está; si no, lat/lng float + bounding box en query (v1 OK).

Slug: `altamira-3h-142m-abc123`.

---

## 9. AUTH

- Google OAuth (Gmail).
- Email + password (min 8, hash bcrypt).
- Sesión JWT o database session (database preferida).
- Middleware protege `/agency` y `/platform`.
- Tras Google, si no hay rol: asignar SEEKER. Flujo «¿Eres agencia?» para crear Agency.
- Nunca commitear secrets. `.env.example` completo.

```
DATABASE_URL=
AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
NEXT_PUBLIC_GOOGLE_MAPS_KEY=
AI_BASE_URL=
AI_API_KEY=
AI_MODEL=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Sin keys de Google: modo demo `DEMO_AUTH=true` que loguea usuarios seed (botón «Entrar como…»). Obligatorio para que el bot y el humano puedan QA sin consola Google.

---

## 10. MAPA

- Loader oficial `@vis.gl/react-google-maps` o `@react-google-maps/api`.
- Map ID opcional; si no hay, styles JSON night (water #0B1220, roads #1a2740, labels #8AA4B5).
- Markers cluster. Pin SVG coral.
- Click marker → card preview.
- Draw polygon (Drawing library) → filtro backend listings whose point-in-polygon.
- Places autocomplete en wizard y search box, componentRestrictions country VE por defecto, selector de país.
- Geocoder al pegar dirección.

Si `NEXT_PUBLIC_GOOGLE_MAPS_KEY` falta: mapa placeholder + lista, no pantalla blanca.

---

## 11. PWA + APP NATIVA

- `manifest.webmanifest`: name New Place, short_name New Place, theme_color #0B1220, background_color #0B1220, display standalone, start_url /es.
- Service worker: cache app-shell + fonts; network-first API.
- Capacitor: una WebView a NEXT_PUBLIC_APP_URL. Documentar `cap sync`, iconos 1024, splash.
- Deep link `newplace://listing/{id}`.
- Push: no obligatorio v1; dejar hook `PushProvider` noop.

---

## 12. SEED VENEZUELA (obligatorio, datos realistas no copiados de portales reales)

Mínimo **48 listings**:
- 16 venta residencial Caracas (Altamira, Los Palos Grandes, La Castellana, Las Mercedes, El Hatillo, Chacao, Sabana Grande, La Boyera).
- 8 long rent Caracas.
- 6 short rent (Lechería, Margarita, Mérida, Los Roques mock, Choroní, Caracas).
- 8 commercial (Las Mercedes, La Trinidad, Valencia).
- 6 luxury (Lomas de San Raphael, Country Club, full-bleed).
- 4 land / town other cities.

3 agencies seed: «Andes Prime», «Caracas Night Realty», «Orinoco Commercial».  
Users demo: superadmin@newplace.app, owner@andesprime.ve, agent@andesprime.ve, seeker@gmail.com, owner.priv@gmail.com — password `NewPlace!2026`.  
12 leads, 8 tours, 20 fotos placeholder (unsplash source URLs o bloques color; no infringir marcas).

PlaceEstimate precalculado en seed.

---

## 13. CALIDAD DE CÓDIGO QUE EL BOT DEBE RESPETAR

- Un listing page server-component + client islands (map, gallery).
- No `any`. Tipos en `types/`.
- Errores de API `{ error: { code, message } }` i18n.
- Loading skeletons navy/ivory. Empty states con CTA.
- Accesibilidad: contraste coral sobre navy validado, focus rings, alt en fotos.
- Formularios con RHF + Zod.
- Commits lógicos o al menos carpetas por dominio.
- `/docs/ARCHITECTURE.md`, `/docs/RUNBOOK.md` (cómo levantar), `/docs/DECISIONS.md`.
- README raíz en ES y EN: 10 minutos a `localhost:3000`.

### Orden de construcción (el bot sigue este orden, no salta al final)
1. Repo + Tailwind tokens + layout ES/EN + auth demo.
2. Prisma + seed VE.
3. Search mapa + ficha + saved.
4. Wizard owner + agency listings CRUD + fotos.
5. Leads + tours + inbox.
6. Dashboards owner/superadmin + RBAC duro.
7. IA Heuristic + UI de las 4 features.
8. PWA + Capacitor config + smoke tests.
9. Pulido visual Caracas Night, empty states, calidad ficha.

Cada fase debe quedar `npm run dev` usable antes de la siguiente.

---

## 14. FUERA DE SCOPE EXPLÍCITO

Pagos Stripe/PayPal, cripto, firma electrónica vinculante, WhatsApp Cloud API, sync Idealista/Zillow, app nativa Flutter aparte, React Native, Firebase como DB principal, WordPress, templates comprados, Lorem de 3 páginas fingiendo producto.

---

## 15. CRITERIO DE ACEPTACIÓN

El humano puede:
1. Abrir `/es`, ver mapa night centrado en Caracas con pines seed.
2. Filtrar «comprar, 2+ hab, < 250000 USD, Chacao».
3. Abrir ficha bilingüe, ver PlaceEstimate y pedir visita (lead creado).
4. Login demo agente, ver el lead, score y next action.
5. Login owner particular, publicar FSBO en Altamira.
6. Login agency owner, ver dashboard no vacío.
7. Login superadmin, apagar un listing.
8. Instalar PWA (manifest válido).
9. Cambiar a `/en` y no romper rutas.
10. Arrancar sin Maps key y sin AI key sin crash.

Si algo no llega, documenta en DEVIATIONS.md la brecha; no inventes pantallas rotas.

---

## 16. INSTRUCCIÓN FINAL AL BOT

Empieza por el monorepo y la fase 1. No preguntes de nuevo la paleta, el stack, ni el mercado: ya está cerrado. Si debes asumir, asume Venezuela/USD/ES y déjalo en DECISIONS.md. Entrega código, no una lista de intenciones.
