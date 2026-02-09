/**
 * Tests para las utilidades de Button (button.utils.ts)
 * Verifica las variantes y tamaños del botón usando class-variance-authority
 */
import { buttonVariants } from '../button.utils';

describe('buttonVariants', () => {
  describe('clases base', () => {
    it('debe incluir clases base en todas las variantes', () => {
      const result = buttonVariants();
      
      expect(result).toContain('inline-flex');
      expect(result).toContain('items-center');
      expect(result).toContain('justify-center');
      expect(result).toContain('whitespace-nowrap');
      expect(result).toContain('rounded-md');
      expect(result).toContain('text-sm');
      expect(result).toContain('font-medium');
      expect(result).toContain('ring-offset-background');
      expect(result).toContain('transition-colors');
    });

    it('debe incluir clases de focus-visible', () => {
      const result = buttonVariants();
      
      expect(result).toContain('focus-visible:outline-none');
      expect(result).toContain('focus-visible:ring-2');
      expect(result).toContain('focus-visible:ring-ring');
      expect(result).toContain('focus-visible:ring-offset-2');
    });

    it('debe incluir clases de disabled', () => {
      const result = buttonVariants();
      
      expect(result).toContain('disabled:pointer-events-none');
      expect(result).toContain('disabled:opacity-50');
    });
  });

  describe('variantes de estilo', () => {
    describe('variante default', () => {
      it('debe aplicar variante default cuando no se especifica', () => {
        const result = buttonVariants();
        
        expect(result).toContain('bg-primary');
        expect(result).toContain('text-primary-foreground');
        expect(result).toContain('hover:bg-primary/90');
      });

      it('debe aplicar variante default explícitamente', () => {
        const result = buttonVariants({ variant: 'default' });
        
        expect(result).toContain('bg-primary');
        expect(result).toContain('text-primary-foreground');
      });
    });

    describe('variante destructive', () => {
      it('debe aplicar estilos destructive correctamente', () => {
        const result = buttonVariants({ variant: 'destructive' });
        
        expect(result).toContain('bg-destructive');
        expect(result).toContain('text-destructive-foreground');
        expect(result).toContain('hover:bg-destructive/90');
      });

      it('no debe incluir estilos de primary', () => {
        const result = buttonVariants({ variant: 'destructive' });
        
        expect(result).not.toContain('bg-primary');
        expect(result).not.toContain('text-primary-foreground');
      });
    });

    describe('variante outline', () => {
      it('debe aplicar estilos outline correctamente', () => {
        const result = buttonVariants({ variant: 'outline' });
        
        expect(result).toContain('border');
        expect(result).toContain('border-input');
        expect(result).toContain('bg-background');
        expect(result).toContain('hover:bg-accent');
        expect(result).toContain('hover:text-accent-foreground');
      });
    });

    describe('variante secondary', () => {
      it('debe aplicar estilos secondary correctamente', () => {
        const result = buttonVariants({ variant: 'secondary' });
        
        expect(result).toContain('bg-secondary');
        expect(result).toContain('text-secondary-foreground');
        expect(result).toContain('hover:bg-secondary/80');
      });
    });

    describe('variante ghost', () => {
      it('debe aplicar estilos ghost correctamente', () => {
        const result = buttonVariants({ variant: 'ghost' });
        
        expect(result).toContain('hover:bg-accent');
        expect(result).toContain('hover:text-accent-foreground');
      });

      it('no debe incluir background inicial', () => {
        const result = buttonVariants({ variant: 'ghost' });
        
        expect(result).not.toContain('bg-primary');
        expect(result).not.toContain('bg-secondary');
        expect(result).not.toContain('bg-destructive');
      });
    });

    describe('variante link', () => {
      it('debe aplicar estilos link correctamente', () => {
        const result = buttonVariants({ variant: 'link' });
        
        expect(result).toContain('text-primary');
        expect(result).toContain('underline-offset-4');
        expect(result).toContain('hover:underline');
      });

      it('no debe incluir background', () => {
        const result = buttonVariants({ variant: 'link' });
        
        expect(result).not.toContain('bg-primary');
        expect(result).not.toContain('bg-secondary');
      });
    });
  });

  describe('variantes de tamaño', () => {
    describe('tamaño default', () => {
      it('debe aplicar tamaño default cuando no se especifica', () => {
        const result = buttonVariants();
        
        expect(result).toContain('h-10');
        expect(result).toContain('px-4');
        expect(result).toContain('py-2');
      });

      it('debe aplicar tamaño default explícitamente', () => {
        const result = buttonVariants({ size: 'default' });
        
        expect(result).toContain('h-10');
        expect(result).toContain('px-4');
      });
    });

    describe('tamaño sm', () => {
      it('debe aplicar tamaño sm correctamente', () => {
        const result = buttonVariants({ size: 'sm' });
        
        expect(result).toContain('h-9');
        expect(result).toContain('rounded-md');
        expect(result).toContain('px-3');
      });

      it('no debe incluir padding de tamaño default', () => {
        const result = buttonVariants({ size: 'sm' });
        
        expect(result).not.toContain('px-4');
        expect(result).not.toContain('py-2');
      });
    });

    describe('tamaño lg', () => {
      it('debe aplicar tamaño lg correctamente', () => {
        const result = buttonVariants({ size: 'lg' });
        
        expect(result).toContain('h-11');
        expect(result).toContain('rounded-md');
        expect(result).toContain('px-8');
      });
    });

    describe('tamaño icon', () => {
      it('debe aplicar tamaño icon correctamente', () => {
        const result = buttonVariants({ size: 'icon' });
        
        expect(result).toContain('h-10');
        expect(result).toContain('w-10');
      });

      it('no debe incluir padding horizontal', () => {
        const result = buttonVariants({ size: 'icon' });
        
        expect(result).not.toContain('px-4');
        expect(result).not.toContain('px-3');
        expect(result).not.toContain('px-8');
      });
    });
  });

  describe('combinaciones de variante y tamaño', () => {
    it('debe combinar variante destructive con tamaño sm', () => {
      const result = buttonVariants({ variant: 'destructive', size: 'sm' });
      
      expect(result).toContain('bg-destructive');
      expect(result).toContain('h-9');
      expect(result).toContain('px-3');
    });

    it('debe combinar variante outline con tamaño lg', () => {
      const result = buttonVariants({ variant: 'outline', size: 'lg' });
      
      expect(result).toContain('border');
      expect(result).toContain('border-input');
      expect(result).toContain('h-11');
      expect(result).toContain('px-8');
    });

    it('debe combinar variante ghost con tamaño icon', () => {
      const result = buttonVariants({ variant: 'ghost', size: 'icon' });
      
      expect(result).toContain('hover:bg-accent');
      expect(result).toContain('h-10');
      expect(result).toContain('w-10');
    });

    it('debe combinar variante link con tamaño sm', () => {
      const result = buttonVariants({ variant: 'link', size: 'sm' });
      
      expect(result).toContain('text-primary');
      expect(result).toContain('hover:underline');
      expect(result).toContain('h-9');
    });
  });

  describe('composición de clases', () => {
    it('debe retornar string de clases válido', () => {
      const result = buttonVariants({ variant: 'default', size: 'default' });
      
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('cada combinación debe producir clases válidas', () => {
      const variants = ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'] as const;
      const sizes = ['default', 'sm', 'lg', 'icon'] as const;
      
      variants.forEach(variant => {
        sizes.forEach(size => {
          const result = buttonVariants({ variant, size });
          
          expect(typeof result).toBe('string');
          expect(result.length).toBeGreaterThan(0);
          
          // Verificar que no hay clases malformadas
          expect(result).not.toMatch(/\s{2,}/);
        });
      });
    });

    it('todas las variantes deben incluir clases base', () => {
      const variants = ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'] as const;
      
      variants.forEach(variant => {
        const result = buttonVariants({ variant });
        
        expect(result).toContain('inline-flex');
        expect(result).toContain('items-center');
        expect(result).toContain('justify-center');
      });
    });
  });

  describe('defaultVariants', () => {
    it('debe usar default como variant por defecto', () => {
      const withoutVariant = buttonVariants();
      const withDefault = buttonVariants({ variant: 'default' });
      
      expect(withoutVariant).toBe(withDefault);
    });

    it('debe usar default como size por defecto', () => {
      const withoutSize = buttonVariants();
      const withDefaultSize = buttonVariants({ size: 'default' });
      
      expect(withoutSize).toBe(withDefaultSize);
    });

    it('debe funcionar con objeto vacío', () => {
      const result = buttonVariants({});
      
      expect(result).toContain('bg-primary');
      expect(result).toContain('h-10');
    });

    it('debe funcionar con undefined', () => {
      const result = buttonVariants({ variant: undefined, size: undefined });
      
      expect(result).toContain('bg-primary');
      expect(result).toContain('h-10');
    });
  });

  describe('className parameter', () => {
    it('debe incluir className adicional', () => {
      const result = buttonVariants({ className: 'custom-class' });
      
      expect(result).toContain('custom-class');
    });

    it('debe mantener todas las clases base con className adicional', () => {
      const result = buttonVariants({ 
        variant: 'destructive', 
        size: 'lg',
        className: 'extra-class' 
      });
      
      expect(result).toContain('bg-destructive');
      expect(result).toContain('h-11');
      expect(result).toContain('extra-class');
    });

    it('debe manejar múltiples clases en className', () => {
      const result = buttonVariants({ className: 'class-1 class-2 class-3' });
      
      expect(result).toContain('class-1');
      expect(result).toContain('class-2');
      expect(result).toContain('class-3');
    });
  });

  describe('integración con Tailwind', () => {
    it('las clases generadas deben tener formato válido de Tailwind', () => {
      const variants = ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'] as const;
      const sizes = ['default', 'sm', 'lg', 'icon'] as const;
      
      variants.forEach(variant => {
        sizes.forEach(size => {
          const result = buttonVariants({ variant, size });
          
          // Verificar que cada clase tiene formato válido
          const classes = result.split(' ').filter(Boolean);
          classes.forEach(cls => {
            // Tailwind classes pueden contener letras, números, guiones, dos puntos, barras, puntos y corchetes
            expect(cls).toMatch(/^[a-z\-\[\]:\/\.0-9]+$/i);
          });
        });
      });
    });
  });
});

