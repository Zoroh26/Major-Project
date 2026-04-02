import { useState, useEffect } from 'react';
import CameraFeed from '../components/CameraFeed';
import { getCameras, type Camera } from '../services/api';
import { useAuthStore } from '../store/auth';

const CameraGridDashboard = () => {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const { user } = useAuthStore();

  useEffect(() => {
    getCameras()
      .then((res) => setCameras(res.data.data))
      .catch(() => {});
  }, []);

  return (
    <div className="h-[85vh] bg-background p-6 overflow-hidden flex flex-col gap-4">

      {/* Camera Grid */}
      <div className="flex-1 overflow-hidden">
        <div className="grid grid-cols-2 grid-rows-2 gap-4 h-full">
          {Array.from({ length: 4 }).map((_, i) => {
            const camera = cameras[i];
            return camera ? (
              <div key={camera.uuid} className="bg-card rounded-lg border-2 border-primary overflow-hidden flex flex-col min-h-0">
                <div className="flex-1 min-h-0">
                  <CameraFeed
                    webrtcUrl={camera.webrtc_url ?? `http://localhost:8889/${camera.stream_path}`}
                    streamUrl={camera.hls_url ?? `http://localhost:8888/${camera.stream_path}/index.m3u8`}
                    cameraName={camera.name}
                  />
                </div>
                <div className="px-3 py-2 shrink-0">
                  <p className="text-sm font-semibold text-primary">{camera.name}</p>
                  <p className="text-xs text-gray-400">📍 {camera.location}</p>
                </div>
              </div>
            ) : (
              <div key={`empty-${i}`} className="bg-card rounded-lg border-2 border-primary border-dashed flex items-center justify-center min-h-0">
                <div className="text-center">
                  <div className="text-3xl mb-2 opacity-30">📷</div>
                  <p className="text-xs text-gray-500">No camera</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CameraGridDashboard;
