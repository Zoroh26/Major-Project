/**
 * CrowdDashboardWidget — presentational component
 *
 * Renders live ML analysis results for each camera in the grid.
 * Data comes from the parent (CameraGridDashboard) which captures
 * real video frames and calls the CrowdVision API — no random/static data.
 */

import { RefreshCw, AlertTriangle, Zap, Activity } from 'lucide-react';
import type { CameraMLResult, RiskLevel } from '../services/crowdvision';

// ── Style maps ────────────────────────────────────────────────────────────────

const RISK_RING: Record<RiskLevel, string> = {
  low:      'ring-green-500/40  bg-green-500/5',
  medium:   'ring-yellow-500/40 bg-yellow-500/5',
  high:     'ring-orange-500/40 bg-orange-500/5',
  critical: 'ring-red-500/50    bg-red-500/5',
};

const RISK_LABEL: Record<RiskLevel, string> = {
  low:      'text-green-600  bg-green-500/10  border-green-500/30',
  medium:   'text-yellow-600 bg-yellow-500/10 border-yellow-500/30',
  high:     'text-orange-500 bg-orange-500/10 border-orange-500/30',
  critical: 'text-red-500    bg-red-500/10    border-red-500/40',
};

const RISK_DOT: Record<RiskLevel, string> = {
  low:      'bg-green-500',
  medium:   'bg-yellow-500',
  high:     'bg-orange-500',
  critical: 'bg-red-500',
};

// ── Camera result card ────────────────────────────────────────────────────────

const CameraCard = ({ result }: { result: CameraMLResult }) => (
  <div className={`ring-1 rounded-xl p-3 flex flex-col gap-2 transition-all ${RISK_RING[result.risk_level]}`}>

    {/* Header: camera + zone */}
    <div className="flex items-start justify-between gap-1">
      <div className="min-w-0">
        <p className="text-[11px] font-bold text-primary truncate">{result.cameraName}</p>
        <p className="text-[10px] text-primary/50 truncate">
          {result.zoneName ?? 'Unassigned'} · {result.cameraLocation}
        </p>
      </div>
      <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${RISK_LABEL[result.risk_level]}`}>
        {result.risk_level}
      </span>
    </div>

    {/* Metrics */}
    <div className="grid grid-cols-3 gap-1 text-center">
      <div>
        <p className="text-[9px] text-primary/40 uppercase">People</p>
        <p className="text-base font-extrabold text-primary leading-none">{result.density_count.toFixed(0)}</p>
      </div>
      <div>
        <p className="text-[9px] text-primary/40 uppercase">Anomaly</p>
        <p className={`text-base font-extrabold leading-none ${result.is_anomalous ? 'text-red-500' : 'text-green-600'}`}>
          {(result.anomaly_score * 100).toFixed(0)}
          <span className="text-[8px] font-normal">%</span>
        </p>
      </div>
      <div>
        <p className="text-[9px] text-primary/40 uppercase">Status</p>
        <p className={`text-[10px] font-bold leading-none mt-1 ${result.is_anomalous ? 'text-red-500' : 'text-green-600'}`}>
          {result.is_anomalous ? '⚠ ANOM' : '✓ OK'}
        </p>
      </div>
    </div>

    {/* Density heatmap thumbnail */}
    {result.density_map_b64 && (
      <img
        src={`data:image/png;base64,${result.density_map_b64}`}
        alt={`Density — ${result.cameraName}`}
        className="w-full h-14 object-cover rounded-lg opacity-90"
      />
    )}

    <p className="text-[9px] text-primary/30 text-right">
      {result.last_updated.toLocaleTimeString()}
    </p>
  </div>
);

// ── Empty / skeleton card ─────────────────────────────────────────────────────

const SkeletonCard = ({ label }: { label: string }) => (
  <div className="ring-1 ring-border rounded-xl p-3 flex flex-col gap-2 animate-pulse">
    <p className="text-[11px] font-bold text-primary/30">{label}</p>
    <div className="h-4 bg-primary/10 rounded w-2/3" />
    <div className="grid grid-cols-3 gap-1">
      {[0, 1, 2].map((k) => <div key={k} className="h-6 bg-primary/10 rounded" />)}
    </div>
    <div className="h-14 bg-primary/10 rounded-lg" />
  </div>
);

// ── Main widget ───────────────────────────────────────────────────────────────

interface CrowdDashboardWidgetProps {
  /** Real ML results from captured camera frames */
  results: CameraMLResult[];
  /** True while an analysis pass is running */
  loading: boolean;
  /** Set when the CrowdVision API is unreachable */
  error: string | null;
  /** When the last analysis completed */
  lastUpdated: Date | null;
  /** Trigger a manual refresh */
  onRefresh: () => void;
  /** Names of the camera slots that are occupied (for skeleton labels) */
  cameraNames: string[];
}

const CrowdDashboardWidget = ({
  results,
  loading,
  error,
  lastUpdated,
  onRefresh,
  cameraNames,
}: CrowdDashboardWidgetProps) => {

  const alertResults = results.filter(
    (r) => r.risk_level === 'critical' || r.risk_level === 'high' || r.is_anomalous
  );

  return (
    <div className="border border-border rounded-2xl p-4 flex flex-col gap-3">

      {/* ── Header ── */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Zap size={14} className="text-primary" />
          <span className="text-xs font-bold uppercase tracking-wider text-primary">
            CrowdVision — Live Feed Analysis
          </span>

          {/* Model badges */}
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-green-500/10 text-green-600 border-green-500/30 uppercase">
              Density · Real
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-yellow-500/10 text-yellow-600 border-yellow-500/30 uppercase">
              Anomaly · Simulated
            </span>
          </div>

          {/* Active alerts badge */}
          {alertResults.length > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-500/10 border border-red-500/30 rounded-full px-2 py-0.5 animate-pulse">
              <span className={`w-1.5 h-1.5 rounded-full ${RISK_DOT['critical']}`} />
              {alertResults.length} alert{alertResults.length > 1 ? 's' : ''}
            </span>
          )}

          {loading && (
            <span className="flex items-center gap-1 text-[10px] text-primary/40">
              <Activity size={10} className="animate-pulse" />
              analyzing frames…
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-[10px] text-primary/30">
              {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1 text-[10px] text-primary/50 hover:text-primary border border-border rounded px-2 py-0.5 transition-colors disabled:opacity-40"
          >
            <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Error state ── */}
      {error && (
        <div className="flex items-center gap-2 border border-red-500/30 bg-red-500/5 rounded-xl px-3 py-2 text-xs text-red-500">
          <AlertTriangle size={13} />
          {error}
        </div>
      )}

      {/* ── Camera result grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cameraNames.map((name, i) => {
          const result = results.find((r) => r.cameraName === name);
          if (result) return <CameraCard key={result.cameraUuid} result={result} />;
          // Show skeleton while loading or API is offline
          return <SkeletonCard key={name} label={name} />;
        })}
      </div>

      {/* ── Alert banner ── */}
      {alertResults.length > 0 && (
        <div className="border border-red-500/30 rounded-xl px-3 py-2 flex flex-wrap items-center gap-x-4 gap-y-1 bg-red-500/5">
          <AlertTriangle size={13} className="text-red-500 shrink-0" />
          {alertResults.map((r) => (
            <span key={r.cameraUuid} className="text-[10px] font-bold text-red-500">
              {r.cameraName}
              <span className="font-normal text-red-400 ml-1">
                ({r.density_count.toFixed(0)} ppl ·{' '}
                {r.is_anomalous ? `anomaly ${(r.anomaly_score * 100).toFixed(0)}%` : r.risk_level})
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default CrowdDashboardWidget;
