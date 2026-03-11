import { useState } from 'react';
import CameraFeed from '../components/CameraFeed';
import HeatMap from '../components/HeatMap';
import DataPanel from '../components/DataPanel';
import { useAuthStore } from '../store/auth';
import { dispatchAlert } from '../services/api';

const ALERT_ZONES = ["top-left", "top-right", "bottom-left", "bottom-right"];

const AdminDashboard = () => {
  const { user } = useAuthStore();
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const toggleZone = (zone: string) => {
    setSelectedZones(prev => 
      prev.includes(zone) ? prev.filter(z => z !== zone) : [...prev, zone]
    );
  };

  const handleBulkDispatch = async () => {
    if (!user?.token || selectedZones.length === 0) return;
    try {
      await Promise.all(selectedZones.map(zone => 
        dispatchAlert(zone, `Emergency in ${zone} zone! Please assist immediately.`, user.token!)
      ));
      setSelectedZones([]);
      setIsConfirmOpen(false);
    } catch (err) {
      console.error(err);
      alert('Failed to dispatch alert.');
    }
  };

  return (
    <div className="h-[98vh] bg-background p-6 overflow-hidden">
      <div className="grid grid-cols-4 gap-2 h-full" style={{ gridTemplateRows: '10% 31% 31% 28%' }}>
        
        {/* Row 1: Header */}
        <div className="col-span-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">Admin Command Center</h1>
            <p className="text-muted-foreground mt-1">
              Welcome, {user?.name}
            </p>
          </div>
          <button 
            onClick={() => useAuthStore.getState().logout()} 
            className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500 px-4 py-2 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>

        {/* Rows 2 & 3: Camera Feed (Left) */}
        <div className="col-span-2 row-span-2 bg-card rounded-lg border border-border p-4 flex flex-col">
          <h2 className="text-lg font-semibold text-primary mb-3">Live Fleet Feed (All Zones)</h2>
          <div className="flex-1 min-h-0 rounded overflow-hidden">
            <CameraFeed />
          </div>
        </div>

        {/* Rows 2 & 3: Heatmap w/ Overlap (Right) */}
        <div className="col-span-2 row-span-2 bg-card rounded-lg border border-border p-4 flex flex-col relative">
          <h2 className="text-lg font-semibold text-primary mb-3">Live Crowd Density</h2>
          <div className="flex-1 min-h-0 relative rounded overflow-hidden">
            <HeatMap />
            
            {/* Overlay Dispatch Buttons on Heatmap Corners */}
            {ALERT_ZONES.map(z => {
              const isSelected = selectedZones.includes(z);
              let posClass = "";
              if (z === 'top-left') posClass = "top-4 left-4";
              if (z === 'top-right') posClass = "top-4 right-4";
              if (z === 'bottom-left') posClass = "bottom-4 left-4";
              if (z === 'bottom-right') posClass = "bottom-4 right-4";

              return (
                <button 
                  key={z} 
                  onClick={() => toggleZone(z)}
                  className={`absolute ${posClass} z-10 px-4 py-2 rounded text-xs font-bold border transition-all shadow-lg backdrop-blur-md ${
                    isSelected 
                      ? 'bg-red-600 text-white border-red-700 scale-110 shadow-red-500/50' 
                      : 'bg-background/80 text-red-500 border-red-500/50 hover:bg-background'
                  }`}
                >
                  {z.split('-').map(w => w[0].toUpperCase() + w.substring(1)).join(' ')}
                </button>
              )
            })}

            {/* Central Dispatch Action Button */}
            {selectedZones.length > 0 && (
              <button 
                onClick={() => setIsConfirmOpen(true)}
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full font-bold shadow-[0_0_20px_rgba(220,38,38,0.6)] animate-pulse border-2 border-red-400"
              >
                DISPATCH ({selectedZones.length})
              </button>
            )}
            
          </div>
        </div>

        {/* Row 4: Metrics Footer */}
        <div className="col-span-4 bg-card rounded-lg border border-border p-3 overflow-hidden">
          <DataPanel />
        </div>
      </div>

      {/* Confirmation Dialog Overlay */}
      {isConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card p-6 rounded-xl border border-red-500 max-w-md w-full shadow-2xl text-center">
            <h2 className="text-2xl font-bold text-red-500 mb-4 flex items-center justify-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span>
              CONFIRM DISPATCH
            </h2>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to dispatch security personnel to the following zones?
            </p>
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {selectedZones.map(z => (
                <span key={z} className="bg-red-500/20 text-red-500 px-3 py-1 rounded border border-red-500/50 uppercase text-xs font-bold tracking-wider">
                  {z}
                </span>
              ))}
            </div>
            <div className="flex items-center justify-center gap-4">
              <button 
                onClick={() => setIsConfirmOpen(false)}
                className="px-6 py-2 rounded font-bold border border-muted-foreground text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleBulkDispatch}
                className="px-6 py-2 rounded font-bold bg-red-600 hover:bg-red-700 text-white transition-colors"
              >
                Execute Dispatch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
