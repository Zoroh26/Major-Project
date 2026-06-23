from __future__ import annotations

import threading
import time
from typing import Any

import numpy as np


class OpenCVFrameSource:
    """
    Wraps an OpenCV VideoCapture and drains it continuously in a background
    daemon thread so that the asyncio event loop is never blocked by a slow
    RTSP read.  ``read_frame()`` is non-blocking and always returns the most
    recent decoded frame (or ``None`` if no frame has arrived yet).
    """

    def __init__(self, source_mode: str, device_id: int = 0, stream_url: str | None = None):
        self._source_mode = source_mode
        self._device_id = device_id
        self._stream_url = stream_url
        self._capture: Any | None = None

        self._latest_frame: np.ndarray | None = None
        self._frame_lock = threading.Lock()
        self._reader_thread: threading.Thread | None = None
        self._running = False

    @staticmethod
    def _get_cv2() -> Any:
        try:
            import cv2

            return cv2
        except ImportError as exc:
            raise RuntimeError(
                "opencv-python is required for local webcam inference"
            ) from exc

    # ------------------------------------------------------------------
    # Background reader
    # ------------------------------------------------------------------

    def _reader_worker(self) -> None:
        """Continuously reads frames from the capture device.

        Storing only the latest frame means the asyncio inference loop
        always gets a fresh image without blocking on network I/O.
        """
        while self._running:
            cap = self._capture
            if cap is None:
                break

            ok, frame = cap.read()
            if ok and frame is not None:
                with self._frame_lock:
                    self._latest_frame = frame
            else:
                # Brief pause when the source yields no frame (e.g. between
                # RTSP keyframes) to avoid a tight busy-loop.
                time.sleep(0.02)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def open(self) -> None:
        cv2 = self._get_cv2()

        source: int | str
        if self._source_mode == "direct_webcam":
            source = self._device_id
        else:
            if not self._stream_url:
                raise RuntimeError("stream_url is required for mediamtx source mode")
            source = self._stream_url

        capture = cv2.VideoCapture(source)
        if not capture.isOpened():
            raise RuntimeError(f"Unable to open video source: {source}")

        self._capture = capture
        self._running = True
        self._reader_thread = threading.Thread(
            target=self._reader_worker,
            daemon=True,
            name="ml-frame-reader",
        )
        self._reader_thread.start()

    def read_frame(self) -> np.ndarray | None:
        """Return the most recently decoded frame without blocking."""
        with self._frame_lock:
            return self._latest_frame

    def close(self) -> None:
        self._running = False
        if self._reader_thread is not None:
            self._reader_thread.join(timeout=2.0)
            self._reader_thread = None
        if self._capture is not None:
            self._capture.release()
            self._capture = None
        with self._frame_lock:
            self._latest_frame = None
