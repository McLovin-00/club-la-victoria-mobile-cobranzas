import React, { useCallback, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './dialog';
import { ConfirmContext, ConfirmOptions } from '../../contexts/confirmContext';

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions({ cancelText: 'Cancelar', confirmText: 'Confirmar', title: 'Confirmar acción', variant: 'danger', ...opts });
    return new Promise<boolean>((resolve) => {
      setResolver(() => resolve);
    });
  }, []);

  const close = (result: boolean) => {
    if (resolver) resolver(result);
    setResolver(null);
    setOptions(null);
  };

  const confirmBtnClasses = options?.variant === 'danger'
    ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white'
    : 'bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white';

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Dialog open={Boolean(options)} onOpenChange={(open)=> { if (!open) close(false); }}>
        <DialogContent>
          <DialogHeader>
            {options?.title && <DialogTitle>{options.title}</DialogTitle>}
            {options?.message && <DialogDescription>{options.message}</DialogDescription>}
          </DialogHeader>
          <DialogFooter>
            <button className="border border-gray-300 text-gray-600 hover:bg-gray-50 font-medium px-6 py-2 rounded-lg transition-all duration-200" onClick={() => close(false)}>
              {options?.cancelText}
            </button>
            <button className={`${confirmBtnClasses} font-medium px-6 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300`} onClick={() => close(true)}>
              {options?.confirmText}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
};


