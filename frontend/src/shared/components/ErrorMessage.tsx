import { errorText, fieldLabel, normalizeError } from '../api/errors';

interface Props {
  error: unknown;
}

export function ErrorMessage({ error }: Props) {
  if (!error) return null;
  const e = normalizeError(error);
  return (
    <div className="alert" role="alert">
      <p className="alert__title">{errorText(e)}</p>
      {e.code === 'VALIDATION_ERROR' && e.details.length > 0 && (
        <ul className="alert__list">
          {e.details.map((d, i) => (
            <li key={`${d.field}-${i}`}>
              <strong>{fieldLabel(d.field)}:</strong> {d.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
