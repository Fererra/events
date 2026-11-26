import { useState, type ChangeEvent } from 'react';

interface Props {
  name: string;
  label: string;
  value: string;
  error?: string;
  invalid?: boolean;
  type?: 'text' | 'email' | 'password' | 'tel';
  autoComplete?: string;
  placeholder?: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
}

export function TextField({
  name,
  label,
  value,
  error,
  invalid,
  type = 'text',
  autoComplete,
  placeholder,
  onChange,
  onBlur,
}: Props) {
  const [shown, setShown] = useState(false);
  const isPassword = type === 'password';
  const errorId = `${name}-error`;

  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <div className="field__control">
        <input
          id={name}
          className={isPassword ? 'field__input--toggle' : undefined}
          name={name}
          type={isPassword && shown ? 'text' : type}
          value={value}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={Boolean(error) || Boolean(invalid)}
          aria-describedby={error ? errorId : undefined}
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
      {error && (
        <p id={errorId} className="field__error">
          {error}
        </p>
      )}
    </div>
  );
}
