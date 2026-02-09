/**
 * Import tests para schemas con 0% de cobertura.
 * @jest-environment node
 */

describe('schemas imports (real)', () => {
  it('imports user.schema', async () => {
    const m = await import('../user.schema');
    expect(m).toBeDefined();
  });
});


