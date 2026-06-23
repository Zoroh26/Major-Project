/**
 * CrowdVisionPanel
 *
 * A self-contained panel that accepts a video / canvas ref, periodically
 * captures a JPEG frame, sends it to the CrowdVision API for density and
 * anomaly analysis, and also polls the forecast endpoint.
 *
 * Designed to be dropped alongside the existing YOLO feed in ZoneCameraMonitor.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  estimateDensity,
  detectAnomaly,
  predictForecast,
  captureFrameFromBackend,
  type DensityResult,
  type AnomalyResult,
  type ForecastResult,
  type RiskLevel,
  type CongestionLevel,
} from '../services/crowdvision';

// ── Style helpers ─────────────────────────────────────────────────────────────

const RISK_BG: Record<RiskLevel, string> = {
  low: 'bg-green-500/20 text-green-600 border-green-500/40',
  medium: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/40',
  high: 'bg-orange-500/20 text-orange-600 border-orange-500/40',
  critical: 'bg-red-500/20 text-red-500 border-red-500/50',
};

const RISK_DOT: Record<RiskLevel, string> = {
  low: 'bg-green-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500',
};

const CONGESTION_COLOR: Record<CongestionLevel, string> = {
  free_flow: 'text-green-600',
  moderate: 'text-yellow-600',
  heavy: 'text-orange-500',
  critical: 'text-red-500',
};

const CONGESTION_BAR: Record<CongestionLevel, string> = {
  free_flow: 'bg-green-500',
  moderate: 'bg-yellow-500',
  heavy: 'bg-orange-500',
  critical: 'bg-red-500',
};

const CONGESTION_WIDTH: Record<CongestionLevel, string> = {
  free_flow: 'w-[20%]',
  moderate: 'w-[50%]',
  heavy: 'w-[75%]',
  critical: 'w-full',
};

// ── Component ─────────────────────────────────────────────────────────────────

interface CrowdVisionPanelProps {
  /**
   * Full RTSP URL of the camera stream.
   * Frames are captured server-side via GET /api/v1/ml/dev/snapshot?stream_url=...
   * This avoids CORS/HLS browser restrictions on canvas.drawImage().
   */
  rtspUrl: string;
  /**
   * Person count from YOLO (ML inference service).
   * When provided it overrides the CSRNet density count in the UI — YOLO's
   * discrete detection is more accurate than CSRNet integration on sparse scenes.
   */
  yoloPersonCount?: number;
  /** The camera's actual zone name from the database (displayed in the density tab). */
  zoneName?: string;
  /** Sensor zone index passed to the forecast model (0–206) */
  zoneIndex?: number;
  /** Seconds between frame captures. Default: 8 */
  captureIntervalSeconds?: number;
  /** Forecast horizon in minutes: 15, 30 or 60. Default: 30 */
  forecastHorizon?: 15 | 30 | 60;
}

const CrowdVisionPanel = ({
  rtspUrl,
  yoloPersonCount,
  zoneName,
  zoneIndex = 0,
  captureIntervalSeconds = 8,
  forecastHorizon: initialHorizon = 30,
}: CrowdVisionPanelProps) => {
  const [density, setDensity] = useState<DensityResult | null>(null);
  const [anomaly, setAnomaly] = useState<AnomalyResult | null>(null);
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [forecastHorizon, setForecastHorizon] = useState<15 | 30 | 60>(initialHorizon);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [cvError, setCvError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [frameCount, setFrameCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'density' | 'anomaly'>('density');

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

  // ── Frame analysis ──────────────────────────────────────────────────────────

  const runAnalysis = useCallback(async () => {
    if (!isMountedRef.current || !rtspUrl) return;

    // Capture a JPEG frame server-side (bypasses CORS/HLS restrictions)
    const blob = await captureFrameFromBackend(rtspUrl);
    if (!blob) {
      if (isMountedRef.current) {
        setCvError('Frame not ready — stream may still be buffering or RTSP unavailable');
      }
      return;
    }

    setIsAnalyzing(true);
    setCvError(null);

    try {
      // Run density + anomaly in parallel, forecast separately (no image needed)
      const [densityResult, anomalyResult] = await Promise.all([
        estimateDensity(blob),
        detectAnomaly(blob),
      ]);

      if (isMountedRef.current) {
        setDensity(densityResult);
        setAnomaly(anomalyResult);
        setLastUpdated(new Date());
        setFrameCount((c) => c + 1);
      }
    } catch (err: unknown) {
      if (isMountedRef.current) {
        const msg = err instanceof Error ? err.message : String(err);
        setCvError(msg.includes('Failed to fetch')
          ? 'CrowdVision API offline — start service on :8002'
          : msg);
      }
    } finally {
      if (isMountedRef.current) setIsAnalyzing(false);
    }
  }, [rtspUrl]);

  // ── Polling loop ────────────────────────────────────────────────────────────

  useEffect(() => {
    isMountedRef.current = true;

    // Initial analysis after a short delay to let the video start
    const firstRun = setTimeout(() => { void runAnalysis(); }, 2000);

    intervalRef.current = setInterval(() => {
      void runAnalysis();
    }, captureIntervalSeconds * 1000);

    return () => {
      isMountedRef.current = false;
      clearTimeout(firstRun);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [runAnalysis, captureIntervalSeconds]);

  // ── Forecast polling (independent — no image needed) ───────────────────────

  useEffect(() => {
    let active = true;

    const loadForecast = async () => {
      try {
        const result = await predictForecast(zoneIndex, forecastHorizon);
        if (active) setForecast(result);
      } catch {
        // Silently suppress forecast errors — density/anomaly take priority
      }
    };

    void loadForecast();
    const timer = setInterval(() => { void loadForecast(); }, 60_000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [zoneIndex, forecastHorizon]);

  // ── Render ──────────────────────────────────────────────────────────────────

  const overallRisk: RiskLevel = (() => {
    // Prefer YOLO count (discrete detection) over CSRNet when available
    const displayCount = yoloPersonCount ?? (density ? Math.round(density.count) : 0);
    if (displayCount > 60 || (anomaly?.is_anomalous && (anomaly.anomaly_score ?? 0) > 0.7)) return 'critical';
    if (displayCount > 40 || (anomaly?.is_anomalous)) return 'high';
    if (displayCount > 20) return 'medium';
    return 'low';
  })();

  return (
    <div className="flex flex-col gap-3 h-full">

      {/* ── Header bar ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-primary/60">
            CrowdVision ML
          </span>
          {isAnalyzing && (
            <span className="flex items-center gap-1 text-xs text-primary/50">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse" />
              analyzing…
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-[10px] text-primary/40">
              #{frameCount} · {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          {/* Overall risk pill */}
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${RISK_BG[overallRisk]}`}>
            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${RISK_DOT[overallRisk]}`} />
            {overallRisk}
          </span>
        </div>
      </div>

      {/* ── Error banner ── */}
      {cvError && (
        <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
          ⚠ {cvError}
        </div>
      )}

      {/* ── Tab switcher ── */}
      <div className="flex rounded-lg overflow-hidden border border-border text-xs font-semibold shrink-0">
        {(['density', 'anomaly'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 capitalize transition-colors ${activeTab === tab
              ? 'bg-primary text-background'
              : 'text-primary/60 hover:text-primary hover:bg-primary/5'
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 min-h-0 overflow-y-auto">

        {/* DENSITY TAB */}
        {activeTab === 'density' && (
          <div className="space-y-3">
            {/* Count summary */}
            <div className="border border-border rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-primary/50">
                  {yoloPersonCount !== undefined ? 'Detected (YOLO)' : 'Total Count'}
                </p>
                <p className="text-3xl font-extrabold text-primary leading-none mt-0.5">
                  {yoloPersonCount !== undefined
                    ? yoloPersonCount
                    : density ? density.count.toFixed(0) : '—'}
                </p>
                <p className="text-[10px] text-primary/40 mt-0.5">
                  {yoloPersonCount !== undefined
                    ? `density est. ${density ? Math.round(density.count) : '—'}`
                    : density?.simulated ? 'simulated' : 'AdaptiveCSRNet'}
                </p>
              </div>
              {density && (
                <div className={`px-3 py-1.5 rounded-lg border text-sm font-bold ${RISK_BG[overallRisk]}`}>
                  {overallRisk.toUpperCase()}
                </div>
              )}
            </div>

            {/* Density heatmap image */}
            {density?.density_map_b64 ? (
              <div className="border border-border rounded-xl overflow-hidden">
                <p className="text-[10px] uppercase tracking-wider text-primary/50 px-3 pt-2 pb-1">
                  Density Map
                </p>
                <img
                  src={`data:image/png;base64,${density.density_map_b64}`}
                  alt="Density heatmap"
                  className="w-full object-contain"
                />
              </div>
            ) : (
              <div className="border border-border rounded-xl p-6 flex items-center justify-center">
                <p className="text-xs text-primary/30">
                  {isAnalyzing ? 'Generating density map…' : 'Awaiting first frame capture…'}
                </p>
              </div>
            )}

            {/* Spatial frame regions — derived from CSRNet's image grid */}
            {density && density.zones.length > 0 && (() => {
              // Parse zone_R_C into human-readable spatial labels
              const COLS = ['Left', 'Center', 'Right'];
              const ROWS = ['Top', 'Bottom'];
              const label = (id: string) => {
                const m = id.match(/zone_(\d+)_(\d+)/);
                if (!m) return id;
                const row = parseInt(m[1], 10);
                const col = parseInt(m[2], 10);
                return `${ROWS[row] ?? `Row ${row + 1}`} ${COLS[col] ?? `Col ${col + 1}`}`;
              };
              return (
                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-3 pt-2 pb-1">
                    <p className="text-[10px] uppercase tracking-wider text-primary/50">Frame Regions</p>
                    {zoneName && (
                      <span className="text-[10px] font-semibold text-primary/40">
                        📍 {zoneName}
                      </span>
                    )}
                  </div>
                  <div className="divide-y divide-border">
                    {density.zones.map((z) => (
                      <div key={z.zone_id} className="flex items-center justify-between px-3 py-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${RISK_DOT[z.risk_level]}`} />
                          <span className="text-xs text-primary/70">{label(z.zone_id)}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-semibold text-primary">
                            {z.count.toFixed(1)} ppl
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${RISK_BG[z.risk_level]}`}>
                            {z.risk_level}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ANOMALY TAB */}
        {activeTab === 'anomaly' && (
          <div className="space-y-3">
            {/* Score summary */}
            <div className={`border rounded-xl p-4 ${anomaly?.is_anomalous
              ? 'border-red-500/50 bg-red-500/5'
              : 'border-green-500/40 bg-green-500/5'
              }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-primary/50">
                    Anomaly Score
                  </p>
                  <p className="text-3xl font-extrabold text-primary leading-none mt-0.5">
                    {anomaly ? `${(anomaly.anomaly_score * 100).toFixed(1)}%` : '—'}
                  </p>
                  <p className="text-[10px] text-primary/40 mt-0.5">
                    ConvAE{anomaly?.simulated ? ' · simulated ⚠' : ''}
                  </p>
                </div>
                <div className="text-4xl">
                  {anomaly
                    ? (anomaly.is_anomalous ? '🔴' : '🟢')
                    : '⚫'}
                </div>
              </div>
              {anomaly && (
                <p className={`mt-3 text-sm font-semibold ${anomaly.is_anomalous ? 'text-red-500' : 'text-green-600'
                  }`}>
                  {anomaly.description}
                </p>
              )}
            </div>

            {/* Score bar */}
            {anomaly && (
              <div className="border border-border rounded-xl p-3">
                <div className="flex justify-between text-[10px] text-primary/50 mb-1">
                  <span>Normal</span>
                  <span>Threshold</span>
                  <span>Anomalous</span>
                </div>
                <div className="relative h-3 bg-primary/10 rounded-full overflow-hidden">
                  <div
                    className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${anomaly.is_anomalous ? 'bg-red-500' : 'bg-green-500'
                      }`}
                    style={{ width: `${anomaly.anomaly_score * 100}%` }}
                  />
                  {/* Threshold marker at 50% */}
                  <div className="absolute left-1/2 top-0 h-full w-0.5 bg-primary/30" />
                </div>
                <p className="text-[10px] text-primary/40 mt-2">
                  Confidence: {(anomaly.confidence * 100).toFixed(1)}%
                </p>
              </div>
            )}

            {/* Anomaly heatmap */}
            {anomaly?.heatmap_b64 ? (
              <div className="border border-border rounded-xl overflow-hidden">
                <p className="text-[10px] uppercase tracking-wider text-primary/50 px-3 pt-2 pb-1">
                  Anomaly Heatmap
                </p>
                <img
                  src={`data:image/png;base64,${anomaly.heatmap_b64}`}
                  alt="Anomaly heatmap"
                  className="w-full object-contain"
                />
              </div>
            ) : (
              <div className="border border-border rounded-xl p-6 flex items-center justify-center">
                <p className="text-xs text-primary/30">
                  {isAnalyzing ? 'Running anomaly detection…' : 'Awaiting first frame capture…'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* FORECAST TAB */}

      </div>

      <div className="shrink-0 border-t border-border pt-2 flex items-center justify-between text-[10px] text-primary/40">
        <span>Via backend snapshot every {captureIntervalSeconds}s</span>
        <button
          onClick={() => { void runAnalysis(); }}
          disabled={isAnalyzing}
          className="px-2 py-0.5 rounded border border-primary/20 text-primary/50 hover:text-primary hover:border-primary/40 transition-colors disabled:opacity-40"
        >
          {isAnalyzing ? 'analyzing…' : '↺ refresh now'}
        </button>
      </div>
    </div>
  );
};

export default CrowdVisionPanel;
