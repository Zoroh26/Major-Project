/**
 * CrowdVision ML API — frontend service
 *
 * Wraps the four endpoints exposed by crowdvision_api/demo_api.py:
 *   POST /api/v1/density/estimate
 *   POST /api/v1/forecast/predict
 *   POST /api/v1/anomaly/detect
 *   GET  /api/v1/dashboard/status
 *
 * Base URL is read from VITE_CV_API_URL (default: http://localhost:8001).
 */

const CV_BASE = (import.meta.env.VITE_CV_API_URL as string | undefined)?.replace(/\/$/, '')
  ?? 'http://localhost:8002';

// ── Types ────────────────────────────────────────────────────────────────────

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type CongestionLevel = 'free_flow' | 'moderate' | 'heavy' | 'critical';

export interface CvDensityZone {
  zone_id: string;
  count: number;
  risk_level: RiskLevel;
}

export interface DensityResult {
  count: number;
  /** Base64-encoded PNG — use as: `data:image/png;base64,${density_map_b64}` */
  density_map_b64: string;
  zones: CvDensityZone[];
  simulated: boolean;
}

export interface ForecastStep {
  time_step_min: number;
  speed_mph: number;
  congestion_level: CongestionLevel;
}

export interface ForecastResult {
  zone_id: number;
  horizon_minutes: number;
  predictions: ForecastStep[];
  trend: 'increasing' | 'decreasing' | 'stable';
  simulated: boolean;
}

export interface AnomalyResult {
  /** 0–1 anomaly score */
  anomaly_score: number;
  is_anomalous: boolean;
  confidence: number;
  /** Base64-encoded PNG */
  heatmap_b64: string;
  description: string;
  simulated: boolean;
}

export interface DashboardZone {
  zone_id: string;
  density_count: number;
  avg_speed_mph: number;
  anomaly_score: number;
  risk_level: RiskLevel;
  congestion: 'free_flow' | 'moderate' | 'heavy';
}

export interface DashboardStatus {
  timestamp: string;
  total_zones: number;
  zones: DashboardZone[];
  alerts: DashboardZone[];
  models_active: {
    density: string;
    forecasting: string;
    anomaly: string;
  };
}

/**
 * Real per-camera ML result computed from an actual captured video frame.
 * Zone name and UUID come from the app's zone store, not the ML API.
 */
export interface CameraMLResult {
  cameraUuid: string;
  cameraName: string;
  cameraLocation: string;
  /** Null when the camera isn't assigned to a zone */
  zoneName: string | null;
  zoneUuid: string | null;
  density_count: number;
  /** Highest risk level among density sub-zones */
  risk_level: RiskLevel;
  anomaly_score: number;
  is_anomalous: boolean;
  /** Base64 PNG density heatmap */
  density_map_b64: string;
  last_updated: Date;
}

/** Derive the highest risk level from a set of density sub-zones */
export function maxRiskLevel(zones: CvDensityZone[]): RiskLevel {
  const order: RiskLevel[] = ['low', 'medium', 'high', 'critical'];
  return zones.reduce<RiskLevel>(
    (acc, z) => (order.indexOf(z.risk_level) > order.indexOf(acc) ? z.risk_level : acc),
    'low'
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function postImage(endpoint: string, blob: Blob, filename = 'frame.jpg'): Promise<Response> {
  const form = new FormData();
  form.append('image', blob, filename);
  return fetch(`${CV_BASE}${endpoint}`, { method: 'POST', body: form });
}

// ── API functions ─────────────────────────────────────────────────────────────

/**
 * Estimate crowd density from a raw image Blob (e.g. a canvas snapshot).
 * Returns count, a base64 density heatmap, and per-zone risk breakdown.
 */
export async function estimateDensity(blob: Blob): Promise<DensityResult> {
  const res = await postImage('/api/v1/density/estimate', blob);
  if (!res.ok) throw new Error(`CrowdVision density error ${res.status}`);
  return res.json() as Promise<DensityResult>;
}

/**
 * Detect anomalies in an image frame.
 * Note: model is currently simulated — `result.simulated` will be `true`.
 */
export async function detectAnomaly(blob: Blob): Promise<AnomalyResult> {
  const res = await postImage('/api/v1/anomaly/detect', blob);
  if (!res.ok) throw new Error(`CrowdVision anomaly error ${res.status}`);
  return res.json() as Promise<AnomalyResult>;
}

/**
 * Predict congestion for a given sensor zone index (0–206) over a horizon.
 */
export async function predictForecast(
  zoneId: number,
  horizonMinutes: 15 | 30 | 60 = 30,
): Promise<ForecastResult> {
  const res = await fetch(`${CV_BASE}/api/v1/forecast/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ zone_id: zoneId, horizon_minutes: horizonMinutes }),
  });
  if (!res.ok) throw new Error(`CrowdVision forecast error ${res.status}`);
  return res.json() as Promise<ForecastResult>;
}

/**
 * Fetch aggregated dashboard status for all zones.
 */
export async function getDashboardStatus(): Promise<DashboardStatus> {
  const res = await fetch(`${CV_BASE}/api/v1/dashboard/status`);
  if (!res.ok) throw new Error(`CrowdVision dashboard error ${res.status}`);
  return res.json() as Promise<DashboardStatus>;
}

// ── Frame capture ─────────────────────────────────────────────────────────────

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '')
  ?? 'http://localhost:8000';

/**
 * Capture a JPEG frame from an RTSP stream **server-side** via the FastAPI backend.
 *
 * This is the preferred method because it bypasses browser CORS restrictions
 * on canvas.drawImage() from HLS/WebRTC video elements.
 *
 * The backend calls cv2.VideoCapture(rtspUrl), reads one frame, and returns JPEG bytes.
 * Returns null when the stream is unavailable or the backend is unreachable.
 */
export async function captureFrameFromBackend(rtspUrl: string): Promise<Blob | null> {
  try {
    const url = `${API_BASE}/api/v1/ml/dev/snapshot?stream_url=${encodeURIComponent(rtspUrl)}&quality=80`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.blob();
  } catch {
    return null;
  }
}


/**
 * Capture a JPEG blob from a <video> or <canvas> element.
 * Returns null if the element has no painted frame yet (width/height = 0).
 */
export function captureFrameBlob(
  source: HTMLVideoElement | HTMLCanvasElement,
  quality = 0.8,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    let width: number;
    let height: number;

    if (source instanceof HTMLVideoElement) {
      width = source.videoWidth;
      height = source.videoHeight;
    } else {
      width = source.width;
      height = source.height;
    }

    if (!width || !height) {
      resolve(null);
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d')!.drawImage(source, 0, 0, width, height);
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
  });
}
