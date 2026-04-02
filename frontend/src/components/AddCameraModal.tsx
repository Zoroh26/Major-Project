import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, Loader } from 'lucide-react';
import { addCamera } from '../services/api';
import type { Camera } from '../services/api';
import { toast } from 'react-toastify';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { Button } from './ui/Button';

interface AddCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newCamera: Camera) => void;
}

interface FormData {
  name: string;
  location: string;
  rtsp_url: string;
}

const AddCameraModal = ({ isOpen, onClose, onSuccess }: AddCameraModalProps) => {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>();
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      const response = await addCamera(data);
      toast.success('Camera added successfully!');
      reset();
      onSuccess(response.data);
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
