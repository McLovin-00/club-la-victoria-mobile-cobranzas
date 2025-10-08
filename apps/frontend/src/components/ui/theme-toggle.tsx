import { MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../providers/theme-provider.utils';
import { Button } from './button';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant='ghost'
      size='icon'
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      aria-label='Cambiar tema'
      className='h-9 w-9 rounded-full'
    >
      <SunIcon className='h-5 w-5 rotate-0 scale-100 transition-all dark:rotate-90 dark:scale-0' />
      <MoonIcon className='absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100' />
    </Button>
  );
}
