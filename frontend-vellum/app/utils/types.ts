export interface Genero {
  id: number;
  nombre: string;
  slug: string;
}
export interface MangaResumen {
  id: number;
  titulo: string;
  slug: string;
  portadaUrl: string | null;
  tipo: string;
  estado?: string;
  vistas?: number;
  destacado?: boolean;
  ultimoCapitulo?: number | null;
  generos?: Genero[];
}
export interface Paginado<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
export interface CapituloUltimo {
  id: number;
  numero: number;
  titulo: string | null;
  volumen: number | null;
  publicadoEn: string;
  manga: MangaResumen;
}
export interface CapituloLista {
  id: number;
  numero: number;
  titulo: string | null;
  volumen: number | null;
  vistas: number;
  publicadoEn: string;
}
export interface ObraDetalle extends MangaResumen {
  tituloAlternativo: string | null;
  sinopsis: string;
  autor: string | null;
  estado: string;
  vistas: number;
  generos: Genero[];
  capitulos: CapituloLista[];
  actualizadoEn: string;
}
export interface Pagina {
  orden: number;
  url: string;
  ancho: number | null;
  alto: number | null;
}
export interface LectorData {
  manga: MangaResumen;
  capitulo: {
    id: number;
    numero: number;
    titulo: string | null;
    volumen: number | null;
    vistas: number;
    contenido: string | null;
  };
  paginas: Pagina[];
  anterior: { numero: number } | null;
  siguiente: { numero: number } | null;
  capitulos: { numero: number; titulo: string | null }[];
}
export type EstadoLectura = "leyendo" | "completado" | "pendiente";
export const ESTADO_LECTURA_LABEL: Record<EstadoLectura, string> = {
  leyendo: "Leyendo",
  completado: "Completado",
  pendiente: "Pendiente",
};

export interface Comentario {
  id: number;
  contenido: string;
  eliminado: boolean;
  creadoEn: string;
  usuarioId: string;
  username: string;
  avatarUrl: string | null;
  rol: string;
  likes: number;
  meGusta: boolean;
  multimedia: {
    id: number;
    tipo: string;
    url: string;
    ancho: number | null;
    alto: number | null;
  }[];
  respuestas: Comentario[];
}
