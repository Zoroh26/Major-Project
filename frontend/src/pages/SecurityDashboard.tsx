import { useEffect, useState } from 'react';
import HeatMap from '../components/HeatMap';
import CameraFeed from '../components/CameraFeed';
import { useAuthStore } from '../store/auth';

const SecurityDashboard = () => {
  const { user } = useAuthStore();
  const [activeAlert, setActiveAlert] = useState<any>(null);

  useEffect(() => {
    if (user?.role === 'security' && user?.zone) {
      // Connect to WebSocket
      const wsUrl = import.meta.env.VITE_API_URL?.replace('http', 'ws') || 'ws://localhost:8000';
      const ws = new WebSocket(`${wsUrl}/api/v1/alerts/ws?token=${user.token}`);

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'alert' && data.zone === user.zone) {
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
    <div className="h-[98vh] bg-background p-6 overflow-hidden flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-primary">Security Base</h1>
        </div>
      </div>

      {/* 50/50 Split */}
      <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
        <div className="flex flex-col bg-card rounded-lg border border-border p-4">
          <h2 className="text-lg font-semibold text-primary mb-3">Live Feed</h2>
          <div className="flex-1 min-h-0 rounded overflow-hidden">
            <CameraFeed />
          </div>
        </div>
        <div className="flex flex-col bg-card rounded-lg border border-border p-4 relative">
          <h2 className="text-lg font-semibold text-primary mb-3">Live Crowd Density</h2>
          <div className="flex-1 min-h-0 relative rounded overflow-hidden">
            <HeatMap />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityDashboard;
