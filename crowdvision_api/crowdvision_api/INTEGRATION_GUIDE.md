# CrowdVision ML API — Integration Guide

> **Version:** 1.0.0  
> **Date:** May 2026  
> **Contact:** ML Team

---

## Quick Start

### 1. Install Dependencies

```bash
cd crowdvision_api
pip install -r requirements.txt
```

> **Note:** Requires Python 3.10+ and a CUDA GPU for optimal performance. CPU mode works but is slower for density estimation.

### 2. Start the Server

```bash
python demo_api.py
```

Output:
```
============================================================
  CrowdVision ML API Server
  Swagger docs: http://0.0.0.0:8000/docs
============================================================
```

### 3. Open Swagger Docs

Navigate to **http://\<server-ip\>:8000/docs** for interactive API documentation with "Try it out" buttons.

---

## API Reference

### Base URL

```
http://<server-ip>:8000/api/v1
```

---

### `GET /api/v1/health`

Server health and model status.

**Response:**
```json
{
  "status": "ok",
  "uptime_seconds": 142.3,
  "models": {
    "density": { "name": "AdaptiveCSRNet", "status": "real" },
    "forecasting": { "name": "AdaptiveNAS-GNN", "status": "real" },
    "anomaly": { "name": "ConvAE", "status": "simulated" }
  }
}
```

---

### `POST /api/v1/density/estimate`

Estimate crowd density from an image.

**Backend:** ✅ Real model (AdaptiveCSRNet, trained on ShanghaiTech-A)

**Request:** `multipart/form-data`
| Field | Type | Description |
|-------|------|-------------|
| `image` | File | JPEG or PNG image |

**curl Example:**
```bash
curl -X POST http://localhost:8000/api/v1/density/estimate \
  -F "image=@sample_data/IMG_1.jpg"
```

**Response:**
```json
{
  "count": 127.3,
  "density_map_b64": "iVBORw0KGgo...",
  "zones": [
    { "zone_id": "zone_0_0", "count": 42.1, "risk_level": "high" },
    { "zone_id": "zone_0_1", "count": 15.7, "risk_level": "medium" },
    { "zone_id": "zone_0_2", "count": 8.2, "risk_level": "low" },
    { "zone_id": "zone_1_0", "count": 31.5, "risk_level": "high" },
    { "zone_id": "zone_1_1", "count": 22.4, "risk_level": "medium" },
    { "zone_id": "zone_1_2", "count": 7.4, "risk_level": "low" }
  ],
  "simulated": false
}
```

**Displaying the heatmap (JavaScript):**
```javascript
const img = document.getElementById('heatmap');
img.src = `data:image/png;base64,${response.density_map_b64}`;
```

---

### `POST /api/v1/forecast/predict`

Predict traffic congestion for a sensor zone.

**Backend:** ✅ Real model (AdaptiveNAS-GNN, trained on METR-LA, 207 sensors)

**Request:** `application/json`
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `zone_id` | int | 0 | Sensor index (0–206) |
| `horizon_minutes` | int | 60 | Forecast window: 15, 30, or 60 |

**curl Example:**
```bash
curl -X POST http://localhost:8000/api/v1/forecast/predict \
  -H "Content-Type: application/json" \
  -d '{"zone_id": 42, "horizon_minutes": 30}'
```

**Response:**
```json
{
  "zone_id": 42,
  "horizon_minutes": 30,
  "predictions": [
    { "time_step_min": 5,  "speed_mph": 52.3, "congestion_level": "free_flow" },
    { "time_step_min": 10, "speed_mph": 48.1, "congestion_level": "moderate" },
    { "time_step_min": 15, "speed_mph": 43.7, "congestion_level": "moderate" },
    { "time_step_min": 20, "speed_mph": 38.2, "congestion_level": "moderate" },
    { "time_step_min": 25, "speed_mph": 31.5, "congestion_level": "heavy" },
    { "time_step_min": 30, "speed_mph": 28.9, "congestion_level": "heavy" }
  ],
  "trend": "decreasing",
  "simulated": false
}
```

**Congestion levels:**
| Level | Speed (mph) |
|-------|------------|
| `free_flow` | ≥ 50 |
| `moderate` | 35–50 |
| `heavy` | 20–35 |
| `critical` | < 20 |

---

### `POST /api/v1/anomaly/detect`

Detect anomalies in an image frame.

**Backend:** ⚠️ Simulated (model being retrained — responses are realistic but based on image statistics, not learned patterns)

**Request:** `multipart/form-data`
| Field | Type | Description |
|-------|------|-------------|
| `image` | File | JPEG, PNG, or TIFF image |

**curl Example:**
```bash
curl -X POST http://localhost:8000/api/v1/anomaly/detect \
  -F "image=@sample_data/anomaly_test.tif"
```

**Response:**
```json
{
  "anomaly_score": 0.3421,
  "is_anomalous": false,
  "confidence": 0.3158,
  "heatmap_b64": "iVBORw0KGgo...",
  "description": "Normal scene — no anomalies detected",
  "simulated": true
}
```

> **Note:** The `simulated: true` flag indicates this endpoint uses a simulator. When the real ConvAE model finishes retraining, this flag will automatically become `false` with no API changes needed.

---

### `GET /api/v1/dashboard/status`

Aggregated zone status for dashboard widgets.

**curl Example:**
```bash
curl http://localhost:8000/api/v1/dashboard/status
```

**Response:**
```json
{
  "timestamp": "2026-05-07T17:30:00Z",
  "total_zones": 6,
  "zones": [
    {
      "zone_id": "zone_0",
      "density_count": 35.2,
      "avg_speed_mph": 42.1,
      "anomaly_score": 0.12,
      "risk_level": "medium",
      "congestion": "moderate"
    }
  ],
  "alerts": [],
  "models_active": {
    "density": "real",
    "forecasting": "real",
    "anomaly": "simulated"
  }
}
```

---

## Frontend Integration

### React / JavaScript Example

```javascript
// Density estimation
async function estimateDensity(imageFile) {
  const formData = new FormData();
  formData.append('image', imageFile);

  const res = await fetch('/api/v1/density/estimate', {
    method: 'POST',
    body: formData,
  });
  return res.json();
}

// Forecasting
async function getForecast(zoneId, horizon) {
  const res = await fetch('/api/v1/forecast/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ zone_id: zoneId, horizon_minutes: horizon }),
  });
  return res.json();
}

// Anomaly detection
async function detectAnomaly(imageFile) {
  const formData = new FormData();
  formData.append('image', imageFile);

  const res = await fetch('/api/v1/anomaly/detect', {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();

  // Show simulator badge if needed
  if (data.simulated) {
    showBadge('Using simulated model');
  }
  return data;
}
```

### Displaying Base64 Heatmaps

All heatmap fields (`density_map_b64`, `heatmap_b64`) are base64-encoded PNG images. To display:

```html
<img id="heatmap" />
<script>
  const data = await estimateDensity(file);
  document.getElementById('heatmap').src =
    `data:image/png;base64,${data.density_map_b64}`;
</script>
```

---

## Architecture Overview

```
┌──────────────┐     ┌───────────────────┐     ┌─────────────────┐
│   Frontend   │────▶│   FastAPI Server   │────▶│  Real Models    │
│  (React/Vue) │     │   demo_api.py      │     │  (PyTorch)      │
└──────────────┘     │                    │     ├─────────────────┤
                     │  /density/estimate │────▶│ AdaptiveCSRNet  │ ✅ Real
                     │  /forecast/predict │────▶│ AdaptiveNAS-GNN │ ✅ Real
                     │  /anomaly/detect   │────▶│ Simulator       │ ⚠️ Temporary
                     │  /dashboard/status │────▶│ Aggregated      │
                     └───────────────────┘     └─────────────────┘
```

### Swapping Real Models In

When the ConvAE anomaly model finishes retraining:

1. Copy the new `best.pt` to `checkpoints/convae_ped2/`
2. In `demo_inference.py`, uncomment `self._load()` in `AnomalyInference.__init__`
3. Restart the server

The API response format stays **exactly the same** — only `"simulated"` changes from `true` to `false`.

---

## Deployment Options

### Option A: Direct (Development)

```bash
python demo_api.py
# Server runs on http://0.0.0.0:8000
```

### Option B: Systemd Service (Production)

```ini
# /etc/systemd/system/crowdvision-api.service
[Unit]
Description=CrowdVision ML API
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/path/to/crowdvision_api
ExecStart=/usr/bin/python3 demo_api.py
Restart=always
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable crowdvision-api
sudo systemctl start crowdvision-api
```

### Option C: Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name api.crowdvision.example.com;

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## File Structure

```
crowdvision_api/
├── INTEGRATION_GUIDE.md      ← You are here
├── requirements.txt           ← Python dependencies
├── demo_api.py                ← FastAPI server (start here)
├── demo_inference.py          ← Real model inference wrappers
├── demo_simulators.py         ← Simulator for anomaly endpoint
├── src/                       ← ML source code
│   ├── models/                ← Model architectures (PyTorch)
│   ├── evaluation/            ← Metrics code
│   └── data_loaders/          ← Dataset utilities
├── checkpoints/               ← Trained model weights
│   ├── adaptive_csrnet_shaA/best.pt  (107 MB)
│   ├── nas_gnn_retrain/best.pt       (1.9 MB)
│   └── convae_ped2/best.pt           (9.8 MB)
└── sample_data/               ← Test images for demo
    ├── IMG_1.jpg
    └── anomaly_test.tif
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `ModuleNotFoundError: No module named 'src'` | Run from inside `crowdvision_api/` directory |
| CUDA out of memory | Set `CUDA_VISIBLE_DEVICES=""` to use CPU mode |
| Density returns very low counts | Input images should be crowd scenes, not close-ups |
| Forecast returns same values | This is expected — input is synthetic; real sensor feed will vary |
| `503 Model not loaded` | Check that checkpoint files exist in `checkpoints/` |
