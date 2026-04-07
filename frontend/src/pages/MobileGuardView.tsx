import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertOctagon, MapPin, Clock, ShieldCheck, ArrowRight, User, Wifi, WifiOff, Eye, Loader2, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { useZoneStore } from '../store/zones';
import CameraFeed from '../components/CameraFeed';
import { Button } from '../components/ui/Button';

const MobileGuardView: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { activeZone, fetchZone, isLoading: isZoneLoading } = useZoneStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initView = async () => {
      if (user?.zone_id) {
        try {
          await fetchZone(user.zone_id);
        } catch (error) {
          console.error('Failed to load assigned zone:', error);
        }
      }
      setIsLoading(false);
    };

    initView();
  }, [user?.zone_id, fetchZone]);

  const handleCameraClick = (cameraId: string) => {
    navigate(`/guard-view/camera/${cameraId}`);
  };

  // If no zone is assigned, show a professional fallback
  if (!isLoading && !user?.zone_id) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 text-center gap-6">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary animate-pulse">
           <ShieldAlert size={40} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-primary mb-2">Awaiting Sector Assignment</h1>
          <p className="text-primary/60 max-w-sm mx-auto">
            Welcome, <strong>{user?.name || 'Officer'}</strong>. Your account is active, but you haven't been deployed to a specific zone yet. 
            Please contact Dispatch to receive your assignment.
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <div className="p-4 rounded-xl border border-outline-variant/10 bg-surface-container-low flex items-center gap-3">
             <div className="p-2 bg-primary/10 rounded-lg text-primary"><User size={20} /></div>
             <div className="text-left">
                <p className="text-xs font-bold text-primary/40 uppercase">Profile Status</p>
                <p className="text-sm font-semibold text-primary">{user?.rank || 'Security Personnel'}</p>
             </div>
          </div>
          <Button variant="secondary" onClick={() => window.location.reload()}>Refresh Status</Button>
        </div>
      </div>
    );
  }

  if (isLoading || isZoneLoading) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-4">
        <Loader2 size={40} className="animate-spin text-primary/40" />
        <p className="text-sm font-medium text-primary/60 tracking-widest uppercase">Synchronizing with HQ...</p>
      </div>
    );
  }

  const officerName = user?.name || 'Officer';
  const officerRank = user?.rank || 'Security';
  const zoneName = activeZone?.name || 'Assigned Zone';
  const cameras = activeZone?.cameras || [];
  return (
    <div className="min-h-screen bg-surface flex flex-col lg:flex-row overflow-hidden relative">
      
      {/* Top Header - Mobile, Hidden on Desktop */}
      <header className="bg-primary-container text-on-primary-container p-4 pb-6 flex items-center justify-between shadow-md relative z-10 lg:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-surface-container-low text-primary flex items-center justify-center border-2 border-primary">
            <User size={20} />
          </div>
          <div>
            <h1 className="font-bold leading-tight tracking-wide">{officerName}</h1>
            <p className="text-xs text-on-primary-container/70 tracking-wider font-semibold uppercase">{officerRank} • Active Duty</p>
          </div>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-primary-container text-on-primary-container border-r border-outline-variant/20 shadow-lg">
        <div className="p-6 border-b border-outline-variant/20">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-surface-container-low text-primary flex items-center justify-center border-2 border-primary">
              <User size={24} />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-wide">{officerName}</h1>
              <p className="text-xs text-on-primary-container/70 tracking-wider font-semibold uppercase">{officerRank} • Active Duty</p>
            </div>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-lg p-3 flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
            <div>
              <div className="text-primary font-bold text-sm">Assigned: {zoneName}</div>
              <div className="text-xs text-primary/50 font-semibold">{activeZone?.description || 'All Clear'}</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-6 space-y-4">
          <button className="w-full flex items-center gap-3 text-left font-bold p-3 rounded-lg bg-surface-container/40 hover:bg-surface-container/60 transition-all text-primary">
            <AlertOctagon size={20} className="text-error" />
            <span>ALERTS</span>
          </button>
          <button className="w-full flex items-center gap-3 text-left font-bold p-3 rounded-lg hover:bg-surface-container/40 transition-all text-on-primary-container/70">
            <ShieldCheck size={20} />
            <span>STATUS</span>
          </button>
        </nav>
      </aside>

      {/* Assignment Banner - Mobile Only */}
      <div className="px-4 -mt-4 relative z-20 lg:hidden">
        <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-lg p-3 shadow-md flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary font-bold">
            <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
            Assigned: {zoneName}
          </div>
          <span className="text-xs font-semibold text-primary/50 bg-surface-container p-1 px-2 rounded">
            All Clear
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-4 lg:p-5 flex flex-col gap-4 mt-2 lg:mt-0 overflow-y-auto pb-24 lg:pb-4 max-w-5xl mx-auto w-full">
        
        {/* Urgent Alert Card */}
        <div className="bg-error/10 border-2 border-error/50 rounded-xl p-5 lg:p-5 shadow-[0_8px_32px_rgba(186,26,26,0.15)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-error animate-pulse"></div>
          
          <div className="flex flex-col lg:flex-row lg:items-start gap-3 lg:gap-4 mb-4">
            <div className="bg-error text-on-error p-2.5 rounded-lg shrink-0">
              <AlertOctagon size={24} />
            </div>
            <div className="flex-1">
              <h2 className="text-error font-extrabold text-lg leading-tight uppercase tracking-widest">Congestion Alert</h2>
              <p className="text-xs text-error/80 font-bold mt-0.5">PRIORITY: CRITICAL</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 bg-surface-container-lowest/50 rounded-lg p-3 mb-4 border border-error/10">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <MapPin size={16} className="text-error shrink-0" /> 
              <span>{zoneName} — Tactical Hub</span>
            </div>
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Clock size={16} className="text-primary/60 shrink-0" /> 
              <span>Detected 2m 14s ago</span>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-2">
            <button className="flex-1 bg-error hover:bg-red-800 text-on-error font-bold py-3 px-4 rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-base">
              <ArrowRight size={18} /> EN ROUTE / RESPOND
            </button>
            <button className="flex-1 lg:flex-none lg:px-4 bg-transparent border-2 border-error/30 text-error hover:bg-error/5 font-bold py-3 text-sm rounded-xl transition-all">
              Mark as False Alarm
            </button>
          </div>
        </div>

        {/* Assigned Cameras Grid */}
        <div className="mt-6">
          <h3 className="text-lg font-bold text-primary mb-4">Assigned Optical Hardwares</h3>
          {cameras.length === 0 ? (
            <div className="text-center py-12 border border-outline-variant/15 rounded-xl bg-surface-container-low/30 flex flex-col items-center gap-3">
              <ShieldCheck size={32} className="text-primary/20" />
              <p className="text-primary/60 font-medium">No optical hardware linked to this sector yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {cameras.map((camera) => {
                const isOnline = camera.is_active;
                const statusColor = isOnline ? 'text-green-500' : 'text-error';
                const statusBg = isOnline ? 'bg-green-500/10' : 'bg-error/10';
                const statusBorder = isOnline ? 'border-green-500/30' : 'border-error/30';
                const statusLabel = isOnline ? 'Online' : 'Degraded';

                return (
                  <div
                    key={camera.uuid}
                    className="border border-outline-variant/15 rounded-xl bg-surface-container-low/30 overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all cursor-pointer"
                    onClick={() => handleCameraClick(camera.uuid)}
                  >
                    {/* Camera Feed */}
                    <div className="w-full h-40 bg-black relative overflow-hidden">
                      <CameraFeed
                        webrtcUrl={camera.webrtc_url ?? `http://localhost:8889/${camera.stream_path}`}
                        streamUrl={camera.hls_url ?? `http://localhost:8888/${camera.stream_path}/index.m3u8`}
                        cameraName={camera.name}
                      />
                    </div>

                    {/* Camera Info Footer */}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-bold text-primary text-sm lg:text-base">{camera.name}</h4>
                          <p className="text-xs text-primary/60 mt-1">{camera.location}</p>
                        </div>
                        <div className={`px-2 py-1 rounded text-xs font-semibold ${statusBg} border ${statusBorder}`}>
                          <div className="flex items-center gap-1.5">
                            {isOnline ? (
                              <Wifi size={14} className={statusColor} />
                            ) : (
                              <WifiOff size={14} className={statusColor} />
                            )}
                            <span className={statusColor}>{statusLabel}</span>
                          </div>
                        </div>
                      </div>

                      {/* Stream Path */}
                      <div className="mb-3 pb-3 border-b border-outline-variant/10">
                        <p className="text-xs text-primary/60 mb-1">Stream:</p>
                        <p className="text-xs font-mono text-primary/80 break-all">{camera.stream_path}</p>
                      </div>

                      {/* Action Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCameraClick(camera.uuid);
                        }}
                        className="w-full py-2 px-3 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-sm transition-all flex items-center justify-center gap-2 border border-primary/30"
                      >
                        <Eye size={16} /> View Stats
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </main>

      {/* Mobile Bottom Nav */}
      <nav className="bg-surface-container border-t border-outline-variant/15 p-3 flex justify-around items-center fixed bottom-0 w-full pb-4 lg:hidden">
        <button className="flex flex-col items-center gap-1 text-primary">
          <AlertOctagon size={24} className="text-error drop-shadow-[0_0_8px_rgba(186,26,26,0.5)]" />
          <span className="text-[10px] font-bold">ALERTS</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-primary/40">
          <ShieldCheck size={24} />
          <span className="text-[10px] font-bold">STATUS</span>
        </button>
      </nav>
    </div>
  );
};

export default MobileGuardView;
