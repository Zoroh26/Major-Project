import { useForm } from 'react-hook-form';
import { X, Loader } from 'lucide-react';
import { toast } from 'react-toastify';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { useZoneStore } from '../store/zones';
import type { ZoneCreate, ZoneUpdate, ZoneDetail } from '../types/zones';
import { useEffect } from 'react';

interface AddZoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: ZoneDetail | null;
}

interface FormData {
  name: string;
  description: string;
  alert_threshold: number;
}

const AddZoneModal = ({ isOpen, onClose, onSuccess, initialData }: AddZoneModalProps) => {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      alert_threshold: 85
    }
  });
  const { createZone, updateZone, isLoading } = useZoneStore();
  const isEditing = !!initialData;

  useEffect(() => {
    if (isOpen && initialData) {
      reset({
        name: initialData.name,
        description: initialData.description || '',
        alert_threshold: Math.round((initialData.alert_threshold || 0) * 100),
      });
    } else if (isOpen) {
      reset({ name: '', description: '', alert_threshold: 85 });
    }
  }, [isOpen, initialData, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      if (isEditing && initialData) {
        const payload: ZoneUpdate = {
          name: data.name,
          description: data.description || undefined,
          alert_threshold: data.alert_threshold / 100
        };
        await updateZone(initialData.uuid, payload);
        toast.success('Zone updated successfully!');
      } else {
        const payload: ZoneCreate = {
          name: data.name,
          description: data.description || undefined,
          alert_threshold: data.alert_threshold / 100
        };
        await createZone(payload);
        toast.success('Zone added successfully!');
      }
      reset();
      if (onSuccess) onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || `Failed to ${isEditing ? 'update' : 'create'} zone`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-primary/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full relative">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-extrabold text-primary">{isEditing ? 'Edit Zone' : 'Create New Zone'}</h2>
          <button
            onClick={onClose}
            className="text-primary/40 hover:text-primary transition bg-surface-container-low p-1.5 rounded-md"
            disabled={isLoading}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Zone Name */}
          <div>
            <Input
              label="Zone Name"
              placeholder="e.g., Main Lobby"
              {...register('name', {
                required: 'Zone name is required',
                minLength: { value: 1, message: 'Name must not be empty' },
              })}
              disabled={isLoading}
              className={errors.name ? "border-error focus:border-error bg-error/5" : ""}
            />
            {errors.name && <p className="text-xs text-error mt-1">{errors.name.message}</p>}
          </div>

          {/* Location/Description */}
          <div>
            <Input
              label="Description (Optional)"
              placeholder="e.g., Ground floor entrance block"
              {...register('description')}
              disabled={isLoading}
            />
          </div>

          {/* Alert Threshold */}
          <div>
            <Input
              label="Alert Threshold (%)"
              type="number"
              placeholder="85"
              {...register('alert_threshold', {
                required: 'Alert threshold is required',
                min: { value: 0, message: 'Minimum is 0' },
                max: { value: 100, message: 'Maximum is 100' },
                valueAsNumber: true
              })}
              disabled={isLoading}
              className={errors.alert_threshold ? "border-error focus:border-error bg-error/5" : ""}
            />
            {errors.alert_threshold && <p className="text-xs text-error mt-1">{errors.alert_threshold.message}</p>}
            <p className="text-[10px] text-primary/50 mt-1 uppercase tracking-widest font-bold">
              Crowd density percentage to trigger an alert
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2 mt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1 flex items-center justify-center gap-2"
              disabled={isLoading}
            >
              {isLoading ? <><Loader size={16} className="animate-spin" /> {isEditing ? 'Updating...' : 'Creating...'}</> : isEditing ? 'Update Zone' : 'Create Zone'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default AddZoneModal;
