# Publicar New Place en Hostinger (plan Business) con el dominio newplace.site

Probado de punta a punta en un clon limpio: instalación en modo producción, base de datos vacía,
migraciones + datos de ejemplo, compilación (pico de memoria medido: 1,9 GB) y arranque en el puerto que asigna el host.
Volver a publicar **no borra datos** (la siembra solo ocurre si la base está vacía).

## 1. Base de datos (Neon, gratis) — 2 minutos
1. Entra en **neon.com** → *Sign up* con tu cuenta de Google o GitHub.
2. *Create project*: nombre `newplace`. Región: la del mismo continente que el servidor de Hostinger
   (Europa → *AWS Europe (Frankfurt)*; América → *AWS US East (N. Virginia)*).
3. Pulsa **Connect**, **desactiva «Connection pooling»** y copia la URL completa
   (empieza por `postgresql://` y termina en `sslmode=require`).

## 2. La app en Hostinger — 5 minutos
**Sitios web → Añadir sitio web → Node.js / Web App → Importar repositorio de GitHub**

| Ajuste | Valor |
|---|---|
| Repositorio | `acalzadillaruiz/prueba` |
| Rama | `claude/new-place-pwa-estimate-knqqgn` |
| Framework | Next.js (si no lo detecta: *Other*) |
| Directorio raíz | `/` (la raíz del repositorio, **no** `apps/web`) |
| Versión de Node | 22 |
| Comando de instalación | `npm ci` |
| Comando de compilación | `npm run build:host` |
| Comando de inicio / archivo de entrada | `npm start` |
| Directorio de salida | `apps/web/.next` |

**Variables de entorno**: importa el archivo `newplace-hostinger.env` y sustituye el valor de
`DATABASE_URL` por la URL de Neon. Variables que contiene:

| Variable | Para qué |
|---|---|
| `DATABASE_URL` | la base de Neon |
| `AUTH_SECRET` | firma de las sesiones (cadena aleatoria; no la compartas) |
| `AUTH_TRUST_HOST` | `true` |
| `APP_URL`, `NEXT_PUBLIC_APP_URL` | `https://newplace.site` |
| `AUTH_URL` | opcional: la URL pública de Auth.js (inicio de sesión). Si falta, se toma de `APP_URL`; nunca la dirección interna del servidor. |
| `SITE_ACCESS_CODE` | código de la vista previa. **Bórrala y vuelve a publicar el día del lanzamiento.** |
| `DEMO_AUTH`, `NEXT_PUBLIC_DEMO_AUTH` | `true` durante la vista previa («Entrar como…» con las cuentas de ejemplo). **Bórralas antes de abrir al público.** |

Pulsa **Desplegar**. La primera compilación tarda unos 5–8 minutos.

## 3. El dominio (GoDaddy → Hostinger) — 2 minutos
1. En Hostinger, en la app, **Dominio → Conectar dominio existente** → `newplace.site`.
   Hostinger muestra sus dos *nameservers* (normalmente `ns1.dns-parking.com` y `ns2.dns-parking.com`).
2. En GoDaddy → **Mis productos → newplace.site → DNS → Servidores de nombres → Cambiar →
   «Usaré mis propios servidores de nombres»** → escribe los dos de Hostinger → Guardar.
3. Entre minutos y unas horas después, Hostinger activa el certificado HTTPS solo.

## Si algo falla
- **La compilación se queda sin memoria**: ya usa el modo de bajo consumo (`LOW_MEMORY_BUILD`). Si aun así
  falla, revisa en *Detalles del plan* la RAM; con 1,5 GB hay que pasar a Cloud Startup.
- **No conecta con la base**: la URL debe ser la **sin pooling** y terminar en `sslmode=require`.
- **Fotos subidas por las agencias**: se guardan en el disco del servidor. Comprobar tras el primer
  redespliegue que siguen; si no, moverlas a un almacenamiento externo antes del lanzamiento.
