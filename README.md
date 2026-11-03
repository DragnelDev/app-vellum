# Vellum

Plataforma de lectura de manga, manhwa, manhua y novelas ligeras. Mobile-first, SSR para SEO.

| Capa                         | Tecnología                                                |
| ---------------------------- | --------------------------------------------------------- |
| Frontend (`frontend-vellum`) | Nuxt 4 · Vue 3 · TypeScript · Tailwind CSS 4              |
| Backend (`backend-vellum`)   | NestJS 11 (monolito modular) · TypeORM                    |
| Base de datos                | PostgreSQL (índices B-tree + GIN `pg_trgm` para búsqueda) |
| Archivos                     | Cloudflare R2 + CDN (driver `local` para desarrollo)      |

## Puesta en marcha

```bash
docker compose up -d                      # PostgreSQL

cd backend-vellum
cp .env.example .env                      # revisa JWT_SECRET y ADMIN_*
npm install && npm run start:dev          # http://localhost:3001/api

cd ../frontend-vellum
cp .env.example .env
npm install && npm run dev                # http://localhost:3000
```

Al arrancar el backend se crean las tablas (`DB_SYNCHRONIZE=true`, solo desarrollo), los índices
avanzados y 20 géneros base. El usuario configurado en `ADMIN_EMAIL` se crea con rol `admin` o,
si ya existe, se le asigna ese rol y conserva su contraseña actual.

Flujo: entra como admin → **Panel admin → Nueva obra** → **Subir capítulo** (.zip).

## Base de datos (18 tablas) · scripts en `database/`

`database/01-schema.sql` crea tablas, índices y triggers; `database/02-datos-ejemplo.sql` inserta obras, usuarios y comentarios de prueba
(usuarios `admin / Admin12345`, `uploader1 / Uploader123`, `lector1 / Lector12345`). Si los usas, pon `DB_SYNCHRONIZE=false`.

Tablas base: `usuarios`, `preferencias_usuario`, `generos`, `mangas`, `manga_generos`, `capitulos` (`numero numeric(8,2)`, admite 130.5),
`capitulo_paginas`, `biblioteca_usuario`, `historial_lectura`, `reacciones_capitulo`, `comentarios` (`comentario_padre_id`),
`comentario_multimedia`, `reacciones_comentarios`.
Fase 2: `notificaciones`, `reportes_comentarios`, `palabras_prohibidas`, `password_resets`, `vistas_diarias`.
Añadidos respecto al enunciado: `mangas.slug/autor/titulo_alternativo`, `capitulos.contenido_texto` (novelas) y `comentarios.eliminado` (borrado lógico que conserva el hilo).

## Funcionalidades añadidas (fase 2)

- **Cuentas:** perfil con avatar, cambio de correo y contraseña, historial de lectura completo, recuperar contraseña por correo (SMTP opcional; sin SMTP el enlace sale en el log del backend).
- **Notificaciones:** aviso de nuevo capítulo a quien tenga la obra en _leyendo/pendiente_ y de respuestas a tus comentarios; campana con contador.
- **Admin:** panel con estadísticas y gráfico de vistas, gestión de capítulos (editar número/título/volumen, borrar), géneros, usuarios (rol y bloqueo).
- **Moderación:** reportar comentarios, cola de reportes (descartar / eliminar / eliminar y bloquear) y filtro de palabras prohibidas.
- **Descubrimiento:** banner de destacadas, ranking semana/mes/siempre, obras relacionadas, búsqueda avanzada (autor, solo con capítulos).
- **Lector:** modos vertical, página a página y manga RTL; selector de capítulos; atajos de teclado (←/→, [ ], M, F, P); precarga de páginas y del capítulo siguiente; PWA con caché de imágenes y página offline.

## Carga masiva de capítulos

`POST /api/admin/capitulos/upload` (multipart: `archivo`=.zip, `mangaId`, `numero`, `volumen?`, `titulo?`, `reemplazar?`) — roles `admin`/`uploader`.

1. El ZIP se lee **en memoria** (sin extraer a disco → sin zip-slip); se filtran imágenes, límites de nº de páginas/tamaño (anti zip-bomb) y orden numérico natural.
2. `sharp` convierte a **WebP** (máx. 1600 px de ancho; las tiras verticales > 16 383 px se cortan en piezas contiguas).
3. Subida paralela (8) a R2 con `Cache-Control: immutable`.
4. Transacción: inserta el capítulo y hace **bulk insert** en `capitulo_paginas`. Si algo falla se borran los objetos subidos.

## Seguridad

JWT (30 días) · bcrypt(12) · `RolesGuard` en `/api/admin/*` + middleware `admin` en Nuxt · rate limiting (`@nestjs/throttler`) · Helmet · validación DTO con whitelist · adjuntos de comentarios validados por firma real del archivo y solo desde nuestro almacenamiento · HTML de comentarios escapado antes de aplicar formato.

## Producción (Cloudflare)

- R2: crea el bucket, un dominio personalizado (CDN) → `R2_PUBLIC_URL`, y `STORAGE_DRIVER=r2`.
- `DB_SYNCHRONIZE=false` y migraciones de TypeORM; `NODE_ENV=production`; `JWT_SECRET` ≥ 32 caracteres.
- El HTML cacheado (SWR) nunca contiene datos de usuario: sesión y preferencias se resuelven en el cliente.
- Las reacciones en vivo usan SSE con bus en memoria: con varias instancias del backend sustituir por Redis pub/sub (`ReaccionesService.bus`).

## Estado de verificación

Este código se escribió sin acceso a npm, por lo que **no se ha compilado ni ejecutado el stack completo** (NestJS/Nuxt).
Sí se comprobó: sintaxis de todo el TS/Vue, balance de plantillas, `database/*.sql` y **todas las consultas SQL crudas del backend** contra PostgreSQL 16
(árbol de comentarios recursivo, ranking, relacionadas, notificaciones, upserts), y con `sharp` la lógica de WebP/cortes de tiras/orden natural.
Primer paso recomendado: `npm install && npm run build` en ambos proyectos y `npm test` en el backend; corrige lo que el compilador señale.
