import { create } from 'zustand';
import { 
  getZones, 
  getZone, 
  addZone, 
  updateZone, 
  deleteZone,
  assignCameraToZone,
  unassignCameraFromZone,
  assignGuardToZone,
  unassignGuardFromZone,
  getUsers
} from '../services/api';
import type { Zone, ZoneDetail, ZoneCreate, ZoneUpdate } from '../types/zones';
import type { User } from '../types/auth';

interface ZoneState {
  zones: Zone[];
  activeZone: ZoneDetail | null;
  guards: User[];
  isLoading: boolean;
  error: string | null;
  
  fetchZones: (page?: number) => Promise<void>;
  fetchZone: (uuid: string) => Promise<void>;
  createZone: (data: ZoneCreate) => Promise<void>;
  updateZone: (uuid: string, data: ZoneUpdate) => Promise<void>;
  deleteZone: (uuid: string) => Promise<void>;
  
  fetchGuards: () => Promise<void>;
  assignCamera: (zoneUuid: string, cameraUuid: string) => Promise<void>;
  unassignCamera: (zoneUuid: string, cameraUuid: string) => Promise<void>;
  assignGuard: (zoneUuid: string, userUuid: string) => Promise<void>;
  unassignGuard: (zoneUuid: string, userUuid: string) => Promise<void>;
}

export const useZoneStore = create<ZoneState>((set) => ({
  zones: [],
  activeZone: null,
  guards: [],
  isLoading: false,
  error: null,

  fetchZones: async (page = 1) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getZones(page);
      set({ zones: response.data.data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchZone: async (uuid: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getZone(uuid);
      set({ activeZone: response.data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  createZone: async (data: ZoneCreate) => {
    set({ isLoading: true, error: null });
    try {
      const response = await addZone(data);
      set((state) => ({ 
        zones: [response.data, ...state.zones], 
        isLoading: false 
      }));
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  updateZone: async (uuid: string, data: ZoneUpdate) => {
    set({ isLoading: true, error: null });
    try {
      const response = await updateZone(uuid, data);
      set((state) => ({
        zones: state.zones.map(z => z.uuid === uuid ? response.data : z),
        activeZone: state.activeZone?.uuid === uuid ? { ...state.activeZone, ...response.data } : state.activeZone,
        isLoading: false
      }));
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  deleteZone: async (uuid: string) => {
    set({ isLoading: true, error: null });
    try {
      await deleteZone(uuid);
      set((state) => ({
        zones: state.zones.filter(z => z.uuid !== uuid),
        activeZone: state.activeZone?.uuid === uuid ? null : state.activeZone,
        isLoading: false
      }));
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  fetchGuards: async () => {
    try {
      const response = await getUsers(1, 100);
      // Filter for guards only
      const securityUsers = response.data.data.filter(u => u.role === 'security');
      set({ guards: securityUsers });
    } catch (err: any) {
      console.error("Failed to fetch guards:", err);
    }
  },

  assignCamera: async (zoneUuid: string, cameraUuid: string) => {
    set({ isLoading: true });
    try {
      const response = await assignCameraToZone(zoneUuid, cameraUuid);
      set({ activeZone: response.data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  unassignCamera: async (zoneUuid: string, cameraUuid: string) => {
    set({ isLoading: true });
    try {
      await unassignCameraFromZone(zoneUuid, cameraUuid);
      // Refetch zone details to get updated lists
      const response = await getZone(zoneUuid);
      set({ activeZone: response.data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  assignGuard: async (zoneUuid: string, userUuid: string) => {
    set({ isLoading: true });
    try {
      const response = await assignGuardToZone(zoneUuid, userUuid);
      set((state) => ({ 
        activeZone: response.data,
        guards: state.guards.map(g => (g.uuid === userUuid || g.id === userUuid) ? { ...g, zone_id: zoneUuid } : g),
        isLoading: false 
      }));
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  unassignGuard: async (zoneUuid: string, userUuid: string) => {
    set({ isLoading: true });
    try {
      await unassignGuardFromZone(zoneUuid, userUuid);
      // Refetch zone details if needed, but also update guards list
      const response = await getZone(zoneUuid);
      set((state) => ({ 
        activeZone: response.data,
        guards: state.guards.map(g => (g.uuid === userUuid || g.id === userUuid) ? { ...g, zone_id: null } : g),
        isLoading: false 
      }));
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  }
}));
