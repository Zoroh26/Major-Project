import React from 'react';
import { Users, CheckCircle, AlertOctagon, User, Filter, MapPin, Radio, MoreVertical, Plus, Download } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

import { useNavigate } from 'react-router-dom';

const mockGuards = [
  { id: 'g1', name: 'Officer David Chen', rank: 'Senior Grade', zone: 'North Plaza (A-1)', radio: 'RT-9622-X', status: 'PATROLLING', lastActivity: '14:22:15 - Checkpoint Delta' },
  { id: 'g2', name: 'Officer Sarah Jenkins', rank: 'Response Lead', zone: 'VIP Lounge (C-3)', radio: 'RT-4418-B', status: 'RESPONDING', lastActivity: '14:38:02 - Sector Incident #402' },
  { id: 'g3', name: 'Officer Marcus Thorne', rank: 'Security Guard', zone: 'Main Entry (E-1)', radio: 'RT-1192-K', status: 'STATIONARY', lastActivity: '14:05:50 - Desk Duty Log-In' },
  { id: 'g4', name: 'Officer Liam O\'Reilly', rank: 'Senior Grade', zone: 'West Parking (B-2)', radio: 'RT-8839-Z', status: 'PATROLLING', lastActivity: '14:35:12 - Perimeter Clear' },
  { id: 'g5', name: 'Officer Elena Rossi', rank: 'Security Guard', zone: 'Admin Wing (D-4)', radio: 'RT-2091-M', status: 'STATIONARY', lastActivity: '14:41:22 - Guard Post A' },
];

const PersonnelManager: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="h-full flex flex-col max-w-7xl mx-auto w-full gap-6 p-4 overflow-y-auto pb-12">
      
      {/* Header section */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-[28px] font-extrabold text-primary mb-1 tracking-tight">Personnel Manager</h1>
          <p className="text-sm font-medium text-primary/70">32 Active Staff Members Across 8 Zones</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" className="text-xs font-bold tracking-widest uppercase">
            Export Report
          </Button>
          <Button onClick={() => navigate('/personnel/new')} className="text-xs font-bold tracking-widest uppercase flex items-center gap-2">
            <Plus size={14} /> Onboard New
          </Button>
        </div>
      </div>

      {/* Top Statistical Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="flex items-center justify-between p-6">
          <div>
            <p className="text-[10px] font-extrabold tracking-widest text-primary/50 uppercase mb-1">Total Staff</p>
            <p className="text-4xl font-extrabold text-primary">48</p>
          </div>
          <div className="bg-primary/5 p-3 rounded-xl text-primary">
            <Users size={24} />
          </div>
        </Card>

        <Card className="flex items-center justify-between p-6 border-l-4 border-l-green-500">
          <div>
            <p className="text-[10px] font-extrabold tracking-widest text-primary/50 uppercase mb-1">On Duty</p>
            <p className="text-4xl font-extrabold text-primary">32</p>
          </div>
          <div className="bg-green-500/10 p-3 rounded-xl text-green-600">
            <CheckCircle size={24} />
          </div>
        </Card>

        <Card className="flex items-center justify-between p-6 border-l-4 border-l-error">
          <div>
            <p className="text-[10px] font-extrabold tracking-widest text-error/70 uppercase mb-1">Responding</p>
            <p className="text-4xl font-extrabold text-error">04</p>
          </div>
          <div className="bg-error/10 p-3 rounded-xl text-error">
            <AlertOctagon size={24} />
          </div>
        </Card>

        <Card className="flex items-center justify-between p-6">
          <div>
            <p className="text-[10px] font-extrabold tracking-widest text-primary/50 uppercase mb-1">Stationary</p>
            <p className="text-4xl font-extrabold text-primary">12</p>
          </div>
          <div className="bg-primary/5 p-3 rounded-xl text-primary">
            <User size={24} />
          </div>
        </Card>
      </div>

      {/* Table Section */}
      <div className="flex flex-col gap-3 mt-4">
        <div className="flex justify-between items-center px-1">
          <h2 className="text-xs font-extrabold tracking-widest text-primary uppercase">Active Personnel Directory</h2>
          <button className="flex items-center gap-2 text-xs font-bold text-primary/60 hover:text-primary transition">
            <Filter size={14} /> Filter by Status
          </button>
        </div>

        <Card className="flex-1 flex flex-col p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-primary">
              <thead className="text-[10px] text-primary/50 uppercase tracking-widest border-b border-outline-variant/10">
                <tr>
                  <th className="px-6 py-4 font-bold">Guard Name</th>
                  <th className="px-6 py-4 font-bold">Assigned Zone</th>
                  <th className="px-6 py-4 font-bold">Radio ID</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold">Last Activity</th>
                  <th className="px-6 py-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5">
                {mockGuards.map((guard) => (
                  <tr key={guard.id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-sm shadow-sm opacity-90">
                           <User size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-primary mb-0.5">{guard.name}</p>
                          <p className="text-[10px] text-primary/50 uppercase tracking-wider">Rank: {guard.rank}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="inline-flex items-center bg-surface-container-low px-3 py-1.5 rounded-md text-xs font-bold">
                        {guard.zone} <select className="opacity-0 w-4 absolute cursor-pointer"><option></option></select>
                        <span className="ml-2 text-primary/40 text-[10px]">▼</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-primary font-bold text-xs">
                      {guard.radio}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={
                        guard.status === 'RESPONDING' ? 'danger' :
                        guard.status === 'PATROLLING' ? 'success' : 'neutral'
                      } className="text-[10px] font-extrabold tracking-widest px-2 py-1">
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 inline-block ${guard.status === 'RESPONDING' ? 'bg-error animate-pulse' : guard.status === 'PATROLLING' ? 'bg-green-500' : 'bg-primary/40'}`} />
                        {guard.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-primary/70">
                      {guard.lastActivity}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-primary/40 hover:text-primary transition-colors p-1">
                        <MoreVertical size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Table Footer */}
          <div className="px-6 py-4 border-t border-outline-variant/10 flex justify-between items-center bg-surface-container-lowest">
            <span className="text-[10px] font-extrabold tracking-widest text-primary/50 uppercase">Showing 1 - 5 of 32 results</span>
            <div className="flex gap-1">
              <button className="w-6 h-6 rounded bg-surface border border-outline-variant/20 flex items-center justify-center text-xs text-primary/40 hover:bg-surface-container-low">{'<'}</button>
              <button className="w-6 h-6 rounded bg-primary text-background flex items-center justify-center text-xs font-bold">1</button>
              <button className="w-6 h-6 rounded bg-surface border border-outline-variant/20 flex items-center justify-center text-xs text-primary font-bold hover:bg-surface-container-low">2</button>
              <button className="w-6 h-6 rounded bg-surface border border-outline-variant/20 flex items-center justify-center text-xs text-primary font-bold hover:bg-surface-container-low">3</button>
              <button className="w-6 h-6 rounded bg-surface border border-outline-variant/20 flex items-center justify-center text-xs text-primary/40 hover:bg-surface-container-low">{'>'}</button>
            </div>
          </div>
        </Card>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-2">
        {/* Map Card */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-xs font-extrabold tracking-widest text-primary uppercase">Zone Deployment Map</h2>
            <Badge variant="success" className="text-[10px] bg-green-500/10 text-green-600 border-none">Live Feed Active</Badge>
          </div>
          <Card className="flex-1 p-0 overflow-hidden relative min-h-[250px]">
             {/* Map Placeholder */}
             <div className="absolute inset-0 bg-surface-container-low/50 flex flex-col items-center justify-center">
                 <div className="w-full h-full bg-gradient-to-tr from-surface-container-low to-surface opacity-80" />
                 <MapPin size={48} className="absolute text-primary/10" />
             </div>
             
             {/* Map Legend */}
             <div className="absolute bottom-4 left-4 flex gap-4 text-[10px] font-extrabold tracking-widest text-primary/60 uppercase">
               <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500"></span> Optimal Coverage</div>
               <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span> Critical Entry</div>
             </div>
          </Card>
        </div>

        {/* Recent Alerts */}
        <div className="flex flex-col gap-3">
          <h2 className="text-xs font-extrabold tracking-widest text-primary uppercase px-1">Recent Alerts</h2>
          <Card className="flex-1 p-5 flex flex-col gap-4">
             
             <div className="flex gap-3 items-start border-b border-outline-variant/10 pb-4">
                <div className="mt-1 text-error"><AlertOctagon size={16} /></div>
                <div>
                  <p className="text-sm font-bold text-primary leading-tight mb-1">Unassigned Radio RT-1192-K</p>
                  <p className="text-[10px] text-primary/50 uppercase tracking-widest">02 mins ago • Sector Delta</p>
                </div>
             </div>

             <div className="flex gap-3 items-start border-b border-outline-variant/10 pb-4">
                <div className="mt-1 text-primary/50"><AlertOctagon size={16} /></div>
                <div>
                  <p className="text-sm font-bold text-primary leading-tight mb-1">Shift Change: North Gate</p>
                  <p className="text-[10px] text-primary/50 uppercase tracking-widest">14 mins ago • Sector Alpha</p>
                </div>
             </div>

             <div className="flex gap-3 items-start">
                <div className="mt-1 text-primary/50"><AlertOctagon size={16} /></div>
                <div>
                  <p className="text-sm font-bold text-primary leading-tight mb-1">Equipment Check Completed</p>
                  <p className="text-[10px] text-primary/50 uppercase tracking-widest">38 mins ago • Logistics</p>
                </div>
             </div>

          </Card>
        </div>
      </div>

    </div>
  );
};

export default PersonnelManager;
