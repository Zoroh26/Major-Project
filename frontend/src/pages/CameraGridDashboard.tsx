import { useEffect, useState } from 'react';
import CameraFeed from '../components/CameraFeed';
import type { Camera } from '../services/api';
import { getZone } from '../services/api';
import { useCameraStore } from '../store/cameras';
import { useZoneStore } from '../store/zones';
import { useAuthStore } from '../store/auth';
import { Loader, AlertTriangle } from 'lucide-react';
import { CreateEscalationModal } from '../components/CreateEscalationModal';

const CameraGridDashboard = () => {
  const { user } = useAuthStore();
  const { cameras, isLoading, fetchCameras } = useCameraStore();
  const { zones, guards, fetchZones, fetchGuards } = useZoneStore();
  const [showCreateEscalation, setShowCreateEscalation] = useState(false);
  const [selectedZoneUuid, setSelectedZoneUuid] = useState<string | null>(null);
  const [cameraZoneMap, setCameraZoneMap] = useState<Record<string, { zoneUuid: string; zoneName: string }>>({});
  const canCreateEscalation = user?.role === 'admin';

  const getCameraZoneUuid = (camera: Camera) => {
    if (typeof camera.zone_uuid === "string" && camera.zone_uuid.length > 0) return camera.zone_uuid;
    if (typeof camera.zone_id === "string" && camera.zone_id.length > 0) return camera.zone_id;
    const mapped = cameraZoneMap[camera.uuid];
    if (mapped?.zoneUuid) return mapped.zoneUuid;
    return null;
  };

  const getCameraZoneName = (camera: Camera) => {
    const directZoneUuid = getCameraZoneUuid(camera);
    if (directZoneUuid) {
      const zone = zones.find((z) => z.uuid === directZoneUuid);
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
        const hasCamera = (detail.data.cameras || []).some((zCamera) => String(zCamera.uuid) === camera.uuid);
        if (hasCamera) {
          return zone.uuid;
        }
      }
    } catch (error) {
      console.error('Failed to resolve camera zone for escalation:', error);
    }

    return null;
  };

  useEffect(() => {
    fetchCameras();
    fetchZones();
    fetchGuards();
  }, []);

  useEffect(() => {
    const loadCameraZoneMap = async () => {
      if (zones.length === 0) {
        setCameraZoneMap({});
        return;
      }

      try {
        const details = await Promise.all(zones.map((zone) => getZone(zone.uuid)));
        const nextMap: Record<string, { zoneUuid: string; zoneName: string }> = {};

        for (const detail of details) {
          const zoneData = detail.data;
          for (const camera of zoneData.cameras || []) {
            nextMap[String(camera.uuid)] = {
              zoneUuid: String(zoneData.uuid),
              zoneName: zoneData.name,
            };
          }
        }

        setCameraZoneMap(nextMap);
      } catch (error) {
        console.error('Failed to map cameras to zones:', error);
      }
    };

    loadCameraZoneMap();
  }, [zones]);

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
            {Array.from({ length: 4 }).map((_, i) => {
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

      {/* Escalation Modal */}
      {showCreateEscalation && (
        <CreateEscalationModal
          isOpen={showCreateEscalation}
          onClose={() => {
            setShowCreateEscalation(false);
            setSelectedZoneUuid(null);
          }}
          zones={zones.map(z => ({ uuid: z.uuid, name: z.name }))}
          securityPersonnel={guards.map(g => ({ uuid: g.uuid || g.id || '', email: g.email, name: g.name ?? undefined }))}
          preselectedZoneUuid={selectedZoneUuid ?? undefined}
          lockZoneSelection={Boolean(selectedZoneUuid)}
        />
      )}
    </div>
  );
};

export default CameraGridDashboard;
