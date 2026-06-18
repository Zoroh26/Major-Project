import { useState, useEffect } from 'react';
import { X, Loader, Shield, Info } from 'lucide-react';
import { toast } from 'react-toastify';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { useZoneStore } from '../store/zones';
import type { User } from '../types/auth';

interface EditPersonnelModalProps {
  isOpen: boolean;
  onClose: () => void;
  guard: User | null;
  onSuccess: () => void;
}

const EditPersonnelModal = ({ isOpen, onClose, guard, onSuccess }: EditPersonnelModalProps) => {
  const { zones, assignGuard, unassignGuard } = useZoneStore();
  const [targetZone, setTargetZone] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && guard) {
      setTargetZone(guard.zone_id || 'unassigned');
    }
  }, [isOpen, guard]);

  if (!isOpen || !guard) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const guardId = guard.uuid || guard.id;
      if (!guardId) throw new Error("Guard identifier missing.");

      if (targetZone === 'unassigned') {
        if (guard.zone_id) {
          await unassignGuard(guard.zone_id, guardId);
          toast.success(`Removed ${guard.name || 'personnel'} from assignment.`);
        }
      } else {
        await assignGuard(targetZone, guardId);
        toast.success(`Assigned ${guard.name || 'personnel'} to new zone.`);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || err.message || "Failed to update personnel assignment");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-primary/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full relative">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold text-primary flex items-center gap-2">
            <Shield size={20} className="text-primary" /> Edit Personnel
          </h2>
          <button
            onClick={onClose}
            className="text-primary/40 hover:text-primary transition bg-surface-container-low p-1.5 rounded-md"
            disabled={isLoading}
          >
            <X size={18} />
          </button>
        </div>

        <div className="bg-surface-container-lowest p-3 rounded-md border border-outline-variant/10 mb-5 flex gap-3 text-sm">
          <div className="mt-0.5 text-primary/50"><Info size={16} /></div>
          <div>
            <p className="font-semibold text-primary">{guard.name || 'Unknown Officer'} DIS-{(guard.uuid || guard.id || '').slice(-3).toUpperCase()}</p>
            <p className="text-primary/60 text-xs mt-0.5">Note: System profile edits are restricted. You may only modify their active deployment zone here.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex flex-col">
            <label className="text-xs font-bold text-primary uppercase tracking-widest mb-2">Active Deployment Zone</label>
            <select
              value={targetZone}
              onChange={(e) => setTargetZone(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/30 text-primary text-sm rounded-lg focus:ring-primary focus:border-primary block p-3 min-h-[46px]"
              disabled={isLoading}
            >
              <option value="unassigned">Standby (Unassigned)</option>
              {zones.map((z) => (
                <option key={z.uuid} value={z.uuid}>{z.name}</option>
              ))}
            </select>
          </div>

          <div className="pt-4 border-t border-outline-variant/10 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="flex items-center gap-2 min-w-[120px] justify-center" disabled={isLoading}>
              {isLoading ? <Loader size={16} className="animate-spin" /> : "Save Changes"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default EditPersonnelModal;
