-- =====================================================================
-- VELLUM · Esquema PostgreSQL (14+)  ·  18 tablas
-- Ejecutar en DBeaver sobre una base vacía (Ctrl+Alt+Shift+X = ejecutar script)
-- Si usas este script, pon DB_SYNCHRONIZE=false en backend-vellum/.env
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;   -- búsqueda ILIKE rápida por título

-- Mantiene actualizado_en automáticamente en updates manuales
CREATE OR REPLACE FUNCTION set_actualizado_en() RETURNS trigger AS $$
BEGIN NEW.actualizado_en = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- 1. usuarios -----------------------------------------------------------
CREATE TABLE usuarios (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username       varchar(32)  NOT NULL UNIQUE,
  email          varchar(255) NOT NULL UNIQUE,
  password_hash  varchar(255) NOT NULL,
  avatar_url     text,
  rol            varchar(16)  NOT NULL DEFAULT 'lector' CHECK (rol IN ('admin','uploader','lector')),
  activo         boolean      NOT NULL DEFAULT true,
  creado_en      timestamptz  NOT NULL DEFAULT now(),
  actualizado_en timestamptz  NOT NULL DEFAULT now()
);

-- 2. preferencias_usuario -----------------------------------------------
CREATE TABLE preferencias_usuario (
  usuario_id         uuid PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  tema               varchar(8)  NOT NULL DEFAULT 'oscuro' CHECK (tema IN ('oscuro','claro')),
  color_fondo        varchar(9)  NOT NULL DEFAULT '#0f172a',
  color_acento       varchar(9)  NOT NULL DEFAULT '#f59e0b',
  ancho_pagina       int         NOT NULL DEFAULT 800  CHECK (ancho_pagina BETWEEN 320 AND 1400),
  separacion_vinetas varchar(12) NOT NULL DEFAULT 'sin_espacio' CHECK (separacion_vinetas IN ('sin_espacio','fina','amplia')),
  brillo             int         NOT NULL DEFAULT 100  CHECK (brillo BETWEEN 40 AND 100),
  gestos_tactiles    boolean     NOT NULL DEFAULT true,
  ocultar_barras     boolean     NOT NULL DEFAULT true,
  modo_lectura       varchar(14) NOT NULL DEFAULT 'vertical' CHECK (modo_lectura IN ('vertical','paginado','paginado_rtl')),
  tamano_fuente      int         NOT NULL DEFAULT 18   CHECK (tamano_fuente BETWEEN 12 AND 32),
  actualizado_en     timestamptz NOT NULL DEFAULT now()
);

-- 3. generos ------------------------------------------------------------
CREATE TABLE generos (
  id     serial PRIMARY KEY,
  nombre varchar(60) NOT NULL UNIQUE,
  slug   varchar(80) NOT NULL UNIQUE
);

-- 4. mangas -------------------------------------------------------------
CREATE TABLE mangas (
  id                 serial PRIMARY KEY,
  titulo             varchar(255) NOT NULL,
  titulo_alternativo varchar(255),
  slug               varchar(140) NOT NULL UNIQUE,
  sinopsis           text         NOT NULL DEFAULT '',
  autor              varchar(160),
  portada_url        text,
  tipo               varchar(10)  NOT NULL DEFAULT 'manga'       CHECK (tipo IN ('manga','manhwa','manhua','novela')),
  estado             varchar(12)  NOT NULL DEFAULT 'en_emision'  CHECK (estado IN ('en_emision','finalizado','pausado','cancelado')),
  vistas             int          NOT NULL DEFAULT 0,
  destacado          boolean      NOT NULL DEFAULT false,   -- banner de portada
  creado_en          timestamptz  NOT NULL DEFAULT now(),
  actualizado_en     timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX idx_mangas_tipo_estado        ON mangas (tipo, estado);
CREATE INDEX idx_mangas_vistas             ON mangas (vistas DESC);
CREATE INDEX idx_mangas_titulo_trgm        ON mangas USING gin (titulo gin_trgm_ops);
CREATE INDEX idx_mangas_titulo_alt_trgm    ON mangas USING gin (titulo_alternativo gin_trgm_ops);

-- 5. manga_generos (N:M) ------------------------------------------------
CREATE TABLE manga_generos (
  manga_id  int NOT NULL REFERENCES mangas(id)  ON DELETE CASCADE,
  genero_id int NOT NULL REFERENCES generos(id) ON DELETE CASCADE,
  PRIMARY KEY (manga_id, genero_id)
);
CREATE INDEX idx_manga_generos_genero ON manga_generos (genero_id, manga_id);

-- 6. capitulos (numero admite decimales: 130.5) -------------------------
CREATE TABLE capitulos (
  id              serial PRIMARY KEY,
  manga_id        int           NOT NULL REFERENCES mangas(id) ON DELETE CASCADE,
  numero          numeric(8,2)  NOT NULL,
  titulo          varchar(255),
  volumen         int,
  vistas          int           NOT NULL DEFAULT 0,
  contenido_texto text,                       -- solo novelas ligeras
  publicado_en    timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT uq_capitulo_manga_numero UNIQUE (manga_id, numero)
);
CREATE INDEX idx_capitulos_publicado           ON capitulos (publicado_en DESC);
CREATE INDEX idx_capitulos_manga_numero_desc   ON capitulos (manga_id, numero DESC);

-- 7. capitulo_paginas ---------------------------------------------------
CREATE TABLE capitulo_paginas (
  id          serial PRIMARY KEY,
  capitulo_id int  NOT NULL REFERENCES capitulos(id) ON DELETE CASCADE,
  orden       int  NOT NULL,
  url         text NOT NULL,
  ancho       int,
  alto        int,
  CONSTRAINT uq_pagina_capitulo_orden UNIQUE (capitulo_id, orden)
);

-- 8. biblioteca_usuario -------------------------------------------------
CREATE TABLE biblioteca_usuario (
  id             serial PRIMARY KEY,
  usuario_id     uuid        NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  manga_id       int         NOT NULL REFERENCES mangas(id)   ON DELETE CASCADE,
  estado         varchar(12) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('leyendo','completado','pendiente')),
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_biblioteca_usuario_manga UNIQUE (usuario_id, manga_id)
);
CREATE INDEX idx_biblioteca_usuario_estado ON biblioteca_usuario (usuario_id, estado);

-- 9. historial_lectura ("Continuar leyendo") ----------------------------
CREATE TABLE historial_lectura (
  id             serial PRIMARY KEY,
  usuario_id     uuid        NOT NULL REFERENCES usuarios(id)  ON DELETE CASCADE,
  manga_id       int         NOT NULL REFERENCES mangas(id)    ON DELETE CASCADE,
  capitulo_id    int         NOT NULL REFERENCES capitulos(id) ON DELETE CASCADE,
  pagina         int         NOT NULL DEFAULT 1,
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_historial_usuario_manga UNIQUE (usuario_id, manga_id)
);
CREATE INDEX idx_historial_usuario_fecha ON historial_lectura (usuario_id, actualizado_en DESC);

-- 10. reacciones_capitulo (1 reacción por usuario y capítulo) -----------
CREATE TABLE reacciones_capitulo (
  id          serial PRIMARY KEY,
  capitulo_id int         NOT NULL REFERENCES capitulos(id) ON DELETE CASCADE,
  usuario_id  uuid        NOT NULL REFERENCES usuarios(id)  ON DELETE CASCADE,
  emoji       varchar(16) NOT NULL,
  CONSTRAINT uq_reaccion_capitulo_usuario UNIQUE (capitulo_id, usuario_id)
);
CREATE INDEX idx_reaccion_capitulo ON reacciones_capitulo (capitulo_id, emoji);

-- 11. comentarios (hilos con respuestas anidadas) -----------------------
CREATE TABLE comentarios (
  id                  serial PRIMARY KEY,
  capitulo_id         int         NOT NULL REFERENCES capitulos(id) ON DELETE CASCADE,
  usuario_id          uuid        NOT NULL REFERENCES usuarios(id)  ON DELETE CASCADE,
  comentario_padre_id int         REFERENCES comentarios(id) ON DELETE CASCADE,
  contenido           text        NOT NULL,
  eliminado           boolean     NOT NULL DEFAULT false,
  creado_en           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_comentarios_capitulo ON comentarios (capitulo_id, comentario_padre_id, creado_en);
CREATE INDEX idx_comentarios_padre    ON comentarios (comentario_padre_id);

-- 12a. comentario_multimedia (imágenes / GIFs / stickers) ---------------
CREATE TABLE comentario_multimedia (
  id            serial PRIMARY KEY,
  comentario_id int         NOT NULL REFERENCES comentarios(id) ON DELETE CASCADE,
  tipo          varchar(10) NOT NULL CHECK (tipo IN ('imagen','gif','sticker')),
  url           text        NOT NULL,
  ancho         int,
  alto          int
);
CREATE INDEX idx_comentario_multimedia_comentario ON comentario_multimedia (comentario_id);

-- 12b. reacciones_comentarios ("likes") ---------------------------------
CREATE TABLE reacciones_comentarios (
  id            serial PRIMARY KEY,
  comentario_id int         NOT NULL REFERENCES comentarios(id) ON DELETE CASCADE,
  usuario_id    uuid        NOT NULL REFERENCES usuarios(id)    ON DELETE CASCADE,
  creado_en     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_reaccion_comentario_usuario UNIQUE (comentario_id, usuario_id)
);
CREATE INDEX idx_reacciones_comentarios_comentario ON reacciones_comentarios (comentario_id);


-- ===================== NUEVAS TABLAS (fase 2) =====================

-- 13. notificaciones (nuevo capítulo / respuesta a comentario)
CREATE TABLE notificaciones (
  id         serial PRIMARY KEY,
  usuario_id uuid         NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo       varchar(20)  NOT NULL CHECK (tipo IN ('nuevo_capitulo','respuesta','sistema')),
  titulo     varchar(255) NOT NULL,
  cuerpo     text         NOT NULL DEFAULT '',
  url        text,
  leida      boolean      NOT NULL DEFAULT false,
  creado_en  timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX idx_notificaciones_usuario ON notificaciones (usuario_id, leida, creado_en DESC);

-- 14. reportes_comentarios (moderación)
CREATE TABLE reportes_comentarios (
  id            serial PRIMARY KEY,
  comentario_id int         NOT NULL REFERENCES comentarios(id) ON DELETE CASCADE,
  usuario_id    uuid        NOT NULL REFERENCES usuarios(id)    ON DELETE CASCADE,
  motivo        varchar(40) NOT NULL,
  detalle       varchar(300),
  estado        varchar(12) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','resuelto','descartado')),
  creado_en     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_reporte_comentario_usuario UNIQUE (comentario_id, usuario_id)
);
CREATE INDEX idx_reportes_estado ON reportes_comentarios (estado, creado_en DESC);

-- 15. palabras_prohibidas (filtro de comentarios)
CREATE TABLE palabras_prohibidas (
  id      serial PRIMARY KEY,
  palabra varchar(80) NOT NULL UNIQUE
);

-- 16. password_resets (recuperar contraseña; solo hash del token)
CREATE TABLE password_resets (
  id         serial PRIMARY KEY,
  usuario_id uuid        NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token_hash varchar(64) NOT NULL UNIQUE,
  expira_en  timestamptz NOT NULL,
  usado      boolean     NOT NULL DEFAULT false,
  creado_en  timestamptz NOT NULL DEFAULT now()
);

-- 17. vistas_diarias (ranking semanal / mensual)
CREATE TABLE vistas_diarias (
  manga_id int  NOT NULL REFERENCES mangas(id) ON DELETE CASCADE,
  dia      date NOT NULL,
  vistas   int  NOT NULL DEFAULT 0,
  PRIMARY KEY (manga_id, dia)
);
CREATE INDEX idx_vistas_diarias_dia ON vistas_diarias (dia);

-- Triggers de actualizado_en -------------------------------------------
CREATE TRIGGER trg_usuarios_upd    BEFORE UPDATE ON usuarios             FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();
CREATE TRIGGER trg_mangas_upd      BEFORE UPDATE ON mangas               FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();
CREATE TRIGGER trg_prefs_upd       BEFORE UPDATE ON preferencias_usuario FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();
CREATE TRIGGER trg_biblioteca_upd  BEFORE UPDATE ON biblioteca_usuario   FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

-- Datos iniciales: géneros ---------------------------------------------
INSERT INTO generos (nombre, slug) VALUES
 ('Acción','accion'),('Aventura','aventura'),('Comedia','comedia'),('Drama','drama'),
 ('Fantasía','fantasia'),('Romance','romance'),('Ciencia ficción','ciencia-ficcion'),('Terror','terror'),
 ('Misterio','misterio'),('Slice of life','slice-of-life'),('Deportes','deportes'),('Sobrenatural','sobrenatural'),
 ('Isekai','isekai'),('Artes marciales','artes-marciales'),('Escolar','escolar'),('Psicológico','psicologico'),
 ('Histórico','historico'),('Seinen','seinen'),('Shonen','shonen'),('Shojo','shojo')
ON CONFLICT DO NOTHING;
