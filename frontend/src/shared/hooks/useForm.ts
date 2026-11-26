import { useState, type ChangeEvent, type FormEvent } from 'react';

type Values = Record<string, string>;
type Key<T extends Values> = keyof T & string;
export type FieldErrors<T extends Values> = Partial<Record<Key<T>, string | undefined>>;

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
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      setValues((prev) => ({ ...prev, [name]: e.target.value }));
      onChange?.();
    },
    onBlur: () => setTouched((prev) => ({ ...prev, [name]: true })),
  });

  const submit = (handler: (values: T) => void | Promise<void>) => (ev: FormEvent) => {
    ev.preventDefault();
    const keys = Object.keys(initial) as Key<T>[];
    setTouched(Object.fromEntries(keys.map((k) => [k, true])) as Partial<Record<Key<T>, boolean>>);
    const firstInvalid = keys.find((k) => errors[k]);
    if (firstInvalid) {
      document.getElementById(firstInvalid)?.focus();
      return;
    }
    return handler(values);
  };

  return { values, bind, submit };
}
