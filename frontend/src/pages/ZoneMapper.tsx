import React, { useState } from 'react';
import { Plus, Video, Map, Settings, Trash2 } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import AddCameraModal from '../components/AddCameraModal';

const mockZones = [
  { id: 'zone_a', name: 'Zone A (North Entrance)', cameraCount: 2, status: 'Active' },
  { id: 'zone_b', name: 'Zone B (Main Lobby)', cameraCount: 1, status: 'Warning' },
  { id: 'zone_c', name: 'Zone C (Stage Front)', cameraCount: 4, status: 'Active' },
];

const mockCameras = [
  { id: 'cam_1', name: 'Gate Alpha Sensor', ip: '192.168.1.101', status: 'Online' },
  { id: 'cam_2', name: 'North Corridor PTZ', ip: '192.168.1.102', status: 'Degraded' },
];

const ZoneMapper: React.FC = () => {
  const [activeZone, setActiveZone] = useState(mockZones[0].id);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
              <Button variant="secondary" className="px-2 py-1 flex items-center gap-1 text-xs">
                <Plus size={14} /> Add Zone
              </Button>
            </div>
            
            <div className="flex flex-col gap-2 overflow-y-auto">
              {mockZones.map((zone) => (
                <div 
                  key={zone.id}
                  onClick={() => setActiveZone(zone.id)}
                  className={`p-3 rounded border cursor-pointer transition-all ${
                    activeZone === zone.id 
                      ? 'border-primary-container bg-surface-container shadow-sm' 
                      : 'border-outline-variant/20 hover:bg-surface-container-low'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold text-sm text-primary">{zone.name}</span>
                    <Badge variant={zone.status === 'Active' ? 'success' : 'warning'}>{zone.status}</Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-primary/60">
                    <Video size={12} /> {zone.cameraCount} assigned feeds
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Column: Zone Details & Cameras */}
        <div className="md:col-span-8 flex flex-col gap-4">
          <Card className="flex-1">
            <div className="flex justify-between items-start border-b border-outline-variant/15 pb-4 mb-6">
              <div>
                <h2 className="text-2xl font-extrabold text-primary mb-1">
                  {mockZones.find(z => z.id === activeZone)?.name}
                </h2>
                <div className="flex items-center gap-4 text-sm text-primary/70">
                  <span className="flex items-center gap-1"><Map size={16} /> Sector 4</span>
                  <span className="flex items-center gap-1"><Settings size={16} /> Alert Threshold: 85%</span>
                </div>
              </div>
              <Button variant="primary" className="flex items-center gap-2" onClick={() => setIsModalOpen(true)}>
                <Plus size={16} /> Bind Camera
              </Button>
            </div>

            <h3 className="font-semibold text-primary mb-4">Assigned Optical Hardwares</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {mockCameras.map((cam) => (
                <div key={cam.id} className="border border-outline-variant/20 rounded-md p-4 bg-surface-container-lowest flex flex-col gap-3">
                  <div className="flex justify-between">
                    <span className="font-medium text-sm text-primary">{cam.name}</span>
                    <Badge variant={cam.status === 'Online' ? 'success' : 'danger'}>{cam.status}</Badge>
                  </div>
                  <div className="aspect-video bg-[#001918] rounded flex items-center justify-center relative overflow-hidden group">
                    <span className="text-white/20 text-xs tracking-widest uppercase">Live Feed Missing</span>
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button variant="secondary" className="text-xs">Calibrate AI Mapping</Button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-xs mt-1">
                    <span className="text-primary/50 font-mono">{cam.ip}</span>
                    <button className="text-error hover:underline flex items-center gap-1"><Trash2 size={12} /> Unbind</button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <AddCameraModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(cam) => {
          setIsModalOpen(false);
        }}
      />
    </div>
  );
};

export default ZoneMapper;
