import { mapLimit } from './concurrency';
import { slugify } from './slug';

describe('slugify', () => {
  it('quita acentos y símbolos', () =>
    expect(slugify('Ōkami & Ñandú: ¡Vol. 2!')).toBe('okami-nandu-vol-2'));
  it('no deja guiones en los extremos', () =>
    expect(slugify('  --Hola--  ')).toBe('hola'));
});

describe('mapLimit', () => {
  it('respeta la concurrencia y el orden', async () => {
    let cur = 0,
      max = 0;
    const out = await mapLimit([...Array(20).keys()], 4, async (i) => {
      cur++;
      max = Math.max(max, cur);
      await new Promise((r) => setTimeout(r, 2));
      cur--;
      return i * 2;
    });
    expect(max).toBeLessThanOrEqual(4);
    expect(out).toEqual([...Array(20).keys()].map((i) => i * 2));
  });
});

describe('orden natural de páginas', () => {
  it('1,2,9,10 y no 1,10,2', () => {
    const l = ['10.jpg', '2.jpg', '1.jpg', '9.jpg'].sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }),
    );
    expect(l).toEqual(['1.jpg', '2.jpg', '9.jpg', '10.jpg']);
  });
});
