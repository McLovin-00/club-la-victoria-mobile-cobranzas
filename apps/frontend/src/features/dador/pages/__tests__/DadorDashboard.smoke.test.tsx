/**
 * Tests de cobertura para DadorDashboard
 */
import React from 'react';
import { describe, it, expect, beforeAll, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

jest.mock('../../../../store/hooks', () => ({
  useAppSelector: (selector: any) => selector({ auth: { user: { id: 1 } } }),
}));

jest.mock('../../../../components/ui/card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h2>{children}</h2>,
}));

jest.mock('../../../../components/ui/button', () => ({
  Button: ({ children }: any) => <button>{children}</button>,
}));

describe('DadorDashboard - Coverage', () => {
  let DadorDashboard: React.FC;

  beforeAll(async () => {
    const module = await import('../DadorDashboard.tsx');
    DadorDashboard = module.DadorDashboard || module.default;
  });

  it('debería importar el módulo', async () => {
    const module = await import('../DadorDashboard.tsx');
    expect(module.DadorDashboard || module.default).toBeDefined();
  });

  it('debería renderizar el dashboard', () => {
    render(
      <MemoryRouter>
        <DadorDashboard />
      </MemoryRouter>
    );

    expect(document.body.children.length).toBeGreaterThan(0);
  });
});
