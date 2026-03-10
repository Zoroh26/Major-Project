
import axios, { AxiosError } from 'axios';
import type { AuthResponse } from '../types/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL ;

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
	return axios.post<AuthResponse>(`${API_BASE_URL}/v1/login`, credentials);
};

export const signup = async (data: { email: string; password: string }) => {
	return axios.post<AuthResponse>(`${API_BASE_URL}/v1/user`, data);
};

// Camera types
export interface Camera {
	uuid: string;
	name: string;
	location: string;
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
		`${API_BASE_URL}/v1/cameras?page=${page}&items_per_page=${itemsPerPage}`
	);
};

export const getCamera = async (uuid: string) => {
	return axios.get<Camera>(`${API_BASE_URL}/v1/camera/${uuid}`);
};

export const addCamera = async (data: {
	name: string;
	location: string;
	rtsp_url: string;
}) => {
	return axios.post<Camera>(`${API_BASE_URL}/v1/camera`, data);
};

export const updateCamera = async (
	uuid: string,
	data: Partial<{ name: string; location: string }>
) => {
	return axios.patch<Camera>(`${API_BASE_URL}/v1/camera/${uuid}`, data);
};

export const deleteCamera = async (uuid: string) => {
	return axios.delete(`${API_BASE_URL}/v1/camera/${uuid}`);
};
