import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { ErrorMessage } from '../../../shared/components/ErrorMessage';
import { fetchScheduledEventCountsByVenue } from '../../events';
import { deleteVenue, fetchAllVenues, type Venue } from '../../venues';
import { VenueFormModal } from './VenueFormModal';

interface AdminVenuesTabProps {
  onDataChanged?: () => void;
}

export function AdminVenuesTab({ onDataChanged }: AdminVenuesTabProps) {
  const [venues, setVenues] = useState<Venue[] | null>(null);
  const [scheduledCounts, setScheduledCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState<unknown>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);

  const [pendingDelete, setPendingDelete] = useState<Venue | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<unknown>(null);

  const loadVenuesData = useCallback(async (signal?: AbortSignal) => {
    const [allVenues, counts] = await Promise.all([
      fetchAllVenues(signal),
      fetchScheduledEventCountsByVenue(signal),
    ]);
    setVenues(allVenues);
    setScheduledCounts(counts);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setError(null);

    loadVenuesData(controller.signal).catch((e) => {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setError(e);
    });

    return () => controller.abort();
  }, [loadVenuesData]);

  const openCreateModal = () => {
    setSuccessMessage(null);
    setEditingVenue(null);
    setFormOpen(true);
  };

  const openEditModal = (venue: Venue) => {
    setSuccessMessage(null);
    setEditingVenue(venue);
    setFormOpen(true);
  };

  const closeFormModal = useCallback(() => {
    setFormOpen(false);
    setEditingVenue(null);
  }, []);

  const handleVenueSaved = async (saved: Venue, isEdit: boolean) => {
    setFormOpen(false);
    setEditingVenue(null);
    setSuccessMessage(
      isEdit
        ? `Venue "${saved.name}" has been updated.`
        : `Venue "${saved.name}" has been created.`,
    );
    try {
      await loadVenuesData();
    } catch (e) {
      setError(e);
    }
    onDataChanged?.();
  };

  const openDeleteDialog = (venue: Venue) => {
    setDeleteError(null);
    setSuccessMessage(null);
    setPendingDelete(venue);
  };

  const closeDeleteDialog = useCallback(() => {
    if (deleting) return;
    setPendingDelete(null);
    setDeleteError(null);
  }, [deleting]);

  const handleConfirmDelete = async () => {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const target = pendingDelete;
      await deleteVenue(target.id);
      setPendingDelete(null);
      setSuccessMessage(`Venue "${target.name}" has been deleted.`);
      await loadVenuesData();
      onDataChanged?.();
    } catch (e) {
      setDeleteError(e);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section aria-label="Manage venues">
      <div className="admin-toolbar">
        <p className="muted">
          {venues ? `${venues.length} ${venues.length === 1 ? 'venue' : 'venues'} total` : 'Loading venues…'}
        </p>
        <button type="button" className="btn" onClick={openCreateModal}>
          + Add venue
        </button>
      </div>

      <ErrorMessage error={error} />

      {successMessage && (
        <div className="alert alert--success" role="status" aria-live="polite">
          <p className="alert__title">{successMessage}</p>
        </div>
      )}

      {venues && venues.length === 0 && (
        <div className="card">
          <p className="muted">No venues configured yet. Add the first venue to start hosting events.</p>
        </div>
      )}

      {venues && venues.length > 0 && (
        <div className="admin-list">
          {venues.map((venue) => {
            const scheduled = scheduledCounts[venue.id] ?? 0;
            return (
              <article key={venue.id} className="card admin-item">
                <div className="admin-item__head">
                  <h2 className="admin-item__title">
                    <Link to={`/venues/${venue.id}`}>{venue.name}</Link>
                  </h2>
                  <span
                    className={`badge ${scheduled > 0 ? 'badge--planning' : 'badge--neutral'}`}
                  >
                    {scheduled === 0
                      ? 'No scheduled events'
                      : `${scheduled} scheduled ${scheduled === 1 ? 'event' : 'events'}`}
                  </span>
                </div>

                <dl className="admin-item__meta">
                  <div>
                    <dt>Address</dt>
                    <dd>{venue.address}</dd>
                  </div>
                  <div>
                    <dt>Capacity</dt>
                    <dd>
                      {venue.capacity !== null ? `${venue.capacity} people` : 'Not specified'}
                    </dd>
                  </div>
                </dl>

                <div className="admin-item__footer">
                  <Link to={`/venues/${venue.id}`} className="btn btn--ghost btn--sm">
                    View public page
                  </Link>
                  <div className="admin-item__actions">
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => openEditModal(venue)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn--danger-outline btn--sm"
                      onClick={() => openDeleteDialog(venue)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <VenueFormModal
        open={formOpen}
        venue={editingVenue}
        onClose={closeFormModal}
        onSaved={handleVenueSaved}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete venue?"
        description={
          pendingDelete
            ? `Are you sure you want to delete "${pendingDelete.name}" (${pendingDelete.address})? Venues with scheduled events cannot be deleted.`
            : ''
        }
        confirmLabel={deleting ? 'Deleting…' : 'Delete venue'}
        cancelLabel="Keep venue"
        busy={deleting}
        error={deleteError}
        onConfirm={handleConfirmDelete}
        onCancel={closeDeleteDialog}
      />
    </section>
  );
}
