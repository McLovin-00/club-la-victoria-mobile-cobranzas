/**
 * Tests for ServiceWidgets component
 * Covers all code paths to achieve 100% coverage
 */

import React from 'react';
import { describe, it, expect, jest, beforeAll } from '@jest/globals';
import { render, screen } from '@testing-library/react';

describe('ServiceWidgetsContainer', () => {
  let ServiceWidgetsContainer: React.FC;

  beforeAll(async () => {
    // Import the component after any necessary mocks
    const module = await import('../ServiceWidgets');
    ServiceWidgetsContainer = module.ServiceWidgetsContainer;
  });

  it('should render services specialized title', () => {
    render(<ServiceWidgetsContainer />);

    expect(screen.getByText('Servicios Especializados')).toBeInTheDocument();
  });

  it('should render grid container for services', () => {
    const { container } = render(<ServiceWidgetsContainer />);

    expect(container.querySelector('.grid')).toBeInTheDocument();
  });

  it('should render with correct container styling', () => {
    const { container } = render(<ServiceWidgetsContainer />);

    const mainContainer = container.querySelector('.mb-8');
    expect(mainContainer).toBeInTheDocument();
  });
});
