import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShieldIcon } from '../../../shared/components/Icons';
import { fetchAllEvents } from '../../events';
import { fetchAllRegistrations } from '../../registrations';
import { fetchAllVenues } from '../../venues';
import { AdminEventsTab } from '../components/AdminEventsTab';
import { AdminRegistrationsTab } from '../components/AdminRegistrationsTab';
import { AdminVenuesTab } from '../components/AdminVenuesTab';

type AdminTab = 'events' | 'venues' | 'registrations';

function parseTabParam(raw: string | null): AdminTab {
  if (raw === 'venues' || raw === 'registrations') return raw;
  return 'events';
}

interface AdminSummary {
  eventsCount: number;
  venuesCount: number;
  activeRegistrationsCount: number;
}

export function AdminPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = parseTabParam(searchParams.get('tab'));

  const [summary, setSummary] = useState<AdminSummary | null>(null);

  const refreshSummary = useCallback(async (signal?: AbortSignal) => {
    try {
      const [events, venues, registrations] = await Promise.all([
        fetchAllEvents(signal),
        fetchAllVenues(signal),
        fetchAllRegistrations(signal),
      ]);
      setSummary({
        eventsCount: events.length,
        venuesCount: venues.length,
        activeRegistrationsCount: registrations.filter((r) => r.status === 'ACTIVE').length,
      });
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    refreshSummary(controller.signal);
    return () => controller.abort();
  }, [refreshSummary]);

  const handleTabChange = (tab: AdminTab) => {
    setSearchParams(tab === 'events' ? {} : { tab });
  };

  return (
    <section>
      <div className="page-header">
        <h1 className="page-header__title">
          <ShieldIcon size={26} />
          <span>Admin panel</span>
        </h1>
        <p className="muted">
          Create and manage venues, configure events and ticket types, and oversee user
          registrations.
        </p>
      </div>

      <div className="admin-stats" aria-label="Platform summary">
        <div className="card admin-stat">
          <span className="admin-stat__label">Events</span>
          <span className="admin-stat__value">{summary ? summary.eventsCount : '—'}</span>
        </div>
        <div className="card admin-stat">
          <span className="admin-stat__label">Venues</span>
          <span className="admin-stat__value">{summary ? summary.venuesCount : '—'}</span>
        </div>
        <div className="card admin-stat">
          <span className="admin-stat__label">Active registrations</span>
          <span className="admin-stat__value">
            {summary ? summary.activeRegistrationsCount : '—'}
          </span>
        </div>
      </div>

      <div className="admin-tabs" role="tablist" aria-label="Admin sections">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'events'}
          className={`filter-tab${activeTab === 'events' ? ' filter-tab--active' : ''}`}
          onClick={() => handleTabChange('events')}
        >
          Events
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'venues'}
          className={`filter-tab${activeTab === 'venues' ? ' filter-tab--active' : ''}`}
          onClick={() => handleTabChange('venues')}
        >
          Venues
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'registrations'}
          className={`filter-tab${activeTab === 'registrations' ? ' filter-tab--active' : ''}`}
          onClick={() => handleTabChange('registrations')}
        >
          Registrations
        </button>
      </div>

      {activeTab === 'events' && <AdminEventsTab onDataChanged={refreshSummary} />}
      {activeTab === 'venues' && <AdminVenuesTab onDataChanged={refreshSummary} />}
      {activeTab === 'registrations' && <AdminRegistrationsTab onDataChanged={refreshSummary} />}
    </section>
  );
}
