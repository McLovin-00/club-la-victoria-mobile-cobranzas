import React from 'react';

type PaginationProps = {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
};

export const Pagination: React.FC<PaginationProps> = ({ currentPage, totalItems, pageSize, onPageChange, className }) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const canPrev = currentPage > 1;
  const canNext = currentPage < totalPages;

  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <button
        className="border border-gray-300 text-gray-600 hover:bg-gray-50 font-medium px-4 py-2 rounded-lg transition-all duration-200 disabled:opacity-50"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!canPrev}
      >
        Anterior
      </button>
      <span className="text-sm text-muted-foreground">Página {currentPage} de {totalPages}</span>
      <button
        className="border border-gray-300 text-gray-600 hover:bg-gray-50 font-medium px-4 py-2 rounded-lg transition-all duration-200 disabled:opacity-50"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!canNext}
      >
        Siguiente
      </button>
    </div>
  );
};


