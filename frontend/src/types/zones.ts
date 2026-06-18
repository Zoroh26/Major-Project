import type { Camera } from '../services/api';
import type { User } from './auth';

export interface Zone {
  uuid: string;
  name: string;
  description: string | null;
  alert_threshold: number;
  created_at: string;
  updated_at: string | null;
}

export interface ZoneDetail extends Zone {
  cameras: Camera[];
  guards: User[];
}

export interface ZoneCreate {
  name: string;
  description?: string;
  alert_threshold?: number;
}

export interface ZoneUpdate {
  name?: string;
  description?: string;
  alert_threshold?: number;
}

export interface PaginatedZonesResponse {
  data: Zone[];
  total_count: number;
  has_more: boolean;
  page: number;
  items_per_page: number;
}
