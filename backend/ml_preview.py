import argparse
import time
from datetime import datetime

import cv2
import numpy as np
from ultralytics import YOLO


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Standalone webcam YOLO preview with heatmap and live specs"
    )
    parser.add_argument("--camera", type=int, default=0, help="Webcam index (default: 0)")
    parser.add_argument("--model", type=str, default="yolov8n.pt", help="YOLO model file")
    parser.add_argument(
        "--conf",
        type=float,
        default=0.25,
        help="Detection confidence threshold (0.0 to 1.0)",
    )
    parser.add_argument(
        "--heatmap-decay",
        type=float,
        default=0.92,
        help="Heatmap decay factor per frame (0.0 to 1.0)",
    )
    parser.add_argument(
        "--overlay-alpha",
        type=float,
        default=0.45,
        help="Heatmap overlay blend alpha (0.0 to 1.0)",
    )
    return parser.parse_args()


def draw_specs_panel(
    frame: np.ndarray,
    person_count: int,
    avg_conf: float,
    max_conf: float,
    infer_ms: float,
    fps: float,
    model_name: str,
    conf_threshold: float,
    heatmap_enabled: bool,
) -> None:
    lines = [
        f"Time: {datetime.now().strftime('%H:%M:%S')}",
        f"Model: {model_name}",
        f"Conf Threshold: {conf_threshold:.2f}",
        f"Persons: {person_count}",
        f"Avg Confidence: {avg_conf:.3f}",
        f"Max Confidence: {max_conf:.3f}",
        f"Inference: {infer_ms:.1f} ms",
        f"FPS: {fps:.1f}",
        f"Frame: {frame.shape[1]}x{frame.shape[0]}",
        f"Heatmap: {'ON' if heatmap_enabled else 'OFF'}",
        "Controls: q=quit h=toggle r=reset",
    ]

    x, y = 10, 10
    line_h = 24
    panel_w = 380
    panel_h = (len(lines) * line_h) + 10

    cv2.rectangle(frame, (x, y), (x + panel_w, y + panel_h), (10, 10, 10), -1)
    cv2.rectangle(frame, (x, y), (x + panel_w, y + panel_h), (80, 80, 80), 1)

    text_y = y + 22
    for line in lines:
        cv2.putText(
            frame,
            line,
            (x + 10, text_y),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (240, 240, 240),
            1,
            cv2.LINE_AA,
        )
        text_y += line_h


def main() -> None:
    args = parse_args()

    if not (0.0 <= args.conf <= 1.0):
        raise ValueError("--conf must be between 0.0 and 1.0")
    if not (0.0 <= args.heatmap_decay <= 1.0):
        raise ValueError("--heatmap-decay must be between 0.0 and 1.0")
    if not (0.0 <= args.overlay_alpha <= 1.0):
        raise ValueError("--overlay-alpha must be between 0.0 and 1.0")

    print(f"Loading model: {args.model}")
    model = YOLO(args.model)

    cap = cv2.VideoCapture(args.camera)
    if not cap.isOpened():
        raise RuntimeError(f"Unable to open webcam index {args.camera}")

    heatmap_acc: np.ndarray | None = None
    heatmap_enabled = True
    fps_ema = 0.0

    print("Preview started. Press q to quit, h to toggle heatmap, r to reset heatmap.")

    try:
        while True:
            loop_start = time.perf_counter()

            ok, frame = cap.read()
            if not ok or frame is None:
                continue

            h, w = frame.shape[:2]
            if heatmap_acc is None or heatmap_acc.shape[:2] != (h, w):
                heatmap_acc = np.zeros((h, w), dtype=np.float32)

            infer_start = time.perf_counter()
            result = model.predict(frame, conf=args.conf, verbose=False)[0]
            infer_ms = (time.perf_counter() - infer_start) * 1000.0

            person_count = 0
            confs: list[float] = []

            if result.boxes is not None and result.boxes.cls is not None and result.boxes.xyxy is not None:
                classes = result.boxes.cls.detach().cpu().numpy()
                confidences = result.boxes.conf.detach().cpu().numpy()
                boxes = result.boxes.xyxy.detach().cpu().numpy()

                for idx, class_id in enumerate(classes):
                    if int(class_id) != 0:
                        continue

                    person_count += 1
                    conf_val = float(confidences[idx])
                    confs.append(conf_val)

                    x1, y1, x2, y2 = boxes[idx].astype(int).tolist()
                    cx = max(0, min(w - 1, (x1 + x2) // 2))
                    cy = max(0, min(h - 1, (y1 + y2) // 2))
                    radius = max(12, min(80, int(0.5 * max(x2 - x1, y2 - y1))))

                    cv2.circle(heatmap_acc, (cx, cy), radius, 1.0, -1)

            heatmap_acc *= args.heatmap_decay
            heatmap_blur = cv2.GaussianBlur(heatmap_acc, (0, 0), sigmaX=15, sigmaY=15)

            peak = float(np.max(heatmap_blur))
            normalized = heatmap_blur / peak if peak > 1e-6 else heatmap_blur
            heatmap_img = cv2.applyColorMap(
                np.clip(normalized * 255.0, 0, 255).astype(np.uint8),
                cv2.COLORMAP_JET,
            )

            annotated = result.plot()
            if heatmap_enabled:
                annotated = cv2.addWeighted(annotated, 1.0, heatmap_img, args.overlay_alpha, 0.0)

            avg_conf = float(np.mean(confs)) if confs else 0.0
            max_conf = float(np.max(confs)) if confs else 0.0

            elapsed = time.perf_counter() - loop_start
            inst_fps = 1.0 / elapsed if elapsed > 0 else 0.0
            fps_ema = inst_fps if fps_ema == 0.0 else ((0.9 * fps_ema) + (0.1 * inst_fps))

            draw_specs_panel(
                frame=annotated,
                person_count=person_count,
                avg_conf=avg_conf,
                max_conf=max_conf,
                infer_ms=infer_ms,
                fps=fps_ema,
                model_name=args.model,
                conf_threshold=args.conf,
                heatmap_enabled=heatmap_enabled,
            )

            cv2.imshow("YOLO Webcam Preview + Heatmap", annotated)
            cv2.imshow("Heatmap Only", heatmap_img)

            key = cv2.waitKey(1) & 0xFF
            if key == ord("q"):
                break
            if key == ord("h"):
                heatmap_enabled = not heatmap_enabled
            if key == ord("r") and heatmap_acc is not None:
                heatmap_acc.fill(0.0)

    finally:
        cap.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
