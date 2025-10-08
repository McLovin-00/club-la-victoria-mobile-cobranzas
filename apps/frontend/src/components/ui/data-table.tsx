import React from 'react';

interface Column<T> {
  header: string;
  accessorKey: keyof T | ((row: T) => React.ReactNode);
  cell?: (info: { getValue: () => any; row: { original: T } }) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  pagination?: boolean;
  pageSize?: number;
  title?: string;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

export const DataTable = <T extends Record<string, any>>({
  columns,
  data,
  pagination = false,
  pageSize = 10,
  title,
  emptyMessage = 'No hay datos para mostrar',
  onRowClick,
}: DataTableProps<T>) => {
  const [page, setPage] = React.useState(0);
  const totalPages = pagination ? Math.ceil(data.length / pageSize) : 1;

  // Datos paginados si se habilita la paginación
  const paginatedData = pagination ? data.slice(page * pageSize, (page + 1) * pageSize) : data;

  const handleNextPage = () => {
    if (page < totalPages - 1) {
      setPage(page + 1);
    }
  };

  const handlePreviousPage = () => {
    if (page > 0) {
      setPage(page - 1);
    }
  };

  return (
    <div className='overflow-hidden rounded-md border'>
      {title && (
        <div className='border-b bg-muted/50 p-3'>
          <h3 className='font-medium'>{title}</h3>
        </div>
      )}

      <div className='overflow-x-auto'>
        <table className='w-full'>
          <thead className='bg-muted/50'>
            <tr>
              {columns.map((column, index) => (
                <th
                  key={index}
                  className='px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider'
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className='divide-y divide-border'>
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className='px-4 py-4 text-center text-sm text-muted-foreground'
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIndex) => (
                <tr key={rowIndex} className={`hover:bg-muted/20 ${onRowClick ? 'cursor-pointer' : ''}`} onClick={() => onRowClick?.(row)}>
                  {columns.map((column, colIndex) => {
                    const getValue = () => {
                      if (typeof column.accessorKey === 'function') {
                        return column.accessorKey(row);
                      }
                      return row[column.accessorKey];
                    };

                    return (
                      <td key={colIndex} className='px-4 py-4 text-sm'>
                        {column.cell
                          ? column.cell({ getValue, row: { original: row } })
                          : getValue()}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && totalPages > 1 && (
        <div className='flex items-center justify-between border-t p-3'>
          <div className='text-sm text-muted-foreground'>
            Página {page + 1} de {totalPages}
          </div>
          <div className='flex space-x-2'>
            <button
              onClick={handlePreviousPage}
              disabled={page === 0}
              className='px-3 py-1 text-sm bg-muted rounded-md disabled:opacity-50'
            >
              Anterior
            </button>
            <button
              onClick={handleNextPage}
              disabled={page === totalPages - 1}
              className='px-3 py-1 text-sm bg-muted rounded-md disabled:opacity-50'
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
