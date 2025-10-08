import { render, screen, fireEvent } from '@testing-library/react';
import { Pagination } from '../Pagination';

describe('Pagination', () => {
  it('calls onPageChange on next/prev', () => {
    const onChange = jest.fn();
    render(<Pagination currentPage={2} totalItems={100} pageSize={10} onPageChange={onChange} />);
    fireEvent.click(screen.getByText('Anterior'));
    fireEvent.click(screen.getByText('Siguiente'));
    expect(onChange).toHaveBeenCalledTimes(2);
  });
});


