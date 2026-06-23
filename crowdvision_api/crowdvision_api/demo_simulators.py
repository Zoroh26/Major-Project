"""
Realistic simulators for CrowdVision endpoints where real models
aren't ready yet (currently: anomaly detection).

Simulators analyse image statistics to produce plausible-looking
responses. All responses include "simulated": True so the frontend
can optionally display a badge.
"""

import io
import base64
from typing import Dict

import numpy as np
from PIL import Image


class AnomalySimulator:
    """
    Generates realistic anomaly detection responses based on
    image statistics (edge density, brightness variance).

    NOT a real model — purely for frontend integration testing.
    """

    def detect(self, image_bytes: bytes) -> Dict:
        """
        Analyse an image and return a plausible anomaly response.

        Returns:
            {
                "anomaly_score": float (0-1),
                "is_anomalous": bool,
                "confidence": float,
                "heatmap_b64": str,
                "description": str,
                "simulated": True
            }
        """
        img = Image.open(io.BytesIO(image_bytes)).convert("L")
        arr = np.array(img, dtype=np.float32) / 255.0

        # Use image statistics as proxy for anomaly score
        # High variance + strong edges → more "anomalous"
        variance = float(arr.var())
        edge_x = np.abs(np.diff(arr, axis=1)).mean()
        edge_y = np.abs(np.diff(arr, axis=0)).mean()
        edge_density = float((edge_x + edge_y) / 2)

        # Combine into a score (tuned to produce reasonable distribution)
        raw_score = 0.3 * variance * 10 + 0.7 * edge_density * 5
        score = float(np.clip(raw_score, 0, 1))

        # Add some randomness for realism
        score = float(np.clip(score + np.random.normal(0, 0.05), 0, 1))

        is_anomalous = score > 0.5
        confidence = abs(score - 0.5) * 2  # distance from decision boundary

        # Generate heatmap from local variance
        heatmap = self._generate_heatmap(arr)

        if is_anomalous:
            if score > 0.8:
                desc = "High anomaly detected — unusual activity or object pattern"
            else:
                desc = "Moderate anomaly — minor irregularity in scene"
        else:
            desc = "Normal scene — no anomalies detected"

        return {
            "anomaly_score": round(score, 4),
            "is_anomalous": is_anomalous,
            "confidence": round(confidence, 4),
            "heatmap_b64": heatmap,
            "description": desc,
            "simulated": True,
        }

    def _generate_heatmap(self, arr: np.ndarray) -> str:
        """Generate an anomaly heatmap from local variance."""
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt

        # Local variance as proxy for "anomaly regions"
        from scipy.ndimage import uniform_filter
        local_mean = uniform_filter(arr, size=15)
        local_sq_mean = uniform_filter(arr ** 2, size=15)
        local_var = np.clip(local_sq_mean - local_mean ** 2, 0, None)

        fig, ax = plt.subplots(1, 1, figsize=(6, 4))
        ax.imshow(arr, cmap="gray", alpha=0.4)
        ax.imshow(local_var, cmap="hot", alpha=0.6, interpolation="bilinear")
        ax.axis("off")

        buf = io.BytesIO()
        fig.savefig(buf, format="png", bbox_inches="tight", pad_inches=0,
                    dpi=100)
        plt.close(fig)
        buf.seek(0)
        return base64.b64encode(buf.read()).decode("utf-8")
