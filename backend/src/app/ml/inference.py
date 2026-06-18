from __future__ import annotations

from typing import Any

import numpy as np


class YoloPersonDetector:
    def __init__(self, model_name: str, confidence_threshold: float):
        self._model = self._load_model(model_name)
        self._confidence_threshold = confidence_threshold

    @staticmethod
    def _load_model(model_name: str) -> Any:
        try:
            from ultralytics import YOLO

            return YOLO(model_name)
        except ImportError as exc:
            raise RuntimeError(
                "ultralytics is required for YOLO inference"
            ) from exc

    def detect_people(self, frame: np.ndarray) -> tuple[list[tuple[float, float, float, float]], list[float]]:
        results = self._model.predict(
            frame,
            conf=self._confidence_threshold,
            verbose=False,
        )

        boxes: list[tuple[float, float, float, float]] = []
        confidences: list[float] = []

        for result in results:
            if result.boxes is None:
                continue

            class_tensor = result.boxes.cls
            conf_tensor = result.boxes.conf
            xyxy_tensor = result.boxes.xyxy
            if class_tensor is None or conf_tensor is None or xyxy_tensor is None:
                continue

            classes = class_tensor.detach().cpu().numpy()
            confidence_values = conf_tensor.detach().cpu().numpy()
            xyxy_values = xyxy_tensor.detach().cpu().numpy()

            for idx, class_id in enumerate(classes):
                if int(class_id) != 0:
                    continue

                x1, y1, x2, y2 = xyxy_values[idx].tolist()
                boxes.append((float(x1), float(y1), float(x2), float(y2)))
                confidences.append(float(confidence_values[idx]))

        return boxes, confidences
