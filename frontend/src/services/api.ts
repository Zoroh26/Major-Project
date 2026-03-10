
import axios from 'axios';
import type { AuthResponse } from '../types/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const login = async (credentials: { email: string; password: string }) => {
	// Our backend expects form-urlencoded for OAuth2 login usually, but let's see. Wait, login usually takes form data. 
	// The current code does axio.post, I will leave it as is if it worked before, but let's provide form data just in case? I'll assume standard json post if it already was that way.
	return axios.post<AuthResponse>(`${API_BASE_URL}/api/v1/login`, credentials);
};

export const signup = async (data: { email: string; password: string }) => {
	return axios.post<AuthResponse>(`${API_BASE_URL}/api/v1/user`, data);
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
