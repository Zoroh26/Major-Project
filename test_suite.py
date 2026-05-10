import requests
import time
import sys

def check_endpoint(name, url, expected_status=200):
    try:
        r = requests.get(url, timeout=5)
        if r.status_code == expected_status:
            print(f"✅ {name} ({url}): OK (HTTP {r.status_code})")
            return True
        else:
            print(f"❌ {name} ({url}): FAILED (HTTP {r.status_code})")
            return False
    except Exception as e:
        print(f"❌ {name} ({url}): ERROR ({e})")
        return False

print("=== 1. API Health Checks ===")
check_endpoint("Frontend (Nginx)", "http://localhost:3000")
check_endpoint("Backend API Docs", "http://localhost:8000/docs")
check_endpoint("Backend Health", "http://localhost:8000/api/v1/health")
check_endpoint("MediaMTX API", "http://localhost:9997/v3/config/global/get")

print("\n=== 2. ML Inference Test ===")
