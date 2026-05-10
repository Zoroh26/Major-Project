"""
FutureFrameNet: U-Net future-frame predictor for anomaly detection.
Copied from crowdvision/src/models/anomaly/future_frame.py (self-contained).
"""

import torch
import torch.nn as nn
import torch.nn.functional as F


class DoubleConv(nn.Module):
    def __init__(self, in_ch, out_ch):
        super().__init__()
        self.seq = nn.Sequential(
            nn.Conv2d(in_ch, out_ch, 3, padding=1, bias=False),
            nn.BatchNorm2d(out_ch), nn.ReLU(inplace=True),
            nn.Conv2d(out_ch, out_ch, 3, padding=1, bias=False),
            nn.BatchNorm2d(out_ch), nn.ReLU(inplace=True),
        )

    def forward(self, x):
        return self.seq(x)


class Down(nn.Module):
    def __init__(self, in_ch, out_ch):
        super().__init__()
        self.pool_conv = nn.Sequential(nn.MaxPool2d(2), DoubleConv(in_ch, out_ch))

    def forward(self, x):
        return self.pool_conv(x)


class Up(nn.Module):
    def __init__(self, in_ch, out_ch):
        super().__init__()
        self.up = nn.Upsample(scale_factor=2, mode='bilinear', align_corners=False)
        self.conv = DoubleConv(in_ch, out_ch)

    def forward(self, x, skip):
        return self.conv(torch.cat([skip, self.up(x)], dim=1))


class FutureFrameNet(nn.Module):
    """
    U-Net future frame predictor for anomaly detection.
    Input:  [B, T*C, H, W] (T concatenated grayscale frames)
    Output: [B, C, H, W]   predicted next frame
    Anomaly score = prediction error (higher = more anomalous)
    """

    def __init__(self, num_input_frames: int = 4, in_channels: int = 1, base_ch: int = 32):
        super().__init__()
        c = base_ch
        in_ch = num_input_frames * in_channels
        self.enc1 = DoubleConv(in_ch, c)
        self.enc2 = Down(c, c * 2)
        self.enc3 = Down(c * 2, c * 4)
        self.enc4 = Down(c * 4, c * 8)
        self.bottleneck = Down(c * 8, c * 16)
        self.dec4 = Up(c * 16 + c * 8, c * 8)
        self.dec3 = Up(c * 8 + c * 4, c * 4)
        self.dec2 = Up(c * 4 + c * 2, c * 2)
        self.dec1 = Up(c * 2 + c, c)
        self.out = nn.Conv2d(c, in_channels, 1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        e1 = self.enc1(x)
        e2 = self.enc2(e1)
        e3 = self.enc3(e2)
        e4 = self.enc4(e3)
        b = self.bottleneck(e4)
        d4 = self.dec4(b, e4)
        d3 = self.dec3(d4, e3)
        d2 = self.dec2(d3, e2)
        d1 = self.dec1(d2, e1)
        return self.out(d1)

    def reconstruction_error(self, clip: torch.Tensor) -> torch.Tensor:
        """
        Anomaly score for a clip [B, T, C, H, W] or [B, T*C, H, W].
        Uses frames 0..T-2 as context, predicts frame T-1, returns error.
        """
        if clip.dim() == 5:
            B, T, C, H, W = clip.shape
            past = clip[:, :-1]
            target = clip[:, -1]
            x = past.reshape(B, (T - 1) * C, H, W)
        else:
            x = clip
            target = clip[:, :1]
        pred = self.forward(x)
        err = (pred - target).pow(2)
        mean_err = err.mean(dim=[1, 2, 3])
        patch_err = F.adaptive_avg_pool2d(err, (8, 8))
        max_patch = patch_err.amax(dim=[1, 2, 3])
        return 0.6 * mean_err + 0.4 * max_patch
