import { BadRequestException, Injectable } from '@nestjs/common';
import sharp from 'sharp';

export interface ProcessedImage {
  buffer: Buffer;
  width: number;
  height: number;
}

/** Límite de alto del formato WebP (16383 px). Los webtoons largos se cortan en tiras. */
const WEBP_MAX_DIM = 16383;
const SLICE_HEIGHT = 8000;

@Injectable()
export class ImagesService {
  /**
   * Convierte a WebP. Si la imagen es más ancha que `maxWidth` se reduce.
   * Las tiras verticales muy altas (webtoon) se dividen en varias páginas contiguas.
   */
  async toWebp(
    input: Buffer,
    opts: { maxWidth?: number; quality?: number } = {},
  ): Promise<ProcessedImage[]> {
    const { maxWidth = 1600, quality = 80 } = opts;
    try {
      const base = sharp(input, {
        failOn: 'error',
        limitInputPixels: 400_000_000,
      }).rotate();
      const meta = await base.metadata();
      if (!meta.width || !meta.height) throw new Error('sin dimensiones');

      const scale = meta.width > maxWidth ? maxWidth / meta.width : 1;
      const width = Math.round(meta.width * scale);
      const height = Math.round(meta.height * scale);

      // Normalizamos a un buffer intermedio ya redimensionado para poder cortar tiras.
      const resized =
        scale < 1 || height > WEBP_MAX_DIM
          ? await base.resize({ width }).toBuffer()
          : input;

      if (height <= WEBP_MAX_DIM) {
        const out = await sharp(resized)
          .rotate()
          .webp({ quality, effort: 4 })
          .toBuffer({ resolveWithObject: true });
        return [
          { buffer: out.data, width: out.info.width, height: out.info.height },
        ];
      }

      const pieces: ProcessedImage[] = [];
      for (let top = 0; top < height; top += SLICE_HEIGHT) {
        const h = Math.min(SLICE_HEIGHT, height - top);
        const out = await sharp(resized)
          .extract({ left: 0, top, width, height: h })
          .webp({ quality, effort: 4 })
          .toBuffer({ resolveWithObject: true });
        pieces.push({
          buffer: out.data,
          width: out.info.width,
          height: out.info.height,
        });
      }
      return pieces;
    } catch (e) {
      throw new BadRequestException(
        `Imagen inválida o corrupta: ${(e as Error).message}`,
      );
    }
  }

  /** Imagen estática para portadas/avatares/comentarios: máx. ancho y WebP. */
  async toWebpSingle(
    input: Buffer,
    maxWidth: number,
    quality = 82,
  ): Promise<ProcessedImage> {
    const [first] = await this.toWebp(input, { maxWidth, quality });
    return first;
  }

  /** Comprueba firma real del archivo (no confiar en mimetype del cliente). */
  detect(buf: Buffer): 'gif' | 'png' | 'jpeg' | 'webp' | 'avif' | null {
    if (buf.length < 12) return null;
    if (buf.toString('ascii', 0, 4) === 'GIF8') return 'gif';
    if (buf[0] === 0x89 && buf.toString('ascii', 1, 4) === 'PNG') return 'png';
    if (buf[0] === 0xff && buf[1] === 0xd8) return 'jpeg';
    if (
      buf.toString('ascii', 0, 4) === 'RIFF' &&
      buf.toString('ascii', 8, 12) === 'WEBP'
    )
      return 'webp';
    if (
      buf.toString('ascii', 4, 8) === 'ftyp' &&
      /avif|avis/.test(buf.toString('ascii', 8, 16))
    )
      return 'avif';
    return null;
  }
}
