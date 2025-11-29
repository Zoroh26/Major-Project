
import axios from 'axios';
import type { AuthResponse } from '../types/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL ;

export const login = async (credentials: { email: string; password: string }) => {
	return axios.post<AuthResponse>(`${API_BASE_URL}/v1/login`, credentials);
};

export const signup = async (data: { email: string; password: string }) => {
	return axios.post<AuthResponse>(`${API_BASE_URL}/v1/user`, data);
};
