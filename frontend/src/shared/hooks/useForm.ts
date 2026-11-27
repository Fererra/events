import { useCallback, useState, type ChangeEvent, type FormEvent } from 'react';

type Values = Record<string, string>;
type Key<T extends Values> = keyof T & string;
export type FieldErrors<T extends Values> = Partial<Record<Key<T>, string | undefined>>;
export type FormFieldElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

export function useForm<T extends Values>(
  initial: T,
  validate: (values: T) => FieldErrors<T>,
  onChange?: () => void,
) {
  const [values, setValues] = useState<T>(initial);
  const [touched, setTouched] = useState<Partial<Record<Key<T>, boolean>>>({});
  const errors = validate(values);

  const bind = (name: Key<T>) => ({
    name,
    value: values[name],
    error: touched[name] ? errors[name] : undefined,
    onChange: (e: ChangeEvent<FormFieldElement>) => {
      setValues((prev) => ({ ...prev, [name]: e.target.value }));
      onChange?.();
    },
    onBlur: () => setTouched((prev) => ({ ...prev, [name]: true })),
  });

  const reset = useCallback((nextValues: T) => {
    setValues(nextValues);
    setTouched({});
  }, []);

  const submit = (handler: (values: T) => void | Promise<void>) => (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const keys = Object.keys(values) as Key<T>[];
    setTouched(Object.fromEntries(keys.map((k) => [k, true])) as Partial<Record<Key<T>, boolean>>);
    const firstInvalid = keys.find((k) => errors[k]);
    if (firstInvalid) {
      const control = ev.currentTarget.elements.namedItem(firstInvalid);
      if (control instanceof HTMLElement) {
        control.focus();
      } else {
        document.getElementById(firstInvalid)?.focus();
      }
      return;
    }
    return handler(values);
  };

  return { values, errors, touched, bind, reset, submit };
}
