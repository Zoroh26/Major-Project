import { create } from "zustand";
import { escalationService } from "../services/escalation";
import type { Escalation, EscalationCreate, EscalationStats } from "../services/escalation";

interface EscalationStore {
  // State
  escalations: Escalation[];
  assignedToMe: Escalation[];
  stats: EscalationStats | null;
  isLoading: boolean;
  error: string | null;
  unreadCount: number;

  // Actions
  fetchEscalations: () => Promise<void>;
  fetchAssignedToMe: () => Promise<void>;
  fetchStats: () => Promise<void>;
  createEscalation: (data: EscalationCreate) => Promise<Escalation>;
  assignEscalation: (uuid: string, securityUuid: string) => Promise<Escalation>;
  actOnEscalation: (uuid: string, actionTaken: string) => Promise<Escalation>;
  resolveEscalation: (uuid: string) => Promise<Escalation>;
  markFalseAlarm: (uuid: string) => Promise<Escalation>;
  markAsRead: () => void;
  startPolling: () => void;
  stopPolling: () => void;
}

let pollingInterval: ReturnType<typeof setTimeout> | null = null;

const getCurrentUserUuid = (): string | null => {
  try {
    const raw = localStorage.getItem("currentUser");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { uuid?: string; id?: string };
    return parsed.uuid || parsed.id || null;
  } catch {
    return null;
  }
};

export const useEscalationStore = create<EscalationStore>((set, get) => ({
  // State
  escalations: [],
  assignedToMe: [],
  stats: null,
  isLoading: false,
  error: null,
  unreadCount: 0,

  // Actions
  fetchEscalations: async () => {
    set({ isLoading: true, error: null });
    try {
      const escalations = await escalationService.listEscalations();
      set({ escalations, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to fetch escalations",
        isLoading: false,
      });
    }
  },

  fetchAssignedToMe: async () => {
    set({ isLoading: true, error: null });
    try {
      const escalations = await escalationService.listEscalations();
      const currentUserUuid = getCurrentUserUuid();
      const assigned = escalations.filter((e) => {
        if (e.status === "resolved" || e.status === "false_alarm") return false;
        if (!currentUserUuid) return false;
        return e.assigned_to_uuid === currentUserUuid;
      });
      
      const previousCount = get().assignedToMe.length;
      set({ assignedToMe: assigned, isLoading: false });
      
      // Increment unread count for new assignments
      if (assigned.length > previousCount) {
        set({ unreadCount: assigned.length - previousCount });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to fetch assigned escalations",
        isLoading: false,
      });
    }
  },

  fetchStats: async () => {
    try {
      const stats = await escalationService.getStats();
      set({ stats });
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  },

  createEscalation: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const escalation = await escalationService.createEscalation(data);
      set((state) => ({
        escalations: [...state.escalations, escalation],
        isLoading: false,
      }));
      await get().fetchStats();
      return escalation;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to create escalation";
      set({ error: errorMsg, isLoading: false });
      throw error;
    }
  },

  assignEscalation: async (uuid, securityUuid) => {
    set({ isLoading: true, error: null });
    try {
      const escalation = await escalationService.updateEscalation(uuid, {
        assigned_to_uuid: securityUuid,
        status: "assigned",
      });
      
      set((state) => ({
        escalations: state.escalations.map((e) => (e.uuid === uuid ? escalation : e)),
        isLoading: false,
      }));
      
      await get().fetchStats();
      return escalation;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to assign escalation";
      set({ error: errorMsg, isLoading: false });
      throw error;
    }
  },

  actOnEscalation: async (uuid, actionTaken) => {
    set({ isLoading: true, error: null });
    try {
      const escalation = await escalationService.actOnEscalation(uuid, actionTaken);
      
      set((state) => ({
        escalations: state.escalations.map((e) => (e.uuid === uuid ? escalation : e)),
        assignedToMe: state.assignedToMe.map((e) => (e.uuid === uuid ? escalation : e)),
        isLoading: false,
      }));
      
      await get().fetchStats();
      return escalation;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to act on escalation";
      set({ error: errorMsg, isLoading: false });
      throw error;
    }
  },

  resolveEscalation: async (uuid) => {
    const previousEscalations = get().escalations;
    const previousAssigned = get().assignedToMe;
    const nowIso = new Date().toISOString();

    set({
      isLoading: true,
      error: null,
      escalations: previousEscalations.map((e) =>
        e.uuid === uuid
          ? { ...e, status: "resolved", resolved_at: nowIso, updated_at: nowIso }
          : e
      ),
      assignedToMe: previousAssigned.filter((e) => e.uuid !== uuid),
    });

    try {
      const escalation = await escalationService.resolveEscalation(uuid);
      
      set((state) => ({
        escalations: state.escalations.map((e) => (e.uuid === uuid ? escalation : e)),
        assignedToMe: state.assignedToMe.filter((e) => e.uuid !== uuid),
        isLoading: false,
      }));
      
      await get().fetchStats();
      return escalation;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to resolve escalation";
      set({
        error: errorMsg,
        isLoading: false,
        escalations: previousEscalations,
        assignedToMe: previousAssigned,
      });
      throw error;
    }
  },

  markFalseAlarm: async (uuid) => {
    const previousEscalations = get().escalations;
    const previousAssigned = get().assignedToMe;
    const nowIso = new Date().toISOString();

    set({
      isLoading: true,
      error: null,
      escalations: previousEscalations.map((e) =>
        e.uuid === uuid
          ? {
              ...e,
              status: "false_alarm",
              is_false_alarm: true,
              resolved_at: nowIso,
              updated_at: nowIso,
            }
          : e
      ),
      assignedToMe: previousAssigned.filter((e) => e.uuid !== uuid),
    });

    try {
      const escalation = await escalationService.markFalseAlarm(uuid);
      
      set((state) => ({
        escalations: state.escalations.map((e) => (e.uuid === uuid ? escalation : e)),
        assignedToMe: state.assignedToMe.filter((e) => e.uuid !== uuid),
        isLoading: false,
      }));
      
      await get().fetchStats();
      return escalation;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to mark as false alarm";
      set({
        error: errorMsg,
        isLoading: false,
        escalations: previousEscalations,
        assignedToMe: previousAssigned,
      });
      throw error;
    }
  },

  markAsRead: () => {
    set({ unreadCount: 0 });
  },

  startPolling: () => {
    if (pollingInterval) return;

    pollingInterval = setInterval(() => {
      get().fetchAssignedToMe();
    }, 3000); // Poll every 3 seconds
  },

  stopPolling: () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  },
}));
