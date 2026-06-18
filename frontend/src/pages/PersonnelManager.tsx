import React, { useEffect, useState } from 'react';
import { Users, CheckCircle, AlertOctagon, User, Filter, MapPin, Plus, Loader, Pencil } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useNavigate } from 'react-router-dom';
import { useZoneStore } from '../store/zones';
import EditPersonnelModal from '../components/EditPersonnelModal';
import type { User as UserType } from '../types/auth';

const PersonnelManager: React.FC = () => {
  const navigate = useNavigate();
  const { guards, zones, fetchGuards, fetchZones, isLoading } = useZoneStore();
  const [editingGuard, setEditingGuard] = useState<UserType | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    fetchGuards();
    fetchZones();
  }, [fetchGuards, fetchZones]);

  // Derived stats
  const totalStaff = guards.length;
  const onDutyCount = guards.filter(g => g.zone_id).length;
  const respondingCount = 0; // Placeholder for now
  const stationaryCount = totalStaff - onDutyCount;

  return (
    <div className="h-full flex flex-col max-w-7xl mx-auto w-full gap-6 p-4 overflow-y-auto pb-12">

      {/* Header section */}
      <div className="flex justify-between items-end mb-2">
        <div>
          <h1 className="text-2xl font-bold text-primary mb-1">Personnel Manager</h1>
          <p className="text-sm text-primary/60">{onDutyCount} Active Staff Members Across {zones.length} Zones</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" className="text-sm font-semibold">
            Export Report
          </Button>
          <Button onClick={() => navigate('/personnel/new')} className="text-sm font-semibold flex items-center gap-2">
            <Plus size={16} /> Onboard New
          </Button>
        </div>
      </div>

      {/* Top Statistical Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="flex items-center justify-between p-5 border border-outline-variant/20 shadow-sm">
          <div>
            <p className="text-xs font-medium text-primary/60 mb-1">Total Staff</p>
            <p className="text-3xl font-bold text-primary">{totalStaff}</p>
          </div>
          <div className="bg-primary/5 p-2.5 rounded-lg text-primary/80">
            <Users size={20} />
          </div>
        </Card>

        <Card className="flex items-center justify-between p-5 border border-outline-variant/20 shadow-sm">
          <div>
            <p className="text-xs font-medium text-primary/60 mb-1">On Duty</p>
            <p className="text-3xl font-bold text-primary">{onDutyCount}</p>
          </div>
          <div className="bg-green-500/10 p-2.5 rounded-lg text-green-600">
            <CheckCircle size={20} />
          </div>
        </Card>

        <Card className="flex items-center justify-between p-5 border border-outline-variant/20 shadow-sm">
          <div>
            <p className="text-xs font-medium text-primary/60 mb-1">Responding</p>
            <p className="text-3xl font-bold text-error">{respondingCount}</p>
          </div>
          <div className="bg-error/10 p-2.5 rounded-lg text-error">
            <AlertOctagon size={20} />
          </div>
        </Card>

        <Card className="flex items-center justify-between p-5 border border-outline-variant/20 shadow-sm">
          <div>
            <p className="text-xs font-medium text-primary/60 mb-1">Stationary</p>
            <p className="text-3xl font-bold text-primary">{stationaryCount}</p>
          </div>
          <div className="bg-primary/5 p-2.5 rounded-lg text-primary/80">
            <User size={20} />
          </div>
        </Card>
      </div>

      {/* Table Section */}
      <div className="flex flex-col gap-3 mt-6">
        <div className="flex justify-between items-center px-1">
          <h2 className="text-sm font-semibold text-primary">Active Personnel Directory</h2>
          <button className="flex items-center gap-2 text-sm font-medium text-primary/60 hover:text-primary transition">
            <Filter size={16} /> Filter
          </button>
        </div>

        <Card className="flex-1 flex flex-col p-0 overflow-hidden border border-outline-variant/20 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-primary">
              <thead className="bg-surface-container-lowest text-xs text-primary/70 border-b border-outline-variant/10">
                <tr>
                  <th className="px-6 py-3 font-medium">Guard Name</th>
                  <th className="px-6 py-3 font-medium text-center">Assigned Zone</th>
                  <th className="px-6 py-3 font-medium">Radio ID</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Last Activity</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {isLoading && guards.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-primary/50"><Loader size={20} className="animate-spin inline mr-2" /> Loading personnel...</td></tr>
                ) : guards.map((guard) => {
                  const status: string = guard.zone_id ? 'Active' : 'Standby';
                  return (
                    <tr key={guard.uuid || guard.id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shadow-sm">
                            <User size={16} />
                          </div>
                          <div>
                            <p className="font-medium text-sm text-primary leading-tight">{guard.name}</p>
                            <p className="text-xs text-primary/60">{guard.rank || 'Security'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <div className="inline-flex items-center bg-surface-container-low px-4 py-1.5 rounded-full text-xs font-semibold text-primary/80 border border-outline-variant/10 shadow-sm whitespace-nowrap">
                          {zones.find(z => z.uuid === guard.zone_id)?.name || 'Unassigned'}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-primary/80 font-medium text-sm">
                        DIS-{(guard.uuid || guard.id || '').slice(-3).toUpperCase()}
                      </td>
                      <td className="px-6 py-3">
                        <Badge variant={
                          status === 'Active' ? 'success' : 'neutral'
                        } className="text-xs px-2.5 py-0.5 font-medium rounded-full border-none">
                          <span className={`w-1.5 h-1.5 rounded-full mr-2 inline-block ${status === 'Active' ? 'bg-green-500' : 'bg-primary/40'}`} />
                          {status}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 text-sm text-primary/70">
                        {status === 'Active' ? 'Patrolling assigned zone' : 'Awaiting assignment'}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button 
                          className="text-primary/40 hover:text-primary transition-colors p-1"
                          onClick={() => {
                            setEditingGuard(guard);
                            setIsEditModalOpen(true);
                          }}
                        >
                          <Pencil size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="px-6 py-4 border-t border-outline-variant/10 flex justify-between items-center bg-surface-container-lowest">
            <span className="text-xs text-primary/60">Showing {Math.min(guards.length, 1)} to {guards.length} of {guards.length} entries</span>
            <div className="flex gap-1">
              <button disabled className="px-3 py-1 rounded text-xs text-primary/40 hover:bg-surface-container-low border border-transparent disabled:opacity-50">Previous</button>
              <button className="px-3 py-1 rounded bg-surface-container-high text-primary text-xs font-medium shadow-sm">1</button>
              <button disabled className="px-3 py-1 rounded text-xs text-primary/60 hover:bg-surface-container-low border border-transparent disabled:opacity-50">Next</button>
            </div>
          </div>
        </Card>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-2">
        {/* Map Card */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-sm font-semibold text-primary">Zone Deployment Map</h2>
            <Badge variant="success" className="text-xs bg-green-500/10 text-green-600 border-none font-medium">Live Connection Active</Badge>
          </div>
          <Card className="flex-1 p-0 overflow-hidden relative min-h-[250px] border border-outline-variant/20 shadow-sm">
            {/* Map Placeholder */}
            <div className="absolute inset-0 bg-surface-container-lowest flex flex-col items-center justify-center">
              <div className="w-full h-full text-primary/5 flex items-center justify-center" />
              <MapPin size={32} className="absolute text-primary/20" />
              <span className="absolute mt-12 text-sm text-primary/40 font-medium">Interactive Map Currently Offline</span>
            </div>
          </Card>
        </div>

        {/* Recent Alerts */}
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-primary px-1">Recent Activity</h2>
          <Card className="flex-1 p-5 flex flex-col gap-5 border border-outline-variant/20 shadow-sm bg-surface-container-lowest">

            <div className="flex gap-3 items-start border-b border-outline-variant/10 pb-4">
              <div className="mt-0.5 text-error p-1.5 bg-error/10 rounded-md"><AlertOctagon size={16} /></div>
              <div>
                <p className="text-sm font-medium text-primary leading-tight mb-1">Unassigned Radio RT-1192-K</p>
                <p className="text-xs text-primary/60">02 mins ago · Sector Delta</p>
              </div>
            </div>

            <div className="flex gap-3 items-start border-b border-outline-variant/10 pb-4">
              <div className="mt-0.5 text-primary/60 p-1.5 bg-surface-container-high rounded-md"><Users size={16} /></div>
              <div>
                <p className="text-sm font-medium text-primary leading-tight mb-1">Shift Change: North Gate</p>
                <p className="text-xs text-primary/60">14 mins ago · Sector Alpha</p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <div className="mt-0.5 text-primary/60 p-1.5 bg-surface-container-high rounded-md"><CheckCircle size={16} /></div>
              <div>
                <p className="text-sm font-medium text-primary leading-tight mb-1">System Audit Completed</p>
                <p className="text-xs text-primary/60">38 mins ago · Core Infrastructure</p>
              </div>
            </div>

          </Card>
        </div>
      </div>

      <EditPersonnelModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        guard={editingGuard} 
        onSuccess={() => fetchGuards()} 
      />
    </div>
  );
};

export default PersonnelManager;
