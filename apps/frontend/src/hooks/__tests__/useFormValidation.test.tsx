import { renderHook, act } from '@testing-library/react';
import { useFormValidation, type ValidatorFn } from '../useFormValidation';

type Values = { name: string; email: string };

const required: ValidatorFn<string> = (v) => (v.trim() ? null : 'Requerido');
const email: ValidatorFn<string> = (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : 'Email inválido');

describe('useFormValidation', () => {
  it('validates fields on setValue and validateAll', () => {
    const { result } = renderHook(() =>
      useFormValidation<Values>({ name: '', email: '' }, { name: [required], email: [required, email] })
    );

    act(() => {
      result.current.setValue('name', '');
      result.current.setValue('email', 'bad');
    });
    expect(result.current.isValid).toBe(false);

    act(() => {
      result.current.setValue('name', 'Alice');
      result.current.setValue('email', 'alice@example.com');
    });
    expect(result.current.isValid).toBe(true);

    act(() => {
      result.current.setValue('email', '');
    });
    act(() => {
      result.current.validateAll();
    });
    expect(result.current.isValid).toBe(false);
  });
});


