"""CrowdVision model architectures for ML inference."""
from .adaptive_csrnet import AdaptiveCSRNet
from .future_frame import FutureFrameNet
from .gcn_gru import GCNGRU

__all__ = ["AdaptiveCSRNet", "FutureFrameNet", "GCNGRU"]
