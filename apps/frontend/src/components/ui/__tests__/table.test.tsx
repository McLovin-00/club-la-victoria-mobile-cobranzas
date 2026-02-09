/**
 * Tests para los componentes Table
 * Verifica renderizado de Table, TableHeader, TableBody, TableRow, TableHead, TableCell, etc.
 */
import { render, screen } from '@testing-library/react';
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

describe('Table Components', () => {
  describe('Table', () => {
    it('debe renderizar correctamente', () => {
      render(
        <Table data-testid="table">
          <tbody>
            <tr><td>Contenido</td></tr>
          </tbody>
        </Table>
      );
      expect(screen.getByTestId('table')).toBeInTheDocument();
    });

    it('debe aplicar clases base', () => {
      render(
        <Table data-testid="table">
          <tbody><tr><td>Test</td></tr></tbody>
        </Table>
      );
      const table = screen.getByTestId('table');
      expect(table).toHaveClass('w-full');
      expect(table).toHaveClass('caption-bottom');
    });

    it('debe aplicar className adicional', () => {
      render(
        <Table data-testid="table" className="custom-table">
          <tbody><tr><td>Test</td></tr></tbody>
        </Table>
      );
      expect(screen.getByTestId('table')).toHaveClass('custom-table');
    });
  });

  describe('TableHeader', () => {
    it('debe renderizar correctamente', () => {
      render(
        <table>
          <TableHeader data-testid="header">
            <tr><th>Header</th></tr>
          </TableHeader>
        </table>
      );
      expect(screen.getByTestId('header')).toBeInTheDocument();
    });

    it('debe ser un elemento thead', () => {
      render(
        <table>
          <TableHeader data-testid="header">
            <tr><th>Header</th></tr>
          </TableHeader>
        </table>
      );
      expect(screen.getByTestId('header').tagName).toBe('THEAD');
    });
  });

  describe('TableBody', () => {
    it('debe renderizar correctamente', () => {
      render(
        <table>
          <TableBody data-testid="body">
            <tr><td>Body</td></tr>
          </TableBody>
        </table>
      );
      expect(screen.getByTestId('body')).toBeInTheDocument();
    });

    it('debe ser un elemento tbody', () => {
      render(
        <table>
          <TableBody data-testid="body">
            <tr><td>Body</td></tr>
          </TableBody>
        </table>
      );
      expect(screen.getByTestId('body').tagName).toBe('TBODY');
    });
  });

  describe('TableFooter', () => {
    it('debe renderizar correctamente', () => {
      render(
        <table>
          <TableFooter data-testid="footer">
            <tr><td>Footer</td></tr>
          </TableFooter>
        </table>
      );
      expect(screen.getByTestId('footer')).toBeInTheDocument();
    });

    it('debe ser un elemento tfoot', () => {
      render(
        <table>
          <TableFooter data-testid="footer">
            <tr><td>Footer</td></tr>
          </TableFooter>
        </table>
      );
      expect(screen.getByTestId('footer').tagName).toBe('TFOOT');
    });

    it('debe aplicar estilos de fondo', () => {
      render(
        <table>
          <TableFooter data-testid="footer">
            <tr><td>Footer</td></tr>
          </TableFooter>
        </table>
      );
      expect(screen.getByTestId('footer')).toHaveClass('bg-primary');
    });
  });

  describe('TableRow', () => {
    it('debe renderizar correctamente', () => {
      render(
        <table>
          <tbody>
            <TableRow data-testid="row">
              <td>Cell</td>
            </TableRow>
          </tbody>
        </table>
      );
      expect(screen.getByTestId('row')).toBeInTheDocument();
    });

    it('debe ser un elemento tr', () => {
      render(
        <table>
          <tbody>
            <TableRow data-testid="row">
              <td>Cell</td>
            </TableRow>
          </tbody>
        </table>
      );
      expect(screen.getByTestId('row').tagName).toBe('TR');
    });

    it('debe aplicar estilos de hover', () => {
      render(
        <table>
          <tbody>
            <TableRow data-testid="row">
              <td>Cell</td>
            </TableRow>
          </tbody>
        </table>
      );
      expect(screen.getByTestId('row')).toHaveClass('hover:bg-muted/50');
    });
  });

  describe('TableHead', () => {
    it('debe renderizar correctamente', () => {
      render(
        <table>
          <thead>
            <tr>
              <TableHead data-testid="head">Header Cell</TableHead>
            </tr>
          </thead>
        </table>
      );
      expect(screen.getByTestId('head')).toBeInTheDocument();
      expect(screen.getByText('Header Cell')).toBeInTheDocument();
    });

    it('debe ser un elemento th', () => {
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

    it('debe aplicar estilos de fuente', () => {
      render(
        <table>
          <thead>
            <tr>
              <TableHead data-testid="head">Header</TableHead>
            </tr>
          </thead>
        </table>
      );
      expect(screen.getByTestId('head')).toHaveClass('font-medium');
    });
  });

  describe('TableCell', () => {
    it('debe renderizar correctamente', () => {
      render(
        <table>
          <tbody>
            <tr>
              <TableCell data-testid="cell">Cell Content</TableCell>
            </tr>
          </tbody>
        </table>
      );
      expect(screen.getByTestId('cell')).toBeInTheDocument();
      expect(screen.getByText('Cell Content')).toBeInTheDocument();
    });

    it('debe ser un elemento td', () => {
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

    it('debe aplicar padding', () => {
      render(
        <table>
          <tbody>
            <tr>
              <TableCell data-testid="cell">Cell</TableCell>
            </tr>
          </tbody>
        </table>
      );
      expect(screen.getByTestId('cell')).toHaveClass('p-4');
    });
  });

  describe('TableCaption', () => {
    it('debe renderizar correctamente', () => {
      render(
        <table>
          <TableCaption data-testid="caption">Descripción de la tabla</TableCaption>
          <tbody><tr><td>Data</td></tr></tbody>
        </table>
      );
      expect(screen.getByTestId('caption')).toBeInTheDocument();
      expect(screen.getByText('Descripción de la tabla')).toBeInTheDocument();
    });

    it('debe ser un elemento caption', () => {
      render(
        <table>
          <TableCaption data-testid="caption">Caption</TableCaption>
          <tbody><tr><td>Data</td></tr></tbody>
        </table>
      );
      expect(screen.getByTestId('caption').tagName).toBe('CAPTION');
    });
  });

  describe('Tabla completa', () => {
    it('debe renderizar una estructura de tabla completa', () => {
      render(
        <Table>
          <TableCaption>Lista de usuarios</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Juan Pérez</TableCell>
              <TableCell>juan@example.com</TableCell>
              <TableCell>Admin</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>María García</TableCell>
              <TableCell>maria@example.com</TableCell>
              <TableCell>Usuario</TableCell>
            </TableRow>
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={3}>Total: 2 usuarios</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      );

      expect(screen.getByText('Lista de usuarios')).toBeInTheDocument();
      expect(screen.getByText('Nombre')).toBeInTheDocument();
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
      expect(screen.getByText('Total: 2 usuarios')).toBeInTheDocument();
    });
  });
});

