# Encargo: publicar la web de New Place en newplace.site (Hostinger)

Texto para entregar a un asistente con acceso al navegador (Grok, Claude en Chrome u otro).
Contiene todo lo necesario. **El dueño no debe hacer nada salvo iniciar sesión cuando se le pida.**

---

## 1. Qué es y qué está ya resuelto

- **Web**: aplicación Next.js 15 (Node 22) + PostgreSQL (Prisma). Monorepo con npm workspaces.
- **Código**: GitHub `acalzadillaruiz/prueba`, rama **`claude/new-place-pwa-estimate-knqqgn`** (repositorio público).
- **Probado de punta a punta** en un clon limpio, simulando el host: `npm ci` en modo producción, base
  de datos vacía, migraciones y datos de ejemplo, compilación (pico de memoria medido: **1,9 GB**) y arranque
  en el puerto que asigna el host. Volver a publicar **no borra datos**.
- **Vista previa privada**: mientras exista la variable `SITE_ACCESS_CODE`, la web pide un código al entrar.

## 2. Cuentas (el dueño inicia sesión; el asistente no crea contraseñas ni las guarda)

| Servicio | Cuenta | Para qué |
|---|---|---|
| Hostinger (hPanel) | **ceo@grupoprimesupply.com** (plan **Business Web Hosting**, ya contratado) | Alojar la web |
| GoDaddy | cuenta del dueño | Donde está comprado el dominio `newplace.site` |
| Neon (neon.com) | se crea con el Google del dueño (gratis) | Base de datos PostgreSQL |
| GitHub | `acalzadillaruiz` | Hostinger lee el código de aquí |

> **No tocar** el sitio existente **grupoprimesupply.com** ni nada de su `public_html`. New Place es un sitio nuevo.

## 3. Pasos

### Paso A · Base de datos en Neon
1. neon.com → *Sign up* (con Google del dueño).
2. *Create project* → nombre `newplace`, PostgreSQL por defecto. Región: la del mismo continente que el
   servidor de Hostinger (Europa → **AWS Europe (Frankfurt)**; América → **AWS US East (N. Virginia)**).
3. *Connect* → **desactivar «Connection pooling»** → copiar la cadena completa
   (`postgresql://…neon.tech/neondb?sslmode=require`). Es el valor de `DATABASE_URL`.

### Paso B · La app en Hostinger
hPanel → **Sitios web → Añadir sitio web → Node.js (Web App) → Importar repositorio de GitHub**
(autorizar la cuenta de GitHub `acalzadillaruiz` si lo pide).

| Ajuste | Valor exacto |
|---|---|
| Repositorio | `acalzadillaruiz/prueba` |
| Rama | `claude/new-place-pwa-estimate-knqqgn` |
| Framework | Next.js (si no lo detecta: *Other* / personalizado) |
| Directorio raíz | `/` — la raíz del repositorio, **no** `apps/web` |
| Versión de Node | **22** |
| Gestor de paquetes | npm |
| Instalación | `npm ci` |
| Compilación | `npm run build:host` |
| Inicio / entrada | `npm start` |
| Directorio de salida | `apps/web/.next` |
| Dominio | `newplace.site` (dominio existente / externo) |

**Variables de entorno** (importar el archivo `newplace-hostinger.env` que entrega el dueño y cambiar
solo `DATABASE_URL` por la cadena de Neon):

| Variable | Valor |
|---|---|
| `DATABASE_URL` | la cadena de Neon del paso A |
| `AUTH_SECRET` | **la del archivo** (no inventar otra; no publicarla) |
| `AUTH_TRUST_HOST` | `true` |
| `APP_URL` | `https://newplace.site` |
| `NEXT_PUBLIC_APP_URL` | `https://newplace.site` |
| `SITE_ACCESS_CODE` | el código de 6 cifras que indica el dueño (está en el archivo) |
| `DEMO_AUTH` | `true` |
| `NEXT_PUBLIC_DEMO_AUTH` | `true` |

Desplegar. La primera compilación tarda 5–8 minutos. En el registro de compilación debe aparecer
`Empty database → seeding Venezuela demo data` y al final `✓ Generating static pages (95/95)`.

### Paso C · Dominio: GoDaddy → Hostinger
1. Hostinger indica sus *nameservers* para `newplace.site` (normalmente `ns1.dns-parking.com` y
   `ns2.dns-parking.com`; usar los que muestre).
2. GoDaddy → *Mis productos* → `newplace.site` → **DNS → Servidores de nombres → Cambiar →
   «Usaré mis propios servidores de nombres»** → escribir los dos → Guardar.
3. Esperar la propagación (minutos a unas horas). Hostinger emite el certificado HTTPS solo.

## 4. Comprobación final (todas deben cumplirse)

1. `https://newplace.site` redirige a `/es/acceso` y muestra «Acceso privado» con el logotipo.
2. Con el código correcto entra a la portada «Pocas propiedades. Todas extraordinarias.»; con uno
   incorrecto muestra «El código no es correcto».
3. Abren sin error: `/es/search?type=SALE`, `/es/luxury`, `/en`, y una ficha desde la portada.
4. El candado HTTPS aparece en el navegador.
5. `grupoprimesupply.com` sigue funcionando igual que antes.

Entregar al dueño: captura de cada punto y el registro de compilación si algo falló.

## 5. Si algo falla

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| Compilación: *JavaScript heap out of memory* | RAM del plan | Ya usa modo bajo consumo. Ver RAM en *Detalles del plan*; con menos de 2 GB hay que pasar a Cloud Startup. |
| Compilación: `P1001` / no conecta a la base | URL con pooling o sin SSL | Usar la cadena **sin pooling** que termina en `sslmode=require`. |
| Compilación: no encuentra `next`, `prisma` o `tsx` | Directorio raíz o instalación | Directorio raíz `/`, instalación `npm ci` (el repo tiene `.npmrc` con `include=dev`). |
| La web arranca pero da error 500 | Falta una variable | Revisar que estén las 8 variables; guardar redespliega. |
| El dominio no carga | DNS aún propagando | Esperar; comprobar que los nameservers en GoDaddy son los de Hostinger. |

## 6. Actualizar a una versión con datos de ejemplo nuevos (vista previa)
Al redesplegar, la base **no se toca** (solo se aplican migraciones). Si una versión trae datos de ejemplo nuevos
(zonas, inmuebles, guardias) y se quieren ver en la vista previa:
1. Añadir la variable `RESEED_DEMO` = `1` y redesplegar. **Borra la base y recarga los datos de ejemplo.**
   Solo funciona mientras `DEMO_AUTH=true`; con datos reales se ignora.
2. Al terminar, **borrar `RESEED_DEMO`** (si se queda, cada redespliegue volvería a borrar la base).

## 7. Después (no forma parte de este encargo)
- Día del lanzamiento: borrar `SITE_ACCESS_CODE`, `DEMO_AUTH` y `NEXT_PUBLIC_DEMO_AUTH` y redesplegar.
- La paleta definitiva (A, B o C) se aplicará con un nuevo push a la misma rama; Hostinger redespliega solo.
