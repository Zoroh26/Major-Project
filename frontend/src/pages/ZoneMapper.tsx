import React, { useState, useEffect } from 'react';
import { Plus, Video, Settings, Trash2, Loader, Calendar, Edit3, AlignLeft } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import AddCameraModal from '../components/AddCameraModal';
import AddZoneModal from '../components/AddZoneModal';
import { useZoneStore } from '../store/zones';
import CameraFeed from '../components/CameraFeed';

const ZoneMapper: React.FC = () => {
  const { zones, activeZone, fetchZones, fetchZone, assignCamera, unassignCamera, isLoading } = useZoneStore();
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddZoneModalOpen, setIsAddZoneModalOpen] = useState(false);
  const [isEditZoneModalOpen, setIsEditZoneModalOpen] = useState(false);

  useEffect(() => {
    fetchZones();
  }, [fetchZones]);

  useEffect(() => {
    if (zones.length > 0 && !activeZoneId) {
      setActiveZoneId(zones[0].uuid);
    }
  }, [zones, activeZoneId]);

  useEffect(() => {
    if (activeZoneId) {
      fetchZone(activeZoneId);
    }
  }, [activeZoneId, fetchZone]);

  return (
    <div className="h-full flex flex-col items-stretch max-w-7xl mx-auto w-full gap-6 p-2">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-primary">Infrastructure Mapper</h1>
          <p className="text-sm text-primary/60">Configure spatial zones and camera assignments.</p>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[600px]">
        {/* Left Column: Zones List */}
        <div className="md:col-span-4 flex flex-col gap-4">
          <Card className="flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-lg text-primary">Venue Zones</h2>
              <Button variant="secondary" className="px-2 py-1 flex items-center gap-1 text-xs" onClick={() => setIsAddZoneModalOpen(true)}>
                <Plus size={14} /> Add Zone
              </Button>
            </div>
            
            <div className="flex flex-col gap-2 overflow-y-auto">
              {isLoading && zones.length === 0 ? (
                <div className="p-4 text-center text-primary/60"><Loader className="animate-spin inline mr-2" size={16}/>Loading zones...</div>
              ) : (
                zones.map((zone) => (
                  <div 
                    key={zone.uuid}
                    onClick={() => setActiveZoneId(zone.uuid)}
                    className={`p-3 rounded border cursor-pointer transition-all ${
                      activeZoneId === zone.uuid 
                        ? 'border-primary-container bg-surface-container shadow-sm' 
                        : 'border-outline-variant/20 hover:bg-surface-container-low'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-semibold text-sm text-primary">{zone.name}</span>
                      <Badge variant="success">Active</Badge>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-primary/60">
                      <Video size={12} /> {(zone as any).cameras?.length || 0} assigned feeds
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Zone Details & Cameras */}
        <div className="md:col-span-8 flex flex-col gap-4">
          <Card className="flex-1">
            <div className="flex justify-between items-center border-b border-outline-variant/15 pb-4 mb-6">
              <div className="flex items-center gap-3">
                 <h2 className="text-2xl font-extrabold text-primary">
                   {activeZone ? activeZone.name : 'Select a Zone'}
                 </h2>
                 {activeZone && (
                   <button onClick={() => setIsEditZoneModalOpen(true)} className="text-primary/40 hover:text-primary transition bg-surface-container p-1 rounded">
                      <Edit3 size={16} />
                   </button>
                 )}
              </div>
              <Button variant="primary" className="flex items-center gap-2" onClick={() => setIsModalOpen(true)}>
                <Plus size={16} /> Bind Camera
              </Button>
            </div>

            {activeZone && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-primary/60 mb-2">
                    <AlignLeft size={16} />
                    <span className="text-[10px] font-extrabold uppercase tracking-widest">Description</span>
                  </div>
                  <p className="text-sm font-medium text-primary leading-tight">
                    {activeZone.description || 'No description provided.'}
                  </p>
                </div>
                
                <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-xl p-4 border-l-4 border-l-primary/40">
                  <div className="flex items-center gap-2 text-primary/60 mb-2">
                    <Settings size={16} />
                    <span className="text-[10px] font-extrabold uppercase tracking-widest">Alert Threshold</span>
                  </div>
                  <p className="text-2xl font-extrabold text-primary leading-none">
                    {Math.round((activeZone.alert_threshold ?? 0.85) * 100)}%
                  </p>
                </div>

                <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-primary/60 mb-2">
                    <Calendar size={16} />
                    <span className="text-[10px] font-extrabold uppercase tracking-widest">Created Date</span>
                  </div>
                  <p className="text-sm font-medium text-primary">
                    {activeZone.created_at ? new Date(activeZone.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                  </p>
                </div>
              </div>
            )}

            <h3 className="font-semibold text-primary mb-4">Assigned Optical Hardwares</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {activeZone?.cameras?.map((cam) => (
                <div key={cam.uuid} className="border border-outline-variant/20 rounded-md p-4 bg-surface-container-lowest flex flex-col gap-3">
                  <div className="flex justify-between">
                    <span className="font-medium text-sm text-primary">{cam.name}</span>
                    <Badge variant={cam.is_active ? 'success' : 'danger'}>{cam.is_active ? 'Online' : 'Offline'}</Badge>
                  </div>
                  <div className="aspect-video bg-[#001918] rounded flex items-center justify-center relative overflow-hidden group">
                    <CameraFeed
                      webrtcUrl={cam.webrtc_url ?? `http://localhost:8889/${cam.stream_path}`}
                      streamUrl={cam.hls_url ?? `http://localhost:8888/${cam.stream_path}/index.m3u8`}
                      cameraName={cam.name}
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
                      <Button variant="secondary" className="text-xs">Calibrate AI Mapping</Button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-xs mt-1">
                    <span className="text-primary/50 font-mono">{cam.location}</span>
                    <button 
                      className="text-error hover:underline flex items-center gap-1"
                      onClick={async () => {
                        if (activeZoneId) {
                          await unassignCamera(activeZoneId, cam.uuid);
                          fetchZones();
                        }
                      }}
                    >
                      <Trash2 size={12} /> Unbind
                    </button>
                  </div>
                </div>
              ))}
              {(!activeZone?.cameras || activeZone.cameras.length === 0) && (
                <div className="col-span-full p-8 flex flex-col items-center justify-center border-2 border-dashed border-outline-variant/30 rounded-md text-primary/60">
                  <Video size={32} className="mb-2 opacity-50" />
                  <p>No cameras assigned to this zone yet.</p>
                  <p className="text-xs">Click "Bind Camera" to assign one.</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
      <AddCameraModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        zones={zones}
        defaultZoneId={activeZoneId}
        onSuccess={async (cam, zoneId) => {
          if (zoneId && cam.uuid) {
            await assignCamera(zoneId, cam.uuid);
            fetchZones();
            if (zoneId === activeZoneId) fetchZone(zoneId);
          }
          setIsModalOpen(false);
        }}
      />
      <AddZoneModal
        isOpen={isAddZoneModalOpen}
        onClose={() => setIsAddZoneModalOpen(false)}
        onSuccess={() => fetchZones()}
      />
      <AddZoneModal
        isOpen={isEditZoneModalOpen}
        onClose={() => setIsEditZoneModalOpen(false)}
        onSuccess={() => { fetchZones(); if (activeZoneId) fetchZone(activeZoneId); }}
        initialData={activeZone}
      />
    </div>
  );
};

export default ZoneMapper;
