import React, { useState } from 'react';
import { logger } from '../../utils/logger';
import { PlusIcon, CameraIcon, DocumentArrowUpIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { TouchFeedback } from './TouchFeedback';
import { cn } from '../../lib/utils';

interface FABAction {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color?: string;
  onClick: () => void;
}

interface FloatingActionButtonProps {
  actions?: FABAction[];
  className?: string;
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
  size?: 'normal' | 'large';
}

const defaultActions: FABAction[] = [
  {
    id: 'camera',
    icon: CameraIcon,
    label: 'Tomar Foto',
    color: 'bg-green-500',
    onClick: () => {
      logger.debug('Camera action');
    },
  },
  {
    id: 'upload',
    icon: DocumentArrowUpIcon,
    label: 'Subir Archivo',
    color: 'bg-blue-500',
    onClick: () => {
      logger.debug('Upload action');
    },
  },
];

/**
 * FloatingActionButton - FAB optimizado para mobile
 * Posicionado para ser accesible con el pulgar (thumb-friendly)
 */
export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  actions = defaultActions,
  className,
  position = 'bottom-right',
  size = 'normal',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'bottom-center': 'bottom-6 left-1/2 transform -translate-x-1/2',
  };

  const sizeClasses = {
    normal: 'w-14 h-14',
    large: 'w-16 h-16',
  };

  const iconSizeClasses = {
    normal: 'w-6 h-6',
    large: 'w-8 h-8',
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const handleActionClick = (action: FABAction) => {
    action.onClick();
    setIsExpanded(false);
  };

  return (
    <>
      {/* Backdrop para cerrar al tocar fuera */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/20 z-40 transition-opacity duration-200"
          onClick={() => setIsExpanded(false)}
          onKeyDown={(e) => e.key === 'Escape' && setIsExpanded(false)}
          role="button"
          tabIndex={0}
          aria-label="Cerrar acciones"
        />
      )}

      {/* FAB Container */}
      <div className={cn('fixed z-50', positionClasses[position], className)}>
        {/* Action Buttons */}
        <div className="flex flex-col-reverse items-center space-y-reverse space-y-3 mb-3">
          {isExpanded &&
            actions.map((action, index) => (
              <div
                key={action.id}
                className="flex items-center space-x-3"
                style={{
                  animationDelay: `${index * 50}ms`,
                  animation: 'fadeInUp 200ms ease-out forwards',
                }}
              >
                {/* Action Label */}
                <div className="bg-black/80 text-white text-sm px-3 py-1 rounded-full whitespace-nowrap">
                  {action.label}
                </div>
                
                {/* Action Button */}
                <TouchFeedback
                  hapticFeedback="medium"
                  scaleOnPress
                  onPress={() => handleActionClick(action)}
                >
                  <div
                    className={cn(
                      'w-12 h-12 rounded-full shadow-lg flex items-center justify-center',
                      'transition-all duration-200 hover:scale-105',
                      action.color || 'bg-blue-500'
                    )}
                  >
                    <action.icon className="w-5 h-5 text-white" />
                  </div>
                </TouchFeedback>
              </div>
            ))}
        </div>

        {/* Main FAB */}
        <TouchFeedback
          hapticFeedback="medium"
          scaleOnPress
          onPress={toggleExpanded}
        >
          <div
            className={cn(
              'bg-gradient-to-r from-blue-500 to-blue-600 rounded-full shadow-xl',
              'flex items-center justify-center transition-all duration-200',
              'hover:shadow-2xl hover:scale-105',
              sizeClasses[size]
            )}
            style={{
              boxShadow: '0 4px 20px rgba(59, 130, 246, 0.4)',
            }}
          >
            {isExpanded ? (
              <XMarkIcon className={cn('text-white transition-transform duration-200', iconSizeClasses[size])} />
            ) : (
              <PlusIcon className={cn('text-white transition-transform duration-200', iconSizeClasses[size])} />
            )}
          </div>
        </TouchFeedback>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
};

export default FloatingActionButton;
