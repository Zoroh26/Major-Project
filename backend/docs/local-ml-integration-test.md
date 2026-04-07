# Local ML Integration Test Runbook (Backend + Frontend)

This runbook is for testing the integrated pipeline in `backend/src/app/ml` with FastAPI routes and frontend rendering.

This is **not** the standalone `ml_preview.py` flow.
for ml_preview run 'py -m pip install opencv-python numpy ultralytics'

## What This Test Covers

1. Backend ML service starts from `/api/v1/ml/dev/start`.
2. YOLO inference runs on local webcam through backend ML modules.
3. FastAPI serves live ML payload via REST and WebSocket.
4. Frontend `SecurityDashboard` shows:
   - Webcam preview
   - Live heatmap
   - Live metrics (`person_count`, `average_confidence`, `max_confidence`, `processing_time_ms`, `inference_fps`)

## Prerequisites

- Node.js installed
- Docker Desktop running
- Python available through `py`
- Webcam available and not locked by another app

## Terminal 1: Start Database

From repo root:

```powershell
cd C:\Users\Asus\OneDrive\Desktop\Reva_Uni\Major-Project
docker compose up -d db
```

## Terminal 2: Run Backend Locally (Webcam Access)

Run backend on host, not inside container, so webcam can be accessed by OpenCV.

```powershell
cd C:\Users\Asus\OneDrive\Desktop\Reva_Uni\Major-Project\backend
Copy-Item .env .\src\.env -Force
$env:ENVIRONMENT="local"
$env:POSTGRES_SERVER="localhost"
py -m pip install -e .
py -m uvicorn src.app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Terminal 3: Run Frontend

```powershell
cd C:\Users\Asus\OneDrive\Desktop\Reva_Uni\Major-Project\frontend
npm install
npm run dev
```

## Terminal 4: Trigger ML Session (Direct Webcam)

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/v1/ml/dev/start -ContentType application/json -Body '{"source_mode":"direct_webcam","interval_seconds":2.5,"confidence_threshold":0.25}'
```

Check status:

```powershell
Invoke-RestMethod -Method Get -Uri http://localhost:8000/api/v1/ml/dev/status
```

Check latest payload:

```powershell
Invoke-RestMethod -Method Get -Uri http://localhost:8000/api/v1/ml/dev/latest | ConvertTo-Json -Depth 8
```

## Frontend Validation

1. Open `http://localhost:5173`
2. Login
3. Open `/security`
4. Confirm all are visible and updating:
   - webcam preview panel
   - heatmap panel
   - metrics cards

## Stop Session

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/v1/ml/dev/stop
```

## Optional: MediaMTX Mode

Only use this if you want stream input instead of direct webcam.

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/v1/ml/dev/start -ContentType application/json -Body '{"source_mode":"mediamtx","stream_url":"rtsp://localhost:8554/your_path","interval_seconds":2.5,"confidence_threshold":0.25}'
```

## Troubleshooting

### `ModuleNotFoundError: cv2`

```powershell
py -m pip install opencv-python ultralytics numpy
```

### Webcam not opening

- Close Zoom/Meet/Teams/OBS.
- Retry by changing source config device if needed later.
- Ensure backend is running locally (host), not in Docker web container.

### `/api/v1/ml/dev/*` returns 404

- Ensure backend is started with `ENVIRONMENT=local`.

### Frontend not updating

- Verify `/api/v1/ml/dev/latest` returns non-null `latest`.
- Refresh frontend and reopen `/security`.

## Exit Criteria

Test is successful when:

1. `status` endpoint shows `running: true` while session is active.
2. `latest` endpoint returns changing timestamps and metrics.
3. Security dashboard shows live webcam preview, live heatmap, and live specs.
