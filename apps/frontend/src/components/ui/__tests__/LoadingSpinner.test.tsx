import { render, screen } from '@testing-library/react';
import { LoadingSpinner } from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders spinner with optional text', () => {
    render(<LoadingSpinner text='Cargando' />);
    expect(screen.getByText('Cargando')).toBeInTheDocument();
  });
});


