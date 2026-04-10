import argparse
import subprocess
import sys
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Prompt for RTSP URL and launch YOLO + heatmap preview"
    )
    parser.add_argument(
        "--model",
        type=str,
        default="yolov8n.pt",
        help="YOLO model file (default: yolov8n.pt)",
    )
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


def main() -> None:
    args = parse_args()

    rtsp_url = input("Enter RTSP URL: ").strip()
    if not rtsp_url:
        print("RTSP URL is required.")
        raise SystemExit(1)

    script_path = Path(__file__).with_name("ml_preview.py")
    cmd = [
        sys.executable,
        str(script_path),
        "--rtsp-url",
        rtsp_url,
        "--model",
        args.model,
        "--conf",
        str(args.conf),
        "--heatmap-decay",
        str(args.heatmap_decay),
        "--overlay-alpha",
        str(args.overlay_alpha),
    ]

    subprocess.run(cmd, check=False)


if __name__ == "__main__":
    main()
