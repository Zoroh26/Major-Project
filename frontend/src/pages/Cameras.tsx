import { useEffect, useState } from 'react';
import { Plus, Trash2, Loader } from 'lucide-react';
import { deleteCamera } from '../services/api';
import { toast } from 'react-toastify';
import CameraFeed from '../components/CameraFeed';
import AddCameraModal from '../components/AddCameraModal';
import { useCameraStore } from '../store/cameras';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

const Cameras = () => {
  const { cameras, isLoading, fetchCameras, addCamera, removeCamera } = useCameraStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingUuid, setDeletingUuid] = useState<string | null>(null);

  useEffect(() => {
    fetchCameras();
  }, []);

  const handleDelete = async (uuid: string) => {
    if (!confirm('Are you sure you want to delete this camera? The stream will be removed from MediaMTX.')) {
      return;
    }

    setDeletingUuid(uuid);
    try {
      await deleteCamera(uuid);
      removeCamera(uuid);
      toast.success('Camera deleted successfully');
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to delete camera';
      toast.error(message);
    } finally {
      setDeletingUuid(null);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        {/* Action bar */}
        <div className="flex items-center justify-end mb-6">
          <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
            <Plus size={20} />
            Add Camera
          </Button>
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
          <Card className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-primary text-5xl mb-4">📹</div>
              <h2 className="text-xl font-bold text-primary mb-2">No Cameras Yet</h2>
              <p className="text-gray-500 mb-4">Add your first camera to start streaming</p>
              <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 mx-auto">
                <Plus size={18} />
                Add Camera
              </Button>
            </div>
          </Card>
        ) : (
          // Camera Grid
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cameras.map((camera) => (
              <Card
                key={camera.uuid}
                className="overflow-hidden flex flex-col"
              >
                {/* Camera Feed */}
                <div className="h-48 mb-4 rounded overflow-hidden">
                  <CameraFeed
                    webrtcUrl={camera.webrtc_url ?? `http://${window.location.hostname}:8889/${camera.stream_path}`}
                    streamUrl={camera.hls_url ?? `http://${window.location.hostname}:8888/${camera.stream_path}/index.m3u8`}
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
                      <div>
                        <Badge variant="success" className="mt-1">
                          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1" />
                          Active
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <Button
                  variant="danger"
                  onClick={() => handleDelete(camera.uuid)}
                  disabled={deletingUuid === camera.uuid}
                  className="w-full flex items-center justify-center gap-2 mt-auto disabled:opacity-50"
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
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Camera Modal */}
      <AddCameraModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={addCamera}
      />
    </div>
  );
};

export default Cameras;
