import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertOctagon, MapPin, Clock, ShieldCheck, ArrowRight, User, Eye, Loader2, ShieldAlert, LogOut, Radio, Phone, Navigation, Users } from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { useZoneStore } from '../store/zones';
import { useEscalationStore } from '../store/escalations';
import CameraFeed from '../components/CameraFeed';
import { Button } from '../components/ui/Button';

const MobileGuardView: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { activeZone, fetchZone, isLoading: isZoneLoading } = useZoneStore();
  const {
    assignedToMe,
    fetchAssignedToMe,
    actOnEscalation,
    resolveEscalation,
    markFalseAlarm,
    startPolling,
    stopPolling,
    isLoading: isEscalationLoading,
  } = useEscalationStore();
  const [isLoading, setIsLoading] = useState(true);
  const [actionNote, setActionNote] = useState('Security team en route and assessing situation.');

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

  useEffect(() => {
    if (user?.role !== 'security') return;

    fetchAssignedToMe();
    startPolling();

    return () => {
      stopPolling();
    };
  }, [user?.role, fetchAssignedToMe, startPolling, stopPolling]);

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
  const activeEscalation = assignedToMe.find(
    (e) => e.status !== 'resolved' && e.status !== 'false_alarm'
  );

  const formatElapsed = (createdAt?: string) => {
    if (!createdAt) return 'Unknown';
    const diffMs = Date.now() - new Date(createdAt).getTime();
    const mins = Math.max(1, Math.floor(diffMs / 60000));
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ${mins % 60}m ago`;
  };

  const handleRespond = async () => {
    if (!activeEscalation) return;
    const note = actionNote.trim() || 'Security team en route and assessing situation.';
    await actOnEscalation(activeEscalation.uuid, note);
  };

  const handleResolve = async () => {
    if (!activeEscalation) return;
    await resolveEscalation(activeEscalation.uuid);
  };

  const handleFalseAlarm = async () => {
    if (!activeEscalation) return;
    await markFalseAlarm(activeEscalation.uuid);
  };

  const escalationStatusLabel = activeEscalation ? activeEscalation.status.replace('_', ' ').toUpperCase() : 'NO ACTIVE INCIDENT';
  const escalationPriorityLabel = activeEscalation ? activeEscalation.priority.toUpperCase() : 'N/A';
  const escalationTitle = activeEscalation?.title || 'No Active Escalation';
  const escalationId = activeEscalation ? `#${activeEscalation.uuid.slice(-8).toUpperCase()}` : '#------';
  const escalationLocation = activeEscalation?.zone_uuid === activeZone?.uuid ? zoneName : zoneName;
  const hasActiveEscalation = Boolean(activeEscalation);

  const incidentCardClass = hasActiveEscalation
    ? 'bg-error/10 border-2 border-error/50 shadow-[0_8px_32px_rgba(186,26,26,0.15)]'
    : 'bg-surface-container-low border border-outline-variant/20 shadow-sm';

  const incidentHeaderClass = hasActiveEscalation
    ? 'text-error'
    : 'text-primary';

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
        <div className="p-6 border-t border-outline-variant/20">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 text-left font-bold p-3 rounded-lg hover:bg-surface-container/40 transition-all text-error hover:text-red-400"
          >
            <LogOut size={20} />
            <span>LOGOUT</span>
          </button>
        </div>
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
      <main className="flex-1 p-4 lg:p-6 flex flex-col gap-6 mt-2 lg:mt-0 overflow-y-auto pb-24 lg:pb-6 max-w-7xl mx-auto w-full">

        {/* Active Incident Card */}
        <div className={`${incidentCardClass} rounded-xl p-5 relative overflow-hidden`}>
          {hasActiveEscalation && (
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-error via-red-600 to-error animate-pulse"></div>
          )}
          
          <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4">
            {/* Incident Header */}
            <div className="lg:col-span-2">
              <div className="flex items-start gap-3 mb-4">
                <div className="bg-error text-on-error p-2.5 rounded-lg shrink-0 shadow-lg">
                  <AlertOctagon size={24} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className={`${incidentHeaderClass} font-extrabold text-lg uppercase tracking-widest`}>{escalationTitle}</h2>
                    <span className={`${hasActiveEscalation ? 'bg-error text-on-error' : 'bg-surface-container text-primary'} text-xs font-bold px-2 py-0.5 rounded-full`}>{escalationPriorityLabel}</span>
                  </div>
                  <p className="text-xs text-primary/70 font-semibold">Incident {escalationId} • {escalationStatusLabel}</p>
                </div>
              </div>

              <div className="space-y-2 mb-4 bg-surface-container-lowest/50 rounded-lg p-3 border border-error/10">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <MapPin size={16} className={`${hasActiveEscalation ? 'text-error' : 'text-primary/60'} shrink-0`} /> 
                  <span>{escalationLocation}</span>
                </div>
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <Clock size={16} className="text-primary/60 shrink-0" /> 
                  <span>Detected {formatElapsed(activeEscalation?.created_at)} • Last update {formatElapsed(activeEscalation?.updated_at || activeEscalation?.created_at)}</span>
                </div>
              </div>

              <textarea
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                placeholder="Add response note for this escalation"
                className="w-full rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 py-2 text-sm text-primary mb-3"
                rows={2}
                disabled={!activeEscalation || isEscalationLoading}
              />
            </div>

            {/* Quick Response */}
            <div className="lg:flex flex-col justify-between hidden">
              <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-lg p-3">
                <p className="text-xs text-primary/60 mb-2 font-semibold uppercase tracking-wide">Response Console</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-primary/70">Time to Response</span>
                    <span className="font-bold text-primary">{activeEscalation ? formatElapsed(activeEscalation.created_at) : '--'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-primary/70">Assigned Unit</span>
                    <span className="font-bold text-primary">{officerName}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-4 rounded-lg border border-outline-variant/20 bg-surface-container-lowest p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary/60 mb-3">Resolve Escalation</p>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
              <button
                onClick={handleRespond}
                disabled={!activeEscalation || isEscalationLoading}
                className="lg:col-span-2 bg-error hover:bg-red-800 disabled:bg-error/40 disabled:cursor-not-allowed text-on-error font-bold py-3 px-4 rounded-lg shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-base"
              >
                <ArrowRight size={18} /> {isEscalationLoading ? 'UPDATING...' : 'EN ROUTE / RESPOND'}
              </button>
              <button
                onClick={handleResolve}
                disabled={!activeEscalation || isEscalationLoading}
                className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all"
              >
                {isEscalationLoading ? 'PROCESSING...' : 'RESOLVE INCIDENT'}
              </button>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-primary/60">Use false alarm only when the alert is invalid.</p>
              <button
                onClick={handleFalseAlarm}
                disabled={!activeEscalation || isEscalationLoading}
                className="text-sm text-error hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed font-bold transition-colors"
              >
                MARK FALSE ALARM
              </button>
            </div>
          </div>

          {!activeEscalation && (
            <div className="mt-3 text-xs font-medium text-primary/70">
              No active escalations in your assignment queue.
            </div>
          )}
        </div>

        {/* Cameras Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-primary">Assigned Optical Hardwares</h3>
              <p className="text-xs text-primary/60 mt-0.5">{cameras.length} devices • {cameras.filter((c) => c.is_active).length} online</p>
            </div>
          </div>
          {cameras.length === 0 ? (
            <div className="text-center py-12 border border-outline-variant/15 rounded-xl bg-surface-container-low/30 flex flex-col items-center gap-3">
              <ShieldCheck size={32} className="text-primary/20" />
              <p className="text-primary/60 font-medium">No optical hardware linked to this sector yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {cameras.map((camera) => {
                const isOnline = camera.is_active;
                const statusColor = isOnline ? 'text-green-500' : 'text-error';
                const statusBg = isOnline ? 'bg-green-500/10' : 'bg-error/10';
                const statusBorder = isOnline ? 'border-green-500/30' : 'border-error/30';
                const statusLabel = isOnline ? 'Online' : 'Offline';

                return (
                  <div
                    key={camera.uuid}
                    className="border border-outline-variant/20 rounded-xl bg-surface-container-low/50 overflow-hidden hover:shadow-xl hover:border-primary/40 transition-all cursor-pointer group"
                    onClick={() => handleCameraClick(camera.uuid)}
                  >
                    {/* Camera Feed */}
                    <div className="w-full h-44 bg-black relative overflow-hidden group-hover:opacity-90 transition-opacity">
                      <CameraFeed
                        webrtcUrl={camera.webrtc_url ?? `http://localhost:8889/${camera.stream_path}`}
                        streamUrl={camera.hls_url ?? `http://localhost:8888/${camera.stream_path}/index.m3u8`}
                        cameraName={camera.name}
                      />
                      {/* Status Badge Overlay */}
                      <div className={`absolute top-2 right-2 px-3 py-1 rounded-full text-xs font-bold ${statusBg} border ${statusBorder} backdrop-blur-sm flex items-center gap-1.5`}>
                        <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-error'}`}></span>
                        <span className={statusColor}>{statusLabel}</span>
                      </div>
                    </div>

                    {/* Camera Info */}
                    <div className="p-4">
                      <div className="mb-3">
                        <h4 className="font-bold text-primary text-sm mb-1">{camera.name}</h4>
                        <p className="text-xs text-primary/60 flex items-center gap-1">
                          <MapPin size={12} /> {camera.location}
                        </p>
                      </div>

                      {/* Stream Info */}
                      <div className="mb-3 pb-3 border-b border-outline-variant/10">
                        <p className="text-xs text-primary/60 mb-1 font-semibold">Stream Path</p>
                        <p className="text-xs font-mono text-primary/80 break-all truncate">{camera.stream_path}</p>
                      </div>

                      {/* Quick Stats */}
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="bg-surface-container rounded p-2 text-center">
                          <p className="text-xs text-primary/60 font-semibold">FPS</p>
                          <p className="text-sm font-bold text-primary">30</p>
                        </div>
                        <div className="bg-surface-container rounded p-2 text-center">
                          <p className="text-xs text-primary/60 font-semibold">Uptime</p>
                          <p className="text-sm font-bold text-primary">99%</p>
                        </div>
                      </div>

                      {/* Action Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCameraClick(camera.uuid);
                        }}
                        className="w-full py-2.5 px-3 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-bold text-sm transition-all flex items-center justify-center gap-2 border border-primary/30 group-hover:border-primary/60"
                      >
                        <Eye size={16} /> View Live Feed
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
        <button
          onClick={logout}
          className="flex flex-col items-center gap-1 text-error hover:text-red-400 transition-colors"
        >
          <LogOut size={24} />
          <span className="text-[10px] font-bold">LOGOUT</span>
        </button>
      </nav>
    </div>
  );
};

export default MobileGuardView;
