/**
 * Tests extendidos para los componentes Table
 * Verifica ref forwarding, props adicionales, estilos y casos borde
 */
import { render, screen } from '@testing-library/react';
import * as React from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from '../table';

describe('Table Extended', () => {
  describe('ref forwarding', () => {
    it('Table debe soportar ref', () => {
      const ref = React.createRef<HTMLTableElement>();
      render(
        <Table ref={ref}>
          <tbody><tr><td>Data</td></tr></tbody>
        </Table>
      );

      expect(ref.current).toBeInstanceOf(HTMLTableElement);
    });

    it('TableHeader debe soportar ref', () => {
      const ref = React.createRef<HTMLTableSectionElement>();
      render(
        <table>
          <TableHeader ref={ref}>
            <tr><th>Header</th></tr>
          </TableHeader>
        </table>
      );

      expect(ref.current).toBeInstanceOf(HTMLTableSectionElement);
    });

    it('TableBody debe soportar ref', () => {
      const ref = React.createRef<HTMLTableSectionElement>();
      render(
        <table>
          <TableBody ref={ref}>
            <tr><td>Body</td></tr>
          </TableBody>
        </table>
      );

      expect(ref.current).toBeInstanceOf(HTMLTableSectionElement);
    });

    it('TableFooter debe soportar ref', () => {
      const ref = React.createRef<HTMLTableSectionElement>();
      render(
        <table>
          <TableFooter ref={ref}>
            <tr><td>Footer</td></tr>
          </TableFooter>
        </table>
      );

      expect(ref.current).toBeInstanceOf(HTMLTableSectionElement);
    });

    it('TableRow debe soportar ref', () => {
      const ref = React.createRef<HTMLTableRowElement>();
      render(
        <table>
          <tbody>
            <TableRow ref={ref}>
              <td>Cell</td>
            </TableRow>
          </tbody>
        </table>
      );

      expect(ref.current).toBeInstanceOf(HTMLTableRowElement);
    });

    it('TableHead debe soportar ref', () => {
      const ref = React.createRef<HTMLTableCellElement>();
      render(
        <table>
          <thead>
            <tr>
              <TableHead ref={ref}>Header Cell</TableHead>
            </tr>
          </thead>
        </table>
      );

      expect(ref.current).toBeInstanceOf(HTMLTableCellElement);
    });

    it('TableCell debe soportar ref', () => {
      const ref = React.createRef<HTMLTableCellElement>();
      render(
        <table>
          <tbody>
            <tr>
              <TableCell ref={ref}>Cell</TableCell>
            </tr>
          </tbody>
        </table>
      );

      expect(ref.current).toBeInstanceOf(HTMLTableCellElement);
    });

    it('TableCaption debe soportar ref', () => {
      const ref = React.createRef<HTMLTableCaptionElement>();
      render(
        <table>
          <TableCaption ref={ref}>Caption</TableCaption>
          <tbody><tr><td>Data</td></tr></tbody>
        </table>
      );

      expect(ref.current).toBeInstanceOf(HTMLTableCaptionElement);
    });
  });

  describe('props HTML adicionales', () => {
    it('Table debe pasar props adicionales', () => {
      render(
        <Table data-testid="table" id="my-table" aria-label="Data table">
          <tbody><tr><td>Data</td></tr></tbody>
        </Table>
      );

      const table = screen.getByTestId('table');
      expect(table).toHaveAttribute('id', 'my-table');
      expect(table).toHaveAttribute('aria-label', 'Data table');
    });

    it('TableHead debe soportar colSpan y rowSpan', () => {
      render(
        <table>
          <thead>
            <tr>
              <TableHead data-testid="head" colSpan={2} rowSpan={1}>
                Spanning Header
              </TableHead>
            </tr>
          </thead>
        </table>
      );

      const head = screen.getByTestId('head');
      expect(head).toHaveAttribute('colspan', '2');
      expect(head).toHaveAttribute('rowspan', '1');
    });

    it('TableCell debe soportar colSpan y rowSpan', () => {
      render(
        <table>
          <tbody>
            <tr>
              <TableCell data-testid="cell" colSpan={3}>
                Spanning Cell
              </TableCell>
            </tr>
          </tbody>
        </table>
      );

      expect(screen.getByTestId('cell')).toHaveAttribute('colspan', '3');
    });

    it('TableRow debe soportar data-state', () => {
      render(
        <table>
          <tbody>
            <TableRow data-testid="row" data-state="selected">
              <td>Selected Row</td>
            </TableRow>
          </tbody>
        </table>
      );

      expect(screen.getByTestId('row')).toHaveAttribute('data-state', 'selected');
    });
  });

  describe('estilos y clases', () => {
    it('Table debe estar dentro de un div con overflow', () => {
      const { container } = render(
        <Table>
          <tbody><tr><td>Data</td></tr></tbody>
        </Table>
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('overflow-auto');
    });

    it('TableRow debe tener estado selected', () => {
      render(
        <table>
          <tbody>
            <TableRow data-testid="row" data-state="selected">
              <td>Cell</td>
            </TableRow>
          </tbody>
        </table>
      );

      const row = screen.getByTestId('row');
      expect(row.className).toContain('data-[state=selected]:bg-muted');
    });

    it('TableHead debe tener clases de alineación', () => {
      render(
        <table>
          <thead>
            <tr>
              <TableHead data-testid="head">Header</TableHead>
            </tr>
          </thead>
        </table>
      );

      const head = screen.getByTestId('head');
      expect(head).toHaveClass('text-left');
      expect(head).toHaveClass('align-middle');
    });

    it('TableCell debe tener clases de alineación', () => {
      render(
        <table>
          <tbody>
            <tr>
              <TableCell data-testid="cell">Cell</TableCell>
            </tr>
          </tbody>
        </table>
      );

      expect(screen.getByTestId('cell')).toHaveClass('align-middle');
    });

    it('TableCaption debe tener estilos de texto', () => {
      render(
        <table>
          <TableCaption data-testid="caption">Caption</TableCaption>
          <tbody><tr><td>Data</td></tr></tbody>
        </table>
      );

      const caption = screen.getByTestId('caption');
      expect(caption).toHaveClass('text-sm');
      expect(caption).toHaveClass('text-muted-foreground');
    });
  });

  describe('casos borde', () => {
    it('debe renderizar tabla vacía', () => {
      render(
        <Table data-testid="empty-table">
          <TableBody>
            {/* Sin filas */}
          </TableBody>
        </Table>
      );

      expect(screen.getByTestId('empty-table')).toBeInTheDocument();
    });

    it('debe renderizar tabla con muchas filas', () => {
      const rows = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        name: `Item ${i + 1}`,
      }));

      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(row => (
              <TableRow key={row.id}>
                <TableCell>{row.id}</TableCell>
                <TableCell>{row.name}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );

      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 100')).toBeInTheDocument();
    });

    it('debe renderizar tabla con muchas columnas', () => {
      const columns = Array.from({ length: 20 }, (_, i) => `Column ${i + 1}`);

      render(
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col, i) => (
                <TableHead key={i}>{col}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              {columns.map((_, i) => (
                <TableCell key={i}>Cell {i + 1}</TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      );

      expect(screen.getByText('Column 1')).toBeInTheDocument();
      expect(screen.getByText('Column 20')).toBeInTheDocument();
    });

    it('debe manejar contenido complejo en celdas', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>
                <div className="flex items-center">
                  <img src="#" alt="Avatar" className="w-8 h-8 rounded-full" />
                  <div className="ml-2">
                    <div className="font-medium">John Doe</div>
                    <div className="text-sm text-gray-500">john@example.com</div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                  Active
                </span>
              </TableCell>
              <TableCell>
                <button>Edit</button>
                <button>Delete</button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });
  });

  describe('tabla completa con todos los componentes', () => {
    it('debe renderizar estructura completa con todos los componentes', () => {
      render(
        <Table>
          <TableCaption>Lista de productos</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Stock</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Producto A</TableCell>
              <TableCell>$100</TableCell>
              <TableCell>50</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Producto B</TableCell>
              <TableCell>$200</TableCell>
              <TableCell>30</TableCell>
            </TableRow>
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={2}>Total</TableCell>
              <TableCell>80</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      );

      expect(screen.getByText('Lista de productos')).toBeInTheDocument();
      expect(screen.getByText('Producto')).toBeInTheDocument();
      expect(screen.getByText('Producto A')).toBeInTheDocument();
      expect(screen.getByText('$100')).toBeInTheDocument();
      expect(screen.getByText('Total')).toBeInTheDocument();
      expect(screen.getByText('80')).toBeInTheDocument();
    });
  });

  describe('interacciones', () => {
    it('TableRow debe soportar onClick', () => {
      const handleClick = jest.fn();
      render(
        <table>
          <tbody>
            <TableRow onClick={handleClick} data-testid="clickable-row">
              <td>Clickable</td>
            </TableRow>
          </tbody>
        </table>
      );

      screen.getByTestId('clickable-row').click();
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('TableCell debe soportar onClick', () => {
      const handleClick = jest.fn();
      render(
        <table>
          <tbody>
            <tr>
              <TableCell onClick={handleClick} data-testid="clickable-cell">
                Clickable Cell
              </TableCell>
            </tr>
          </tbody>
        </table>
      );

      screen.getByTestId('clickable-cell').click();
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('accesibilidad', () => {
    it('TableHead debe usar elemento th para semántica correcta', () => {
      render(
        <table>
          <thead>
            <tr>
              <TableHead data-testid="head">Header</TableHead>
            </tr>
          </thead>
        </table>
      );

      expect(screen.getByTestId('head').tagName).toBe('TH');
    });

    it('TableCell debe usar elemento td', () => {
      render(
        <table>
          <tbody>
            <tr>
              <TableCell data-testid="cell">Cell</TableCell>
            </tr>
          </tbody>
        </table>
      );

      expect(screen.getByTestId('cell').tagName).toBe('TD');
    });

    it('Table debe tener role table', () => {
      render(
        <Table data-testid="table">
          <tbody><tr><td>Data</td></tr></tbody>
        </Table>
      );

      expect(screen.getByRole('table')).toBeInTheDocument();
    });
  });
});

