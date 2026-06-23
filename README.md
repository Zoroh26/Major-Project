# CrowdVision — Real-Time Crowd Surveillance & Incident Management Platform

> An end-to-end, production-grade system for monitoring crowd density, detecting anomalies, forecasting traffic congestion, and managing security escalations — powered by FastAPI, YOLOv8, and three purpose-trained ML models.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Repository Structure](#3-repository-structure)
4. [Technology Stack](#4-technology-stack)
5. [Services & Ports](#5-services--ports)
6. [Prerequisites](#6-prerequisites)
7. [Quick Start (Docker Compose)](#7-quick-start-docker-compose)
8. [Environment Variables](#8-environment-variables)
9. [Backend API Reference](#9-backend-api-reference)
   - [Authentication](#91-authentication)
   - [Users](#92-users)
   - [Cameras](#93-cameras)
   - [Zones](#94-zones)
   - [Escalations](#95-escalations)
   - [Alerts (WebSocket)](#96-alerts-websocket)
   - [ML Dev (Local-only)](#97-ml-dev-local-only)
10. [CrowdVision ML API Reference](#10-crowdvision-ml-api-reference)
    - [Density Estimation](#101-density-estimation)
    - [Traffic Forecasting](#102-traffic-forecasting)
    - [Anomaly Detection](#103-anomaly-detection)
    - [Dashboard Status](#104-dashboard-status)
11. [Role-Based Access Control](#11-role-based-access-control)
12. [Database Schema](#12-database-schema)
13. [ML Pipeline](#13-ml-pipeline)
14. [Stream Ingestion (MediaMTX)](#14-stream-ingestion-mediamtx)
15. [Admin Panel](#15-admin-panel)
16. [Database Migrations](#16-database-migrations)
17. [Development Workflow](#17-development-workflow)
18. [Testing](#18-testing)
19. [Deployment](#19-deployment)
20. [Troubleshooting](#20-troubleshooting)

---

## 1. Project Overview

CrowdVision is a full-stack surveillance platform designed for large venues, public events, and campus security operations. It ingests live RTSP camera feeds, runs real-time person-detection and crowd analytics, and provides a structured incident escalation workflow for security teams.

### Core Capabilities

| Capability | Implementation |
|---|---|
| Live RTSP stream ingestion | MediaMTX (FFmpeg-based relay) |
| Real-time person detection | YOLOv8n (Ultralytics) via OpenCV |
| Crowd density estimation | AdaptiveCSRNet (trained on ShanghaiTech-A) |
| Traffic congestion forecasting | AdaptiveNAS-GNN (trained on METR-LA, 207 sensors) |
| Incident management | Structured escalation lifecycle (PENDING → RESOLVED) |
| Real-time guard alerts | WebSocket push per zone |
| Admin panel | CRUDAdmin at `/admin` |

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT TIER                             │
│  React/TypeScript Frontend  │  Admin Panel (/admin)             │
└────────────┬────────────────────────────┬───────────────────────┘
             │ HTTP / WebSocket           │ HTTP
             ▼                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API TIER                                │
│         FastAPI (Backend) — port 8000                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  /api/v1/                                                │   │
│  │  ├── auth       (login, logout, refresh)                 │   │
│  │  ├── users      (CRUD, role management)                  │   │
│  │  ├── cameras    (RTSP registration → MediaMTX)           │   │
│  │  ├── zones      (camera/guard assignment)                │   │
│  │  ├── escalations (lifecycle + stats)                     │   │
│  │  ├── alerts     (WebSocket broadcast per zone)           │   │
│  │  └── /dev/*     (ML session control — LOCAL only)        │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────┬─────────────────────┬───────────────────────────────────-┘
       │                     │
       ▼                     ▼
┌─────────────┐    ┌──────────────────────────┐
│  PostgreSQL │    │  MediaMTX (RTSP server)  │
│  (port 5432)│    │  port 8554 / 8888 / 8889 │
└─────────────┘    └──────────┬───────────────┘
                              │ RTSP pull
                              ▼
                   ┌────────────────────────┐
                   │  IP Camera / RTSP Feed │
                   └────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      ML SERVICES TIER                           │
│                                                                 │
│  CrowdVision API (port 8002)                                    │
│  ├── AdaptiveCSRNet  → /api/v1/density/estimate                 │
│  ├── AdaptiveNAS-GNN → /api/v1/forecast/predict                 │
│  └── Aggregator      → /api/v1/dashboard/status                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Repository Structure

```
Major-Project/
├── docker-compose.yml          ← Orchestrates all services
├── README.md
│
├── backend/                    ← FastAPI application
│   ├── Dockerfile              ← Multi-stage uv build
│   ├── pyproject.toml          ← Dependencies + ruff + mypy
│   ├── mediamtx.yml            ← MediaMTX path configuration
│   ├── default.conf            ← Nginx configuration (optional proxy)
│   ├── yolov8n.pt              ← YOLOv8 nano weights (bundled)
│   ├── ml_preview.py           ← Standalone ML preview script
│   ├── run_rtsp_preview.py     ← RTSP debug utility
│   ├── .env                    ← Environment variables (never commit secrets)
│   └── src/
│       ├── app/
│       │   ├── main.py         ← FastAPI entry point + lifespan
│       │   ├── admin/          ← CRUDAdmin interface setup
│       │   ├── api/
│       │   │   ├── dependencies.py
│       │   │   └── v1/
│       │   │       ├── login.py
│       │   │       ├── logout.py
│       │   │       ├── users.py
│       │   │       ├── cameras.py
│       │   │       ├── zones.py
│       │   │       ├── escalations.py
│       │   │       ├── alerts.py
│       │   │       ├── health.py
│       │   │       └── ml_dev.py      ← Local-only ML control
│       │   ├── core/
│       │   │   ├── config.py          ← Pydantic settings hierarchy
│       │   │   ├── db/                ← SQLAlchemy async session
│       │   │   ├── security.py        ← JWT + bcrypt + token blacklist
│       │   │   ├── setup.py           ← App factory + lifespan
│       │   │   ├── exceptions/
│       │   │   ├── utils/
│       │   │   └── worker/            ← ARQ background worker
│       │   ├── crud/                  ← FastCRUD wrappers
│       │   ├── middleware/
│       │   │   └── client_cache_middleware.py
│       │   ├── ml/
│       │   │   ├── inference.py       ← YoloPersonDetector (Ultralytics)
│       │   │   ├── service.py         ← MLInferenceService (async task)
│       │   │   ├── source.py          ← OpenCVFrameSource
│       │   │   ├── postprocess.py     ← Heatmap grid builder
│       │   │   └── models/
│       │   ├── models/
│       │   │   ├── user.py
│       │   │   ├── camera.py
│       │   │   ├── zone.py
│       │   │   └── escalation.py
│       │   └── schemas/
│       └── migrations/                ← Alembic versioned migrations
│
├── crowdvision_api/            ← Standalone ML microservice
│   └── crowdvision_api/
│       ├── Dockerfile
│       ├── INTEGRATION_GUIDE.md
│       ├── requirements.txt
│       ├── demo_api.py         ← FastAPI server for ML endpoints
│       ├── demo_inference.py   ← Real model inference wrappers
│       ├── demo_simulators.py  ← Anomaly simulator (pending retraining)
│       ├── checkpoints/        ← Trained model weights
│       │   ├── adaptive_csrnet_shaA/best.pt   (107 MB)
│       │   ├── nas_gnn_retrain/best.pt         (1.9 MB)
│       │   └── convae_ped2/best.pt             (9.8 MB)
│       ├── src/
│       │   ├── models/         ← PyTorch model architectures
│       │   ├── evaluation/     ← Metrics code
│       │   └── data_loaders/   ← Dataset utilities
│       └── sample_data/        ← Test images for demos
│
└── frontend/                   ← React + TypeScript (Vite)
    ├── Dockerfile
    ├── src/
    └── package.json
```

---

## 4. Technology Stack

### Backend (`/backend`)

| Layer | Technology |
|---|---|
| Web Framework | FastAPI ≥ 0.109 (async) |
| Python Version | 3.11 |
| Package Manager | `uv` (Astral) |
| ORM | SQLAlchemy 2.0 (async) + asyncpg |
| Database | PostgreSQL 13 |
| Migrations | Alembic |
| Auth | JWT (python-jose) + bcrypt |
| Background Jobs | ARQ (Redis-backed) |
| Caching | Redis |
| CRUD Layer | FastCRUD + CRUDAdmin |
| ML Inference | Ultralytics YOLOv8 + OpenCV |
| HTTP Client | HTTPX (async) |
| Linting | Ruff |
| Type Checking | mypy |

### CrowdVision ML API (`/crowdvision_api`)

| Component | Technology |
|---|---|
| Framework | FastAPI |
| Density Model | AdaptiveCSRNet (PyTorch, ShanghaiTech-A) |
| Forecasting Model | AdaptiveNAS-GNN (PyTorch, METR-LA) |
| Runtime | Python 3.10+ |
| GPU Support | CUDA (optional, CPU fallback) |

### Frontend (`/frontend`)

| Component | Technology |
|---|---|
| Framework | React + TypeScript |
| Build Tool | Vite |
| Dev Server | Port 5173 |

### Infrastructure

| Component | Technology |
|---|---|
| Container Orchestration | Docker Compose |
| Stream Server | MediaMTX (FFmpeg-based) |
| Database Admin | pgAdmin 4 |
| Network | Custom bridge `10.200.0.0/16` |

---

## 5. Services & Ports

| Service | Host Port | Description |
|---|---|---|
| `web` (FastAPI backend) | **8000** | Main REST API |
| `db` (PostgreSQL) | **5432** | Primary database |
| `pgadmin` | **5050** | Database admin UI |
| `mediamtx` | **8554** (RTSP) | Stream server TCP/UDP |
| `mediamtx` | **8888** | HLS streaming |
| `mediamtx` | **8889** | WebRTC streaming |
| `mediamtx` | **9997** | MediaMTX REST API |
| `crowdvision` | **8002** | ML inference microservice |
| `frontend` | **5173** (dev) | React dev server (not in compose by default) |
| Admin Panel | **8000/admin** | CRUDAdmin UI (mounted on backend) |

---

## 6. Prerequisites

- **Docker Desktop** ≥ 24 with Compose v2
- **Git**
- (Optional) Python 3.11 + `uv` for local development without Docker

**Hardware:**
- Minimum: 4 GB RAM, 4-core CPU
- Recommended for ML: NVIDIA GPU with CUDA support (CPU fallback available)
- CrowdVision model weights total ≈ 120 MB — download separately if not bundled

---

## 7. Quick Start (Docker Compose)

### 1. Clone the repository

```bash
git clone <repo-url>
cd Major-Project
```

### 2. Configure environment

```bash
cp backend/.env.example backend/.env   # if .env.example exists; otherwise edit backend/.env directly
```

Mandatory fields to change before first run:

```env
POSTGRES_PASSWORD=<strong-password>
SECRET_KEY=<output-of: openssl rand -hex 32>
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=<strong-password>
PGADMIN_DEFAULT_PASSWORD=<pgadmin-password>
```

> **Security Warning:** The `.env` file contains credentials. Never commit it to source control. The `.gitignore` already excludes it, but verify this before pushing.

### 3. Start all services

```bash
docker compose up --build -d
```

### 4. Run database migrations

```bash
docker compose exec web alembic upgrade head
```

### 5. Verify services

| URL | Expected |
|---|---|
| http://localhost:8000/docs | FastAPI Swagger UI |
| http://localhost:8000/api/v1/health | `{"status": "ok"}` |
| http://localhost:8000/admin | CRUDAdmin login |
| http://localhost:8002/docs | CrowdVision ML Swagger UI |
| http://localhost:8002/api/v1/health | ML model status |
| http://localhost:5050 | pgAdmin 4 |

### 6. (Optional) Enable the frontend in Docker Compose

Uncomment the `frontend` service block in `docker-compose.yml`:

```yaml
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:80"
    depends_on:
      - web
```

Or run the frontend dev server directly:

```bash
cd frontend
npm install
npm run dev   # Available at http://localhost:5173
```

---

## 8. Environment Variables

All variables are set in `backend/.env`. They are consumed via Pydantic settings in `backend/src/app/core/config.py`.

### Application

| Variable | Default | Description |
|---|---|---|
| `APP_NAME` | `Major_Project` | Application name shown in API docs |
| `APP_VERSION` | `0.1` | Semantic version |
| `ENVIRONMENT` | `local` | `local` \| `staging` \| `production` |

### Database

| Variable | Default | Description |
|---|---|---|
| `POSTGRES_USER` | `postgres` | PostgreSQL username |
| `POSTGRES_PASSWORD` | — | **Required.** PostgreSQL password |
| `POSTGRES_SERVER` | `db` | Hostname (use `db` for Compose, `localhost` for local dev) |
| `POSTGRES_PORT` | `5432` | PostgreSQL port |
| `POSTGRES_DB` | `MajorProject` | Database name |

### Authentication & Security

| Variable | Default | Description |
|---|---|---|
| `SECRET_KEY` | — | **Required.** 32-byte hex key for JWT signing |
| `ALGORITHM` | `HS256` | JWT signing algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | Access token lifetime |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | Refresh token lifetime (stored as httpOnly cookie) |

### Bootstrap Admin

| Variable | Default | Description |
|---|---|---|
| `ADMIN_NAME` | `Admin User` | Display name of the bootstrap admin |
| `ADMIN_EMAIL` | `admin@example.com` | Bootstrap admin email |
| `ADMIN_PASSWORD` | `admin_secure_password` | **Change immediately after first login** |

### Redis

| Variable | Default | Description |
|---|---|---|
| `REDIS_CACHE_HOST` | `redis` | Redis hostname for API response cache |
| `REDIS_CACHE_PORT` | `6379` | Redis port |
| `REDIS_QUEUE_HOST` | `redis` | Redis hostname for ARQ background job queue |

### CRUDAdmin Panel

| Variable | Default | Description |
|---|---|---|
| `CRUD_ADMIN_ENABLED` | `true` | Enable/disable admin panel |
| `CRUD_ADMIN_MOUNT_PATH` | `/admin` | URL path for admin panel |
| `CRUD_ADMIN_MAX_SESSIONS` | `10` | Max concurrent admin sessions |
| `CRUD_ADMIN_SESSION_TIMEOUT` | `1440` | Session timeout in minutes |

### ML Integration

| Variable | Description |
|---|---|
| `HUGGINGFACE_REPO_ID` | HuggingFace repo for model downloads |
| `HUGGINGFACE_TOKEN` | HF API token for private repos |
| `OPENAI_API_KEY` | OpenAI API key for LLM-assisted anomaly scoring |
| `ANOMALY_THRESHOLD` | Anomaly classification threshold (0.0–1.0) |
| `LOCAL_WEIGHT` | Weight of local model in anomaly ensemble |
| `OPENAI_WEIGHT` | Weight of LLM response in anomaly ensemble |
| `OPENAI_TIMEOUT_MS` | Timeout for OpenAI API calls |

---

## 9. Backend API Reference

**Base URL:** `http://localhost:8000/api/v1`

All endpoints (except login, user creation, and health) require a Bearer token:

```
Authorization: Bearer <access_token>
```

### 9.1 Authentication

#### `POST /login`

Authenticate with email and password. Returns an access token; sets a `refresh_token` httpOnly cookie.

**Request:**
```json
{
  "email": "admin@example.com",
  "password": "admin_secure_password"
}
```

**Response:**
```json
{
  "access_token": "<jwt>",
  "token_type": "bearer"
}
```

---

#### `POST /refresh`

Exchange the `refresh_token` cookie for a new access token. No request body required.

**Response:**
```json
{
  "access_token": "<new-jwt>",
  "token_type": "bearer"
}
```

---

#### `POST /logout`

Blacklists the current access token. Clears the refresh cookie.

---

### 9.2 Users

| Method | Path | Description | Auth Required |
|---|---|---|---|
| `POST` | `/user` | Create a new user | No |
| `GET` | `/users` | List all users (paginated) | Yes |
| `GET` | `/user/me/` | Get current user profile | Yes |
| `GET` | `/user/{username}` | Get user by username | Yes |
| `PATCH` | `/user/{username}` | Update own profile | Yes (self only) |
| `DELETE` | `/user/{username}` | Soft-delete own account | Yes (self only) |
| `DELETE` | `/db_user/{username}` | Hard-delete user (DB) | Superuser only |

**User Roles:** `user` (admin-level) · `security` · (superuser is internal)

---

### 9.3 Cameras

Cameras are registered in the database **and** dynamically added to MediaMTX. The backend uses FFmpeg as an intermediary to handle cameras with non-standard RTSP headers.

| Method | Path | Description |
|---|---|---|
| `POST` | `/camera` | Register new camera + MediaMTX path |
| `GET` | `/cameras` | List all cameras (paginated) |
| `GET` | `/camera/{camera_uuid}` | Get camera details |
| `PATCH` | `/camera/{camera_uuid}` | Update name / location |
| `DELETE` | `/camera/{camera_uuid}` | Soft-delete + remove from MediaMTX |

**Create Camera Request:**
```json
{
  "name": "Gate A Camera",
  "location": "Main Entrance North",
  "rtsp_url": "rtsp://192.168.1.10:554/stream1"
}
```

**Create Camera Response:**
```json
{
  "uuid": "019....",
  "name": "Gate A Camera",
  "location": "Main Entrance North",
  "rtsp_url": "rtsp://192.168.1.10:554/stream1",
  "stream_path": "gate_a_camera",
  "is_active": true,
  "created_at": "2026-06-18T12:00:00Z"
}
```

**Stream URLs (after registration):**
- HLS: `http://localhost:8888/gate_a_camera/index.m3u8`
- WebRTC: `http://localhost:8889/gate_a_camera/`
- RTSP: `rtsp://localhost:8554/gate_a_camera`

> **Note:** The `stream_path` is auto-generated from the camera name (lowercase, spaces → underscores). It must be unique.

---

### 9.4 Zones

Zones represent physical surveillance areas. Multiple cameras and a single security guard can be assigned to a zone.

| Method | Path | Description |
|---|---|---|
| `POST` | `/zone` | Create a zone |
| `GET` | `/zones` | List zones (paginated) |
| `GET` | `/zone/{zone_uuid}` | Zone detail with cameras & guards |
| `PATCH` | `/zone/{zone_uuid}` | Update zone metadata |
| `DELETE` | `/zone/{zone_uuid}` | Soft-delete (unlinks cameras/guards) |
| `POST` | `/zone/{zone_uuid}/assign-camera` | Assign a camera to a zone |
| `DELETE` | `/zone/{zone_uuid}/unassign-camera/{camera_uuid}` | Remove camera from zone |
| `POST` | `/zone/{zone_uuid}/assign-guard` | Assign a security guard (role: `security`) |
| `DELETE` | `/zone/{zone_uuid}/unassign-guard/{user_uuid}` | Remove guard from zone |

> **Business Rule:** Each guard can only be assigned to one zone at a time. Reassigning automatically overrides the previous assignment.

---

### 9.5 Escalations

Escalations are structured incident reports that follow a defined lifecycle.

**Lifecycle:**
```
PENDING → ASSIGNED → IN_PROGRESS → RESOLVED
                                 → FALSE_ALARM
        → CANCELLED
```

| Method | Path | Description | Who |
|---|---|---|---|
| `POST` | `/escalations` | Create escalation | Admin only |
| `GET` | `/escalations` | List escalations (filterable) | All authenticated |
| `GET` | `/escalations/{uuid}` | Escalation detail | Admin / assigned / same zone |
| `PATCH` | `/escalations/{uuid}` | Update escalation | Admin only |
| `POST` | `/escalations/{uuid}/act` | Record action taken | Admin / assigned security |
| `POST` | `/escalations/{uuid}/resolve` | Mark as resolved | Admin / assigned security |
| `POST` | `/escalations/{uuid}/false-alarm` | Mark as false alarm | Admin / assigned security |
| `GET` | `/escalations/stats/summary` | Escalation statistics | All authenticated |

**Query Filters (GET `/escalations`):**

| Param | Type | Description |
|---|---|---|
| `zone_uuid` | UUID | Filter by zone |
| `status_filter` | string | `pending` \| `assigned` \| `in_progress` \| `resolved` \| `false_alarm` \| `cancelled` |
| `priority_filter` | string | `low` \| `medium` \| `high` \| `critical` |

**Create Escalation:**
```json
{
  "zone_uuid": "019...",
  "camera_uuid": "019...",
  "title": "Unauthorized access at Gate B",
  "description": "Individual bypassing turnstile",
  "priority": "high"
}
```

**Stats Response:**
```json
{
  "total": 42,
  "pending": 5,
  "assigned": 8,
  "in_progress": 3,
  "resolved": 22,
  "false_alarms": 4,
  "critical": 2
}
```

---

### 9.6 Alerts (WebSocket)

Real-time alert delivery to security guards via WebSocket, scoped to the guard's assigned zone.

**Connection:**
```
ws://localhost:8000/api/v1/ws?token=<access_token>
```

The user must have a `zone` assigned. The connection is automatically routed to their zone's room. On disconnect, the connection is cleaned up gracefully.

**Admin Dispatch (HTTP):**
```
POST /dispatch
```
```json
{
  "zone": "top-left",
  "message": "Suspicious activity near sector 4"
}
```

**Incoming WebSocket Message:**
```json
{
  "type": "alert",
  "zone": "top-left",
  "message": "Suspicious activity near sector 4",
  "status": "active"
}
```

---

### 9.7 ML Dev (Local-only)

These endpoints are only accessible when `ENVIRONMENT=local`. They are blocked with HTTP 404 in staging/production.

| Method | Path | Description |
|---|---|---|
| `POST` | `/dev/start` | Start a YOLOv8 inference session |
| `POST` | `/dev/stop` | Stop the current inference session |
| `GET` | `/dev/status` | Check if an ML session is running |
| `GET` | `/dev/latest` | Get the latest inference result |
| `WS` | `/dev/stream` | WebSocket stream of inference results |
| `GET` | `/dev/snapshot` | Capture a single JPEG frame from an RTSP URL |

**Start Session:**
```json
{
  "source_mode": "rtsp",
  "stream_url": "rtsp://localhost:8554/gate_a_camera",
  "model_name": "yolov8n.pt",
  "confidence_threshold": 0.5,
  "interval_seconds": 1.0,
  "heatmap_width": 10,
  "heatmap_height": 10
}
```

**Latest Result Payload:**
```json
{
  "running": true,
  "latest": {
    "camera_uuid": "019...",
    "timestamp": "2026-06-18T12:00:00Z",
    "source_mode": "rtsp",
    "metrics": {
      "person_count": 14,
      "average_confidence": 0.832,
      "max_confidence": 0.941,
      "processing_time_ms": 45.3,
      "inference_fps": 22.1,
      "alert_triggered": false
    },
    "frame": { "width": 1920, "height": 1080 },
    "heatmap": { "width": 10, "height": 10, "values": [...] },
    "hotspot": { "x": 4, "y": 3, "intensity": 0.87 }
  }
}
```

---

## 10. CrowdVision ML API Reference

**Base URL:** `http://localhost:8002/api/v1`

This is a separate, standalone FastAPI microservice for three ML models. Full interactive documentation at `http://localhost:8002/docs`.

### 10.1 Density Estimation

**`POST /density/estimate`** — Real model (AdaptiveCSRNet, ShanghaiTech-A)

```bash
curl -X POST http://localhost:8002/api/v1/density/estimate \
  -F "image=@crowd_photo.jpg"
```

**Response:**
```json
{
  "count": 127.3,
  "density_map_b64": "iVBORw0KGgo...",
  "zones": [
    { "zone_id": "zone_0_0", "count": 42.1, "risk_level": "high" },
    { "zone_id": "zone_0_1", "count": 15.7, "risk_level": "medium" }
  ],
  "simulated": false
}
```

`density_map_b64` is a base64-encoded PNG heatmap.

### 10.2 Traffic Forecasting

**`POST /forecast/predict`** — Real model (AdaptiveNAS-GNN, METR-LA, 207 sensors)

```bash
curl -X POST http://localhost:8002/api/v1/forecast/predict \
  -H "Content-Type: application/json" \
  -d '{"zone_id": 42, "horizon_minutes": 30}'
```

**Congestion Levels:**

| Level | Speed (mph) |
|---|---|
| `free_flow` | ≥ 50 |
| `moderate` | 35–50 |
| `heavy` | 20–35 |
| `critical` | < 20 |

### 10.3 Dashboard Status

**`GET /dashboard/status`** — Aggregated zone status for dashboard widgets.

Returns per-zone density counts, average speeds, anomaly scores, risk levels, and active model statuses.

---

## 11. Role-Based Access Control

| Role | Description | Permissions |
|---|---|---|
| `user` | Admin-level operator | Full access: create/manage escalations, assign cameras/guards, view all data |
| `security` | Field security guard | View escalations in own zone, act on assigned escalations, resolve/false-alarm |
| Superuser | System-level | Hard-delete users (internal use; set via `get_current_superuser` dependency) |

> Roles are stored on the `User` model and validated per-endpoint via the `get_current_user` FastAPI dependency.

---

## 12. Database Schema

### `user`
| Column | Type | Notes |
|---|---|---|
| `uuid` | UUID (PK) | UUIDv7 |
| `email` | VARCHAR(50) | Unique, indexed |
| `hashed_password` | VARCHAR | bcrypt hash |
| `role` | VARCHAR(50) | `user` \| `security` |
| `name` | VARCHAR(100) | Display name |
| `rank` | VARCHAR(50) | Optional security rank |
| `zone_id` | UUID (FK) | → `zone.uuid`, nullable |
| `created_at` | TIMESTAMPTZ | Auto-set |
| `is_deleted` | BOOLEAN | Soft-delete flag |

### `camera`
| Column | Type | Notes |
|---|---|---|
| `uuid` | UUID (PK) | UUIDv7 |
| `name` | VARCHAR | Unique among active cameras |
| `location` | VARCHAR | Free-text location |
| `rtsp_url` | VARCHAR | Source RTSP URL |
| `stream_path` | VARCHAR | MediaMTX path key |
| `zone_id` | UUID (FK) | → `zone.uuid`, nullable |
| `is_active` | BOOLEAN | Active status |
| `is_deleted` | BOOLEAN | Soft-delete flag |

### `zone`
| Column | Type | Notes |
|---|---|---|
| `uuid` | UUID (PK) | UUIDv7 |
| `name` | VARCHAR | Unique zone name |
| `description` | TEXT | Optional |
| `is_deleted` | BOOLEAN | Soft-delete flag |

### `escalation`
| Column | Type | Notes |
|---|---|---|
| `uuid` | UUID (PK) | UUIDv7 |
| `zone_uuid` | UUID (FK) | → `zone.uuid`, CASCADE delete |
| `camera_uuid` | UUID (FK) | → `camera.uuid`, nullable |
| `created_by_uuid` | UUID (FK) | → `user.uuid`, RESTRICT |
| `assigned_to_uuid` | UUID (FK) | → `user.uuid`, SET NULL |
| `title` | VARCHAR(255) | Indexed |
| `description` | TEXT | |
| `priority` | VARCHAR(20) | `low` \| `medium` \| `high` \| `critical` |
| `status` | VARCHAR(20) | See lifecycle above |
| `action_taken` | TEXT | Nullable, set on act |
| `is_acted_upon` | BOOLEAN | |
| `is_false_alarm` | BOOLEAN | |
| `resolved_at` | TIMESTAMPTZ | Nullable |
| `is_deleted` | BOOLEAN | Soft-delete flag |

**Composite indexes on `escalation`:**
- `(zone_uuid, status)` — zone-scoped status queries
- `(assigned_to_uuid, status)` — guard workload queries
- `(created_at, zone_uuid)` — chronological zone reports

---

## 13. ML Pipeline

### YOLOv8 Inference (Backend, `/dev` endpoints)

1. **Frame Source:** `OpenCVFrameSource` reads from webcam (`device_id`) or RTSP URL
2. **Detection:** `YoloPersonDetector` runs YOLOv8n; filters class ID `0` (person) above the confidence threshold
3. **Heatmap:** `build_heatmap()` maps bounding-box centroids onto a configurable grid; returns intensity values + peak hotspot coordinates
4. **Async Isolation:** YOLO inference runs in a single-threaded `ThreadPoolExecutor` (`_yolo_executor`) to avoid blocking the async event loop
5. **Result:** `MLResultPayload` is stored in-memory and served via REST or WebSocket

### CrowdVision Models

| Model | Architecture | Training Data | Inference |
|---|---|---|---|
| AdaptiveCSRNet | CSRNet variant (density map) | ShanghaiTech Part A | Image → density map + count |
| AdaptiveNAS-GNN | NAS-optimized Graph Neural Network | METR-LA (traffic sensors) | Sensor ID + horizon → speed predictions |

---

## 14. Stream Ingestion (MediaMTX)

When a camera is registered via `POST /camera`, the backend:

1. Generates a URL-safe `stream_path` (e.g., `gate_a_camera`)
2. Calls the MediaMTX REST API at `http://mediamtx:9997/v3/config/paths/add/{stream_path}`
3. Registers an `runOnDemand` FFmpeg command that:
   - Uses TCP transport (`-rtsp_transport tcp`)
   - Fixes non-monotonic timestamps (`-use_wallclock_as_timestamps 1 -fflags +genpts`)
   - Drops audio (`-an`) to avoid HLS segment corruption
   - Normalizes to 15fps, H.264 baseline, 1200kbps
4. On service restart, `sync_cameras_with_mediamtx()` re-registers all active cameras from the database

**Why FFmpeg instead of native MediaMTX RTSP pull?**
Many IP cameras return malformed RTSP headers (e.g., bracketed `Content-Base`) that MediaMTX rejects. FFmpeg tolerates these and republishes a clean stream.

---

## 15. Admin Panel

Available at `http://localhost:8000/admin` (configurable via `CRUD_ADMIN_MOUNT_PATH`).

- Powered by **CRUDAdmin** (`crudadmin` package)
- Bootstrap admin user is created automatically on first startup if the `user` table is empty
- Supports session tracking (`CRUD_ADMIN_TRACK_EVENTS`, `CRUD_ADMIN_TRACK_SESSIONS`)
- Can optionally use Redis for distributed session storage (`CRUD_ADMIN_REDIS_ENABLED`)
- Secure cookies enforced (`SESSION_SECURE_COOKIES=true`) — disable for HTTP-only local dev

---

## 16. Database Migrations

Migrations are managed with **Alembic** from within the Docker container:

```bash
# Apply all pending migrations
docker compose exec web alembic upgrade head

# Create a new migration (after changing SQLAlchemy models)
docker compose exec web alembic revision --autogenerate -m "add_new_column"

# Rollback one step
docker compose exec web alembic downgrade -1

# Check current revision
docker compose exec web alembic current
```

Migration files are in `backend/src/migrations/versions/`.

> **Warning:** Always review auto-generated migrations before applying to production. Alembic may miss complex constraints.

---

## 17. Development Workflow

### Backend (local, without Docker)

```bash
cd backend

# Install uv (if not installed)
pip install uv

# Create virtualenv and install dependencies
uv sync

# Set up environment
cp .env.example .env  # edit as needed; point POSTGRES_SERVER to localhost

# Run Alembic migrations
uv run alembic -c src/alembic.ini upgrade head

# Start the dev server
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --app-dir src
```

### CrowdVision API (local)

```bash
cd crowdvision_api/crowdvision_api

pip install -r requirements.txt

# Ensure checkpoints exist
ls checkpoints/

python demo_api.py
# Swagger: http://0.0.0.0:8000/docs
```

### Frontend (local)

```bash
cd frontend
npm install
npm run dev   # http://localhost:5173
```

### Code Quality

```bash
# Lint & auto-fix (backend)
cd backend && uv run ruff check src --fix

# Type check
cd backend && uv run mypy src

# Pre-commit hooks (set up once)
cd backend && uv run pre-commit install
```

---

## 18. Testing

```bash
# Run all backend tests
cd backend && uv run pytest

# Run with verbose output
cd backend && uv run pytest -v

# Run a specific test file
cd backend && uv run pytest tests/test_cameras.py
```

Tests are in `backend/tests/`. The test suite uses `pytest`, `pytest-mock`, `pytest-asyncio`, and `faker`.

---

## 19. Deployment

### Production Checklist

- [ ] Generate a new `SECRET_KEY` with `openssl rand -hex 32`
- [ ] Set `ENVIRONMENT=production`
- [ ] Set `SESSION_SECURE_COOKIES=true` (requires HTTPS)
- [ ] Change all default passwords (`POSTGRES_PASSWORD`, `ADMIN_PASSWORD`, `PGADMIN_DEFAULT_PASSWORD`)
- [ ] Remove or restrict the `/dev/*` ML endpoints (auto-gated by `ENVIRONMENT` check)
- [ ] Configure a Redis instance for token blacklisting and ARQ job queue
- [ ] Set up TLS termination (e.g., Nginx reverse proxy or Traefik)
- [ ] Mount `postgres-data` and `pgadmin-data` volumes on persistent storage
- [ ] Replace `--reload` uvicorn flag with gunicorn multi-worker setup

### Switching to Gunicorn (Production)

In `backend/Dockerfile`, comment/uncomment:

```dockerfile
# Development (current default)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# Production
# CMD ["gunicorn", "app.main:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "-b", "0.0.0.0:8000"]
```

## 20. Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| `web` container exits immediately | Missing or invalid `.env` | Check `POSTGRES_PASSWORD` and `SECRET_KEY` are set |
| `alembic upgrade head` fails | DB not ready | Wait ~10s after `docker compose up`, then retry |
| Camera registration returns 400 | MediaMTX not reachable | Ensure `mediamtx` container is running; check port conflicts on 8554 |
| HLS stream not loading in browser | Camera stream not active | The `runOnDemand` script fires on first viewer connection — wait a few seconds |
| `503 Model not loaded` (CrowdVision) | Missing checkpoint | Verify `checkpoints/` contains `adaptive_csrnet_shaA/best.pt` and `nas_gnn_retrain/best.pt` |
| CUDA out of memory (CrowdVision) | GPU VRAM exhausted | Set `CUDA_VISIBLE_DEVICES=` in the `crowdvision` environment to force CPU |
| Admin panel login fails | Wrong credentials or cookie issue | Ensure `SESSION_SECURE_COOKIES=false` for plain HTTP local dev |
| WebSocket closes immediately | Invalid/expired token | Re-authenticate and obtain a fresh access token |
| `ModuleNotFoundError: No module named 'src'` (CrowdVision) | Wrong working directory | Run from inside `crowdvision_api/crowdvision_api/` |

---

## License

See [LICENSE.md](backend/LICENSE.md) for terms.

---

*Last updated: June 2026*