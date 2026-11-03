import { ValueTransformer } from 'typeorm';

/** PostgreSQL devuelve numeric como string; lo convertimos a number (ej. 130.5). */
export const numericTransformer: ValueTransformer = {
  to: (v?: number | null) => v,
  from: (v?: string | null) =>
    v === null || v === undefined ? v : parseFloat(v),
};
