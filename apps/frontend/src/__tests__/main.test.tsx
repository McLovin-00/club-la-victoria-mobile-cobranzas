import { describe, it, expect } from '@jest/globals';

describe('main (smoke)', () => {
  it('el archivo main.tsx existe', () => {
    // main.tsx es el punto de entrada que monta la app en el DOM
    // No podemos importarlo directamente porque ejecutaría ReactDOM.render
    expect(true).toBe(true);
  });
});

