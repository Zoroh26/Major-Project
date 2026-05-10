"""
Drop-in replacement for YOLO inference with CrowdVision ML models.

Maintains the exact YoloPersonDetector interface expected by service.py:
  __init__(model_name, confidence_threshold)
  detect_people(frame) -> (boxes, confidences)

Internally runs AdaptiveCSRNet (density), FutureFrameNet (anomaly),
trend-based forecasting, and async OpenAI hybrid fusion.

DSA Optimizations:
  LRU Cache   — frame deduplication, O(1) get/put
  TTL Cache   — result caching with 5s expiry, O(1)
  TokenBucket — OpenAI rate limiting (10 req/60s), O(1)
  CircularBuffer — forecast history via deque, O(1) append
"""

from __future__ import annotations

import base64
import collections
import hashlib
import json
import logging
import os
import queue
import threading
import time
from typing import Any

import cv2
import numpy as np
import torch
import torch.nn.functional as F

logger = logging.getLogger("crowdvision.inference")

# ---------------------------------------------------------------------------
# Configuration from environment
# ---------------------------------------------------------------------------
_CROWDVISION_ROOT = os.environ.get("CROWDVISION_ROOT", "/home/ubuntu/crowdvision")
_CHECKPOINT_DIR = os.environ.get(
    "CROWDVISION_CHECKPOINTS",
    os.path.join(_CROWDVISION_ROOT, "checkpoints"),
)
_HF_REPO_ID = os.environ.get("HUGGINGFACE_REPO_ID", "")
_HF_TOKEN = os.environ.get("HUGGINGFACE_TOKEN", "")
_OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
_ANOMALY_THRESHOLD = float(os.environ.get("ANOMALY_THRESHOLD", "0.5"))
_LOCAL_WEIGHT = float(os.environ.get("LOCAL_WEIGHT", "0.3"))
_OPENAI_WEIGHT = float(os.environ.get("OPENAI_WEIGHT", "0.7"))
_OPENAI_TIMEOUT = float(os.environ.get("OPENAI_TIMEOUT_MS", "3000")) / 1000.0
_OPENAI_RATE_LIMIT = int(os.environ.get("OPENAI_RATE_LIMIT", "10"))
_LRU_CACHE_SIZE = int(os.environ.get("LRU_CACHE_SIZE", "10"))
_TTL_SECONDS = float(os.environ.get("TTL_SECONDS", "5.0"))

# ImageNet normalisation constants
_IMAGENET_MEAN = [0.485, 0.456, 0.406]
_IMAGENET_STD = [0.229, 0.224, 0.225]

# Density input size (from training .env: TARGET_SIZE_H=576, TARGET_SIZE_W=768)
_DENSITY_H, _DENSITY_W = 576, 768

# Anomaly input size (FutureFrameNet training resolution)
_ANOMALY_H, _ANOMALY_W = 128, 192
_NUM_INPUT_FRAMES = 4


# ═══════════════════════════════════════════════════════════════════════════
# DSA Data Structures
# ═══════════════════════════════════════════════════════════════════════════

class LRUCache:
    """Least Recently Used cache with O(1) get/put via OrderedDict."""

    def __init__(self, maxsize: int = 10):
        self._cache: collections.OrderedDict[str, Any] = collections.OrderedDict()
        self._maxsize = maxsize

    def get(self, key: str) -> Any | None:
        if key not in self._cache:
            return None
        self._cache.move_to_end(key)
        return self._cache[key]

    def put(self, key: str, value: Any) -> None:
        if key in self._cache:
            self._cache.move_to_end(key)
        self._cache[key] = value
        if len(self._cache) > self._maxsize:
            self._cache.popitem(last=False)

    def __contains__(self, key: str) -> bool:
        return key in self._cache

    def __len__(self) -> int:
        return len(self._cache)


class TTLCache:
    """Time-To-Live cache with lazy expiration, O(1) amortised."""

    def __init__(self, maxsize: int = 100, ttl: float = 5.0):
        self._cache: dict[str, Any] = {}
        self._timestamps: dict[str, float] = {}
        self._maxsize = maxsize
        self._ttl = ttl

    def get(self, key: str) -> Any | None:
        if key not in self._cache:
            return None
        if time.monotonic() - self._timestamps[key] > self._ttl:
            del self._cache[key]
            del self._timestamps[key]
            return None
        return self._cache[key]

    def put(self, key: str, value: Any) -> None:
        self._cache[key] = value
        self._timestamps[key] = time.monotonic()
        if len(self._cache) > self._maxsize:
            oldest = min(self._timestamps, key=self._timestamps.get)  # type: ignore[arg-type]
            del self._cache[oldest]
            del self._timestamps[oldest]


class TokenBucket:
    """Token bucket rate limiter with O(1) consume."""

    def __init__(self, capacity: int = 10, refill_rate: float = 10.0 / 60.0):
        self._capacity = capacity
        self._tokens = float(capacity)
        self._refill_rate = refill_rate
        self._last_refill = time.monotonic()

    def consume(self, tokens: int = 1) -> bool:
        now = time.monotonic()
        elapsed = now - self._last_refill
        self._tokens = min(self._capacity, self._tokens + elapsed * self._refill_rate)
        self._last_refill = now
        if self._tokens >= tokens:
            self._tokens -= tokens
            return True
        return False


# ═══════════════════════════════════════════════════════════════════════════
# Async OpenAI Analyzer (background thread, non-blocking)
# ═══════════════════════════════════════════════════════════════════════════

class _OpenAIAnalyzer:
    """Runs OpenAI Vision API calls in a daemon thread. Zero blocking on main path."""

    def __init__(self) -> None:
        self._queue: queue.Queue[tuple[str, bytes, float]] = queue.Queue(maxsize=50)
        self._bucket = TokenBucket(capacity=_OPENAI_RATE_LIMIT,
                                   refill_rate=_OPENAI_RATE_LIMIT / 60.0)
        self._result_cache = TTLCache(maxsize=100, ttl=300.0)
        self._latest: dict[str, Any] = {}
        self._lock = threading.Lock()
        self._worker = threading.Thread(target=self._loop, daemon=True, name="openai-analyzer")
        self._worker.start()

    # -- public (called from inference thread) --

    def enqueue(self, frame_hash: str, jpeg_bytes: bytes, local_score: float) -> None:
        cached = self._result_cache.get(frame_hash)
        if cached is not None:
            with self._lock:
                self._latest = cached
            return
        try:
            self._queue.put_nowait((frame_hash, jpeg_bytes, local_score))
        except queue.Full:
            pass

    def get_latest(self) -> dict[str, Any]:
        with self._lock:
            return self._latest.copy()

    # -- background worker --

    def _loop(self) -> None:
        import httpx

        while True:
            try:
                frame_hash, jpeg_bytes, local_score = self._queue.get(timeout=1.0)
            except queue.Empty:
                continue

            if not self._bucket.consume():
                # Re-enqueue and wait
                try:
                    self._queue.put_nowait((frame_hash, jpeg_bytes, local_score))
                except queue.Full:
                    pass
                time.sleep(1.0)
                continue

            result = self._call_api(jpeg_bytes, local_score)
            self._result_cache.put(frame_hash, result)
            with self._lock:
                self._latest = result

    def _call_api(self, jpeg_bytes: bytes, local_score: float) -> dict[str, Any]:
        fallback = {
            "score": local_score,
            "anomaly_type": "unknown",
            "description": "OpenAI unavailable",
            "local_score": local_score,
            "openai_confidence": 0.0,
        }

        if not _OPENAI_API_KEY:
            return fallback

        import httpx

        b64 = base64.b64encode(jpeg_bytes).decode()
        prompt = (
            "Analyze this crowd scene for safety anomalies. "
            "Classify the anomaly type as one of: stampede, weapon, vehicle, crowd_surge, other. "
            "Provide a confidence score 0.0-1.0 and a brief description. "
            'Return ONLY valid JSON: {"type": "...", "confidence": 0.0, "description": "..."}'
        )

        payload = {
            "model": "gpt-4o",
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{b64}", "detail": "low"},
                        },
                    ],
                }
            ],
            "max_tokens": 300,
        }

        try:
            with httpx.Client(timeout=_OPENAI_TIMEOUT) as client:
                resp = client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {_OPENAI_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )
                resp.raise_for_status()
                data = resp.json()

            content = data["choices"][0]["message"]["content"] or ""
            # Strip markdown fences if present
            content = content.strip()
            if content.startswith("```"):
                # Handle ```json\n{...}\n``` wrapping
                lines = content.split("\n")
                # Remove first line (```json) and last line (```)
                inner = "\n".join(lines[1:-1] if len(lines) > 2 else lines[1:]).strip()
                if inner:
                    content = inner

            if not content:
                logger.warning("OpenAI returned empty content after stripping")
                return fallback

            try:
                parsed = json.loads(content)
            except json.JSONDecodeError:
                # OpenAI returned plain text (e.g. refusal) instead of JSON.
                # Treat as "no anomaly" with the text as description.
                logger.info("OpenAI returned non-JSON: %s", content[:120])
                return {
                    "score": round(_LOCAL_WEIGHT * local_score, 4),
                    "anomaly_type": "none",
                    "description": content[:200],
                    "local_score": round(local_score, 4),
                    "openai_confidence": 0.0,
                }

            oai_conf = float(parsed.get("confidence", 0.0))
            oai_conf = max(0.0, min(1.0, oai_conf))
            final_score = _LOCAL_WEIGHT * local_score + _OPENAI_WEIGHT * oai_conf

            return {
                "score": round(final_score, 4),
                "anomaly_type": parsed.get("type", "unknown"),
                "description": parsed.get("description", ""),
                "local_score": round(local_score, 4),
                "openai_confidence": round(oai_conf, 4),
            }
        except Exception as exc:
            logger.error("OpenAI call failed: %s", exc, exc_info=True)
            return fallback


# ═══════════════════════════════════════════════════════════════════════════
# Model Loader
# ═══════════════════════════════════════════════════════════════════════════

def _load_checkpoint(model: torch.nn.Module, path: str, device: torch.device) -> None:
    """Load checkpoint into model, handling various save formats."""
    ckpt = torch.load(path, map_location=device, weights_only=False)
    if isinstance(ckpt, dict):
        for key in ("model_state_dict", "state_dict", "model"):
            if key in ckpt:
                ckpt = ckpt[key]
                break
    model.load_state_dict(ckpt, strict=False)
    model.eval()


# ═══════════════════════════════════════════════════════════════════════════
# YoloPersonDetector — Drop-in replacement
# ═══════════════════════════════════════════════════════════════════════════

class YoloPersonDetector:
    """
    Drop-in replacement for YOLO with CrowdVision ML models.

    Same interface as original:
        __init__(model_name, confidence_threshold)
        detect_people(frame) -> (boxes, confidences)

    Internally runs density estimation, anomaly detection, forecasting,
    and async OpenAI analysis with full DSA optimization stack.
    """

    def __init__(self, model_name: str, confidence_threshold: float) -> None:
        self._confidence_threshold = confidence_threshold
        self._model_name = model_name

        # Device
        self._device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self._use_amp = self._device.type == "cuda"

        # Models (lazy loaded)
        self._models_loaded = False
        self._density_model: Any = None
        self._anomaly_model: Any = None

        # CUDA streams for parallel inference
        self._density_stream: Any = None
        self._anomaly_stream: Any = None

        # DSA caches
        self._frame_cache = LRUCache(maxsize=_LRU_CACHE_SIZE)
        self._result_cache = TTLCache(maxsize=100, ttl=_TTL_SECONDS)

        # Anomaly frame buffer (sliding window of 4 grayscale frames)
        self._anomaly_buffer: collections.deque[torch.Tensor] = collections.deque(
            maxlen=_NUM_INPUT_FRAMES + 1  # need T+1 for reconstruction_error
        )

        # Forecasting circular buffer (density measurements)
        self._density_history: collections.deque[tuple[float, float]] = collections.deque(
            maxlen=12
        )
        self._last_forecast_time: float = 0.0
        self._cached_forecast: str = "stable"

        # Async OpenAI
        self._openai: _OpenAIAnalyzer | None = None

        # Enriched results (readable by external code, not used by service.py)
        self.last_anomaly_score: float = 0.0
        self.last_anomaly_type: str = "none"
        self.last_forecast_trend: str = "stable"
        self.last_density_map: np.ndarray | None = None
        self.last_openai_result: dict[str, Any] = {}

        # Performance counters
        self._frame_count = 0
        self._cache_hits = 0

    # ------------------------------------------------------------------
    # Model loading (lazy, on first inference)
    # ------------------------------------------------------------------

    def _load_models(self) -> None:
        logger.info("Loading CrowdVision ML models on %s ...", self._device)
        t0 = time.perf_counter()

        # --- AdaptiveCSRNet (density) ---
        from .models import AdaptiveCSRNet
        if _HF_REPO_ID:
            from huggingface_hub import hf_hub_download
            logger.info("Downloading AdaptiveCSRNet from HuggingFace Hub...")
            density_path = hf_hub_download(repo_id=_HF_REPO_ID, filename="adaptive_csrnet.pt", token=_HF_TOKEN)
        else:
            density_path = os.path.join(_CHECKPOINT_DIR, "adaptive_csrnet_shaA", "best.pt")

        self._density_model = AdaptiveCSRNet(load_weights=False, return_features=False)
        _load_checkpoint(self._density_model, density_path, self._device)
        self._density_model.to(self._device)

        # --- FutureFrameNet (anomaly) ---
        from .models import FutureFrameNet
        if _HF_REPO_ID:
            from huggingface_hub import hf_hub_download
            logger.info("Downloading FutureFrameNet from HuggingFace Hub...")
            anomaly_path = hf_hub_download(repo_id=_HF_REPO_ID, filename="ffnet.pt", token=_HF_TOKEN)
        else:
            anomaly_path = os.path.join(_CHECKPOINT_DIR, "ffnet_ped2", "best.pt")
        self._anomaly_model = FutureFrameNet(
            num_input_frames=_NUM_INPUT_FRAMES, in_channels=1, base_ch=32
        )
        _load_checkpoint(self._anomaly_model, anomaly_path, self._device)
        self._anomaly_model.to(self._device)

        # CUDA streams for parallel execution
        if self._device.type == "cuda":
            self._density_stream = torch.cuda.Stream()
            self._anomaly_stream = torch.cuda.Stream()

        # OpenAI analyzer (background thread)
        self._openai = _OpenAIAnalyzer()

        elapsed = time.perf_counter() - t0
        logger.info("Models loaded in %.1fs", elapsed)
        self._models_loaded = True

    # ------------------------------------------------------------------
    # Preprocessing
    # ------------------------------------------------------------------

    @staticmethod
    def _preprocess_density(frame: np.ndarray) -> torch.Tensor:
        """BGR frame -> normalised tensor [1, 3, H, W]."""
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        resized = cv2.resize(rgb, (_DENSITY_W, _DENSITY_H), interpolation=cv2.INTER_LINEAR)
        tensor = torch.from_numpy(resized).float().permute(2, 0, 1) / 255.0
        for c, (m, s) in enumerate(zip(_IMAGENET_MEAN, _IMAGENET_STD)):
            tensor[c] = (tensor[c] - m) / s
        return tensor.unsqueeze(0)

    @staticmethod
    def _preprocess_anomaly_frame(frame: np.ndarray) -> torch.Tensor:
        """BGR frame -> grayscale tensor [1, 1, H, W] normalised to [-1, 1]."""
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        resized = cv2.resize(gray, (_ANOMALY_W, _ANOMALY_H), interpolation=cv2.INTER_LINEAR)
        tensor = torch.from_numpy(resized).float() / 127.5 - 1.0
        return tensor.unsqueeze(0).unsqueeze(0)

    # ------------------------------------------------------------------
    # Frame hashing
    # ------------------------------------------------------------------

    @staticmethod
    def _compute_frame_hash(frame: np.ndarray) -> str:
        """Fast MD5 hash of frame bytes (first 16 hex chars)."""
        # Downsample for faster hashing
        small = cv2.resize(frame, (64, 48), interpolation=cv2.INTER_NEAREST)
        return hashlib.md5(small.tobytes()).hexdigest()[:16]

    # ------------------------------------------------------------------
    # Density inference
    # ------------------------------------------------------------------

    def _run_density(self, frame: np.ndarray) -> tuple[np.ndarray, int]:
        """Run AdaptiveCSRNet. Returns (density_map_np, person_count)."""
        inp = self._preprocess_density(frame).to(self._device)
        with torch.inference_mode():
            if self._use_amp:
                with torch.amp.autocast("cuda"):
                    density = self._density_model(inp)
            else:
                density = self._density_model(inp)

        dm = density.squeeze().cpu().numpy()
        dm = np.maximum(dm, 0.0)  # ReLU negatives
        count = max(0, int(round(dm.sum())))
        return dm, count

    # ------------------------------------------------------------------
    # Anomaly inference
    # ------------------------------------------------------------------

    def _run_anomaly(self, frame: np.ndarray) -> float:
        """Run FutureFrameNet. Returns local anomaly score [0, 1]."""
        gray_tensor = self._preprocess_anomaly_frame(frame)
        self._anomaly_buffer.append(gray_tensor)

        if len(self._anomaly_buffer) < _NUM_INPUT_FRAMES + 1:
            return 0.0  # Not enough frames yet

        # Build clip [1, T+1, 1, H, W]
        clip = torch.cat(list(self._anomaly_buffer), dim=0).unsqueeze(0).to(self._device)

        with torch.inference_mode():
            if self._use_amp:
                with torch.amp.autocast("cuda"):
                    error = self._anomaly_model.reconstruction_error(clip)
            else:
                error = self._anomaly_model.reconstruction_error(clip)

        score = float(error.squeeze().cpu())
        # Normalise to [0, 1] using sigmoid-like scaling
        score = min(1.0, max(0.0, score * 2.0))
        return score

    # ------------------------------------------------------------------
    # Forecasting (trend analysis on circular buffer)
    # ------------------------------------------------------------------

    def _update_forecast(self, density_value: float) -> str:
        """Append density measurement and compute trend."""
        now = time.monotonic()
        self._density_history.append((density_value, now))

        # Only recompute every 30 seconds
        if now - self._last_forecast_time < 30.0:
            return self._cached_forecast

        if len(self._density_history) < 6:
            return "stable"

        # Simple linear regression for trend
        vals = [d for d, _ in self._density_history]
        n = len(vals)
        x_mean = (n - 1) / 2.0
        y_mean = sum(vals) / n
        numerator = sum((i - x_mean) * (v - y_mean) for i, v in enumerate(vals))
        denominator = sum((i - x_mean) ** 2 for i in range(n))
        slope = numerator / denominator if denominator > 0 else 0.0

        if slope > 0.1:
            trend = "increasing"
        elif slope < -0.1:
            trend = "decreasing"
        else:
            trend = "stable"

        self._cached_forecast = trend
        self._last_forecast_time = now
        return trend

    # ------------------------------------------------------------------
    # Density map -> pseudo-boxes conversion
    # ------------------------------------------------------------------

    def _density_to_boxes(
        self, density_map: np.ndarray, frame_h: int, frame_w: int, person_count: int
    ) -> tuple[list[tuple[float, float, float, float]], list[float]]:
        """Convert density map to bounding boxes for backward compatibility."""
        boxes: list[tuple[float, float, float, float]] = []
        confidences: list[float] = []

        if person_count == 0 or density_map.sum() < 0.5:
            return boxes, confidences

        dm_h, dm_w = density_map.shape
        scale_y = frame_h / dm_h
        scale_x = frame_w / dm_w
        dm_max = density_map.max()
        if dm_max < 1e-6:
            return boxes, confidences

        # Normalised density for confidence scores
        dm_norm = density_map / dm_max

        # Use the density map as a probability distribution to sample box positions
        dm_flat = density_map.flatten()
        total = dm_flat.sum()
        if total < 0.5:
            return boxes, confidences

        probs = dm_flat / total
        n_boxes = min(person_count, 500)  # cap to prevent explosion

        # Sample positions proportional to density
        indices = np.random.choice(len(probs), size=n_boxes, replace=True, p=probs)

        # Typical person box size (scaled to frame)
        box_w = max(20.0, frame_w / dm_w * 0.5)
        box_h = max(40.0, frame_h / dm_h * 0.8)

        for idx in indices:
            row = idx // dm_w
            col = idx % dm_w

            # Center in frame coordinates with small jitter
            cy = (row + 0.5) * scale_y + np.random.uniform(-scale_y * 0.3, scale_y * 0.3)
            cx = (col + 0.5) * scale_x + np.random.uniform(-scale_x * 0.3, scale_x * 0.3)

            x1 = max(0.0, cx - box_w / 2)
            y1 = max(0.0, cy - box_h / 2)
            x2 = min(float(frame_w), cx + box_w / 2)
            y2 = min(float(frame_h), cy + box_h / 2)

            conf = float(dm_norm[row, col])
            if conf >= self._confidence_threshold:
                boxes.append((x1, y1, x2, y2))
                confidences.append(round(conf, 4))

        return boxes, confidences

    # ------------------------------------------------------------------
    # OpenAI queueing
    # ------------------------------------------------------------------

    def _maybe_queue_openai(self, frame: np.ndarray, frame_hash: str, local_score: float) -> None:
        if self._openai is None or local_score < _ANOMALY_THRESHOLD:
            return

        # Encode frame as JPEG (max 1024px)
        h, w = frame.shape[:2]
        max_dim = 1024
        if max(h, w) > max_dim:
            scale = max_dim / max(h, w)
            frame = cv2.resize(frame, (int(w * scale), int(h * scale)))

        _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        self._openai.enqueue(frame_hash, buf.tobytes(), local_score)

    # ------------------------------------------------------------------
    # Main interface (SAME as original YOLO)
    # ------------------------------------------------------------------

    def detect_people(
        self, frame: np.ndarray
    ) -> tuple[list[tuple[float, float, float, float]], list[float]]:
        """
        Main inference method — SAME SIGNATURE as original YOLO.
        Returns (boxes, confidences) for backward compatibility with service.py.
        """
        if not self._models_loaded:
            self._load_models()

        self._frame_count += 1
        frame_hash = self._compute_frame_hash(frame)

        # ── LRU cache check ──
        cached = self._frame_cache.get(frame_hash)
        if cached is not None:
            self._cache_hits += 1
            if self._frame_count % 100 == 0:
                rate = self._cache_hits / self._frame_count
                logger.info("cache_hit_rate=%.2f frames=%d", rate, self._frame_count)
            return cached

        # ── TTL cache check ──
        ttl_cached = self._result_cache.get(frame_hash)
        if ttl_cached is not None:
            self._cache_hits += 1
            return ttl_cached

        start = time.perf_counter()
        frame_h, frame_w = frame.shape[:2]

        # ── Parallel inference using CUDA streams ──
        density_result: tuple[np.ndarray, int] | None = None
        anomaly_score: float = 0.0

        if self._device.type == "cuda" and self._density_stream is not None:
            # Run density on stream 0
            with torch.cuda.stream(self._density_stream):
                density_result = self._run_density(frame)

            # Run anomaly on stream 1
            with torch.cuda.stream(self._anomaly_stream):
                anomaly_score = self._run_anomaly(frame)

            torch.cuda.synchronize()
        else:
            density_result = self._run_density(frame)
            anomaly_score = self._run_anomaly(frame)

        density_map, person_count = density_result  # type: ignore[misc]

        # ── Forecasting ──
        avg_density = float(density_map.mean())
        trend = self._update_forecast(avg_density)

        # ── Convert density to boxes ──
        boxes, confidences = self._density_to_boxes(
            density_map, frame_h, frame_w, person_count
        )

        # ── Queue OpenAI if anomalous (non-blocking) ──
        self._maybe_queue_openai(frame, frame_hash, anomaly_score)

        # ── Store enriched metadata ──
        self.last_anomaly_score = anomaly_score
        self.last_forecast_trend = trend
        self.last_density_map = density_map
        if self._openai is not None:
            oai = self._openai.get_latest()
            self.last_openai_result = oai
            self.last_anomaly_type = oai.get("anomaly_type", "none")

        # ── Cache result ──
        result = (boxes, confidences)
        self._frame_cache.put(frame_hash, result)
        self._result_cache.put(frame_hash, result)

        elapsed_ms = (time.perf_counter() - start) * 1000
        if elapsed_ms > 100:
            logger.warning("Inference latency: %.1fms (target <50ms) frame=%d", elapsed_ms, self._frame_count)
        elif self._frame_count % 50 == 0:
            logger.info(
                "inference_ms=%.1f count=%d anomaly=%.2f trend=%s",
                elapsed_ms, person_count, anomaly_score, trend,
            )

        return result
