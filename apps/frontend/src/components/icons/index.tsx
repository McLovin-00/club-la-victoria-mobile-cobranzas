// Exportación de iconos desde Heroicons para uso en el dashboard
import {
  ArrowPathIcon as HeroArrowPathIcon,
  UserGroupIcon as HeroUserGroupIcon,
  BuildingOfficeIcon as HeroBuildingOfficeIcon,
  ComputerDesktopIcon as HeroCpuChipIcon,
  ServerIcon as HeroServerIcon,
  UserIcon as HeroUserIcon,
  ChatBubbleLeftRightIcon as HeroChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import React from 'react';

// Componente ArrowPathIcon (RefreshIcon)
export const ArrowPathIcon: React.FC<React.SVGProps<SVGSVGElement>> = props => {
  return <HeroArrowPathIcon {...props} />;
};

// Componente UsersIcon
export const UsersIcon: React.FC<React.SVGProps<SVGSVGElement>> = props => {
  return <HeroUserGroupIcon {...props} />;
};

// Componente BuildingOfficeIcon
export const BuildingOfficeIcon: React.FC<React.SVGProps<SVGSVGElement>> = props => {
  return <HeroBuildingOfficeIcon {...props} />;
};

// Componente CpuChipIcon
export const CpuChipIcon: React.FC<React.SVGProps<SVGSVGElement>> = props => {
  return <HeroCpuChipIcon {...props} />;
};

// Componente ServerIcon
export const ServerIcon: React.FC<React.SVGProps<SVGSVGElement>> = props => {
  return <HeroServerIcon {...props} />;
};

// Componente UserIcon
export const UserIcon: React.FC<React.SVGProps<SVGSVGElement>> = props => {
  return <HeroUserIcon {...props} />;
};

// Componente ChatBubbleLeftRightIcon
export const ChatBubbleLeftRightIcon: React.FC<React.SVGProps<SVGSVGElement>> = props => {
  return <HeroChatBubbleLeftRightIcon {...props} />;
};
