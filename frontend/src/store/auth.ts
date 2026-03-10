import { create } from 'zustand';
import { login as loginApi, signup as signupApi } from '../services/api';
import type { User } from '../types/auth';

type AuthState = {
	user: User | null;
	isLoggedIn: boolean;
	loading: boolean;
	error: string | null;
	login: (credentials: { email: string; password: string }) => Promise<void>;
	signup: (data: { email: string; password: string }) => Promise<void>;
	logout: () => void;
	checkSession: () => void;
	setLoggedOut: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
	user: null,
	isLoggedIn: false,
	loading: true,  // true until checkSession() runs on app start
	error: null,

	login: async ({ email, password }) => {
		set({ loading: true, error: null });
		try {
			const response = await loginApi({ email, password });
			const { access_token } = response.data;
			if (!access_token) throw new Error('No access token in login response');
			
			const userData = { id: email, name: email, role: 'employee' as const, token: access_token };
			set({
				user: userData,
				isLoggedIn: true,
				loading: false,
				error: null,
			});
			
			if (typeof window !== 'undefined') {
				localStorage.setItem('authToken', access_token);
				localStorage.setItem('currentUser', JSON.stringify(userData));
			}
		} catch (error: any) {
			const errorMessage = 
				error?.response?.data?.detail ||
				error?.response?.data?.message ||
				error?.message ||
				'Login failed. Please try again.';
			set({ error: errorMessage, loading: false });
			throw error;
		}
	},

	signup: async ({ email, password }) => {
		set({ loading: true, error: null });
		try {
			await signupApi({ email, password });
			set({ loading: false, error: null });
		} catch (error: any) {
			const errorMessage = 
				error?.response?.data?.detail ||
				error?.response?.data?.message ||
				error?.message ||
				'Signup failed. Please try again.';
			set({ error: errorMessage, loading: false });
			throw error;
		}
	},

	logout: () => {
		if (typeof window !== 'undefined') {
			localStorage.removeItem('authToken');
			localStorage.removeItem('currentUser');
		}
		set({ user: null, isLoggedIn: false, loading: false });
	},

	setLoggedOut: () => {
		if (typeof window !== 'undefined') {
			localStorage.removeItem('authToken');
			localStorage.removeItem('currentUser');
		}
		set({ user: null, isLoggedIn: false, loading: false, error: 'Session expired. Please login again.' });
	},

	checkSession: () => {
		set({ loading: true, error: null });
		try {
			let token = '';
			let sessionUser = null;
			
			if (typeof window !== 'undefined') {
				token = localStorage.getItem('authToken') || '';
				const userRaw = localStorage.getItem('currentUser');
				if (userRaw) {
					sessionUser = JSON.parse(userRaw);
				}
			}
			
			if (!sessionUser || !token) {
				throw new Error('No valid session found');
			}
			
			set({
				user: sessionUser,
				isLoggedIn: true,
				loading: false,
			});
		} catch (error) {
			// Clear invalid session data
			if (typeof window !== 'undefined') {
				localStorage.removeItem('authToken');
				localStorage.removeItem('currentUser');
			}
			set({ user: null, isLoggedIn: false, loading: false });
		}
	},
}));
