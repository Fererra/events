import { useState, type ChangeEvent, type Ref } from 'react';

interface Props {
  id?: string;
  name: string;
  label: string;
  value: string;
  error?: string;
  invalid?: boolean;
  type?: 'text' | 'email' | 'password' | 'tel' | 'number' | 'datetime-local';
  autoComplete?: string;
  placeholder?: string;
  min?: string;
  step?: string;
  hint?: string;
  inputRef?: Ref<HTMLInputElement>;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
}

export function TextField({
  id,
  name,
  label,
  value,
  error,
  invalid,
  type = 'text',
  autoComplete,
  placeholder,
  min,
  step,
  hint,
  inputRef,
  onChange,
  onBlur,
}: Props) {
  const [shown, setShown] = useState(false);
  const isPassword = type === 'password';
  const inputId = id ?? name;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const describedBy = [hint ? hintId : '', error ? errorId : ''].filter(Boolean).join(' ') || undefined;

  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>
      <div className="field__control">
        <input
          ref={inputRef}
          id={inputId}
          className={isPassword ? 'field__input--toggle' : undefined}
          name={name}
          type={isPassword && shown ? 'text' : type}
          value={value}
          autoComplete={autoComplete}
          placeholder={placeholder}
          min={min}
          step={step}
          aria-invalid={Boolean(error) || Boolean(invalid)}
          aria-describedby={describedBy}
          onChange={onChange}
          onBlur={onBlur}
        />
        {isPassword && (
          <button
            type="button"
            className="field__toggle"
            aria-pressed={shown}
            onClick={() => setShown((v) => !v)}
          >
            {shown ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
      {hint && (
        <p id={hintId} className="field__hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="field__error">
          {error}
        </p>
      )}
    </div>
  );
}
