import { useEffect, useRef, useState } from 'react';
import HeatMap from '../components/HeatMap';
import DataPanel from '../components/DataPanel';
import { useAuthStore } from '../store/auth';
import {
  createMlDevStream,
  getMlDevLatest,
  startMlDevSession,
  stopMlDevSession,
  type MlResultPayload,
  type MlSourceMode,
} from '../services/api';

const SecurityDashboard = () => {
  const { user } = useAuthStore();
  const [activeAlert, setActiveAlert] = useState<any>(null);
  const [sourceMode, setSourceMode] = useState<MlSourceMode>('direct_webcam');
  const [latestPayload, setLatestPayload] = useState<MlResultPayload | null>(null);
  const [mlStatus, setMlStatus] = useState<'idle' | 'starting' | 'running' | 'error' | 'stopped'>('idle');
  const [mlError, setMlError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const webcamRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (user?.role === 'security' && user?.token) {
      // Connect to WebSocket
      const wsUrl = import.meta.env.VITE_API_URL?.replace('http', 'ws') || 'ws://localhost:8000';
      const ws = new WebSocket(`${wsUrl}/api/v1/alerts/ws?token=${user.token}`);

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'alert') {
          setActiveAlert(data);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket Error:", error);
      };

      return () => {
        ws.close();
      };
    }
  }, [user]);

  useEffect(() => {
    const video = webcamRef.current;
    if (!video || !navigator.mediaDevices?.getUserMedia) {
      return;
    }

    let stream: MediaStream | null = null;

    const attachStream = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        video.srcObject = stream;
        await video.play();
      } catch {
        // Ignore webcam preview errors and keep ML stream controls available.
      }
    };

    attachStream();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const closeMlSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  const connectMlSocket = () => {
    closeMlSocket();

    const ws = createMlDevStream(
      (payload) => {
        setLatestPayload(payload);
        setMlStatus('running');
      },
      () => {
        setMlStatus('error');
        setMlError('WebSocket stream error');
      }
    );

    ws.onopen = () => {
      setMlStatus('running');
      setMlError(null);
    };

    ws.onclose = () => {
      setMlStatus((prev) => (prev === 'stopped' ? prev : 'idle'));
    };

    wsRef.current = ws;
  };

  const startMlSession = async () => {
    setMlStatus('starting');
    setMlError(null);

    try {
      await startMlDevSession({ source_mode: sourceMode });
      const latestResponse = await getMlDevLatest();
      if (latestResponse.data.latest) {
        setLatestPayload(latestResponse.data.latest);
      }
      connectMlSocket();
    } catch (error: any) {
      setMlStatus('error');
      setMlError(error?.response?.data?.detail || error?.message || 'Failed to start ML session');
    }
  };

  const stopMlSession = async () => {
    closeMlSocket();
    setMlStatus('stopped');

    try {
      await stopMlDevSession();
    } catch {
      // Stop action should still close local stream state on the frontend.
    }
  };

  useEffect(() => {
    startMlSession();

    return () => {
      closeMlSocket();
      stopMlDevSession().catch(() => {
        // Ignore cleanup stop errors during unmount.
      });
    };
  }, []);

  if (activeAlert && user?.role === 'security') {
    return (
      <div className="h-screen w-screen bg-red-600 flex flex-col items-center justify-center p-6 text-white overflow-hidden">
        <h1 className="text-6xl font-bold mb-8 animate-pulse text-center">EMERGENCY ALERT</h1>
        <div className="bg-white text-black p-8 rounded-xl shadow-2xl text-center max-w-2xl">
          <h2 className="text-4xl font-bold mb-4 capitalize">{activeAlert.zone} Zone</h2>
          <p className="text-2xl mb-8">{activeAlert.message}</p>
          <button 
            onClick={() => setActiveAlert(null)}
            className="bg-red-600 text-white px-8 py-4 rounded-lg text-2xl font-bold hover:bg-red-700 transition"
          >
            Acknowledge & Resolve
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[85vh] bg-background p-6 overflow-hidden flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-primary">Security Base</h1>
          <p className="text-sm text-primary/70 mt-1">
            ML Status: <span className="font-semibold uppercase">{mlStatus}</span>
            {mlError ? ` | ${mlError}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={sourceMode}
            onChange={(event) => setSourceMode(event.target.value as MlSourceMode)}
            className="px-3 py-2 rounded border border-border bg-card text-primary text-sm"
          >
            <option value="direct_webcam">Direct Webcam</option>
            <option value="mediamtx">MediaMTX</option>
          </select>
          <button
            onClick={startMlSession}
            className="px-3 py-2 rounded bg-green-600 text-white text-sm font-semibold hover:bg-green-700"
          >
            Start
          </button>
          <button
            onClick={stopMlSession}
            className="px-3 py-2 rounded bg-red-600 text-white text-sm font-semibold hover:bg-red-700"
          >
            Stop
          </button>
        </div>
      </div>

      {/* 50/50 Split */}
      <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
        <div className="flex flex-col bg-card rounded-lg border border-border p-4">
          <h2 className="text-lg font-semibold text-primary mb-3">Webcam Preview</h2>
          <div className="flex-1 min-h-0 rounded overflow-hidden bg-black border border-border relative">
            <video
              ref={webcamRef}
              className="w-full h-full object-contain"
              muted
              autoPlay
              playsInline
            />
            <div className="absolute top-3 right-3 px-2 py-1 rounded bg-red-600 text-white text-xs font-semibold">
              LIVE
            </div>
          </div>
        </div>
        <div className="flex flex-col bg-card rounded-lg border border-border p-4 relative">
          <h2 className="text-lg font-semibold text-primary mb-3">Live Crowd Density</h2>
          <div className="flex-1 min-h-0 relative rounded overflow-hidden">
            <HeatMap heatmap={latestPayload?.heatmap} />
          </div>
        </div>
      </div>

      <div className="shrink-0 bg-card rounded-lg border border-border p-3">
        <DataPanel
          metrics={latestPayload?.metrics}
          sourceMode={latestPayload?.source_mode ?? sourceMode}
        />
      </div>
    </div>
  );
};

export default SecurityDashboard;
