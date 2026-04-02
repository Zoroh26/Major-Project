import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader } from 'lucide-react';
import { getCameras, deleteCamera, type Camera } from '../services/api';
import { toast } from 'react-toastify';
import CameraFeed from '../components/CameraFeed';
import AddCameraModal from '../components/AddCameraModal';

const Cameras = () => {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingUuid, setDeletingUuid] = useState<string | null>(null);

  const loadCameras = async () => {
    setIsLoading(true);
    try {
      const response = await getCameras();
      setCameras(response.data.data);
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to load cameras';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCameras();
  }, []);

  const handleDelete = async (uuid: string) => {
    if (!confirm('Are you sure you want to delete this camera? The stream will be removed from MediaMTX.')) {
      return;
    }

    setDeletingUuid(uuid);
    try {
      await deleteCamera(uuid);
      setCameras(cameras.filter(c => c.uuid !== uuid));
      toast.success('Camera deleted successfully');
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to delete camera';
      toast.error(message);
    } finally {
      setDeletingUuid(null);
    }
  };

  const handleAddSuccess = (newCamera: Camera) => {
    // Optimistically update the UI to instantly show the newly added camera
    setCameras(prev => [newCamera, ...prev]);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        {/* Action bar */}
        <div className="flex items-center justify-end mb-6">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-background rounded hover:bg-primary/80 transition font-medium"
          >
            <Plus size={20} />
            Add Camera
          </button>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader className="animate-spin mx-auto mb-2 text-primary" size={32} />
              <p className="text-gray-400">Loading cameras...</p>
            </div>
          </div>
        ) : cameras.length === 0 ? (
          // Empty State
          <div className="flex items-center justify-center h-64 bg-card rounded-lg border-2 border-primary">
            <div className="text-center">
              <div className="text-primary text-5xl mb-4">📹</div>
              <h2 className="text-xl font-bold text-primary mb-2">No Cameras Yet</h2>
              <p className="text-gray-400 mb-4">Add your first camera to start streaming</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-background rounded hover:bg-primary/80 transition font-medium mx-auto"
              >
                <Plus size={18} />
                Add Camera
              </button>
            </div>
          </div>
        ) : (
          // Camera Grid
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cameras.map((camera) => (
              <div
                key={camera.uuid}
                className="bg-card rounded-lg border-2 border-primary p-4 overflow-hidden flex flex-col"
              >
                {/* Camera Feed */}
                <div className="h-48 mb-4 rounded overflow-hidden">
                  <CameraFeed
                    streamUrl={camera.hls_url || `http://localhost:8888/${camera.stream_path}/index.m3u8`}
                    cameraName={camera.name}
                  />
                </div>

                {/* Camera Info */}
                <div className="flex-1 flex flex-col mb-4">
                  <h3 className="text-lg font-bold text-primary">{camera.name}</h3>
                  <p className="text-sm text-gray-400">📍 {camera.location}</p>
                  <div className="mt-2 text-xs text-gray-500 space-y-1">
                    <p>Stream: <span className="text-primary font-mono">{camera.stream_path}</span></p>
                    {camera.is_active && (
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-green-500">Active</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <button
                  onClick={() => handleDelete(camera.uuid)}
                  disabled={deletingUuid === camera.uuid}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-500/20 text-red-400 border border-red-500/50 rounded hover:bg-red-500/30 transition font-medium disabled:opacity-50"
                >
                  {deletingUuid === camera.uuid ? (
                    <>
                      <Loader size={16} className="animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} />
                      Delete
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Camera Modal */}
      <AddCameraModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleAddSuccess}
      />
    </div>
  );
};

export default Cameras;
