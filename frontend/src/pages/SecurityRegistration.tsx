import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Shield, Info, ArrowLeft } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

const SecurityRegistration: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    badgeId: '',
    email: '',
    rank: 'Security Guard',
    zone: 'Unassigned',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Normally we'd call an API here
    console.log('Registering guard:', formData);
    navigate('/personnel');
  };

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto w-full gap-6 p-4 overflow-y-auto">
      
      {/* Header */}
      <div className="flex flex-col mb-2">
        <button 
          onClick={() => navigate('/personnel')}
          className="text-primary/60 hover:text-primary active:scale-95 transition-all text-xs font-bold uppercase flex items-center gap-1 w-max mb-4"
        >
          <ArrowLeft size={14} /> Back to Roster
        </button>
        <h1 className="text-[28px] font-extrabold text-primary mb-1 tracking-tight flex items-center gap-3">
          <UserPlus size={28} /> Security Registration
        </h1>
        <p className="text-sm font-medium text-primary/70">Onboard new personnel and assign dispatch credentials.</p>
      </div>

      <Card className="flex flex-col p-8">
        <div className="flex items-start gap-4 mb-8 bg-surface-container-low p-4 rounded-xl border border-outline-variant/20">
          <div className="bg-primary/10 text-primary p-2 rounded-lg">
            <Info size={24} />
          </div>
          <div>
            <h3 className="font-bold text-primary mb-1">Clearance Protocol</h3>
            <p className="text-xs text-primary/70 leading-relaxed max-w-2xl">
              All personnel onboarded via this portal are immediately assigned default clearance level 2. They will be required to authenticate their biometric data via the Mobile Guard App before standard operations can commence.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input 
              label="First Name" 
              name="firstName" 
              placeholder="e.g. John" 
              value={formData.firstName}
              onChange={handleChange}
              required
            />
            <Input 
              label="Last Name" 
              name="lastName" 
              placeholder="e.g. Smith" 
              value={formData.lastName}
              onChange={handleChange}
              required
            />
            <Input 
              label="Badge / Radio ID" 
              name="badgeId" 
              placeholder="e.g. RT-1002-X" 
              value={formData.badgeId}
              onChange={handleChange}
              required
            />
            <Input 
              label="Official Email Address" 
              type="email"
              name="email" 
              placeholder="john.smith@crowdvision.net" 
              value={formData.email}
              onChange={handleChange}
              required
            />
            
            <div className="flex flex-col">
              <label className="text-xs font-bold text-primary uppercase tracking-widest mb-2">Assignment Rank</label>
              <select 
                name="rank"
                value={formData.rank}
                onChange={handleChange}
                className="w-full bg-surface-container-low border border-outline-variant/30 text-primary text-sm rounded-lg focus:ring-primary focus:border-primary block p-3 min-h-[46px]"
              >
                <option value="Security Guard">Security Guard</option>
                <option value="Senior Grade">Senior Grade</option>
                <option value="Response Lead">Response Lead</option>
                <option value="Dispatch Operator">Dispatch Operator</option>
              </select>
            </div>
            
            <div className="flex flex-col">
              <label className="text-xs font-bold text-primary uppercase tracking-widest mb-2">Assigned Zone</label>
              <select 
                name="zone"
                value={formData.zone}
                onChange={handleChange}
                className="w-full bg-surface-container-low border border-outline-variant/30 text-primary text-sm rounded-lg focus:ring-primary focus:border-primary block p-3 min-h-[46px]"
              >
                <option value="Unassigned">Unassigned</option>
                <option value="Zone A">Zone A</option>
                <option value="Zone B">Zone B</option>
                <option value="Zone C">Zone C</option>
              </select>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-outline-variant/15 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => navigate('/personnel')}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="flex items-center gap-2 px-8">
              <Shield size={16} /> Enlist Personnel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default SecurityRegistration;
