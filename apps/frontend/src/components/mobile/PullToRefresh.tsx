import React, { useState, useRef, useEffect } from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { cn } from '../../lib/utils';

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  disabled?: boolean;
  className?: string;
  threshold?: number;
}

/**
 * PullToRefresh - Implementación nativa de pull-to-refresh
 * Optimizada para dispositivos móviles con gesture natural
 */
export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  children,
  onRefresh,
  disabled = false,
  className,
  threshold = 60,
}) => {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [startY, setStartY] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const refreshIndicatorRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    const touch = e.touches[0];
    setStartY(touch.clientY);
    
    // Solo iniciar pull si estamos en el top de la página
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling || disabled || isRefreshing) return;
    
    const touch = e.touches[0];
    const currentY = touch.clientY;
    const distance = Math.max(0, currentY - startY);
    
    // Aplicar resistencia: más resistencia conforme se tira más
    const resistance = Math.min(1, distance / threshold);
    const adjustedDistance = distance * (1 - resistance * 0.6);
    
    setPullDistance(adjustedDistance);
    
    // Prevenir scroll nativo cuando estamos pulling
    if (distance > 0) {
      e.preventDefault();
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling || disabled) return;
    
    setIsPulling(false);
    
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('Error during refresh:', error);
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setPullDistance(0);
  };

  // Reset states cuando se completa el refresh
  useEffect(() => {
    if (!isRefreshing) {
      setPullDistance(0);
      setIsPulling(false);
    }
  }, [isRefreshing]);

  const refreshProgress = Math.min(1, pullDistance / threshold);
  const shouldShowRefreshIndicator = isPulling || isRefreshing;

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-auto', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: isPulling ? `translateY(${Math.min(pullDistance, threshold * 1.2)}px)` : undefined,
        transition: isPulling ? 'none' : 'transform 0.3s ease-out',
      }}
    >
      {/* Refresh Indicator */}
      {shouldShowRefreshIndicator && (
        <div
          ref={refreshIndicatorRef}
          className="absolute top-0 left-0 right-0 flex items-center justify-center z-10"
          style={{
            height: Math.max(0, pullDistance),
            opacity: refreshProgress,
          }}
        >
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'w-8 h-8 rounded-full border-2 border-blue-500 flex items-center justify-center',
                'transition-all duration-200',
                isRefreshing && 'animate-spin'
              )}
              style={{
                transform: `rotate(${refreshProgress * 360}deg)`,
                borderTopColor: refreshProgress >= 1 ? '#3b82f6' : '#e5e7eb',
              }}
            >
              <ArrowPathIcon className="w-4 h-4 text-blue-500" />
            </div>
            
            <div className="text-xs text-gray-500 mt-1">
              {isRefreshing
                ? 'Actualizando...'
                : refreshProgress >= 1
                ? 'Suelta para actualizar'
                : 'Tira para actualizar'
              }
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className={cn('min-h-full', shouldShowRefreshIndicator && 'pt-16')}>
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
