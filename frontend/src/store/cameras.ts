import { create } from 'zustand';
import { 
  getCameras, 
  addCamera as addCameraApi, 
  updateCamera as updateCameraApi, 
  deleteCamera as deleteCameraApi, 
  type Camera 
} from '../services/api';

type CameraState = {
  cameras: Camera[];
  isLoading: boolean;
  error: string | null;
  fetchCameras: (page?: number) => Promise<void>;
  addCamera: (data: { name: string; location: string; rtsp_url: string }) => Promise<void>;
  updateCamera: (uuid: string, data: Partial<{ name: string; location: string }>) => Promise<void>;
  removeCamera: (uuid: string) => Promise<void>;
};

export const useCameraStore = create<CameraState>((set) => ({
  cameras: [],
  isLoading: false,
  error: null,

  fetchCameras: async (page = 1) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getCameras(page);
      set({ cameras: response.data.data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  addCamera: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await addCameraApi(data);
      set((state) => ({ 
        cameras: [response.data, ...state.cameras], 
        isLoading: false 
      }));
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  updateCamera: async (uuid, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await updateCameraApi(uuid, data);
      set((state) => ({
        cameras: state.cameras.map((c) => (c.uuid === uuid ? response.data : c)),
        isLoading: false
      }));
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  removeCamera: async (uuid) => {
    set({ isLoading: true, error: null });
    try {
      await deleteCameraApi(uuid);
      set((state) => ({ 
        cameras: state.cameras.filter((c) => c.uuid !== uuid),
        isLoading: false 
      }));
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },
}));
