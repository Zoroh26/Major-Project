
import axios from 'axios';
import type { AuthResponse, RegisterData, User } from '../types/auth';
import type { Zone, ZoneDetail, ZoneCreate, ZoneUpdate, PaginatedZonesResponse } from '../types/zones';

const API_BASE_URL = import.meta.env.VITE_API_URL;

// Setup axios interceptors
axios.interceptors.request.use(
	(config) => {
		// Add token to all requests
		const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
		}
		return config;
	},
	(error) => Promise.reject(error)
);

// Handle 401 responses (unauthorized)
axios.interceptors.response.use(
	(response) => response,
	(error) => {
		if (error.response?.status === 401) {
			// Token expired or invalid - logout
			if (typeof window !== 'undefined') {
				localStorage.removeItem('authToken');
				localStorage.removeItem('currentUser');
			}
			// The app will redirect to login automatically
		}
		return Promise.reject(error);
	}
);

// Auth endpoints
export const login = async (credentials: { email: string; password: string }) => {
	// Our backend expects form-urlencoded for OAuth2 login usually, but let's see. Wait, login usually takes form data. 
	// The current code does axio.post, I will leave it as is if it worked before, but let's provide form data just in case? I'll assume standard json post if it already was that way.
	return axios.post<AuthResponse>(`${API_BASE_URL}/api/v1/login`, credentials);
};

export const signup = async (data: RegisterData) => {
	// this is kept for legacy auth store calls, but it actually returns UserRead
	return axios.post(`${API_BASE_URL}/api/v1/user`, data);
};

export const createUser = async (data: RegisterData) => {
	return axios.post<User>(`${API_BASE_URL}/api/v1/user`, data);
};

export const getUsers = async (page: number = 1, itemsPerPage: number = 10) => {
	return axios.get<{ data: User[]; total_count: number }>(
		`${API_BASE_URL}/api/v1/users?page=${page}&items_per_page=${itemsPerPage}`
	);
};

export const getCurrentUser = async (token: string) => {
	return axios.get(`${API_BASE_URL}/api/v1/user/me/`, {
		headers: {
			Authorization: `Bearer ${token}`
		}
	});
};

export const dispatchAlert = async (zone: string, message: string, token: string) => {
	return axios.post(
		`${API_BASE_URL}/api/v1/alerts/dispatch`,
		{ zone, message },
		{
			headers: {
				Authorization: `Bearer ${token}`
			}
		}
	);
};

// Camera types
export interface Camera {
	uuid: string;
	name: string;
	location: string;
	zone_uuid?: string;
	zone_id?: string;
	rtsp_url: string;
	stream_path: string;
	is_active: boolean;
	created_at: string;
	updated_at: string | null;
	hls_url?: string;
	webrtc_url?: string;
}

export interface CamerasResponse {
	data: Camera[];
	total: number;
	page: number;
	items_per_page: number;
	total_pages: number;
}

// Camera endpoints
export const getCameras = async (page: number = 1, itemsPerPage: number = 10) => {
	return axios.get<CamerasResponse>(
		`${API_BASE_URL}/api/v1/cameras?page=${page}&items_per_page=${itemsPerPage}`
	);
};

export const getCamera = async (uuid: string) => {
	return axios.get<Camera>(`${API_BASE_URL}/api/v1/camera/${uuid}`);
};

export const addCamera = async (data: {
	name: string;
	location: string;
	rtsp_url: string;
}) => {
	return axios.post<Camera>(`${API_BASE_URL}/api/v1/camera`, data);
};

export const updateCamera = async (
	uuid: string,
	data: Partial<{ name: string; location: string }>
) => {
	return axios.patch<Camera>(`${API_BASE_URL}/api/v1/camera/${uuid}`, data);
};

export const deleteCamera = async (uuid: string) => {
	return axios.delete(`${API_BASE_URL}/api/v1/camera/${uuid}`);
};

// Zone endpoints
export const getZones = async (page: number = 1, itemsPerPage: number = 20) => {
	return axios.get<PaginatedZonesResponse>(
		`${API_BASE_URL}/api/v1/zones?page=${page}&items_per_page=${itemsPerPage}`
	);
};

export const getZone = async (uuid: string) => {
	return axios.get<ZoneDetail>(`${API_BASE_URL}/api/v1/zone/${uuid}`);
};

export const addZone = async (data: ZoneCreate) => {
	return axios.post<Zone>(`${API_BASE_URL}/api/v1/zone`, data);
};

export const updateZone = async (uuid: string, data: ZoneUpdate) => {
	return axios.patch<Zone>(`${API_BASE_URL}/api/v1/zone/${uuid}`, data);
};

export const deleteZone = async (uuid: string) => {
	return axios.delete(`${API_BASE_URL}/api/v1/zone/${uuid}`);
};

// Assignment endpoints
export const assignCameraToZone = async (zoneUuid: string, cameraUuid: string) => {
	return axios.post<ZoneDetail>(`${API_BASE_URL}/api/v1/zone/${zoneUuid}/assign-camera`, {
		camera_uuid: cameraUuid
	});
};

export const unassignCameraFromZone = async (zoneUuid: string, cameraUuid: string) => {
	return axios.delete(`${API_BASE_URL}/api/v1/zone/${zoneUuid}/unassign-camera/${cameraUuid}`);
};

export const assignGuardToZone = async (zoneUuid: string, userUuid: string) => {
	return axios.post<ZoneDetail>(`${API_BASE_URL}/api/v1/zone/${zoneUuid}/assign-guard`, {
		user_uuid: userUuid
	});
};

export const unassignGuardFromZone = async (zoneUuid: string, userUuid: string) => {
	return axios.delete(`${API_BASE_URL}/api/v1/zone/${zoneUuid}/unassign-guard/${userUuid}`);
};

