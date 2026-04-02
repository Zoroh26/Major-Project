import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Wifi, WifiOff, Eye, Activity, Zap, HardDrive } from 'lucide-react';
import { getCamera } from '../services/api';
import { toast } from 'react-toastify';
import CameraFeed from '../components/CameraFeed';
import type { Camera } from '../services/api';

const CameraStats: React.FC = () => {
  const { cameraId } = useParams<{ cameraId: string }>();
  const navigate = useNavigate();
  const [camera, setCamera] = useState<Camera | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cameraId) {
      navigate('/guard-view');
      return;
    }

    const fetchCamera = async () => {
      try {
        const response = await getCamera(cameraId);
        setCamera(response.data);
      } catch (error: any) {
        toast.error('Failed to load camera details');
        navigate('/guard-view');
      } finally {
        setLoading(false);
      }
    };

    fetchCamera();
  }, [cameraId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-primary text-3xl mb-2">⏳</div>
          <p className="text-primary">Loading camera details...</p>
        </div>
      </div>
    );
  }

  if (!camera) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <p className="text-error">Camera not found</p>
        </div>
      </div>
    );
  }

  const isOnline = camera.is_active;
  const status = isOnline ? 'Online' : 'Offline';
  const statusColor = isOnline ? 'text-green-500' : 'text-error';
  const bgColor = isOnline ? 'bg-green-500/10' : 'bg-error/10';
  const borderColor = isOnline ? 'border-green-500/30' : 'border-error/30';

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Header */}
      <header className="bg-primary-container text-on-primary-container p-4 shadow-md sticky top-0 z-40">
        <div className="flex items-center gap-4 max-w-6xl mx-auto">
          <button
            onClick={() => navigate('/guard-view')}
            className="p-2 hover:bg-surface-container/40 rounded-lg transition-all"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{camera.name}</h1>
            <p className="text-sm text-on-primary-container/70">{camera.location}</p>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${bgColor} border ${borderColor}`}>
            <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-error'}`} />
            <span className={`text-sm font-bold ${statusColor}`}>{status}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 lg:p-6 overflow-y-auto max-w-6xl mx-auto w-full">
        {/* Live Feed Section */}
        <div className="mb-6">
          <div className="bg-surface-container-low rounded-xl overflow-hidden border border-outline-variant/15 shadow-md">
            <div className="aspect-video bg-black flex items-center justify-center">
              <CameraFeed
                webrtcUrl={camera.webrtc_url ?? `http://localhost:8889/${camera.stream_path}`}
                streamUrl={camera.hls_url ?? `http://localhost:8888/${camera.stream_path}/index.m3u8`}
                cameraName={camera.name}
              />
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Status Card */}
          <div className={`p-4 rounded-lg border ${borderColor} ${bgColor}`}>
            <div className="flex items-center gap-3 mb-2">
              {isOnline ? (
                <Wifi size={20} className="text-green-500" />
              ) : (
                <WifiOff size={20} className="text-error" />
              )}
              <span className="text-xs font-bold text-on-surface/60 uppercase">Status</span>
            </div>
            <p className={`text-lg font-bold ${statusColor}`}>{status}</p>
          </div>

          {/* Stream Path Card */}
          <div className="p-4 rounded-lg border border-outline-variant/15 bg-surface-container-low/30">
            <div className="flex items-center gap-3 mb-2">
              <Eye size={20} className="text-primary" />
              <span className="text-xs font-bold text-on-surface/60 uppercase">Stream</span>
            </div>
            <p className="text-xs font-mono text-primary break-all">{camera.stream_path}</p>
          </div>

          {/* RTSP URL Card */}
          <div className="p-4 rounded-lg border border-outline-variant/15 bg-surface-container-low/30">
            <div className="flex items-center gap-3 mb-2">
              <Activity size={20} className="text-primary" />
              <span className="text-xs font-bold text-on-surface/60 uppercase">RTSP</span>
            </div>
            <p className="text-xs font-mono text-primary/70 break-all">{camera.rtsp_url}</p>
          </div>

          {/* Uptime Card */}
          <div className="p-4 rounded-lg border border-outline-variant/15 bg-surface-container-low/30">
            <div className="flex items-center gap-3 mb-2">
              <Zap size={20} className="text-primary" />
              <span className="text-xs font-bold text-on-surface/60 uppercase">Active Since</span>
            </div>
            <p className="text-xs text-primary">
              {new Date(camera.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Detailed Info Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Camera Information */}
          <div className="p-5 rounded-lg border border-outline-variant/15 bg-surface-container-low/30">
            <h2 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
              <HardDrive size={20} />
              Camera Information
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-sm text-on-surface/60">Camera Name:</span>
                <span className="text-sm font-semibold text-primary text-right">{camera.name}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-sm text-on-surface/60">Location:</span>
                <span className="text-sm font-semibold text-primary text-right">{camera.location}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-sm text-on-surface/60">Camera UUID:</span>
                <span className="text-xs font-mono text-primary/70 text-right break-all">{camera.uuid}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-sm text-on-surface/60">Status:</span>
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-error'}`} />
                  <span className={`text-sm font-semibold ${statusColor}`}>{status}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stream Information */}
          <div className="p-5 rounded-lg border border-outline-variant/15 bg-surface-container-low/30">
            <h2 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
              <Activity size={20} />
              Stream Information
            </h2>
            <div className="space-y-4">
              <div>
                <span className="text-xs text-on-surface/60 uppercase font-bold">HLS Stream</span>
                <p className="text-xs font-mono text-primary/70 break-all mt-1">
                  {camera.hls_url || `http://localhost:8888/${camera.stream_path}/index.m3u8`}
                </p>
              </div>
              <div>
                <span className="text-xs text-on-surface/60 uppercase font-bold">WebRTC Stream</span>
                <p className="text-xs font-mono text-primary/70 break-all mt-1">
                  {camera.webrtc_url || `http://localhost:8889/${camera.stream_path}`}
                </p>
              </div>
              <div >
                <span className="text-xs text-on-surface/60 uppercase font-bold">Last Updated</span>
                <p className="text-xs text-primary mt-1">
                  {camera.updated_at
                    ? new Date(camera.updated_at).toLocaleString()
                    : 'Never'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CameraStats;
