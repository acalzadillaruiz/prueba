# Publicar New Place en internet (Vercel + Neon + Vercel Blob)

Todo es gratis en los planes básicos. Tiempo: unos 10 minutos. No hace falta instalar nada.

## 1. Crear el proyecto en Vercel
1. Entra en https://vercel.com con tu cuenta de GitHub.
2. **Add New… → Project** → importa el repositorio `acalzadillaruiz/prueba`.
3. En **Root Directory** elige `apps/web`. Framework: Next.js (se detecta solo).
4. En **Environment Variables** añade:

| Variable | Valor |
|---|---|
| `AUTH_SECRET` | una cadena aleatoria larga (puedes generarla en https://generate-secret.vercel.app/32) |
| `AUTH_TRUST_HOST` | `true` |
| `DEMO_AUTH` | `true` solo para la demo: permite «Entrar como…» con las 8 cuentas de ejemplo (nunca con usuarios reales). **Bórralo antes de abrir la app al público.** |
| `NEXT_PUBLIC_DEMO_AUTH` | `true` (igual que el anterior) |
| `SITE_ACCESS_CODE` | el código de acceso de la vista previa (6 cifras). Mientras exista, toda la web pide ese código antes de entrar. **Bórrala (y pulsa Redeploy) el día del lanzamiento.** |
| `APP_URL` y `NEXT_PUBLIC_APP_URL` | `https://newplace.site` en cuanto el dominio esté conectado (enlaces, SEO y correos). |

5. Pulsa **Deploy**. El primer intento fallará porque aún no hay base de datos: es normal.

## 2. Base de datos (Neon) y fotos (Blob)
1. En el proyecto de Vercel → pestaña **Storage** → **Create Database** → **Neon (Postgres)** → conéctala al proyecto. Esto crea `DATABASE_URL` automáticamente.
2. En la misma pestaña **Storage** → **Create** → **Blob** → conéctalo al proyecto. Esto crea `BLOB_READ_WRITE_TOKEN` (las fotos subidas se guardarán ahí).

## 3. Rama de producción
Lo normal es fusionar la rama de trabajo en `main` y dejar `main` como rama de producción. Si quieres publicar antes de fusionar: **Settings → Git → Production Branch** → escribe `claude/new-place-pwa-estimate-knqqgn`.

## 4. Desplegar
**Deployments → … → Redeploy**. En el build se aplican las migraciones versionadas (`prisma migrate deploy`) y, si la base está vacía, se cargan los datos de ejemplo de Venezuela (48 inmuebles, 3 agencias, 16 usuarios). Los despliegues siguientes **no** borran nada: solo aplican migraciones nuevas.

## 5. Dominio propio: newplace.site (comprado en Hostinger)
El dominio se queda en Hostinger; solo se apunta a Vercel.
1. En Vercel → proyecto → **Settings → Domains** → añade `newplace.site` y también `www.newplace.site` (elige que `www` redirija a `newplace.site`).
2. Vercel muestra los registros que hay que crear. Normalmente son:

| Tipo | Nombre | Valor |
|---|---|---|
| A | `@` | `76.76.21.21` |
| CNAME | `www` | `cname.vercel-dns.com` |

3. En Hostinger → **hPanel → Dominios → newplace.site → DNS / Nameservers → Registros DNS**: borra los registros `A` de `@` y el `CNAME` de `www` que vengan por defecto (apuntan a la página de "dominio aparcado") y crea los dos de la tabla. Usa exactamente los valores que te muestre Vercel si son distintos.
4. Espera de unos minutos a unas horas. Cuando Vercel marque el dominio como **Valid Configuration**, crea el certificado HTTPS solo.
5. Cambia `APP_URL` y `NEXT_PUBLIC_APP_URL` a `https://newplace.site` y pulsa **Redeploy**.

## Enlaces (sustituye `TU-APP` por el dominio que te da Vercel)
Contraseña de todos los usuarios de ejemplo: `NewPlace!2026`.

**Cliente**
- Inicio: `https://TU-APP.vercel.app/es`
- Entrar: `https://TU-APP.vercel.app/es/login` → «Entrar como… Buscador» (o regístrate con tu email)
- Buscar: `/es/search?type=SALE` · Lujo: `/es/luxury` · Guardados: `/es/saved` · Mi Hub: `/es/app`
- Publicar como propietario: `/es/owner/new` (entra como «Propietario particular»)

**Admin**
- Login: `/es/login` → «Entrar como… Dueño de agencia» (`owner@andesprime.ve`)
- Cargar un inmueble: `/es/agency/listings/new`
- Inmuebles, aprobar y editar fotos: `/es/agency/listings`
- Leads: `/es/agency/leads` · Calendario: `/es/agency/calendar` · Panel: `/es/agency`
- Superadmin (`superadmin@newplace.app`): `/es/platform`

## Recomendado para producción
| Qué | Variables | Sin configurar |
|---|---|---|
| Emails reales (Resend) | `RESEND_API_KEY`, `EMAIL_FROM` (dominio verificado) | Los correos quedan registrados en «Enviados» sin enviarse |
| Anti-spam distribuido (Upstash Redis) | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Se usa Postgres (funciona, algo más lento) |
| Monitoreo de errores (Sentry) | `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` | Errores solo en los logs de Vercel |
| Dominio propio | `APP_URL=https://tudominio.com` | Se usa el dominio de Vercel para canonical/sitemap |
| IP real fuera de Vercel | `TRUSTED_IP_HEADER` o `TRUSTED_PROXY_HOPS` (ver abajo) | En Vercel se usa su cabecera; fuera de Vercel todos los clientes comparten un único cubo por IP (`direct`) |

> `APP_URL` debe estar definida también en **build** (Vercel la aplica a ambos por defecto): las páginas públicas se generan estáticamente (ISR) y sus enlaces canónicos se escriben en ese momento. Si falta, se usa `NEXT_PUBLIC_APP_URL`, luego `VERCEL_PROJECT_PRODUCTION_URL` y luego `VERCEL_URL`; un build de producción sin ninguna avisa en consola (`[seo] APP_URL is not set…`) porque sitemap/robots/canonical apuntarían a `http://localhost:3000`.

## Límites por IP y cabeceras de proxy
Los límites anti-abuso (login, registro, leads, contadores de vistas…) se agrupan por IP del cliente, que solo se toma de datos fiables (`src/server/rate-limit.ts` → `clientIp`):

1. **`TRUSTED_IP_HEADER`** — nombre de una cabecera que tu proxy **sobrescribe** siempre (`x-real-ip` en nginx con `proxy_set_header X-Real-IP $remote_addr;`, `cf-connecting-ip` en Cloudflare…).
2. **Vercel** (variable `VERCEL` presente) — `x-vercel-forwarded-for` / `x-real-ip`, que pone su edge.
3. **`TRUSTED_PROXY_HOPS=N`** — nº de proxies propios que **añaden** su entrada a `X-Forwarded-For`. Se usa la N-ésima entrada contando desde la **derecha** (con un nginx delante, `1` = la dirección que nginx vio). Las entradas a su izquierda las escribió el cliente y se ignoran.
4. **Nada configurado** — se asume que la app está expuesta directamente: `X-Forwarded-For` lo controla el cliente (Next.js solo lo rellena si no viene), así que rotarlo no puede crear cubos nuevos. Todas las peticiones comparten el cubo `direct` y el servidor avisa una vez en consola. Siguen aplicando los límites por cuenta (login: 10 fallos por cuenta+IP y 50 por cuenta cada 15 min).

No pongas `TRUSTED_PROXY_HOPS` si la app es accesible sin pasar por tu proxy: cualquiera podría inventar la entrada de la derecha.

## Calidad continua
El repositorio incluye `.github/workflows/ci.yml`: en cada push ejecuta lint, tipos, pruebas unitarias, build, pruebas de principio a fin y Lighthouse con notas mínimas (rendimiento 85, accesibilidad/buenas prácticas/SEO 95).

## Opcional
- Google Maps: `NEXT_PUBLIC_GOOGLE_MAPS_KEY` (+ `NEXT_PUBLIC_GOOGLE_MAP_ID`).
- Login con Google: `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `NEXT_PUBLIC_GOOGLE_AUTH=true`.
- IA externa: `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`.
- Tras cambiar variables `NEXT_PUBLIC_*`, haz **Redeploy**.
- Volver a los datos de ejemplo: en tu ordenador, `DATABASE_URL=<la de Neon> npm run db:seed` (borra todo y recarga).
