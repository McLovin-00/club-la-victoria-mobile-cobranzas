export type ToastVariant = 'default' | 'success' | 'error' | 'warning';

export const showToast = (
  message: string,
  variant: ToastVariant = 'default',
  duration: number = 5000
) => {
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'fixed top-4 right-4 z-50 flex flex-col gap-2';
    document.body.appendChild(toastContainer);
  }

  const toastId = `toast-${Date.now()}`;
  const toastElement = document.createElement('div');
  toastElement.id = toastId;
  const closeToast = () => {
    const element = document.getElementById(toastId);
    if (element) {
      element.classList.add('opacity-0', 'translate-x-4');
      setTimeout(() => {
        element.remove();
        if (toastContainer && toastContainer.children.length === 0) {
          toastContainer.remove();
        }
      }, 300);
    }
  };

  const toast = document.createElement('div');
  let variantClasses = '';
  let iconSvg = '';
  switch (variant) {
    case 'success':
      variantClasses = 'bg-success/10 border-success/30 text-success';
      iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
      break;
    case 'error':
      variantClasses = 'bg-destructive/10 border-destructive/30 text-destructive';
      iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12" y2="16"></line></svg>`;
      break;
    case 'warning':
      variantClasses = 'bg-warning/10 border-warning/30 text-warning';
      iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12" y2="17"></line></svg>`;
      break;
    default:
      variantClasses = 'bg-card text-card-foreground border-border';
      iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="8"></line></svg>`;
  }
  toast.className = `p-4 rounded-md border shadow-md ${variantClasses} max-w-sm transition-all duration-300 opacity-0 translate-x-4`;
  toast.innerHTML = `<div class="flex items-center justify-between"><div class="flex items-center gap-2"><div class="flex-shrink-0">${iconSvg}</div><p class="text-sm font-medium">${message}</p></div><button class="ml-4 text-current opacity-70 hover:opacity-100" aria-label="Cerrar"><svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><line x1='18' y1='6' x2='6' y2='18'></line><line x1='6' y1='6' x2='18' y2='18'></line></svg></button></div>`;
  toastElement.appendChild(toast);
  setTimeout(() => { toast.classList.remove('opacity-0', 'translate-x-4'); }, 10);
  const closeButton = toast.querySelector('button');
  if (closeButton) closeButton.addEventListener('click', closeToast);
  if (duration > 0) setTimeout(closeToast, duration);
  return closeToast;
};


