# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — install dependencies (cached layer)
# ─────────────────────────────────────────────────────────────────────────────
FROM python:3.11-slim AS deps

WORKDIR /install

# System libs needed by OpenCV/Pillow/matplotlib
RUN apt-get update && apt-get install -y --no-install-recommends \
        libglib2.0-0 \
        libsm6 \
        libxext6 \
        libxrender-dev \
        libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Install CPU-only PyTorch first (much smaller than default CUDA wheel ~2 GB vs 700 MB).
# Then install the rest of the dependencies.
RUN pip install --no-cache-dir \
        torch==2.3.1+cpu \
        torchvision==0.18.1+cpu \
        --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r requirements.txt

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — runtime image
# ─────────────────────────────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

WORKDIR /app

# Copy installed packages from the deps stage
COPY --from=deps /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=deps /usr/local/bin /usr/local/bin

# System runtime libs (same as build stage, no dev headers needed)
RUN apt-get update && apt-get install -y --no-install-recommends \
        libglib2.0-0 \
        libsm6 \
        libxext6 \
        libxrender1 \
        libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Non-interactive matplotlib backend (no display needed in a container)
ENV MPLBACKEND=Agg
# Suppress torch CUDA warnings on CPU-only images
ENV CUDA_VISIBLE_DEVICES=""
# Make Python output unbuffered so logs appear immediately
ENV PYTHONUNBUFFERED=1

# Copy all application source
COPY . .

EXPOSE 8000

CMD ["python", "demo_api.py"]
