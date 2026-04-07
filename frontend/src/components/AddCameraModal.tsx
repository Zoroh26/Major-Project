import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, Loader } from 'lucide-react';
import { addCamera } from '../services/api';
import type { Camera } from '../services/api';
import type { Zone } from '../types/zones';
import { toast } from 'react-toastify';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { Button } from './ui/Button';

interface AddCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newCamera: Camera, zoneId?: string) => void;
  zones?: Zone[];
  defaultZoneId?: string | null;
}

interface FormData {
  name: string;
  location: string;
  rtsp_url: string;
  zone_id?: string;
}

const AddCameraModal = ({ isOpen, onClose, onSuccess, zones = [], defaultZoneId = null }: AddCameraModalProps) => {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      reset({ zone_id: defaultZoneId || '' });
    }
  }, [isOpen, defaultZoneId, reset]);

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      const response = await addCamera({
        name: data.name,
        location: data.location,
        rtsp_url: data.rtsp_url
      });
      toast.success('Camera added successfully!');
      reset();
      onSuccess(response.data, data.zone_id || defaultZoneId || undefined); // Pass zone_id to ZoneMapper
      onClose();
    } catch (error: any) {
      const message = error.response?.data?.detail || error.message || 'Failed to add camera';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-primary/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full relative">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-extrabold text-primary">Bind New Camera</h2>
          <button
            onClick={onClose}
            className="text-primary/40 hover:text-primary transition bg-surface-container-low p-1.5 rounded-md"
            disabled={isLoading}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Camera Name */}
          <div>
            <Input
              label="Camera Identifier"
              placeholder="e.g., North Plaza PTZ"
              {...register('name', {
                required: 'Camera identifier is required',
                minLength: { value: 1, message: 'Name must not be empty' },
              })}
              disabled={isLoading}
              className={errors.name ? "border-error focus:border-error bg-error/5" : ""}
            />
            {errors.name && <p className="text-xs text-error mt-1">{errors.name.message}</p>}
          </div>

          {/* Location */}
          <div>
            <Input
              label="Physical Location"
              placeholder="e.g., Sector 7-G / Main Lobby"
              {...register('location', {
                required: 'Location is required',
                minLength: { value: 1, message: 'Location must not be empty' },
              })}
              disabled={isLoading}
              className={errors.location ? "border-error focus:border-error bg-error/5" : ""}
            />
            {errors.location && <p className="text-xs text-error mt-1">{errors.location.message}</p>}
          </div>

          {/* Assigned Zone */}
          <div>
            <label className="block text-[10px] font-extrabold tracking-widest text-primary/70 uppercase mb-1.5 ml-1">Assigned Zone</label>
            <select
              {...register('zone_id')}
              disabled
              className="w-full bg-surface-container border border-outline-variant/30 rounded-lg px-4 py-2.5 text-sm text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium appearance-none"
            >
              <option value="">Unassigned</option>
              {zones.map((zone) => (
                <option key={zone.uuid} value={zone.uuid}>{zone.name}</option>
              ))}
            </select>
          </div>

          {/* RTSP URL */}
          <div>
            <Input
              label="Hardware RTSP Feed URL"
              placeholder="rtsp://192.168.1.100:8080/video"
              {...register('rtsp_url', {
                required: 'RTSP URL is required',
                pattern: {
                  value: /^rtsp:\/\/.+/,
                  message: 'Must be a valid RTSP URL (rtsp://...)',
                },
              })}
              disabled={isLoading}
              className={`font-mono text-xs ${errors.rtsp_url ? "border-error focus:border-error bg-error/5" : ""}`}
            />
            {errors.rtsp_url && <p className="text-xs text-error mt-1">{errors.rtsp_url.message}</p>}
            <p className="text-[10px] text-primary/50 mt-1 uppercase tracking-widest font-bold">Requires active local network bridge</p>
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
              {isLoading ? <><Loader size={16} className="animate-spin" /> Binding...</> : 'Bind Hardware'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default AddCameraModal;
