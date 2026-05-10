import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Camera, MapPin, Timer } from 'lucide-react';
import { toast } from 'react-toastify';
import CameraFeed from '../components/CameraFeed';
// HeatMap import removed — YOLO heatmap section is commented out
import CrowdVisionPanel from '../components/CrowdVisionPanel';
import {
  createMlDevStream,
  getCamera,
  getZone,
  getMlDevLatest,
  startMlDevSession,
  stopMlDevSession,
  type Camera as CameraType,
  type MlResultPayload,
} from '../services/api';

const ZoneCameraMonitor = () => {
  const navigate = useNavigate();
  const { cameraId } = useParams<{ cameraId: string }>();

  const [camera, setCamera] = useState<CameraType | null>(null);
  const [cameraZoneName, setCameraZoneName] = useState<string | null>(null);
  const [latestPayload, setLatestPayload] = useState<MlResultPayload | null>(null);
  const [isLoadingCamera, setIsLoadingCamera] = useState(true);
  const [mlStatus, setMlStatus] = useState<'idle' | 'starting' | 'running' | 'error' | 'stopped'>('idle');
  const [mlError, setMlError] = useState<string | null>(null);
  const [activeStreamUrl, setActiveStreamUrl] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  const buildStreamCandidates = (cam: CameraType): string[] => {
    const path = cam.stream_path.replace(/^\/+/, '');
    const envBase = (import.meta.env.VITE_ML_RTSP_BASE as string | undefined)?.trim();

    const baseUrls = [
      envBase,
      'rtsp://mediamtx:8554',
      'rtsp://host.docker.internal:8554',
      'rtsp://localhost:8554',
    ].filter(Boolean) as string[];

    const unique = new Set<string>();
    for (const base of baseUrls) {
      unique.add(`${base.replace(/\/$/, '')}/${path}`);
    }
    unique.add(cam.rtsp_url);

    return Array.from(unique);
  };

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const closeMlSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  const connectMlSocket = (selectedCameraUuid: string) => {
    closeMlSocket();

    const ws = createMlDevStream(
      (payload) => {
        if (payload.camera_uuid !== selectedCameraUuid) {
          return;
        }
        setLatestPayload(payload);
        setMlStatus('running');
      },
      () => {
        setMlStatus('error');
        setMlError('ML stream websocket error');
      }
    );

    ws.onopen = () => {
      setMlStatus('running');
      setMlError(null);
    };

    ws.onclose = () => {
      setMlStatus((prev) => (prev === 'stopped' ? prev : 'idle'));
    };

    wsRef.current = ws;
  };

  useEffect(() => {
    if (!cameraId) {
      navigate('/zones', { replace: true });
      return;
    }

    const loadCamera = async () => {
      setIsLoadingCamera(true);
      try {
        const response = await getCamera(cameraId);
        const cam = response.data;
        setCamera(cam);

        // Fetch zone name for display in the CrowdVision panel
        const zoneUuid = cam.zone_uuid ?? cam.zone_id;
        if (zoneUuid) {
          try {
            const zoneRes = await getZone(zoneUuid);
            setCameraZoneName(zoneRes.data.name);
          } catch {
            // Non-fatal — panel will just omit the zone label
          }
        }
      } catch {
        toast.error('Failed to load selected camera');
        navigate('/zones', { replace: true });
      } finally {
        setIsLoadingCamera(false);
      }
    };

    loadCamera();
  }, [cameraId, navigate]);

  useEffect(() => {
    if (!camera) {
      return;
    }

    let isDisposed = false;

    const runSession = async () => {
      setMlStatus('starting');
      setMlError(null);
      setActiveStreamUrl(null);

      try {
        const streamCandidates = buildStreamCandidates(camera);
        let selectedStreamUrl: string | null = null;
        let lastError = 'Failed to start ML session';

        for (const streamUrl of streamCandidates) {
          if (isDisposed) {
            return;
          }

          await stopMlDevSession().catch(() => {
            // Ignore if no previous session is running.
          });

          await startMlDevSession({
            source_mode: 'mediamtx',
            stream_url: streamUrl,
            camera_uuid: camera.uuid,
            confidence_threshold: 0.25,
            interval_seconds: 1.0,
          });
          let candidateError: string | null = null;

          for (let attempt = 0; attempt < 7; attempt += 1) {
            await delay(900);
            const latestResponse = await getMlDevLatest();
            const latest = latestResponse.data.latest;
            const error = latestResponse.data.error;

            if (latest && latest.camera_uuid === camera.uuid && !error) {
              selectedStreamUrl = streamUrl;
              setLatestPayload(latest);
              break;
            }

            if (error) {
              candidateError = error;
              break;
            }
          }

          if (selectedStreamUrl) {
            break;
          }

          if (candidateError) {
            lastError = candidateError;
          }
        }

        if (!selectedStreamUrl) {
          throw new Error(lastError);
        }

        if (!isDisposed) {
          setActiveStreamUrl(selectedStreamUrl);
          connectMlSocket(camera.uuid);
        }
      } catch (error: any) {
        if (!isDisposed) {
          setMlStatus('error');
          setMlError(error?.response?.data?.detail || error?.message || 'Failed to start ML session');
        }
      }
    };

    runSession();

    return () => {
      isDisposed = true;
      closeMlSocket();
      setMlStatus('stopped');
      stopMlDevSession().catch(() => {
        // Ignore cleanup errors while navigating away.
      });
    };
  }, [camera]);

  if (isLoadingCamera) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-primary text-3xl mb-2">⏳</div>
          <p className="text-primary/70">Loading camera monitor...</p>
        </div>
      </div>
    );
  }

  if (!camera) {
    return null;
  }

  const displayTime = latestPayload?.timestamp
    ? new Date(latestPayload.timestamp).toLocaleTimeString()
    : '--:--:--';
  const displayPersons = latestPayload?.metrics.person_count ?? '--';
  const displayAvgConf = latestPayload
    ? latestPayload.metrics.average_confidence.toFixed(3)
    : '--';
  const displayMaxConf = latestPayload
    ? latestPayload.metrics.max_confidence.toFixed(3)
    : '--';
  const displayInference = latestPayload
    ? `${latestPayload.metrics.processing_time_ms.toFixed(1)} ms`
    : '--';
  const displayFps = latestPayload
    ? latestPayload.metrics.inference_fps.toFixed(1)
    : '--';

  // Derive a numeric zone index from the camera's stream path (best effort).
  // Falls back to 0 if not parseable.
  const derivedZoneIndex = (() => {
    const match = camera.stream_path.match(/\d+/);
    const n = match ? parseInt(match[0], 10) : 0;
    return Math.min(n, 206);
  })();

  return (
    <div className="h-full overflow-y-auto">
      <div className="rounded-3xl border border-border bg-card p-4">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4 items-start">

          {/* ── Sidebar ── */}
          <aside className="border border-border rounded-2xl p-4 flex flex-col justify-between min-h-[220px] lg:min-h-[740px]">
            <div>
              <button
                onClick={() => navigate('/zones')}
                className="mb-4 inline-flex items-center gap-2 text-sm text-primary/70 hover:text-primary"
              >
                <ArrowLeft size={16} />
                Back to Zones
              </button>

              <p className="text-xs uppercase tracking-wider text-primary/60">Camera Node</p>
              <p className="text-3xl font-extrabold text-primary mt-2">{camera.name}</p>
            </div>

            <div className="text-sm text-primary/70">
              <p>Mode: monitor</p>
              <p>YOLO: {mlStatus}</p>
            </div>
          </aside>

          {/* ── Main content ── */}
          <section className="min-w-0 space-y-4">

            {/* Row 1 — Camera info + Live feed (no detection) */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-4">

              {/* Camera details */}
              <div className="border border-border rounded-2xl p-4 min-w-0 overflow-hidden">
                <p className="text-sm font-semibold text-primary mb-3">Cam details:</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="border border-border rounded-lg p-2">
                    <p className="text-primary/60">Location</p>
                    <p className="text-primary mt-1 flex items-center gap-1"><MapPin size={12} /> {camera.location}</p>
                  </div>
                  <div className="border border-border rounded-lg p-2">
                    <p className="text-primary/60">ML Session</p>
                    <p className="text-primary mt-1">{mlStatus.toUpperCase()}</p>
                  </div>
                  <div className="border border-border rounded-lg p-2 col-span-2">
                    <p className="text-primary/60">Stream Path</p>
                    <p className="font-mono text-primary mt-1 break-all">{camera.stream_path}</p>
                  </div>
                  <div className="border border-border rounded-lg p-2 col-span-2">
                    <p className="text-primary/60">ML Source URL</p>
                    <p className="font-mono text-primary mt-1 break-all">{activeStreamUrl ?? 'starting...'}</p>
                  </div>
                  {mlError ? (
                    <div className="border border-red-400/40 rounded-lg p-2 col-span-2 text-red-400">
                      {mlError}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Live feed — no detection overlay */}
              <div className="border border-border rounded-2xl p-4 min-w-0 overflow-hidden">
                <h2 className="text-sm font-bold uppercase tracking-wide text-primary/70 mb-3">Live feed</h2>
                <div className="h-[240px] rounded-lg overflow-hidden bg-black border border-border">
                  <CameraFeed
                    webrtcUrl={camera.webrtc_url ?? `http://${window.location.hostname}:8889/${camera.stream_path}`}
                    streamUrl={camera.hls_url ?? `http://${window.location.hostname}:8888/${camera.stream_path}/index.m3u8`}
                    cameraName={camera.name}
                  />
                </div>
              </div>
            </div>

            {/* Row 2 — YOLO preview + CrowdVision panel */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.45fr_1fr] gap-4">

              {/* YOLO preview with hotspot overlay */}
              <div className="border border-border rounded-2xl p-4 min-w-0 overflow-hidden">
                <h2 className="text-sm font-bold uppercase tracking-wide text-primary/70 mb-3">
                  YOLO preview + heatmap overlay
                </h2>

                <div className="relative h-[58vh] min-h-[420px] max-h-[680px] rounded-lg overflow-hidden bg-black border border-border mb-3">
                  {/* Display feed — WebRTC for lowest latency */}
                  <CameraFeed
                    webrtcUrl={camera.webrtc_url ?? `http://${window.location.hostname}:8889/${camera.stream_path}`}
                    streamUrl={camera.hls_url ?? `http://${window.location.hostname}:8888/${camera.stream_path}/index.m3u8`}
                    cameraName={camera.name}
                  />

                  {/* Crowd hotspot radial gradient overlay */}
                  {latestPayload?.hotspot.intensity ? (
                    <div
                      className="absolute pointer-events-none"
                      style={{
                        left: `${latestPayload.hotspot.x * 100}%`,
                        top: `${latestPayload.hotspot.y * 100}%`,
                        width: '220px',
                        height: '220px',
                        transform: 'translate(-50%, -50%)',
                        background:
                          'radial-gradient(circle, rgba(255,0,0,0.55) 0%, rgba(255,128,0,0.35) 30%, rgba(255,255,0,0.2) 50%, rgba(0,160,255,0.14) 70%, rgba(0,0,255,0) 82%)',
                      }}
                    />
                  ) : null}

                  {/* YOLO stats overlay */}
                  <div className="absolute left-3 top-3 bg-black/78 rounded-lg p-3 text-[13px] text-white space-y-1.5 min-w-[270px]">
                    <p>Time: {displayTime}</p>
                    <p>Model: yolov8n.pt</p>
                    <p>Conf Threshold: 0.25</p>
                    <p>Persons: {displayPersons}</p>
                    <p>Avg Confidence: {displayAvgConf}</p>
                    <p>Max Confidence: {displayMaxConf}</p>
                    <p>Inference: {displayInference}</p>
                    <p>FPS: {displayFps}</p>
                    <p>Heatmap: ON</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="border border-border rounded p-2 text-primary/80 flex items-center gap-2">
                    <Timer size={13} />
                    {latestPayload ? `${latestPayload.metrics.processing_time_ms.toFixed(1)} ms` : '--'}
                  </div>
                  <div className="border border-border rounded p-2 text-primary/80 flex items-center gap-2">
                    <Camera size={13} />
                    {latestPayload ? `${latestPayload.metrics.inference_fps.toFixed(1)} fps` : '--'}
                  </div>
                </div>
              </div>

              {/* Right column — CrowdVision ML panel + YOLO heatmap */}
              <div className="flex flex-col gap-4 min-w-0">

                {/* CrowdVision ML panel */}
                <div className="border border-border rounded-2xl p-4 flex-1 min-h-0 overflow-hidden flex flex-col">
                  <CrowdVisionPanel
                    rtspUrl={activeStreamUrl ?? `rtsp://mediamtx:8554/${camera.stream_path.replace(/^\/+/, '')}`}
                    yoloPersonCount={latestPayload?.metrics.person_count}
                    zoneName={cameraZoneName ?? undefined}
                    zoneIndex={derivedZoneIndex}
                    captureIntervalSeconds={8}
                    forecastHorizon={30}
                  />
                </div>

                {/* YOLO heatmap
                <div className="border border-border rounded-2xl p-4 min-w-0 overflow-hidden">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-primary/70 mb-3">
                    YOLO heatmap
                  </h2>
                  <div className="h-[200px] rounded-lg overflow-hidden border border-border">
                    <HeatMap heatmap={latestPayload?.heatmap} />
                  </div>
                </div> */}
              </div>
            </div>

          </section>
        </div>
      </div>
    </div>
  );
};

export default ZoneCameraMonitor;
