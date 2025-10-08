import React from 'react';

type LoadingSpinnerProps = {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary';
  text?: string;
  className?: string;
};

const sizeClasses: Record<NonNullable<LoadingSpinnerProps['size']>, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-2',
};

const colorClasses: Record<NonNullable<LoadingSpinnerProps['variant']>, string> = {
  primary: 'border-blue-600',
  secondary: 'border-gray-500',
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', variant = 'primary', text, className }) => {
  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      <div className={`animate-spin rounded-full border-t-transparent ${sizeClasses[size]} ${colorClasses[variant]}`} />
      {text && <span className='text-sm text-muted-foreground'>{text}</span>}
    </div>
  );
};

export default LoadingSpinner;


