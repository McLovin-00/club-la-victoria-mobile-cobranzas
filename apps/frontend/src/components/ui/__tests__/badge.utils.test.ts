/**
 * Tests para las utilidades de Badge (badge.utils.ts)
 * Verifica las variantes del badge usando class-variance-authority
 */
import { badgeVariants } from '../badge.utils';

describe('badgeVariants', () => {
  describe('clases base', () => {
    it('debe incluir clases base en todas las variantes', () => {
      const result = badgeVariants();
      
      expect(result).toContain('inline-flex');
      expect(result).toContain('items-center');
      expect(result).toContain('rounded-full');
      expect(result).toContain('border');
      expect(result).toContain('px-2.5');
      expect(result).toContain('py-0.5');
      expect(result).toContain('text-xs');
      expect(result).toContain('font-semibold');
      expect(result).toContain('transition-colors');
    });

    it('debe incluir clases de focus', () => {
      const result = badgeVariants();
      
      expect(result).toContain('focus:outline-none');
      expect(result).toContain('focus:ring-2');
      expect(result).toContain('focus:ring-ring');
      expect(result).toContain('focus:ring-offset-2');
    });
  });

  describe('variante default', () => {
    it('debe aplicar variante default cuando no se especifica', () => {
      const result = badgeVariants();
      
      expect(result).toContain('border-transparent');
      expect(result).toContain('bg-primary');
      expect(result).toContain('text-primary-foreground');
      expect(result).toContain('hover:bg-primary/80');
    });

    it('debe aplicar variante default explícitamente', () => {
      const result = badgeVariants({ variant: 'default' });
      
      expect(result).toContain('bg-primary');
      expect(result).toContain('text-primary-foreground');
    });
  });

  describe('variante secondary', () => {
    it('debe aplicar estilos secondary correctamente', () => {
      const result = badgeVariants({ variant: 'secondary' });
      
      expect(result).toContain('border-transparent');
      expect(result).toContain('bg-secondary');
      expect(result).toContain('text-secondary-foreground');
      expect(result).toContain('hover:bg-secondary/80');
    });

    it('no debe incluir estilos de primary', () => {
      const result = badgeVariants({ variant: 'secondary' });
      
      expect(result).not.toContain('bg-primary');
      expect(result).not.toContain('text-primary-foreground');
    });
  });

  describe('variante destructive', () => {
    it('debe aplicar estilos destructive correctamente', () => {
      const result = badgeVariants({ variant: 'destructive' });
      
      expect(result).toContain('border-transparent');
      expect(result).toContain('bg-destructive');
      expect(result).toContain('text-destructive-foreground');
      expect(result).toContain('hover:bg-destructive/80');
    });
  });

  describe('variante outline', () => {
    it('debe aplicar estilos outline correctamente', () => {
      const result = badgeVariants({ variant: 'outline' });
      
      expect(result).toContain('text-foreground');
    });

    it('no debe incluir border-transparent', () => {
      const result = badgeVariants({ variant: 'outline' });
      
      // Outline no debería tener border-transparent porque usa el border visible
      expect(result).not.toContain('border-transparent');
    });

    it('no debe incluir background color', () => {
      const result = badgeVariants({ variant: 'outline' });
      
      expect(result).not.toContain('bg-primary');
      expect(result).not.toContain('bg-secondary');
      expect(result).not.toContain('bg-destructive');
    });
  });

  describe('variante success', () => {
    it('debe aplicar estilos success correctamente', () => {
      const result = badgeVariants({ variant: 'success' });
      
      expect(result).toContain('border-transparent');
      expect(result).toContain('bg-success');
      expect(result).toContain('text-success-foreground');
      expect(result).toContain('hover:bg-success/80');
    });
  });

  describe('composición de clases', () => {
    it('debe retornar string de clases válido', () => {
      const result = badgeVariants({ variant: 'default' });
      
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('cada variante debe producir clases diferentes', () => {
      const defaultResult = badgeVariants({ variant: 'default' });
      const secondaryResult = badgeVariants({ variant: 'secondary' });
      const destructiveResult = badgeVariants({ variant: 'destructive' });
      const outlineResult = badgeVariants({ variant: 'outline' });
      const successResult = badgeVariants({ variant: 'success' });
      
      // Verificar que cada variante es única
      const uniqueResults = new Set([
        defaultResult,
        secondaryResult,
        destructiveResult,
        outlineResult,
        successResult,
      ]);
      
      expect(uniqueResults.size).toBe(5);
    });
  });

  describe('defaultVariants', () => {
    it('debe usar default como variant por defecto', () => {
      const withoutVariant = badgeVariants();
      const withDefault = badgeVariants({ variant: 'default' });
      
      expect(withoutVariant).toBe(withDefault);
    });

    it('debe funcionar con objeto vacío', () => {
      const result = badgeVariants({});
      
      expect(result).toContain('bg-primary');
    });

    it('debe funcionar con undefined', () => {
      const result = badgeVariants({ variant: undefined });
      
      expect(result).toContain('bg-primary');
    });
  });

  describe('integración con cn()', () => {
    it('las clases generadas deben ser compatibles con Tailwind', () => {
      const variants = ['default', 'secondary', 'destructive', 'outline', 'success'] as const;
      
      variants.forEach(variant => {
        const result = badgeVariants({ variant });
        
        // Verificar que no hay clases malformadas (espacios dobles, etc.)
        expect(result).not.toMatch(/\s{2,}/);
        
        // Verificar que cada clase tiene formato válido
        const classes = result.split(' ').filter(Boolean);
        classes.forEach(cls => {
          expect(cls).toMatch(/^[a-z\-\[\]:\/\.0-9]+$/i);
        });
      });
    });
  });
});

