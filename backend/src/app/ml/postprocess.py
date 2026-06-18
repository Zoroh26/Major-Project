from __future__ import annotations


def build_heatmap(
    boxes: list[tuple[float, float, float, float]],
    frame_width: int,
    frame_height: int,
    grid_width: int,
    grid_height: int,
) -> tuple[list[float], tuple[float, float, float]]:
    values = [0.0] * (grid_width * grid_height)
    if frame_width <= 0 or frame_height <= 0:
        return values, (0.0, 0.0, 0.0)

    for x1, y1, x2, y2 in boxes:
        center_x = max(0.0, min(frame_width - 1.0, (x1 + x2) * 0.5))
        center_y = max(0.0, min(frame_height - 1.0, (y1 + y2) * 0.5))

        grid_x = min(grid_width - 1, int((center_x / frame_width) * grid_width))
        grid_y = min(grid_height - 1, int((center_y / frame_height) * grid_height))
        idx = grid_y * grid_width + grid_x
        values[idx] += 1.0

    peak = max(values) if values else 0.0
    if peak > 0:
        values = [round(value / peak, 4) for value in values]

    hotspot_idx = values.index(max(values)) if values else 0
    hotspot_x = (hotspot_idx % grid_width) / max(1, grid_width - 1)
    hotspot_y = (hotspot_idx // grid_width) / max(1, grid_height - 1)
    hotspot_intensity = values[hotspot_idx] if values else 0.0

    return values, (round(hotspot_x, 4), round(hotspot_y, 4), round(hotspot_intensity, 4))
