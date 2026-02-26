import React, { useRef, useState } from 'react';
import { cn } from '../../lib/utils';

interface TouchFeedbackProps {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  hapticFeedback?: 'light' | 'medium' | 'heavy';
  scaleOnPress?: boolean;
  rippleEffect?: boolean;
  onPress?: () => void;
  onClick?: () => void;
}

/**
 * TouchFeedback - Componente que proporciona feedback visual y háptico
 * Inspirado en el sistema de feedback de iOS para una experiencia nativa
 */
export const TouchFeedback: React.FC<TouchFeedbackProps> = ({
  children,
  className,
  disabled = false,
  hapticFeedback = 'light',
  scaleOnPress = false,
  rippleEffect = false,
  onPress,
  onClick,
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [ripples, setRipples] = useState<Array<{ id: string; x: number; y: number }>>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Haptic feedback (solo funciona en dispositivos compatibles)
  const triggerHapticFeedback = () => {
    if (navigator.vibrate && hapticFeedback) {
      const intensity = {
        light: 10,
        medium: 20,
        heavy: 30,
      };
      navigator.vibrate(intensity[hapticFeedback]);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    // Evitar scroll accidental mientras se da feedback háptico
    e.preventDefault();
    e.stopPropagation();

    setIsPressed(scaleOnPress);
    triggerHapticFeedback();

    // Ripple effect
    if (rippleEffect && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.touches[0].clientX - rect.left;
      const y = e.touches[0].clientY - rect.top;
      
      const newRipple = {
        id: Date.now().toString(),
        x,
        y,
      };
      
      setRipples(prev => [...prev, newRipple]);
      
      // Remove ripple after animation
      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== newRipple.id));
      }, 600);
    }
  };

  const handleTouchEnd = () => {
    if (disabled) return;
    setIsPressed(false);
    onPress?.();
  };

  const handleMouseDown = () => {
    if (disabled) return;
    setIsPressed(true);
  };

  const handleMouseUp = () => {
    if (disabled) return;
    setIsPressed(false);
    onPress?.();
  };

  const handleMouseLeave = () => {
    if (disabled) return;
    setIsPressed(false);
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-hidden select-none cursor-pointer',
        'transition-transform duration-75 ease-out',
        scaleOnPress && isPressed && 'scale-95',
        disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
        className
      )}
      onClick={onClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      style={{
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
      }}
    >
      {children}
      
      {/* Ripple Effect */}
      {rippleEffect && (
        <div className="absolute inset-0 pointer-events-none">
          {ripples.map(ripple => (
            <div
              key={ripple.id}
              className="absolute rounded-full bg-white/20 animate-ping"
              style={{
                left: ripple.x - 10,
                top: ripple.y - 10,
                width: 20,
                height: 20,
                animationDuration: '600ms',
              }}
            />
          ))}
        </div>
      )}
      
      {/* Pressed Overlay */}
      {isPressed && (
        <div className="absolute inset-0 bg-black/5 pointer-events-none transition-opacity duration-75" />
      )}
    </div>
  );
};

export default TouchFeedback;
