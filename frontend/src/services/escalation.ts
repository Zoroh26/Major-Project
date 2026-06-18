/**
 * Escalation API Service
 * Handles all escalation-related API calls
 */

const BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1`;

const getAuthToken = () => {
  const localToken = localStorage.getItem('authToken');
  if (localToken) return localToken;

  const rawUser = localStorage.getItem('currentUser');
  if (!rawUser) return null;

  try {
    const parsed = JSON.parse(rawUser) as { token?: string };
    return parsed.token || null;
  } catch {
    return null;
  }
};

const getAuthHeader = (): HeadersInit => {
  const token = getAuthToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
};

export interface Escalation {
  uuid: string;
  zone_uuid: string;
  zone_name?: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "pending" | "assigned" | "in_progress" | "resolved" | "false_alarm" | "cancelled";
  assigned_to?: string;
  assigned_to_uuid: string | null;
  assigned_to_name?: string;
  created_by_uuid: string;
  action_taken: string | null;
  is_acted_upon: boolean;
  is_false_alarm: boolean;
  acted_at: string | null;
  camera_uuid: string | null;
  camera_name?: string;
  created_at: string;
  updated_at: string | null;
  resolved_at: string | null;
}

export interface EscalationCreate {
  zone_uuid: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  camera_uuid?: string;
}

export interface EscalationUpdate {
  title?: string;
  description?: string;
  priority?: "low" | "medium" | "high" | "critical";
  assigned_to_uuid?: string;
  status?: string;
}

export interface EscalationAction {
  action_taken: string;
}

export interface EscalationStats {
  total: number;
  pending: number;
  assigned: number;
  in_progress: number;
  resolved: number;
  false_alarms: number;
  critical: number;
}

class EscalationService {
  /**
   * Create a new escalation
   */
  async createEscalation(data: EscalationCreate): Promise<Escalation> {
    const response = await fetch(`${BASE_URL}/escalations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeader() },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to create escalation: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get list of escalations with optional filtering
   */
  async listEscalations(params?: {
    zone_uuid?: string;
    status_filter?: string;
    priority_filter?: string;
  }): Promise<Escalation[]> {
    const queryParams = new URLSearchParams();
    if (params?.zone_uuid) queryParams.append("zone_uuid", params.zone_uuid);
    if (params?.status_filter) queryParams.append("status_filter", params.status_filter);
    if (params?.priority_filter) queryParams.append("priority_filter", params.priority_filter);

    const url = queryParams.toString()
      ? `${BASE_URL}/escalations?${queryParams.toString()}`
      : `${BASE_URL}/escalations`;

    const response = await fetch(url, {
      headers: { ...getAuthHeader() },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch escalations: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get escalation details
   */
  async getEscalation(uuid: string): Promise<Escalation> {
    const response = await fetch(`${BASE_URL}/escalations/${uuid}`, {
      headers: { ...getAuthHeader() },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch escalation: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Update an escalation (admin only)
   */
  async updateEscalation(uuid: string, data: EscalationUpdate): Promise<Escalation> {
    const response = await fetch(`${BASE_URL}/escalations/${uuid}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...getAuthHeader() },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to update escalation: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Act on an escalation (mark as acted upon)
   */
  async actOnEscalation(uuid: string, actionTaken: string): Promise<Escalation> {
    const response = await fetch(`${BASE_URL}/escalations/${uuid}/act`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeader() },
      body: JSON.stringify({ action_taken: actionTaken }),
    });

    if (!response.ok) {
      throw new Error(`Failed to act on escalation: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Resolve an escalation
   */
  async resolveEscalation(uuid: string): Promise<Escalation> {
    const response = await fetch(`${BASE_URL}/escalations/${uuid}/resolve`, {
      method: "POST",
      headers: { ...getAuthHeader() },
    });

    if (!response.ok) {
      throw new Error(`Failed to resolve escalation: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Mark escalation as false alarm
   */
  async markFalseAlarm(uuid: string): Promise<Escalation> {
    const response = await fetch(`${BASE_URL}/escalations/${uuid}/false-alarm`, {
      method: "POST",
      headers: { ...getAuthHeader() },
    });

    if (!response.ok) {
      throw new Error(`Failed to mark as false alarm: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get escalation statistics
   */
  async getStats(): Promise<EscalationStats> {
    const response = await fetch(`${BASE_URL}/escalations/stats/summary`, {
      headers: { ...getAuthHeader() },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch stats: ${response.statusText}`);
    }

    return response.json();
  }
}

export const escalationService = new EscalationService();
