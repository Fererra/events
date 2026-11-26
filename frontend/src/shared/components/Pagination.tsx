export function parsePageParam(raw: string | null): number {
  if (!raw) return 1;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  itemLabel: string;
  onPageChange: (page: number) => void;
}

function getPageTokens(current: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, idx) => idx + 1);
  }

  const tokens: (number | 'ellipsis')[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);

  if (start > 2) tokens.push('ellipsis');
  for (let p = start; p <= end; p++) tokens.push(p);
  if (end < totalPages - 1) tokens.push('ellipsis');

  tokens.push(totalPages);
  return tokens;
}

export function Pagination({
  page,
  totalPages,
  total,
  limit,
  itemLabel,
  onPageChange,
}: PaginationProps) {
  if (total === 0) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const tokens = getPageTokens(page, totalPages);

  return (
    <nav className="pagination" aria-label="Pagination">
      <p className="pagination__info">
        Showing {from}–{to} of {total} {itemLabel}
      </p>
      {totalPages > 1 && (
        <div className="pagination__controls">
          <button
            type="button"
            className="pagination__btn"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </button>
          {tokens.map((token, idx) =>
            token === 'ellipsis' ? (
              <span key={`ellipsis-${idx}`} className="pagination__ellipsis" aria-hidden="true">
                …
              </span>
            ) : (
              <button
                key={token}
                type="button"
                className={`pagination__btn${token === page ? ' pagination__btn--active' : ''}`}
                aria-current={token === page ? 'page' : undefined}
                onClick={() => onPageChange(token)}
              >
                {token}
              </button>
            ),
          )}
          <button
            type="button"
            className="pagination__btn"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </nav>
  );
}
