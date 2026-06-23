import { useEffect, useState, useCallback } from 'react';
import CameraFeed from '../components/CameraFeed';
import CrowdDashboardWidget from '../components/CrowdDashboardWidget';
import type { Camera } from '../services/api';
import { getZone } from '../services/api';
import { useCameraStore } from '../store/cameras';
import { useZoneStore } from '../store/zones';
import { useAuthStore } from '../store/auth';
import { Loader, AlertTriangle } from 'lucide-react';
import { CreateEscalationModal } from '../components/CreateEscalationModal';
import {
  estimateDensity,
  detectAnomaly,
  captureFrameFromBackend,
  maxRiskLevel,
  type CameraMLResult,
} from '../services/crowdvision';

/** Seconds between ML analysis passes across all cameras */
const ML_INTERVAL_SEC = 12;
/** Max cameras to analyse in the grid */
const MAX_CAMERAS = 4;

const CameraGridDashboard = () => {
  const { user } = useAuthStore();
  const { cameras, isLoading, fetchCameras } = useCameraStore();
  const { zones, guards, fetchZones, fetchGuards } = useZoneStore();
  const [showCreateEscalation, setShowCreateEscalation] = useState(false);
  const [selectedZoneUuid, setSelectedZoneUuid] = useState<string | null>(null);
  const [selectedCameraUuid, setSelectedCameraUuid] = useState<string | null>(null);
  const [cameraZoneMap, setCameraZoneMap] = useState<Record<string, { zoneUuid: string; zoneName: string }>>({});
  const canCreateEscalation = user?.role === 'admin';

  // ── ML state ────────────────────────────────────────────────────────────────
  const [mlResults, setMlResults] = useState<CameraMLResult[]>([]);
  const [mlLoading, setMlLoading] = useState(false);
  const [mlError, setMlError] = useState<string | null>(null);
  const [mlLastUpdated, setMlLastUpdated] = useState<Date | null>(null);


  // ── Zone helpers ─────────────────────────────────────────────────────────────

  const getCameraZoneUuid = (camera: Camera) => {
    if (typeof camera.zone_uuid === 'string' && camera.zone_uuid.length > 0) return camera.zone_uuid;
    if (typeof camera.zone_id === 'string' && camera.zone_id.length > 0) return camera.zone_id;
    return cameraZoneMap[camera.uuid]?.zoneUuid ?? null;
  };

  const getCameraZoneName = (camera: Camera) => {
    const uuid = getCameraZoneUuid(camera);
    if (uuid) {
      const zone = zones.find((z) => z.uuid === uuid);
      if (zone?.name) return zone.name;
    }
    return cameraZoneMap[camera.uuid]?.zoneName ?? null;
  };

  const resolveCameraZoneUuid = async (camera: Camera) => {
    const existing = getCameraZoneUuid(camera);
    if (existing) return existing;
    if (zones.length === 0) return null;
    try {
      for (const zone of zones) {
        const detail = await getZone(zone.uuid);
        const hasCamera = (detail.data.cameras || []).some((c) => String(c.uuid) === camera.uuid);
        if (hasCamera) return zone.uuid;
      }
    } catch {
      // ignore
    }
    return null;
  };

  // ── Data fetching ────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchCameras();
    fetchZones();
    fetchGuards();
  }, []);

  useEffect(() => {
    const loadCameraZoneMap = async () => {
      if (zones.length === 0) { setCameraZoneMap({}); return; }
      try {
        const details = await Promise.all(zones.map((zone) => getZone(zone.uuid)));
        const nextMap: Record<string, { zoneUuid: string; zoneName: string }> = {};
        for (const detail of details) {
          const zoneData = detail.data;
          for (const cam of zoneData.cameras || []) {
            nextMap[String(cam.uuid)] = { zoneUuid: String(zoneData.uuid), zoneName: zoneData.name };
          }
        }
        setCameraZoneMap(nextMap);
      } catch {
        // ignore
      }
    };
    loadCameraZoneMap();
  }, [zones]);

  // ── ML analysis loop ─────────────────────────────────────────────────────────

  const runAnalysis = useCallback(async () => {
    const activeCameras = cameras.slice(0, MAX_CAMERAS);
    if (activeCameras.length === 0) return;

    setMlLoading(true);
    setMlError(null);

    const settled = await Promise.allSettled(
      activeCameras.map(async (camera) => {
        // Use the MediaMTX Docker-internal RTSP URL — camera.rtsp_url points to
        // the raw RPi address which is unreachable from inside the Docker network.
        const streamPath = camera.stream_path.replace(/^\/+/, '');
        const rtspUrl = `rtsp://mediamtx:8554/${streamPath}`;
        const blob = await captureFrameFromBackend(rtspUrl);
        if (!blob) throw new Error(`Frame not ready for ${camera.name} — stream may still be buffering`);

        const [density, anomaly] = await Promise.all([
          estimateDensity(blob),
          detectAnomaly(blob),
        ]);

        const zoneInfo = cameraZoneMap[camera.uuid];
        const result: CameraMLResult = {
          cameraUuid: camera.uuid,
          cameraName: camera.name,
          cameraLocation: camera.location,
          zoneName: zoneInfo?.zoneName ?? getCameraZoneName(camera),
          zoneUuid: zoneInfo?.zoneUuid ?? null,
          density_count: density.count,
          risk_level: maxRiskLevel(density.zones),
          anomaly_score: anomaly.anomaly_score,
          is_anomalous: anomaly.is_anomalous,
          density_map_b64: density.density_map_b64,
          last_updated: new Date(),
        };
        return result;
      })
    );

    const successes: CameraMLResult[] = [];
    let firstError: string | null = null;

    for (const r of settled) {
      if (r.status === 'fulfilled') {
        successes.push(r.value);
      } else {
        const msg = (r.reason as Error)?.message ?? String(r.reason);
        if (!firstError) firstError = msg;
      }
    }

    if (successes.length > 0) {
      setMlResults(successes);
      setMlLastUpdated(new Date());
      setMlError(null);
    } else if (firstError) {
      // All cameras failed
      const isOffline = firstError.includes('fetch') || firstError.includes('offline');
      setMlError(isOffline
        ? 'CrowdVision API offline — start service on :8002'
        : firstError);
    }

    setMlLoading(false);
  }, [cameras, cameraZoneMap]);

  // Start analysis after a short delay (let HLS buffers fill), then repeat
  useEffect(() => {
    const first = setTimeout(() => { void runAnalysis(); }, 4000);
    const interval = setInterval(() => { void runAnalysis(); }, ML_INTERVAL_SEC * 1000);
    return () => { clearTimeout(first); clearInterval(interval); };
  }, [runAnalysis]);

  // ── Render ───────────────────────────────────────────────────────────────────

  // Camera names for skeleton placeholders in the widget
  const gridCameraNames = cameras.slice(0, MAX_CAMERAS).map((c) => c.name);

  return (
    <div className="h-[85vh] bg-background p-6 overflow-hidden flex flex-col gap-4">

      {/* Camera Grid */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader className="animate-spin mx-auto mb-2 text-primary" size={32} />
              <p className="text-gray-400">Loading cameras...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 grid-rows-2 gap-4 h-full">
            {Array.from({ length: MAX_CAMERAS }).map((_, i) => {
              const camera = cameras[i];
              return camera ? (
                <div key={camera.uuid} className="bg-card rounded-lg border-2 border-primary overflow-hidden flex flex-col min-h-0">
                  <div className="flex-1 min-h-0">
                    <CameraFeed
                      webrtcUrl={camera.webrtc_url ?? `http://localhost:8889/${camera.stream_path}`}
                      streamUrl={camera.hls_url ?? `http://localhost:8888/${camera.stream_path}/index.m3u8`}
                      cameraName={camera.name}
                    />
                  </div>
                  <div className="px-3 py-2 shrink-0 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-semibold text-primary">{camera.name}</p>
                      <p className="text-xs text-gray-400">📍 {camera.location}</p>
                      <p className="text-xs text-gray-400">Zone: {getCameraZoneName(camera) ?? 'Unassigned'}</p>
                    </div>
                    {canCreateEscalation && (
                      <button
                        onClick={async () => {
                          const resolvedZoneUuid = await resolveCameraZoneUuid(camera);
                          setSelectedZoneUuid(resolvedZoneUuid);
                          setSelectedCameraUuid(camera.uuid);
                          setShowCreateEscalation(true);
                        }}
                        className="flex items-center gap-1.5 text-xs font-bold bg-red-500/10 text-red-500 px-3 py-1.5 rounded hover:bg-red-500 hover:text-white transition-colors border border-red-500/40"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        ESCALATE
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div key={`empty-${i}`} className="bg-card rounded-lg border-2 border-primary border-dashed flex items-center justify-center min-h-0">
                  <div className="text-center">
                    <div className="text-3xl mb-2 opacity-30">📷</div>
                    <p className="text-xs text-gray-500">No camera</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CrowdVision Live Analysis Widget */}
      {/* <div className="shrink-0">
        <CrowdDashboardWidget
          results={mlResults}
          loading={mlLoading}
          error={mlError}
          lastUpdated={mlLastUpdated}
          onRefresh={() => { void runAnalysis(); }}
          cameraNames={gridCameraNames}
        />
      </div> */}

      {/* Escalation Modal */}
      {showCreateEscalation && (
        <CreateEscalationModal
          isOpen={showCreateEscalation}
          onClose={() => {
            setShowCreateEscalation(false);
            setSelectedZoneUuid(null);
            setSelectedCameraUuid(null);
          }}
          zones={zones.map(z => ({ uuid: z.uuid, name: z.name }))}
          securityPersonnel={guards.map(g => ({ uuid: g.uuid || g.id || '', email: g.email, name: g.name ?? undefined }))}
          preselectedZoneUuid={selectedZoneUuid ?? undefined}
          preselectedCameraUuid={selectedCameraUuid ?? undefined}
          lockZoneSelection={Boolean(selectedZoneUuid)}
        />
      )}
    </div>
  );
};

export default CameraGridDashboard;
