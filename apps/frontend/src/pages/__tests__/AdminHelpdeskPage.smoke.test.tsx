import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = jest.fn();

jest.unstable_mockModule('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  MemoryRouter: ({ children }: any) => children,
}));

jest.unstable_mockModule('../../features/helpdesk/api/helpdeskApi', () => ({
  useGetTicketsQuery: () => ({ data: { data: [] }, isLoading: false }),
  useGetStatsQuery: () => ({ data: { open: 1, inProgress: 2, resolved: 3, closed: 4, total: 10 }, isLoading: false }),
  useGetResolverConfigsQuery: () => ({ data: [], isLoading: false }),
  useUpdateResolverConfigMutation: () => [jest.fn(), { isLoading: false }],
}));

jest.unstable_mockModule('../../features/helpdesk/components/TicketList', () => ({
  TicketList: () => <div data-testid='ticket-list'>TicketList</div>,
}));

jest.unstable_mockModule('../../components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

jest.unstable_mockModule('../../components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardDescription: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

jest.unstable_mockModule('../../components/ui/Toast.utils', () => ({
  showToast: jest.fn(),
}));

const { AdminHelpdeskPage } = await import('../AdminHelpdeskPage');

describe('AdminHelpdeskPage (smoke)', () => {
  it('renderiza sin crashear', () => {
    render(
      <MemoryRouter>
        <AdminHelpdeskPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Administracion de Mesa de Ayuda')).toBeTruthy();
    expect(screen.getByTestId('ticket-list')).toBeTruthy();
  });
});
