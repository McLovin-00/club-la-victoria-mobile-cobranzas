import { render } from '@testing-library/react';
import { Skeleton, SkeletonTableRows } from '../Skeleton';

describe('Skeleton components', () => {
  it('renders Skeleton', () => {
    const { container } = render(<Skeleton className='h-4 w-10' />);
    expect(container.firstChild).toBeTruthy();
  });
  it('renders SkeletonTableRows with rows', () => {
    const { container } = render(<SkeletonTableRows rows={3} />);
    expect(container.querySelectorAll('.p-4').length).toBeGreaterThan(0);
  });
});


