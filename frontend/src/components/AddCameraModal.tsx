import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, Loader } from 'lucide-react';
import { addCamera } from '../services/api';
import { toast } from 'react-toastify';

interface AddCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
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
      await addCamera(data);
      toast.success('Camera added successfully!');
      reset();
      onSuccess();
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border-2 border-primary rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-primary">Add Camera</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-primary transition"
            disabled={isLoading}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Camera Name */}
          <div>
            <label className="block text-sm font-medium text-primary mb-1">
              Camera Name
            </label>
            <input
              type="text"
              placeholder="e.g., Office Camera"
              className="w-full px-3 py-2 bg-background border border-primary rounded text-black placeholder-gray-500 focus:outline-none focus:border-primary/50"
              {...register('name', {
                required: 'Camera name is required',
                minLength: { value: 1, message: 'Name must not be empty' },
              })}
              disabled={isLoading}
            />
            {errors.name && (
              <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>
            )}
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-primary mb-1">
              Location
            </label>
            <input
              type="text"
              placeholder="e.g., Main Lobby"
              className="w-full px-3 py-2 bg-background border border-primary rounded text-black placeholder-gray-500 focus:outline-none focus:border-primary/50"
              {...register('location', {
                required: 'Location is required',
                minLength: { value: 1, message: 'Location must not be empty' },
              })}
              disabled={isLoading}
            />
            {errors.location && (
              <p className="text-xs text-red-500 mt-1">{errors.location.message}</p>
            )}
          </div>

          {/* RTSP URL */}
          <div>
            <label className="block text-sm font-medium text-primary mb-1">
              RTSP URL
            </label>
            <input
              type="text"
              placeholder="e.g., rtsp://192.168.1.100:8080/video"
              className="w-full px-3 py-2 bg-background border border-primary rounded text-black placeholder-gray-500 focus:outline-none focus:border-primary/50 text-xs"
              {...register('rtsp_url', {
                required: 'RTSP URL is required',
                pattern: {
                  value: /^rtsp:\/\/.+/,
                  message: 'Must be a valid RTSP URL (rtsp://...)',
                },
              })}
              disabled={isLoading}
            />
            {errors.rtsp_url && (
              <p className="text-xs text-red-500 mt-1">{errors.rtsp_url.message}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              Get from IP Webcam app on your phone
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-primary text-primary rounded hover:bg-primary/10 transition font-medium disabled:opacity-50"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary text-background rounded hover:bg-primary/80 transition font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              disabled={isLoading}
            >
              {isLoading && <Loader size={16} className="animate-spin" />}
              {isLoading ? 'Adding...' : 'Add Camera'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCameraModal;
