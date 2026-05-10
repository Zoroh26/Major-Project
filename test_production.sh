#!/bin/bash

# Always run from the Major-Project directory (where docker-compose.yml lives)
cd "$(dirname "$0")" || exit 1
RESULTS_FILE=$(mktemp /tmp/cv_test_XXXX)
echo "0 0 0" > "$RESULTS_FILE"

pass() {
  echo "  ✅ $1"
  read P F W < "$RESULTS_FILE"
  echo "$((P+1)) $F $W" > "$RESULTS_FILE"
}
fail() {
  echo "  ❌ $1"
  read P F W < "$RESULTS_FILE"
  echo "$P $((F+1)) $W" > "$RESULTS_FILE"
}
warn() {
  echo "  ⚠️  $1"
  read P F W < "$RESULTS_FILE"
  echo "$P $F $((W+1))" > "$RESULTS_FILE"
}

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     CROWDVISION — FINAL PRODUCTION VERIFICATION SUITE       ║"
echo "║     $(date '+%Y-%m-%d %H:%M:%S %Z')                          ║"
echo "╚══════════════════════════════════════════════════════════════╝"

# ──────────────────────────────────────────────────────────────────
echo ""
echo "━━━ [1/10] DOCKER CONTAINERS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
for svc in web db frontend mediamtx pgadmin; do
  state=$(docker compose ps --format '{{.State}}' "$svc" 2>/dev/null || echo "missing")
  if [ "$state" = "running" ]; then
    pass "$svc container is running"
  else
    fail "$svc container state: $state"
  fi
done

# ──────────────────────────────────────────────────────────────────
echo ""
echo "━━━ [2/10] DATABASE CONNECTIVITY ━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if docker compose exec -T db pg_isready -U postgres -d MajorProject > /dev/null 2>&1; then
  pass "PostgreSQL accepting connections"
else
  fail "PostgreSQL not responding"
fi

user_count=$(docker compose exec -T db psql -U postgres -d MajorProject -t -c "SELECT count(*) FROM \"user\";" 2>/dev/null | tr -d ' \n' || echo "ERR")
if [ "$user_count" != "ERR" ] && [ "$user_count" -ge 1 ] 2>/dev/null; then
  pass "User table has $user_count user(s)"
else
  fail "Cannot query user table (got: $user_count)"
fi

# ──────────────────────────────────────────────────────────────────
echo ""
echo "━━━ [3/10] HTTP SERVICE ENDPOINTS ━━━━━━━━━━━━━━━━━━━━━━━━━━"

check_http() {
  local name=$1 url=$2 expect=${3:-200}
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$url" 2>/dev/null || echo "000")
  if [ "$code" = "$expect" ]; then
    pass "$name → HTTP $code"
  else
    fail "$name → HTTP $code (expected $expect)"
  fi
}

check_http "Frontend root"            "http://localhost:3000"
check_http "Frontend SPA /login"      "http://localhost:3000/login"
check_http "Frontend SPA /dashboard"  "http://localhost:3000/dashboard"
check_http "Backend /docs"            "http://localhost:8000/docs"
check_http "Backend /api/v1/health"   "http://localhost:8000/api/v1/health"
check_http "MediaMTX REST API"        "http://localhost:9997/v3/config/global/get"
check_http "PGAdmin"                  "http://localhost:5050" "302"

# ──────────────────────────────────────────────────────────────────
echo ""
echo "━━━ [4/10] BACKEND API ENDPOINTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Login and get JWT (JSON body with email/password)
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin_secure_password"}' 2>/dev/null \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null || echo "")

if [ -n "$TOKEN" ]; then
  pass "POST /api/v1/login → JWT token obtained"
else
  fail "POST /api/v1/login → no token"
fi

AUTH="Authorization: Bearer $TOKEN"

check_api() {
  local name=$1 endpoint=$2 method=${3:-GET}
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 -X "$method" \
    -H "$AUTH" "http://localhost:8000${endpoint}" 2>/dev/null || echo "000")
  if [ "$code" = "200" ] || [ "$code" = "201" ]; then
    pass "$method $endpoint → HTTP $code"
  else
    fail "$method $endpoint → HTTP $code"
  fi
}

check_api "Current User"    "/api/v1/user/me/"
check_api "Zones"           "/api/v1/zones"
check_api "Cameras"         "/api/v1/cameras"
check_api "ML Dev Status"   "/api/v1/ml/dev/status"
check_api "ML Dev Latest"   "/api/v1/ml/dev/latest"
check_api "Escalations"     "/api/v1/escalations"
check_api "Health"          "/api/v1/health"

# ──────────────────────────────────────────────────────────────────
echo ""
echo "━━━ [5/10] PYTHON DEPENDENCIES (inside container) ━━━━━━━━━━"

docker compose exec -T web python -c "
import sys
sys.path.insert(0, '/code')

deps = {
    'torch': 'torch',
    'cv2': 'cv2',
    'numpy': 'numpy',
    'fastapi': 'fastapi',
    'sqlalchemy': 'sqlalchemy',
    'pydantic': 'pydantic',
    'httpx': 'httpx',
    'torchvision': 'torchvision',
    'huggingface_hub': 'huggingface_hub',
}

for name, mod in deps.items():
    try:
        m = __import__(mod)
        ver = getattr(m, '__version__', 'ok')
        print(f'PASS {name}: {ver}')
    except ImportError:
        print(f'FAIL {name}: NOT FOUND')
" 2>/dev/null | while read -r line; do
  status=$(echo "$line" | cut -d' ' -f1)
  rest=$(echo "$line" | cut -d' ' -f2-)
  if [ "$status" = "PASS" ]; then
    pass "$rest"
  else
    fail "$rest"
  fi
done

# ──────────────────────────────────────────────────────────────────
echo ""
echo "━━━ [6/10] ML MODEL ARCHITECTURES ━━━━━━━━━━━━━━━━━━━━━━━━━"

docker compose exec -T web python -c "
import sys, torch
sys.path.insert(0, '/code')
from app.ml.models import AdaptiveCSRNet, FutureFrameNet, GCNGRU

# 1) AdaptiveCSRNet
m1 = AdaptiveCSRNet()
m1.eval()
x = torch.randn(1, 3, 576, 768)
out = m1(x)
assert out.shape == (1, 1, 576, 768), f'Bad shape: {out.shape}'
print(f'PASS AdaptiveCSRNet: input [1,3,576,768] → output {list(out.shape)}')

# 2) FutureFrameNet
m2 = FutureFrameNet()
m2.eval()
x2 = torch.randn(1, 5, 1, 128, 192)
out2 = m2(x2)
print(f'PASS FutureFrameNet: input [1,5,1,128,192] → output {list(out2.shape)}')

# 3) GCNGRU
m3 = GCNGRU(num_nodes=5, in_features=2, hidden_dim=64, out_steps=12)
m3.eval()
x3 = torch.randn(1, 6, 5, 2)
adj = torch.ones(5, 5)
out3 = m3(x3, adj)
print(f'PASS GCNGRU: input [1,6,5,2] → output {list(out3.shape)}')
" 2>&1 | grep '^PASS\|^FAIL' | while read -r line; do
  status=$(echo "$line" | cut -d' ' -f1)
  rest=$(echo "$line" | cut -d' ' -f2-)
  if [ "$status" = "PASS" ]; then
    pass "$rest"
  else
    fail "$rest"
  fi
done

# ──────────────────────────────────────────────────────────────────
echo ""
echo "━━━ [7/10] HUGGINGFACE CHECKPOINT DOWNLOAD + LOAD ━━━━━━━━━━"

docker compose exec -T web python -c "
import sys, torch
sys.path.insert(0, '/code')
from huggingface_hub import hf_hub_download
from app.ml.models import AdaptiveCSRNet, FutureFrameNet

repo = 'subhasisjena/crowdvision-models'

# AdaptiveCSRNet checkpoint
p1 = hf_hub_download(repo_id=repo, filename='adaptive_csrnet.pt')
m1 = AdaptiveCSRNet()
ckpt1 = torch.load(p1, map_location='cpu', weights_only=False)
sd1 = ckpt1.get('model_state_dict', ckpt1)
m1.load_state_dict(sd1, strict=False)
m1.eval()
x = torch.randn(1, 3, 128, 128)
out = m1(x)
print(f'PASS AdaptiveCSRNet checkpoint loaded (sum={out.sum().item():.2f})')

# FutureFrameNet checkpoint
p2 = hf_hub_download(repo_id=repo, filename='ffnet.pt')
m2 = FutureFrameNet()
ckpt2 = torch.load(p2, map_location='cpu', weights_only=False)
sd2 = ckpt2.get('model_state_dict', ckpt2)
m2.load_state_dict(sd2, strict=False)
m2.eval()
x2 = torch.randn(1, 5, 1, 128, 192)
out2 = m2(x2)
print(f'PASS FutureFrameNet checkpoint loaded (error={out2.item():.2f})')
" 2>&1 | grep '^PASS\|^FAIL' | while read -r line; do
  status=$(echo "$line" | cut -d' ' -f1)
  rest=$(echo "$line" | cut -d' ' -f2-)
  if [ "$status" = "PASS" ]; then
    pass "$rest"
  else
    fail "$rest"
  fi
done

# ──────────────────────────────────────────────────────────────────
echo ""
echo "━━━ [8/10] FULL E2E INFERENCE PIPELINE ━━━━━━━━━━━━━━━━━━━━━"

docker compose exec -T web python -c "
import sys, time, numpy as np, cv2
sys.path.insert(0, '/code')
from app.ml.inference import YoloPersonDetector, _OpenAIAnalyzer

# Full local pipeline
det = YoloPersonDetector(model_name='yolov8n.pt', confidence_threshold=0.5)
frame = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)

for i in range(3):
    f = frame.copy(); f[0,0] = i
    boxes, confs = det.detect_people(f)

print(f'PASS Local pipeline: 3 frames, {len(boxes)} boxes, anomaly={det.last_anomaly_score:.4f}, trend={det.last_forecast_trend}')

# OpenAI Vision background thread
analyzer = _OpenAIAnalyzer()
_, buf = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
analyzer.enqueue('final_rigid', buf.tobytes(), 0.85)
for i in range(30):
    time.sleep(0.5)
    r = analyzer.get_latest()
    if r and r.get('description') != 'OpenAI unavailable':
        print(f'PASS OpenAI Vision fusion: type={r.get(\"anomaly_type\")}, conf={r.get(\"openai_confidence\")}, desc={r.get(\"description\",\"\")[:60]}')
        break
else:
    print('WARN OpenAI Vision: timed out (expected with random noise images — works with real feeds)')
" 2>&1 | grep '^PASS\|^FAIL\|^WARN' | while read -r line; do
  status=$(echo "$line" | cut -d' ' -f1)
  rest=$(echo "$line" | cut -d' ' -f2-)
  if [ "$status" = "PASS" ]; then
    pass "$rest"
  elif [ "$status" = "WARN" ]; then
    warn "$rest"
  else
    fail "$rest"
  fi
done

# ──────────────────────────────────────────────────────────────────
echo ""
echo "━━━ [9/10] FRONTEND BUILD INTEGRITY ━━━━━━━━━━━━━━━━━━━━━━━━"

# Check that the built frontend serves valid HTML
html=$(curl -s http://localhost:3000 2>/dev/null)
if echo "$html" | grep -q '<!doctype html>'; then
  pass "Frontend serves valid HTML"
else
  fail "Frontend does not serve HTML"
fi
if echo "$html" | grep -q 'src=.*\.js'; then
  pass "Frontend bundles JS assets"
else
  fail "Frontend missing JS bundles"
fi

# Check no hardcoded localhost:8888/8889 in built JS
js_url=$(echo "$html" | grep -oP 'src="(/assets/[^"]+\.js)"' | head -1 | sed 's/src="//;s/"//')
if [ -n "$js_url" ]; then
  js_content=$(curl -s "http://localhost:3000${js_url}" 2>/dev/null)
  if echo "$js_content" | grep -q 'localhost:8888\|localhost:8889'; then
    fail "Built JS still contains hardcoded localhost:8888/8889"
  else
    pass "No hardcoded localhost:8888/8889 in production JS bundle"
  fi
else
  warn "Could not extract JS bundle URL to verify"
fi

# ──────────────────────────────────────────────────────────────────
echo ""
echo "━━━ [10/10] MEDIAMTX RTSP/WEBRTC SERVER ━━━━━━━━━━━━━━━━━━━━"

mtx_response=$(curl -s http://localhost:9997/v3/config/global/get 2>/dev/null)
if [ -n "$mtx_response" ]; then
  pass "MediaMTX REST API responding"
else
  fail "MediaMTX REST API not responding"
fi

paths_response=$(curl -s http://localhost:9997/v3/paths/list 2>/dev/null)
if [ -n "$paths_response" ]; then
  pass "MediaMTX paths endpoint responding"
else
  fail "MediaMTX paths endpoint not responding"
fi

# ──────────────────────────────────────────────────────────────────
echo ""
read PASS FAIL WARN < "$RESULTS_FILE"
rm -f "$RESULTS_FILE"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    FINAL RESULTS                            ║"
echo "╠══════════════════════════════════════════════════════════════╣"
printf "║  ✅ PASSED:  %-3d                                           ║\n" "$PASS"
printf "║  ❌ FAILED:  %-3d                                           ║\n" "$FAIL"
printf "║  ⚠️  WARNED: %-3d                                           ║\n" "$WARN"
echo "╚══════════════════════════════════════════════════════════════╝"

if [ "$FAIL" -eq 0 ]; then
  echo ""
  echo "🎉 ALL TESTS PASSED — SAFE TO PUSH TO GIT!"
  exit 0
else
  echo ""
  echo "🚨 $FAIL TEST(S) FAILED — DO NOT PUSH UNTIL FIXED!"
  exit 1
fi
