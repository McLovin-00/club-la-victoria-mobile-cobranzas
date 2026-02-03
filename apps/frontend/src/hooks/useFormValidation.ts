import { useCallback, useMemo, useState } from 'react';

export type FieldError = string | null;
export type ValidatorFn<T> = (value: T, values?: Record<string, unknown>) => FieldError;

export function useFormValidation<TValues extends Record<string, unknown>>(
  initialValues: TValues,
  validators: Partial<{ [K in keyof TValues]: ValidatorFn<TValues[K]>[] }>
) {
  const [values, setValues] = useState<TValues>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof TValues, FieldError>>>({});

  const validateField = useCallback(<K extends keyof TValues>(key: K, value: TValues[K]): FieldError => {
    const fns = validators[key] ?? [];
    for (const fn of fns) {
      const err = fn(value, values);
      if (err) return err;
    }
    return null;
  }, [validators, values]);

  const validateAll = useCallback(() => {
    const newErrors: Partial<Record<keyof TValues, FieldError>> = {};
    (Object.keys(values) as Array<keyof TValues>).forEach((k) => {
      const err = validateField(k, values[k]);
      if (err) newErrors[k] = err;
    });
    setErrors(newErrors);
    return newErrors;
  }, [validateField, values]);

  const isValid = useMemo(() => Object.values(errors).every((e) => !e), [errors]);

  const setValue = useCallback(<K extends keyof TValues>(key: K, value: TValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    const err = validateField(key, value);
    setErrors((prev) => ({ ...prev, [key]: err }));
  }, [validateField]);

  return { values, setValue, errors, isValid, validateAll } as const;
}


