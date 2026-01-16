/**
 * Tests extendidos para el componente ConfirmProvider
 * Verifica el comportamiento del diálogo de confirmación, variantes y estados
 */
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useContext } from 'react';
import { ConfirmProvider } from '../confirm-dialog';
import { ConfirmContext, ConfirmContextType } from '../../../contexts/confirmContext';

// Mock de Radix UI Dialog Portal
jest.mock('@radix-ui/react-dialog', () => {
  const actual = jest.requireActual('@radix-ui/react-dialog');
  return {
    ...actual,
    Portal: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-portal">{children}</div>,
  };
});

// Componente helper para testear el contexto
const TestConsumer = ({ onConfirmClick }: { onConfirmClick?: (result: boolean) => void }) => {
  const { confirm } = useContext(ConfirmContext);

  const handleClick = async () => {
    const result = await confirm({ message: 'Test message' });
    onConfirmClick?.(result);
  };

  return (
    <button onClick={handleClick} data-testid="trigger-confirm">
      Abrir confirmación
    </button>
  );
};

const TestConsumerWithOptions = ({ options }: { options: Parameters<ConfirmContextType['confirm']>[0] }) => {
  const { confirm } = useContext(ConfirmContext);

  const handleClick = async () => {
    await confirm(options);
  };

  return (
    <button onClick={handleClick} data-testid="trigger-confirm">
      Abrir confirmación
    </button>
  );
};

describe('ConfirmProvider', () => {
  describe('renderizado básico', () => {
    it('debe renderizar children correctamente', () => {
      render(
        <ConfirmProvider>
          <div data-testid="child">Contenido hijo</div>
        </ConfirmProvider>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.getByText('Contenido hijo')).toBeInTheDocument();
    });

    it('debe proveer el contexto de confirmación', () => {
      let contextValue: ConfirmContextType | null = null;

      const ContextCapture = () => {
        contextValue = useContext(ConfirmContext);
        return null;
      };

      render(
        <ConfirmProvider>
          <ContextCapture />
        </ConfirmProvider>
      );

      expect(contextValue).not.toBeNull();
      expect(typeof contextValue?.confirm).toBe('function');
    });
  });

  describe('mostrar diálogo', () => {
    it('debe mostrar el diálogo al llamar confirm', async () => {
      render(
        <ConfirmProvider>
          <TestConsumer />
        </ConfirmProvider>
      );

      const trigger = screen.getByTestId('trigger-confirm');
      fireEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByText('Test message')).toBeInTheDocument();
      });
    });

    it('debe mostrar el título por defecto', async () => {
      render(
        <ConfirmProvider>
          <TestConsumer />
        </ConfirmProvider>
      );

      fireEvent.click(screen.getByTestId('trigger-confirm'));

      await waitFor(() => {
        expect(screen.getByText('Confirmar acción')).toBeInTheDocument();
      });
    });

    it('debe mostrar título personalizado', async () => {
      render(
        <ConfirmProvider>
          <TestConsumerWithOptions options={{ message: 'Mensaje', title: 'Título personalizado' }} />
        </ConfirmProvider>
      );

      fireEvent.click(screen.getByTestId('trigger-confirm'));

      await waitFor(() => {
        expect(screen.getByText('Título personalizado')).toBeInTheDocument();
      });
    });

    it('debe mostrar botones por defecto', async () => {
      render(
        <ConfirmProvider>
          <TestConsumer />
        </ConfirmProvider>
      );

      fireEvent.click(screen.getByTestId('trigger-confirm'));

      await waitFor(() => {
        expect(screen.getByText('Confirmar')).toBeInTheDocument();
        expect(screen.getByText('Cancelar')).toBeInTheDocument();
      });
    });

    it('debe mostrar texto de botones personalizado', async () => {
      render(
        <ConfirmProvider>
          <TestConsumerWithOptions 
            options={{ 
              message: 'Mensaje', 
              confirmText: 'Sí, eliminar',
              cancelText: 'No, volver'
            }} 
          />
        </ConfirmProvider>
      );

      fireEvent.click(screen.getByTestId('trigger-confirm'));

      await waitFor(() => {
        expect(screen.getByText('Sí, eliminar')).toBeInTheDocument();
        expect(screen.getByText('No, volver')).toBeInTheDocument();
      });
    });
  });

  describe('confirmación y cancelación', () => {
    it('debe resolver con true al confirmar', async () => {
      const handleResult = jest.fn();

      render(
        <ConfirmProvider>
          <TestConsumer onConfirmClick={handleResult} />
        </ConfirmProvider>
      );

      fireEvent.click(screen.getByTestId('trigger-confirm'));

      await waitFor(() => {
        expect(screen.getByText('Confirmar')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Confirmar'));

      await waitFor(() => {
        expect(handleResult).toHaveBeenCalledWith(true);
      });
    });

    it('debe resolver con false al cancelar', async () => {
      const handleResult = jest.fn();

      render(
        <ConfirmProvider>
          <TestConsumer onConfirmClick={handleResult} />
        </ConfirmProvider>
      );

      fireEvent.click(screen.getByTestId('trigger-confirm'));

      await waitFor(() => {
        expect(screen.getByText('Cancelar')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Cancelar'));

      await waitFor(() => {
        expect(handleResult).toHaveBeenCalledWith(false);
      });
    });

    it('debe cerrar el diálogo al confirmar', async () => {
      render(
        <ConfirmProvider>
          <TestConsumer />
        </ConfirmProvider>
      );

      fireEvent.click(screen.getByTestId('trigger-confirm'));

      await waitFor(() => {
        expect(screen.getByText('Test message')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Confirmar'));

      await waitFor(() => {
        expect(screen.queryByText('Test message')).not.toBeInTheDocument();
      });
    });

    it('debe cerrar el diálogo al cancelar', async () => {
      render(
        <ConfirmProvider>
          <TestConsumer />
        </ConfirmProvider>
      );

      fireEvent.click(screen.getByTestId('trigger-confirm'));

      await waitFor(() => {
        expect(screen.getByText('Test message')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Cancelar'));

      await waitFor(() => {
        expect(screen.queryByText('Test message')).not.toBeInTheDocument();
      });
    });
  });

  describe('variantes de estilo', () => {
    it('debe aplicar variante danger por defecto', async () => {
      render(
        <ConfirmProvider>
          <TestConsumer />
        </ConfirmProvider>
      );

      fireEvent.click(screen.getByTestId('trigger-confirm'));

      await waitFor(() => {
        const confirmBtn = screen.getByText('Confirmar');
        // Variante danger tiene clases de rojo
        expect(confirmBtn.className).toContain('from-red-500');
        expect(confirmBtn.className).toContain('to-red-600');
      });
    });

    it('debe aplicar variante primary cuando se especifica', async () => {
      render(
        <ConfirmProvider>
          <TestConsumerWithOptions 
            options={{ 
              message: 'Mensaje',
              variant: 'primary'
            }} 
          />
        </ConfirmProvider>
      );

      fireEvent.click(screen.getByTestId('trigger-confirm'));

      await waitFor(() => {
        const confirmBtn = screen.getByText('Confirmar');
        // Variante primary tiene clases de indigo/blue
        expect(confirmBtn.className).toContain('from-indigo-500');
        expect(confirmBtn.className).toContain('to-blue-500');
      });
    });

    it('debe aplicar estilos al botón cancelar', async () => {
      render(
        <ConfirmProvider>
          <TestConsumer />
        </ConfirmProvider>
      );

      fireEvent.click(screen.getByTestId('trigger-confirm'));

      await waitFor(() => {
        const cancelBtn = screen.getByText('Cancelar');
        expect(cancelBtn.className).toContain('border');
        expect(cancelBtn.className).toContain('border-gray-300');
        expect(cancelBtn.className).toContain('text-gray-600');
      });
    });
  });

  describe('valores por defecto', () => {
    it('cancelText por defecto debe ser "Cancelar"', async () => {
      render(
        <ConfirmProvider>
          <TestConsumerWithOptions options={{ message: 'Test' }} />
        </ConfirmProvider>
      );

      fireEvent.click(screen.getByTestId('trigger-confirm'));

      await waitFor(() => {
        expect(screen.getByText('Cancelar')).toBeInTheDocument();
      });
    });

    it('confirmText por defecto debe ser "Confirmar"', async () => {
      render(
        <ConfirmProvider>
          <TestConsumerWithOptions options={{ message: 'Test' }} />
        </ConfirmProvider>
      );

      fireEvent.click(screen.getByTestId('trigger-confirm'));

      await waitFor(() => {
        expect(screen.getByText('Confirmar')).toBeInTheDocument();
      });
    });

    it('title por defecto debe ser "Confirmar acción"', async () => {
      render(
        <ConfirmProvider>
          <TestConsumerWithOptions options={{ message: 'Test' }} />
        </ConfirmProvider>
      );

      fireEvent.click(screen.getByTestId('trigger-confirm'));

      await waitFor(() => {
        expect(screen.getByText('Confirmar acción')).toBeInTheDocument();
      });
    });

    it('variant por defecto debe ser "danger"', async () => {
      render(
        <ConfirmProvider>
          <TestConsumerWithOptions options={{ message: 'Test' }} />
        </ConfirmProvider>
      );

      fireEvent.click(screen.getByTestId('trigger-confirm'));

      await waitFor(() => {
        const confirmBtn = screen.getByText('Confirmar');
        expect(confirmBtn.className).toContain('from-red-500');
      });
    });
  });

  describe('múltiples confirmaciones', () => {
    it('debe manejar múltiples confirmaciones secuenciales', async () => {
      const results: boolean[] = [];

      const TestSequential = () => {
        const { confirm } = useContext(ConfirmContext);

        const handleClick = async () => {
          const result1 = await confirm({ message: 'Primera confirmación' });
          results.push(result1);
          const result2 = await confirm({ message: 'Segunda confirmación' });
          results.push(result2);
        };

        return (
          <button onClick={handleClick} data-testid="trigger">
            Test
          </button>
        );
      };

      render(
        <ConfirmProvider>
          <TestSequential />
        </ConfirmProvider>
      );

      fireEvent.click(screen.getByTestId('trigger'));

      // Primera confirmación
      await waitFor(() => {
        expect(screen.getByText('Primera confirmación')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Confirmar'));

      // Segunda confirmación
      await waitFor(() => {
        expect(screen.getByText('Segunda confirmación')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Confirmar'));

      await waitFor(() => {
        expect(results).toEqual([true, true]);
      });
    });
  });

  describe('cierre por cambio de estado', () => {
    it('debe resolver con false al cerrar el diálogo mediante onOpenChange', async () => {
      const handleResult = jest.fn();

      render(
        <ConfirmProvider>
          <TestConsumer onConfirmClick={handleResult} />
        </ConfirmProvider>
      );

      fireEvent.click(screen.getByTestId('trigger-confirm'));

      await waitFor(() => {
        expect(screen.getByText('Test message')).toBeInTheDocument();
      });

      // Simular cierre del diálogo (por ejemplo, clic en overlay o escape)
      // En este caso usamos el botón cancelar que llama a close(false)
      fireEvent.click(screen.getByText('Cancelar'));

      await waitFor(() => {
        expect(handleResult).toHaveBeenCalledWith(false);
      });
    });
  });

  describe('contenido del diálogo', () => {
    it('debe mostrar mensaje largo correctamente', async () => {
      const longMessage = 'Este es un mensaje de confirmación muy largo que debería mostrarse completamente en el diálogo sin problemas de renderizado.';

      render(
        <ConfirmProvider>
          <TestConsumerWithOptions options={{ message: longMessage }} />
        </ConfirmProvider>
      );

      fireEvent.click(screen.getByTestId('trigger-confirm'));

      await waitFor(() => {
        expect(screen.getByText(longMessage)).toBeInTheDocument();
      });
    });

    it('debe mostrar caracteres especiales en el mensaje', async () => {
      const specialMessage = '¿Está seguro de eliminar "Archivo.txt"?';

      render(
        <ConfirmProvider>
          <TestConsumerWithOptions options={{ message: specialMessage }} />
        </ConfirmProvider>
      );

      fireEvent.click(screen.getByTestId('trigger-confirm'));

      await waitFor(() => {
        expect(screen.getByText(specialMessage)).toBeInTheDocument();
      });
    });
  });

  describe('casos borde', () => {
    it('debe manejar mensaje vacío', async () => {
      render(
        <ConfirmProvider>
          <TestConsumerWithOptions options={{ message: '' }} />
        </ConfirmProvider>
      );

      fireEvent.click(screen.getByTestId('trigger-confirm'));

      await waitFor(() => {
        expect(screen.getByText('Confirmar')).toBeInTheDocument();
      });
    });

    it('debe manejar solo mensaje sin título explícito', async () => {
      render(
        <ConfirmProvider>
          <TestConsumerWithOptions options={{ message: 'Mensaje solo' }} />
        </ConfirmProvider>
      );

      fireEvent.click(screen.getByTestId('trigger-confirm'));

      await waitFor(() => {
        expect(screen.getByText('Mensaje solo')).toBeInTheDocument();
        // El título por defecto se usa
        expect(screen.getByText('Confirmar acción')).toBeInTheDocument();
      });
    });
  });
});

