-- =====================================================================
-- VELLUM · INSERTS de datos de ejemplo (ejecutar DESPUÉS de vellum-schema.sql)
-- Obras y textos ficticios. Portadas/páginas usan imágenes de marcador (picsum.photos).
-- Usuarios de prueba (contraseña en la 2ª columna):
--   admin / Admin12345   uploader1 / Uploader123   lector1 / Lector12345
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- para generar hashes bcrypt compatibles con la API

-- GÉNEROS
INSERT INTO generos (nombre, slug) VALUES
 ('Acción','accion'),('Aventura','aventura'),('Comedia','comedia'),('Drama','drama'),
 ('Fantasía','fantasia'),('Romance','romance'),('Ciencia ficción','ciencia-ficcion'),('Terror','terror'),
 ('Misterio','misterio'),('Slice of life','slice-of-life'),('Deportes','deportes'),('Sobrenatural','sobrenatural'),
 ('Isekai','isekai'),('Artes marciales','artes-marciales'),('Escolar','escolar'),('Psicológico','psicologico'),
 ('Histórico','historico'),('Seinen','seinen'),('Shonen','shonen'),('Shojo','shojo')
ON CONFLICT DO NOTHING;

-- USUARIOS (hash bcrypt generado por la propia base)
INSERT INTO usuarios (username, email, password_hash, rol) VALUES
 ('admin',     'admin@vellum.local',     crypt('Admin12345',    gen_salt('bf', 12)), 'admin'),
 ('uploader1', 'uploader@vellum.local',  crypt('Uploader123',   gen_salt('bf', 12)), 'uploader'),
 ('lector1',   'lector1@vellum.local',   crypt('Lector12345',   gen_salt('bf', 12)), 'lector'),
 ('lector2',   'lector2@vellum.local',   crypt('Lector12345',   gen_salt('bf', 12)), 'lector');

-- PREFERENCIAS
INSERT INTO preferencias_usuario (usuario_id, tema, color_fondo, color_acento, ancho_pagina, separacion_vinetas, brillo, gestos_tactiles, ocultar_barras, tamano_fuente)
SELECT id, 'oscuro', '#0f172a', '#f59e0b', 800, 'sin_espacio', 100, true, true, 18 FROM usuarios WHERE username = 'lector1';
INSERT INTO preferencias_usuario (usuario_id, tema, color_fondo, color_acento, ancho_pagina, separacion_vinetas, brillo, gestos_tactiles, ocultar_barras, tamano_fuente)
SELECT id, 'claro', '#f4ecd8', '#d4af37', 720, 'fina', 90, true, false, 20 FROM usuarios WHERE username = 'lector2';

-- OBRAS
INSERT INTO mangas (titulo, titulo_alternativo, slug, sinopsis, autor, portada_url, tipo, estado, vistas) VALUES
 ('Cenizas del Dragón Gris', 'Ashes of the Grey Dragon', 'cenizas-del-dragon-gris', 'Un herrero sin magia hereda la última escama de un dragón y descubre que el reino entero la busca.', 'Aiko Mirandel', 'https://picsum.photos/seed/dragon/400/600', 'manga', 'en_emision', 1520),
 ('Torre de los Mil Pisos', NULL, 'torre-de-los-mil-pisos', 'Cada piso de la torre esconde una prueba distinta. Jun-ho solo quiere llegar al piso 10 para salvar a su hermana.', 'Han Seo-yeon', 'https://picsum.photos/seed/torre/400/600', 'manhwa', 'en_emision', 4310),
 ('El Loto Carmesí', 'Crimson Lotus', 'el-loto-carmesi', 'Una discípula expulsada de su secta aprende un arte prohibido en la montaña nevada.', 'Liu Wen', 'https://picsum.photos/seed/loto/400/600', 'manhua', 'en_emision', 980),
 ('Café a las Tres', NULL, 'cafe-a-las-tres', 'Una cafetería que solo abre a las tres de la madrugada y sus clientes inolvidables.', 'Sora Itsuki', 'https://picsum.photos/seed/cafe/400/600', 'manga', 'finalizado', 760),
 ('Crónicas del Archivista', 'Chronicles of the Archivist', 'cronicas-del-archivista', 'Novela ligera: un archivista descubre que los libros de su biblioteca reescriben la historia.', 'Elena Varga', 'https://picsum.photos/seed/archivista/400/600', 'novela', 'en_emision', 540),
 ('Medianoche en Neo-Tokio', NULL, 'medianoche-en-neo-tokio', 'Detectives, androides y una ciudad que nunca duerme.', 'Kenji Aoyama', 'https://picsum.photos/seed/neotokio/400/600', 'manga', 'pausado', 2210);

-- OBRA ↔ GÉNEROS
INSERT INTO manga_generos (manga_id, genero_id)
SELECT m.id, g.id FROM (VALUES
 ('cenizas-del-dragon-gris','accion'),('cenizas-del-dragon-gris','fantasia'),('cenizas-del-dragon-gris','aventura'),
 ('torre-de-los-mil-pisos','accion'),('torre-de-los-mil-pisos','fantasia'),('torre-de-los-mil-pisos','aventura'),
 ('el-loto-carmesi','artes-marciales'),('el-loto-carmesi','drama'),('el-loto-carmesi','fantasia'),
 ('cafe-a-las-tres','slice-of-life'),('cafe-a-las-tres','sobrenatural'),('cafe-a-las-tres','drama'),
 ('cronicas-del-archivista','misterio'),('cronicas-del-archivista','fantasia'),
 ('medianoche-en-neo-tokio','ciencia-ficcion'),('medianoche-en-neo-tokio','misterio'),('medianoche-en-neo-tokio','seinen')
) v(ms, gs) JOIN mangas m ON m.slug = v.ms JOIN generos g ON g.slug = v.gs;

-- CAPÍTULOS (incluye decimales: 2.5)
INSERT INTO capitulos (manga_id, numero, titulo, volumen, vistas, publicado_en)
SELECT m.id, v.n, v.t, v.vol, v.vis, now() - (v.dias || ' days')::interval FROM (VALUES
 ('cenizas-del-dragon-gris', 1,   'La última escama', 1, 900, 12),
 ('cenizas-del-dragon-gris', 2,   'El herrero y el rey', 1, 700, 9),
 ('cenizas-del-dragon-gris', 2.5, 'Extra: la forja', 1, 300, 8),
 ('cenizas-del-dragon-gris', 3,   'Fuego bajo la nieve', 1, 520, 3),
 ('torre-de-los-mil-pisos',  1,   'Piso 1', 1, 2100, 20),
 ('torre-de-los-mil-pisos',  2,   'Piso 2', 1, 1800, 10),
 ('torre-de-los-mil-pisos',  3,   'El guardián', 1, 1500, 2),
 ('el-loto-carmesi',         1,   'Expulsada', 1, 600, 15),
 ('el-loto-carmesi',         2,   'La montaña nevada', 1, 400, 5),
 ('cafe-a-las-tres',         1,   'La primera taza', 1, 400, 40),
 ('cafe-a-las-tres',         2,   'El cliente sin sombra', 1, 360, 30),
 ('cronicas-del-archivista', 1,   'El libro que sangraba tinta', 1, 300, 7),
 ('cronicas-del-archivista', 2,   'Estantería prohibida', 1, 240, 1),
 ('medianoche-en-neo-tokio', 1,   'Lluvia ácida', 1, 1300, 60)
) v(ms, n, t, vol, vis, dias) JOIN mangas m ON m.slug = v.ms;

-- PÁGINAS de los capítulos de imagen (6 páginas cada uno, 800x1200)
INSERT INTO capitulo_paginas (capitulo_id, orden, url, ancho, alto)
SELECT c.id, p.orden, 'https://picsum.photos/seed/' || m.slug || '-' || c.numero || '-' || p.orden || '/800/1200', 800, 1200
FROM capitulos c JOIN mangas m ON m.id = c.manga_id
CROSS JOIN generate_series(1, 6) AS p(orden)
WHERE m.tipo <> 'novela';

-- TEXTO de los capítulos de novela
UPDATE capitulos SET contenido_texto =
 E'La biblioteca olía a polvo y a lluvia vieja.\n\nMarlen deslizó el dedo por el lomo de un tomo sin título. Estaba tibio, como si alguien lo hubiera sostenido hasta hacía un instante.\n\n—No deberías tocar ese —dijo una voz entre las estanterías.\n\nPero ya era tarde: la primera página empezaba a escribirse sola.'
WHERE manga_id = (SELECT id FROM mangas WHERE slug='cronicas-del-archivista') AND numero = 1;
UPDATE capitulos SET contenido_texto =
 E'La estantería prohibida no figuraba en ningún plano.\n\nMarlen contó los pasos desde la puerta: veintidós. Al llegar al veintitrés, el suelo ya no era el mismo.\n\nLos libros respiraban despacio, y en cada lomo había un nombre que ella conocía.'
WHERE manga_id = (SELECT id FROM mangas WHERE slug='cronicas-del-archivista') AND numero = 2;

-- BIBLIOTECA
INSERT INTO biblioteca_usuario (usuario_id, manga_id, estado)
SELECT u.id, m.id, v.e FROM (VALUES
 ('lector1','cenizas-del-dragon-gris','leyendo'),('lector1','torre-de-los-mil-pisos','leyendo'),
 ('lector1','cafe-a-las-tres','completado'),('lector1','el-loto-carmesi','pendiente'),
 ('lector2','torre-de-los-mil-pisos','leyendo'),('lector2','cronicas-del-archivista','pendiente')
) v(un, ms, e) JOIN usuarios u ON u.username = v.un JOIN mangas m ON m.slug = v.ms;

-- HISTORIAL ("Continuar leyendo")
INSERT INTO historial_lectura (usuario_id, manga_id, capitulo_id, pagina)
SELECT u.id, m.id, c.id, v.pag FROM (VALUES
 ('lector1','cenizas-del-dragon-gris', 2, 4),
 ('lector1','torre-de-los-mil-pisos',  3, 2),
 ('lector2','torre-de-los-mil-pisos',  1, 6)
) v(un, ms, n, pag)
JOIN usuarios u ON u.username = v.un JOIN mangas m ON m.slug = v.ms JOIN capitulos c ON c.manga_id = m.id AND c.numero = v.n;

-- REACCIONES DE CAPÍTULO (🔥 😍 😂 😮 😭 😡)
INSERT INTO reacciones_capitulo (capitulo_id, usuario_id, emoji)
SELECT c.id, u.id, v.e FROM (VALUES
 ('cenizas-del-dragon-gris', 1, 'lector1', '🔥'),('cenizas-del-dragon-gris', 1, 'lector2', '😍'),
 ('torre-de-los-mil-pisos',  3, 'lector1', '😮'),('torre-de-los-mil-pisos',  3, 'lector2', '🔥'),
 ('torre-de-los-mil-pisos',  3, 'admin',   '🔥'),('cafe-a-las-tres',         2, 'lector1', '😭')
) v(ms, n, un, e)
JOIN mangas m ON m.slug = v.ms JOIN capitulos c ON c.manga_id = m.id AND c.numero = v.n JOIN usuarios u ON u.username = v.un;

-- COMENTARIOS (hilo con respuestas anidadas)
INSERT INTO comentarios (capitulo_id, usuario_id, comentario_padre_id, contenido, creado_en)
SELECT c.id, u.id, NULL, '¡Qué buen inicio! **La escama** me dejó con ganas de más 🔥', now() - interval '2 days'
FROM capitulos c JOIN mangas m ON m.id=c.manga_id, usuarios u WHERE m.slug='torre-de-los-mil-pisos' AND c.numero=3 AND u.username='lector1';

INSERT INTO comentarios (capitulo_id, usuario_id, comentario_padre_id, contenido, creado_en)
SELECT p.capitulo_id, u.id, p.id, 'Totalmente, el final del guardián fue épico ||spoiler: pierde el brazo||', now() - interval '1 day 20 hours'
FROM comentarios p, usuarios u WHERE p.contenido LIKE '¡Qué buen inicio!%' AND u.username='lector2';

INSERT INTO comentarios (capitulo_id, usuario_id, comentario_padre_id, contenido, creado_en)
SELECT p.capitulo_id, u.id, p.id, 'Gracias por leernos 💛 el siguiente capítulo sale pronto.', now() - interval '1 day'
FROM comentarios p, usuarios u WHERE p.contenido LIKE 'Totalmente, el final%' AND u.username='uploader1';

INSERT INTO comentarios (capitulo_id, usuario_id, comentario_padre_id, contenido, creado_en)
SELECT c.id, u.id, NULL, 'Ese extra de la forja vale oro.', now() - interval '6 days'
FROM capitulos c JOIN mangas m ON m.id=c.manga_id, usuarios u WHERE m.slug='cenizas-del-dragon-gris' AND c.numero=2.5 AND u.username='lector2';

-- MULTIMEDIA de comentarios (imagen / gif / sticker)
INSERT INTO comentario_multimedia (comentario_id, tipo, url, ancho, alto)
SELECT id, 'imagen', 'https://picsum.photos/seed/meme1/600/400', 600, 400 FROM comentarios WHERE contenido LIKE 'Ese extra de la forja%';
INSERT INTO comentario_multimedia (comentario_id, tipo, url, ancho, alto)
SELECT id, 'sticker', 'https://picsum.photos/seed/sticker1/256/256', 256, 256 FROM comentarios WHERE contenido LIKE 'Gracias por leernos%';

-- LIKES de comentarios
INSERT INTO reacciones_comentarios (comentario_id, usuario_id)
SELECT c.id, u.id FROM comentarios c, usuarios u
WHERE c.contenido LIKE '¡Qué buen inicio!%' AND u.username IN ('lector2','admin','uploader1');
INSERT INTO reacciones_comentarios (comentario_id, usuario_id)
SELECT c.id, u.id FROM comentarios c, usuarios u
WHERE c.contenido LIKE 'Totalmente, el final%' AND u.username = 'lector1';


-- ===================== FASE 2 =====================
-- DESTACADAS (banner de portada)
UPDATE mangas SET destacado = true WHERE slug IN ('cenizas-del-dragon-gris','torre-de-los-mil-pisos','el-loto-carmesi');

-- VISTAS DIARIAS (últimos 14 días, para ranking semanal y gráfico del panel)
INSERT INTO vistas_diarias (manga_id, dia, vistas)
SELECT m.id, (CURRENT_DATE - d), (10 + ((m.id * 7 + d * 13) % 60))::int
FROM mangas m CROSS JOIN generate_series(0, 13) AS d;

-- PALABRAS PROHIBIDAS
INSERT INTO palabras_prohibidas (palabra) VALUES ('estupido'),('basura humana'),('spamlink') ON CONFLICT DO NOTHING;

-- NOTIFICACIONES
INSERT INTO notificaciones (usuario_id, tipo, titulo, cuerpo, url, leida)
SELECT u.id, 'nuevo_capitulo', 'Torre de los Mil Pisos', 'Capítulo 3 disponible', '/leer/torre-de-los-mil-pisos/3', false FROM usuarios u WHERE u.username IN ('lector1','lector2');
INSERT INTO notificaciones (usuario_id, tipo, titulo, cuerpo, url, leida)
SELECT u.id, 'respuesta', 'lector2 respondió a tu comentario', 'Totalmente, el final del guardián fue épico', '/leer/torre-de-los-mil-pisos/3', false FROM usuarios u WHERE u.username = 'lector1';
INSERT INTO notificaciones (usuario_id, tipo, titulo, cuerpo, url, leida)
SELECT u.id, 'sistema', '¡Bienvenido a Vellum!', 'Guarda obras en tu biblioteca para recibir avisos de nuevos capítulos.', '/catalogo', true FROM usuarios u WHERE u.username = 'lector1';

-- REPORTE de ejemplo (lector2 reporta un comentario de lector1)
INSERT INTO reportes_comentarios (comentario_id, usuario_id, motivo, detalle)
SELECT c.id, u.id, 'spoiler', 'No avisa del spoiler' FROM comentarios c, usuarios u
WHERE c.contenido LIKE '¡Qué buen inicio!%' AND u.username = 'lector2';
