import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Plus } from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { useEscalationStore } from '../store/escalations';
import { useZoneStore } from '../store/zones';
import { EscalationsList } from '../components/EscalationsList';
import { EscalationDetail } from '../components/EscalationDetail';
import { CreateEscalationModal } from '../components/CreateEscalationModal';

const EscalationsPage = () => {
  const user = useAuthStore((s) => s.user);
  const canCreateEscalation = user?.role === 'admin';

  const { escalations, stats, fetchEscalations, fetchStats, isLoading } = useEscalationStore();
  const { zones, guards, fetchZones, fetchGuards } = useZoneStore();

  const [showCreateEscalation, setShowCreateEscalation] = useState(false);
  const [selectedEscalationUuid, setSelectedEscalationUuid] = useState<string | null>(null);

  useEffect(() => {
    fetchEscalations();
    fetchStats();
    fetchZones();
    fetchGuards();
  }, [fetchEscalations, fetchStats, fetchZones, fetchGuards]);

  const overall = useMemo(() => ({
    total: stats?.total ?? escalations.length,
    active: (stats?.pending ?? 0) + (stats?.assigned ?? 0) + (stats?.in_progress ?? 0),
    resolved: stats?.resolved ?? 0,
    critical: stats?.critical ?? 0,
  }), [stats, escalations.length]);

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="mx-auto w-full max-w-7xl space-y-5 p-2 md:p-4">
        <section className="rounded-2xl border border-outline-variant/20 bg-surface-container-low p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-primary">Escalation Center</h2>
              <p className="text-sm text-primary/60">Overall escalations, detail view, and create escalation workflow.</p>
            </div>

            <button
              type="button"
              onClick={() => setShowCreateEscalation(true)}
              disabled={!canCreateEscalation}
              className="inline-flex items-center gap-2 rounded-lg bg-error px-4 py-2 text-sm font-semibold text-on-error shadow-sm hover:opacity-95 disabled:cursor-not-allowed disabled:bg-muted"
              title={canCreateEscalation ? 'Create escalation' : 'Only admin can create escalations'}
            >
              <Plus size={16} />
              Add Escalation
            </button>
          </div>

          {!canCreateEscalation && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-700">
              <AlertTriangle size={14} />
              Only admin role can add new escalations.
            </div>
          )}
        </section>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-primary/60">Overall Escalations</p>
            <p className="mt-1 text-2xl font-bold text-primary">{overall.total}</p>
          </div>
          <div className="rounded-xl border border-error/25 bg-error/10 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-error/80">Active</p>
            <p className="mt-1 text-2xl font-bold text-error">{overall.active}</p>
          </div>
          <div className="rounded-xl border border-green-500/25 bg-green-500/10 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-green-700">Resolved</p>
            <p className="mt-1 text-2xl font-bold text-green-700">{overall.resolved}</p>
          </div>
          <div className="rounded-xl border border-orange-500/25 bg-orange-500/10 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-orange-700">Critical</p>
            <p className="mt-1 text-2xl font-bold text-orange-700">{overall.critical}</p>
          </div>
        </section>

        <section className="rounded-2xl border border-outline-variant/20 bg-surface-container-low p-3 shadow-sm md:p-4">
          <EscalationsList
            currentUserRole={user?.role === 'security' ? 'security' : 'admin'}
            onSelectEscalation={(uuid) => setSelectedEscalationUuid(uuid)}
          />

          {!isLoading && escalations.length === 0 && (
            <p className="mt-2 px-2 text-xs text-primary/60">No escalations available yet.</p>
          )}
        </section>
      </div>

      {showCreateEscalation && (
        <CreateEscalationModal
          isOpen={showCreateEscalation}
          onClose={() => setShowCreateEscalation(false)}
          zones={zones.map((z) => ({ uuid: z.uuid, name: z.name }))}
          securityPersonnel={guards.map((g) => ({ uuid: g.uuid || g.id || '', email: g.email, name: g.name ?? undefined }))}
        />
      )}

      {selectedEscalationUuid && (
        <EscalationDetail
          escalationUuid={selectedEscalationUuid}
          onClose={() => setSelectedEscalationUuid(null)}
          currentUserRole={user?.role === 'security' ? 'security' : 'admin'}
          currentUserUuid={user?.uuid}
        />
      )}
    </div>
  );
};

export default EscalationsPage;
