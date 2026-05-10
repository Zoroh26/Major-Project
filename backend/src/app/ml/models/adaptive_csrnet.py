"""
AdaptiveCSRNet: Crowd density estimation with CBAM attention + multi-scale backend.
Copied from crowdvision/src/models/density/adaptive_csrnet.py (self-contained).
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import models


class ChannelAttention(nn.Module):
    def __init__(self, channels: int, reduction: int = 16):
        super().__init__()
        mid = max(channels // reduction, 8)
        self.gap = nn.AdaptiveAvgPool2d(1)
        self.gmp = nn.AdaptiveMaxPool2d(1)
        self.fc = nn.Sequential(
            nn.Flatten(),
            nn.Linear(channels, mid), nn.ReLU(inplace=True),
            nn.Linear(mid, channels),
        )
        self.sigmoid = nn.Sigmoid()

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        avg_out = self.fc(self.gap(x))
        max_out = self.fc(self.gmp(x))
        scale = self.sigmoid(avg_out + max_out).unsqueeze(-1).unsqueeze(-1)
        return x * scale


class SpatialAttention(nn.Module):
    def __init__(self, kernel_size: int = 7):
        super().__init__()
        pad = kernel_size // 2
        self.conv = nn.Conv2d(2, 1, kernel_size, padding=pad, bias=False)
        self.sigmoid = nn.Sigmoid()

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        avg_out = x.mean(dim=1, keepdim=True)
        max_out = x.max(dim=1, keepdim=True).values
        attn = self.sigmoid(self.conv(torch.cat([avg_out, max_out], dim=1)))
        return x * attn


class CBAM(nn.Module):
    def __init__(self, channels: int, reduction: int = 16, spatial_ks: int = 7):
        super().__init__()
        self.ca = ChannelAttention(channels, reduction)
        self.sa = SpatialAttention(spatial_ks)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.sa(self.ca(x))


class MultiScaleBackend(nn.Module):
    def __init__(self, in_channels: int = 256, out_channels: int = 256):
        super().__init__()
        mid = out_channels // 4
        branches = []
        for rate in [1, 2, 4, 8]:
            branches.append(nn.Sequential(
                nn.Conv2d(in_channels, mid, 3, padding=rate, dilation=rate),
                nn.BatchNorm2d(mid),
                nn.ReLU(inplace=True),
            ))
        self.branches = nn.ModuleList(branches)
        self.global_branch = nn.Sequential(
            nn.AdaptiveAvgPool2d(1),
            nn.Conv2d(in_channels, mid, 1),
            nn.ReLU(inplace=True),
        )
        self.project = nn.Sequential(
            nn.Conv2d(mid * 5, out_channels, 1),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        h, w = x.shape[-2:]
        outs = [b(x) for b in self.branches]
        glb = F.interpolate(self.global_branch(x), size=(h, w), mode='bilinear',
                            align_corners=False)
        outs.append(glb)
        return self.project(torch.cat(outs, dim=1))


class AdaptiveCSRNet(nn.Module):
    """
    Novel adaptive CSRNet with CBAM attention + ASPP-style multi-scale backend.
    Input:  [B, 3, H, W] (ImageNet-normalised RGB)
    Output: [B, 1, H, W] density map (sum ≈ person count)
    """

    def __init__(self, load_weights: bool = True, return_features: bool = False):
        super().__init__()
        self.return_features = return_features
        vgg = models.vgg16(weights='IMAGENET1K_V1' if load_weights else None)
        feats = list(vgg.features.children())
        self.encoder = nn.Sequential(*feats[:23])
        self.attention = CBAM(512)
        self.backend = MultiScaleBackend(512, 256)
        self.head = nn.Sequential(
            nn.Conv2d(256, 128, 3, padding=1), nn.ReLU(inplace=True),
            nn.Conv2d(128, 64, 3, padding=1), nn.ReLU(inplace=True),
            nn.Conv2d(64, 1, 1),
        )
        self.perspective_head = nn.Sequential(
            nn.Conv2d(256, 64, 3, padding=1), nn.ReLU(inplace=True),
            nn.Conv2d(64, 1, 1), nn.Sigmoid(),
        )
        self._init_new_layers()

    def _init_new_layers(self):
        for m in [self.backend, self.head, self.perspective_head]:
            for p in m.modules():
                if isinstance(p, nn.Conv2d):
                    nn.init.normal_(p.weight, std=0.01)
                    if p.bias is not None:
                        nn.init.zeros_(p.bias)

    def forward(self, x: torch.Tensor):
        h, w = x.shape[-2:]
        enc = self.encoder(x)
        enc = self.attention(enc)
        feat = self.backend(enc)
        density = self.head(feat)
        density = F.interpolate(density, (h, w), mode='bilinear', align_corners=False)
        if self.return_features:
            perspective = self.perspective_head(feat)
            perspective = F.interpolate(perspective, (h, w), mode='bilinear',
                                        align_corners=False)
            return density, enc, perspective
        return density

    def count(self, x: torch.Tensor) -> torch.Tensor:
        if self.return_features:
            density, _, _ = self.forward(x)
        else:
            density = self.forward(x)
        return density.flatten(1).sum(1)
