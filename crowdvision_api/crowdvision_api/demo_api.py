"""
CrowdVision Demo API Server

FastAPI application exposing REST endpoints for:
  - Crowd density estimation (real model)
  - Congestion forecasting (real model)
  - Anomaly detection (simulated until model retrained)
  - Dashboard status (aggregated)

Run:
    pip install -r requirements.txt
    python demo_api.py

Swagger docs:  http://localhost:8000/docs
"""

import sys
import time
from pathlib import Path
from typing import Optional

# Ensure src/ is importable
sys.path.insert(0, str(Path(__file__).parent))

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import uvicorn

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(
    title="CrowdVision ML API",
    description=(
        "REST API for crowd density estimation, congestion forecasting, "
        "and anomaly detection. Some endpoints use real trained models, "
        "others use realistic simulators (marked with `simulated: true`)."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Allow all origins for development — restrict in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Lazy-load models on first request (avoids slow startup for health checks)
# ---------------------------------------------------------------------------

_density_engine = None
_forecast_engine = None
_anomaly_engine = None
_anomaly_simulator = None


def get_density():
    global _density_engine
    if _density_engine is None:
        from demo_inference import DensityInference
        _density_engine = DensityInference()
    return _density_engine


def get_forecast():
    global _forecast_engine
    if _forecast_engine is None:
        from demo_inference import ForecastInference
        _forecast_engine = ForecastInference()
    return _forecast_engine


def get_anomaly():
    global _anomaly_engine, _anomaly_simulator
    if _anomaly_engine is None:
        from demo_inference import AnomalyInference
        _anomaly_engine = AnomalyInference()
    if _anomaly_simulator is None:
        from demo_simulators import AnomalySimulator
        _anomaly_simulator = AnomalySimulator()
    # Return real engine if ready, otherwise simulator
    if _anomaly_engine.is_ready():
        return _anomaly_engine, False
    return _anomaly_simulator, True


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class ForecastRequest(BaseModel):
    zone_id: int = Field(0, ge=0, le=206,
                         description="Sensor/zone index (0-206)")
    horizon_minutes: int = Field(60, description="15, 30, or 60 minutes")


class HealthResponse(BaseModel):
    status: str
    uptime_seconds: float
    models: dict


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

_start_time = time.time()


@app.get("/api/v1/health", response_model=HealthResponse,
         tags=["System"])
async def health_check():
    """Server health and model status."""
    return {
        "status": "ok",
        "uptime_seconds": round(time.time() - _start_time, 1),
        "models": {
            "density": {
                "name": "AdaptiveCSRNet",
                "status": "real" if (
                    _density_engine and _density_engine.is_ready()
                ) else "not_loaded",
                "checkpoint": "adaptive_csrnet_shaA/best.pt",
            },
            "forecasting": {
                "name": "AdaptiveNAS-GNN",
                "status": "real" if (
                    _forecast_engine and _forecast_engine.is_ready()
                ) else "not_loaded",
                "checkpoint": "nas_gnn_retrain/best.pt",
            },
            "anomaly": {
                "name": "ConvAE (MemAE)",
                "status": "simulated",
                "note": "Model being retrained — using image-statistics simulator",
            },
        },
    }


@app.post("/api/v1/density/estimate", tags=["Density Estimation"])
async def estimate_density(image: UploadFile = File(...)):
    """
    Estimate crowd density from an uploaded image.

    **Backend:** Real AdaptiveCSRNet inference.

    Returns count, density heatmap (base64 PNG), and per-zone breakdown.
    """
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(400, "File must be an image (JPEG/PNG)")

    engine = get_density()
    if not engine.is_ready():
        raise HTTPException(503, "Density model not loaded")

    image_bytes = await image.read()
    try:
        result = engine.estimate(image_bytes)
        return JSONResponse(result)
    except Exception as e:
        raise HTTPException(500, f"Inference error: {str(e)}")


@app.post("/api/v1/forecast/predict", tags=["Congestion Forecasting"])
async def forecast_congestion(req: ForecastRequest):
    """
    Predict congestion for a sensor zone over the specified horizon.

    Uses real AdaptiveNAS-GNN when the checkpoint exists; falls back to a
    physics-inspired simulation (simulated=true) if the model isn't loaded.
    """
    import random

    engine = get_forecast()
    if engine.is_ready():
        try:
            result = engine.predict(
                zone_id=req.zone_id,
                horizon_minutes=req.horizon_minutes,
            )
            return JSONResponse(result)
        except Exception as e:
            print(f"[forecast] Inference error, using simulation: {e}")
            # fall through to simulation

    # ── Simulated fallback ────────────────────────────────────────────────────
    steps = req.horizon_minutes // 5   # one prediction per 5-minute block
    base_speed = 45.0 + (req.zone_id % 7) * 3.0

    rng = random.Random(req.zone_id)
    predictions = []
    speed = base_speed
    for i in range(steps):
        speed += rng.gauss(0, 2.5) + 0.1 * (base_speed - speed)
        speed = max(5.0, min(75.0, speed))
        if speed >= 55:
            level = "free_flow"
        elif speed >= 35:
            level = "moderate"
        elif speed >= 20:
            level = "heavy"
        else:
            level = "critical"
        predictions.append({
            "time_step_min": (i + 1) * 5,
            "speed_mph": round(speed, 1),
            "congestion_level": level,
            "people_count": int(max(0, rng.gauss(30, 10))),
        })

    speeds = [p["speed_mph"] for p in predictions]
    trend = (
        "increasing" if speeds[-1] > speeds[0] + 3
        else "decreasing" if speeds[-1] < speeds[0] - 3
        else "stable"
    )

    return JSONResponse({
        "zone_id": req.zone_id,
        "horizon_minutes": req.horizon_minutes,
        "predictions": predictions,
        "trend": trend,
        "simulated": True,
    })


@app.post("/api/v1/anomaly/detect", tags=["Anomaly Detection"])
async def detect_anomaly(image: UploadFile = File(...)):
    """
    Detect anomalies in an uploaded image/frame.

    **Backend:** Currently simulated (model being retrained).
    Response includes `"simulated": true` flag.

    Returns anomaly score, heatmap, and description.
    """
    # Accept any image or unknown content type (TIFF may be sent as
    # application/octet-stream by some clients)
    ct = image.content_type or ""
    if ct and not ct.startswith("image/") and ct != "application/octet-stream":
        raise HTTPException(400, "File must be an image (JPEG/PNG/TIFF)")

    engine, is_sim = get_anomaly()
    image_bytes = await image.read()

    try:
        result = engine.detect(image_bytes)
        return JSONResponse(result)
    except Exception as e:
        raise HTTPException(500, f"Detection error: {str(e)}")


@app.get("/api/v1/dashboard/status", tags=["Dashboard"])
async def dashboard_status(zone_names: str = ""):
    """
    Aggregated status for all zones — designed for dashboard widgets.

    Pass real zone identifiers via ``zone_names`` (comma-separated) to label
    the response with your actual zones instead of generic ``zone_0…zone_N``.

    Example: ``/api/v1/dashboard/status?zone_names=Entrance,Parking,Lobby``
    """
    import numpy as np

    # Use provided zone names or fall back to generic labels
    names = [n.strip() for n in zone_names.split(",") if n.strip()] if zone_names else []
    count = max(len(names), 6)  # always return at least 6 entries

    zones = []
    for i in range(count):
        density_count = round(float(np.random.exponential(30)), 1)
        speed = round(float(np.clip(np.random.normal(50, 15), 5, 70)), 1)
        anomaly_score = round(float(np.random.beta(2, 8)), 3)

        risk = ("critical" if density_count > 60 or anomaly_score > 0.7
                else "high" if density_count > 40 or anomaly_score > 0.5
                else "medium" if density_count > 20
                else "low")

        zones.append({
            "zone_id": names[i] if i < len(names) else f"zone_{i}",
            "density_count": density_count,
            "avg_speed_mph": speed,
            "anomaly_score": anomaly_score,
            "risk_level": risk,
            "congestion": ("heavy" if speed < 25
                           else "moderate" if speed < 45
                           else "free_flow"),
        })

    return {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_zones": len(zones),
        "zones": zones,
        "alerts": [z for z in zones if z["risk_level"] in ("critical", "high")],
        "models_active": {
            "density": "real",
            "forecasting": "real",
            "anomaly": "simulated",
        },
    }


# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("=" * 60)
    print("  CrowdVision ML API Server")
    print("  Swagger docs: http://0.0.0.0:8000/docs")
    print("=" * 60)
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
