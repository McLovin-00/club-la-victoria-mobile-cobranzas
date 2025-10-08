import React from 'react';

type SkeletonProps = {
  className?: string;
};

export const Skeleton: React.FC<SkeletonProps> = ({ className }) => (
  <div className={`animate-pulse rounded-md bg-muted ${className || 'h-4 w-full'}`} />
);

export const SkeletonTableRows: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className='divide-y divide-border'>
    {Array.from({ length: rows }).map((_, idx) => (
      <div key={idx} className='p-4 grid grid-cols-4 gap-4'>
        <Skeleton className='h-4' />
        <Skeleton className='h-4' />
        <Skeleton className='h-4' />
        <Skeleton className='h-4' />
      </div>
    ))}
  </div>
);

export default Skeleton;


