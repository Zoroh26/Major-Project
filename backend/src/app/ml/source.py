from __future__ import annotations

from typing import Any

import numpy as np


class OpenCVFrameSource:
    def __init__(self, source_mode: str, device_id: int = 0, stream_url: str | None = None):
        self._source_mode = source_mode
        self._device_id = device_id
        self._stream_url = stream_url
        self._capture: Any | None = None

    @staticmethod
    def _get_cv2() -> Any:
        try:
            import cv2

            return cv2
        except ImportError as exc:
            raise RuntimeError(
                "opencv-python is required for local webcam inference"
            ) from exc

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

    def read_frame(self) -> np.ndarray | None:
        if self._capture is None:
            return None

        ok, frame = self._capture.read()
        if not ok:
            return None

        if frame is None:
            return None

        return frame

    def close(self) -> None:
        if self._capture is not None:
            self._capture.release()
            self._capture = None
