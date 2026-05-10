"""
GCN-GRU: Graph Convolutional Network + GRU for spatiotemporal forecasting.
Copied from crowdvision/src/models/forecasting/gcn_gru.py (self-contained).
"""

import numpy as np
import torch
import torch.nn as nn


def normalise_adj(adj: np.ndarray) -> torch.Tensor:
    adj = adj + np.eye(adj.shape[0])
    d = np.sqrt(adj.sum(axis=1))
    d_inv = np.where(d > 0, 1.0 / d, 0.0)
    adj_norm = adj * d_inv[:, None] * d_inv[None, :]
    return torch.FloatTensor(adj_norm)


class GraphConv(nn.Module):
    def __init__(self, in_features: int, out_features: int, bias: bool = True):
        super().__init__()
        self.W = nn.Parameter(torch.empty(in_features, out_features))
        self.b = nn.Parameter(torch.zeros(out_features)) if bias else None
        nn.init.xavier_uniform_(self.W)

    def forward(self, x: torch.Tensor, adj: torch.Tensor) -> torch.Tensor:
        out = torch.matmul(x, self.W)
        out = torch.einsum('nm,bmf->bnf', adj, out)
        if self.b is not None:
            out = out + self.b
        return out


class GCGRUCell(nn.Module):
    def __init__(self, input_dim: int, hidden_dim: int, adj_size: int):
        super().__init__()
        self.hidden_dim = hidden_dim
        self.gc_rz_x = GraphConv(input_dim, 2 * hidden_dim)
        self.gc_rz_h = GraphConv(hidden_dim, 2 * hidden_dim, bias=False)
        self.gc_c_x = GraphConv(input_dim, hidden_dim)
        self.gc_c_h = GraphConv(hidden_dim, hidden_dim, bias=False)

    def forward(self, x: torch.Tensor, h: torch.Tensor, adj: torch.Tensor) -> torch.Tensor:
        rz = torch.sigmoid(self.gc_rz_x(x, adj) + self.gc_rz_h(h, adj))
        r, z = rz.chunk(2, dim=-1)
        c = torch.tanh(self.gc_c_x(x, adj) + self.gc_c_h(r * h, adj))
        return z * h + (1 - z) * c


class GCNGRU(nn.Module):
    """
    Stacked GCN-GRU for multi-step graph sequence forecasting.
    Input:  [B, T_in, N, F] + [N, N] adjacency
    Output: [B, T_out, N, out_features]
    """

    def __init__(self, num_nodes: int, in_features: int = 2,
                 hidden_dim: int = 64, num_layers: int = 2,
                 seq_out: int = 12, out_features: int = 1):
        super().__init__()
        self.num_nodes = num_nodes
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers
        self.seq_out = seq_out
        self.cells = nn.ModuleList()
        for i in range(num_layers):
            in_d = in_features if i == 0 else hidden_dim
            self.cells.append(GCGRUCell(in_d, hidden_dim, num_nodes))
        self.out_fc = nn.Linear(hidden_dim, seq_out * out_features)
        self.out_features = out_features

    def forward(self, x: torch.Tensor, adj: torch.Tensor) -> torch.Tensor:
        B, T, N, _ = x.shape
        h = [torch.zeros(B, N, self.hidden_dim, device=x.device)
             for _ in range(self.num_layers)]
        for t in range(T):
            inp = x[:, t]
            for l, cell in enumerate(self.cells):
                h[l] = cell(inp, h[l], adj)
                inp = h[l]
        out = self.out_fc(h[-1])
        out = out.view(B, N, self.seq_out, self.out_features)
        out = out.permute(0, 2, 1, 3)
        return out
