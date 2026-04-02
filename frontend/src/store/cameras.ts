import { create } from 'zustand';
import { getCameras, type Camera } from '../services/api';

type CameraState = {
  cameras: Camera[];
  isLoading: boolean;
  fetchCameras: () => Promise<void>;
  addCamera: (camera: Camera) => void;
  removeCamera: (uuid: string) => void;
};

export const useCameraStore = create<CameraState>((set) => ({
  cameras: [],
  isLoading: false,

  fetchCameras: async () => {
    set({ isLoading: true });
    try {
      const response = await getCameras();
      set({ cameras: response.data.data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addCamera: (camera: Camera) => {
    set((state) => ({ cameras: [camera, ...state.cameras] }));
  },

  removeCamera: (uuid: string) => {
    set((state) => ({ cameras: state.cameras.filter((c) => c.uuid !== uuid) }));
  },
}));
