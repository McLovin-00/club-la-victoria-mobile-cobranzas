/**
 * Tests extendidos para el componente DataTable
 * Verifica renderizado, paginación, interacción con filas y casos borde
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { DataTable } from '../data-table';

interface TestData {
  id: number;
  name: string;
  email: string;
  status: string;
}

const mockData: TestData[] = [
  { id: 1, name: 'Juan Pérez', email: 'juan@example.com', status: 'activo' },
  { id: 2, name: 'María García', email: 'maria@example.com', status: 'inactivo' },
  { id: 3, name: 'Carlos López', email: 'carlos@example.com', status: 'activo' },
  { id: 4, name: 'Ana Martínez', email: 'ana@example.com', status: 'pendiente' },
  { id: 5, name: 'Pedro Sánchez', email: 'pedro@example.com', status: 'activo' },
];

const mockColumns = [
  { header: 'ID', accessorKey: 'id' as const },
  { header: 'Nombre', accessorKey: 'name' as const },
  { header: 'Email', accessorKey: 'email' as const },
  { header: 'Estado', accessorKey: 'status' as const },
];

describe('DataTable', () => {
  describe('renderizado básico', () => {
    it('debe renderizar la tabla correctamente', () => {
      render(<DataTable columns={mockColumns} data={mockData} />);
      
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('debe renderizar los headers de columna', () => {
      render(<DataTable columns={mockColumns} data={mockData} />);
      
      expect(screen.getByText('ID')).toBeInTheDocument();
      expect(screen.getByText('Nombre')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Estado')).toBeInTheDocument();
    });

    it('debe renderizar los datos de las filas', () => {
      render(<DataTable columns={mockColumns} data={mockData} />);
      
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
      expect(screen.getByText('juan@example.com')).toBeInTheDocument();
      expect(screen.getByText('María García')).toBeInTheDocument();
    });

    it('debe aplicar clases de estilo base', () => {
      const { container } = render(<DataTable columns={mockColumns} data={mockData} />);
      
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('rounded-md');
      expect(wrapper).toHaveClass('border');
    });
  });

  describe('título', () => {
    it('debe renderizar el título cuando se proporciona', () => {
      render(<DataTable columns={mockColumns} data={mockData} title="Lista de usuarios" />);
      
      expect(screen.getByText('Lista de usuarios')).toBeInTheDocument();
    });

    it('no debe renderizar título si no se proporciona', () => {
      render(<DataTable columns={mockColumns} data={mockData} />);
      
      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });

    it('debe aplicar estilos al contenedor del título', () => {
      render(<DataTable columns={mockColumns} data={mockData} title="Usuarios" />);
      
      const title = screen.getByText('Usuarios');
      expect(title).toHaveClass('font-medium');
    });
  });

  describe('mensaje vacío', () => {
    it('debe mostrar mensaje por defecto cuando no hay datos', () => {
      render(<DataTable columns={mockColumns} data={[]} />);
      
      expect(screen.getByText('No hay datos para mostrar')).toBeInTheDocument();
    });

    it('debe mostrar mensaje personalizado cuando no hay datos', () => {
      render(
        <DataTable 
          columns={mockColumns} 
          data={[]} 
          emptyMessage="No se encontraron usuarios" 
        />
      );
      
      expect(screen.getByText('No se encontraron usuarios')).toBeInTheDocument();
    });

    it('debe ocupar todas las columnas con el mensaje vacío', () => {
      render(<DataTable columns={mockColumns} data={[]} />);
      
      const emptyCell = screen.getByText('No hay datos para mostrar');
      expect(emptyCell).toHaveAttribute('colspan', String(mockColumns.length));
    });
  });

  describe('paginación', () => {
    const largeData: TestData[] = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      name: `Usuario ${i + 1}`,
      email: `usuario${i + 1}@example.com`,
      status: i % 2 === 0 ? 'activo' : 'inactivo',
    }));

    it('no debe mostrar paginación si pagination es false', () => {
      render(<DataTable columns={mockColumns} data={largeData} pagination={false} />);
      
      expect(screen.queryByText('Siguiente')).not.toBeInTheDocument();
      expect(screen.queryByText('Anterior')).not.toBeInTheDocument();
    });

    it('debe mostrar paginación cuando hay más páginas', () => {
      render(<DataTable columns={mockColumns} data={largeData} pagination pageSize={10} />);
      
      expect(screen.getByText('Siguiente')).toBeInTheDocument();
      expect(screen.getByText('Anterior')).toBeInTheDocument();
    });

    it('debe mostrar el número de página correcto', () => {
      render(<DataTable columns={mockColumns} data={largeData} pagination pageSize={10} />);
      
      expect(screen.getByText('Página 1 de 3')).toBeInTheDocument();
    });

    it('debe navegar a la siguiente página', () => {
      render(<DataTable columns={mockColumns} data={largeData} pagination pageSize={10} />);
      
      const nextButton = screen.getByText('Siguiente');
      fireEvent.click(nextButton);
      
      expect(screen.getByText('Página 2 de 3')).toBeInTheDocument();
      expect(screen.getByText('Usuario 11')).toBeInTheDocument();
    });

    it('debe navegar a la página anterior', () => {
      render(<DataTable columns={mockColumns} data={largeData} pagination pageSize={10} />);
      
      // Ir a página 2
      const nextButton = screen.getByText('Siguiente');
      fireEvent.click(nextButton);
      
      // Volver a página 1
      const prevButton = screen.getByText('Anterior');
      fireEvent.click(prevButton);
      
      expect(screen.getByText('Página 1 de 3')).toBeInTheDocument();
    });

    it('debe deshabilitar botón Anterior en primera página', () => {
      render(<DataTable columns={mockColumns} data={largeData} pagination pageSize={10} />);
      
      const prevButton = screen.getByText('Anterior');
      expect(prevButton).toBeDisabled();
    });

    it('debe deshabilitar botón Siguiente en última página', () => {
      render(<DataTable columns={mockColumns} data={largeData} pagination pageSize={10} />);
      
      // Ir a última página
      const nextButton = screen.getByText('Siguiente');
      fireEvent.click(nextButton);
      fireEvent.click(nextButton);
      
      expect(nextButton).toBeDisabled();
      expect(screen.getByText('Página 3 de 3')).toBeInTheDocument();
    });

    it('no debe mostrar paginación si solo hay una página', () => {
      render(<DataTable columns={mockColumns} data={mockData} pagination pageSize={10} />);
      
      // Con 5 elementos y pageSize 10, solo hay 1 página
      expect(screen.queryByText('Siguiente')).not.toBeInTheDocument();
    });

    it('debe respetar pageSize personalizado', () => {
      render(<DataTable columns={mockColumns} data={largeData} pagination pageSize={5} />);
      
      expect(screen.getByText('Página 1 de 5')).toBeInTheDocument();
      
      // Solo 5 elementos en la primera página
      expect(screen.getByText('Usuario 1')).toBeInTheDocument();
      expect(screen.getByText('Usuario 5')).toBeInTheDocument();
      expect(screen.queryByText('Usuario 6')).not.toBeInTheDocument();
    });
  });

  describe('interacción con filas', () => {
    it('debe llamar onRowClick al hacer clic en una fila', () => {
      const handleRowClick = jest.fn();
      render(
        <DataTable 
          columns={mockColumns} 
          data={mockData} 
          onRowClick={handleRowClick} 
        />
      );
      
      const firstRow = screen.getByText('Juan Pérez').closest('tr');
      fireEvent.click(firstRow!);
      
      expect(handleRowClick).toHaveBeenCalledWith(mockData[0]);
    });

    it('debe aplicar cursor pointer cuando hay onRowClick', () => {
      const handleRowClick = jest.fn();
      render(
        <DataTable 
          columns={mockColumns} 
          data={mockData} 
          onRowClick={handleRowClick} 
        />
      );
      
      const firstRow = screen.getByText('Juan Pérez').closest('tr');
      expect(firstRow).toHaveClass('cursor-pointer');
    });

    it('no debe aplicar cursor pointer sin onRowClick', () => {
      render(<DataTable columns={mockColumns} data={mockData} />);
      
      const firstRow = screen.getByText('Juan Pérez').closest('tr');
      expect(firstRow).not.toHaveClass('cursor-pointer');
    });

    it('debe aplicar hover effect a las filas', () => {
      render(<DataTable columns={mockColumns} data={mockData} />);
      
      const firstRow = screen.getByText('Juan Pérez').closest('tr');
      expect(firstRow).toHaveClass('hover:bg-muted/20');
    });
  });

  describe('accessorKey como función', () => {
    it('debe soportar accessorKey como función', () => {
      const columnsWithFunction = [
        ...mockColumns,
        {
          header: 'Nombre Completo',
          accessorKey: (row: TestData) => `${row.name} (${row.email})`,
        },
      ];
      
      render(<DataTable columns={columnsWithFunction} data={mockData} />);
      
      expect(screen.getByText('Juan Pérez (juan@example.com)')).toBeInTheDocument();
    });
  });

  describe('cell renderer personalizado', () => {
    it('debe usar cell renderer cuando se proporciona', () => {
      const columnsWithCell = [
        { header: 'ID', accessorKey: 'id' as const },
        {
          header: 'Estado',
          accessorKey: 'status' as const,
          cell: ({ getValue }: { getValue: () => string; row: { original: TestData } }) => (
            <span className="badge" data-testid="status-badge">
              {getValue().toUpperCase()}
            </span>
          ),
        },
      ];
      
      render(<DataTable columns={columnsWithCell} data={mockData} />);
      
      const badges = screen.getAllByTestId('status-badge');
      expect(badges.length).toBeGreaterThan(0);
      expect(badges[0]).toHaveTextContent('ACTIVO');
    });

    it('debe pasar row.original al cell renderer', () => {
      const columnsWithRowAccess = [
        {
          header: 'Combinado',
          accessorKey: 'id' as const,
          cell: ({ row }: { getValue: () => number; row: { original: TestData } }) => (
            <span data-testid="combined">{row.original.name} - {row.original.email}</span>
          ),
        },
      ];
      
      render(<DataTable columns={columnsWithRowAccess} data={mockData} />);
      
      expect(screen.getByText('Juan Pérez - juan@example.com')).toBeInTheDocument();
    });
  });

  describe('casos borde', () => {
    it('debe manejar datos undefined o null en celdas', () => {
      const dataWithNull = [
        { id: 1, name: 'Test', email: null, status: undefined },
      ] as unknown as TestData[];
      
      render(<DataTable columns={mockColumns} data={dataWithNull} />);
      
      expect(screen.getByText('Test')).toBeInTheDocument();
    });

    it('debe manejar array vacío de columnas', () => {
      render(<DataTable columns={[]} data={mockData} />);
      
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('debe renderizar correctamente con una sola fila', () => {
      render(<DataTable columns={mockColumns} data={[mockData[0]]} />);
      
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    });

    it('debe renderizar correctamente con muchas filas', () => {
      const manyRows = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        name: `Usuario ${i + 1}`,
        email: `usuario${i + 1}@example.com`,
        status: 'activo',
      }));
      
      render(<DataTable columns={mockColumns} data={manyRows} />);
      
      expect(screen.getByText('Usuario 1')).toBeInTheDocument();
      expect(screen.getByText('Usuario 100')).toBeInTheDocument();
    });
  });

  describe('estilos y clases CSS', () => {
    it('debe aplicar clases a los headers', () => {
      render(<DataTable columns={mockColumns} data={mockData} />);
      
      const headers = screen.getAllByRole('columnheader');
      headers.forEach(header => {
        expect(header).toHaveClass('text-xs');
        expect(header).toHaveClass('font-medium');
        expect(header).toHaveClass('uppercase');
      });
    });

    it('debe aplicar clases a las celdas', () => {
      render(<DataTable columns={mockColumns} data={mockData} />);
      
      const cells = screen.getAllByRole('cell');
      cells.forEach(cell => {
        expect(cell).toHaveClass('text-sm');
      });
    });
  });

  describe('props por defecto', () => {
    it('pagination debe ser false por defecto', () => {
      const largeData: TestData[] = Array.from({ length: 25 }, (_, i) => ({
        id: i + 1,
        name: `Usuario ${i + 1}`,
        email: `usuario${i + 1}@example.com`,
        status: 'activo',
      }));
      
      render(<DataTable columns={mockColumns} data={largeData} />);
      
      // Sin paginación, todos los elementos deberían estar visibles
      expect(screen.getByText('Usuario 1')).toBeInTheDocument();
      expect(screen.getByText('Usuario 25')).toBeInTheDocument();
    });

    it('pageSize debe ser 10 por defecto', () => {
      const data: TestData[] = Array.from({ length: 25 }, (_, i) => ({
        id: i + 1,
        name: `Usuario ${i + 1}`,
        email: `usuario${i + 1}@example.com`,
        status: 'activo',
      }));
      
      render(<DataTable columns={mockColumns} data={data} pagination />);
      
      // Con pageSize 10, debería haber 3 páginas para 25 elementos
      expect(screen.getByText('Página 1 de 3')).toBeInTheDocument();
    });

    it('emptyMessage debe ser "No hay datos para mostrar" por defecto', () => {
      render(<DataTable columns={mockColumns} data={[]} />);
      
      expect(screen.getByText('No hay datos para mostrar')).toBeInTheDocument();
    });
  });
});

