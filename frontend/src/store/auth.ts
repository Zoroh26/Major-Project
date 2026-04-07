import { create } from 'zustand';
import { login as loginApi, signup as signupApi, getCurrentUser } from '../services/api';
import type { User, RegisterData } from '../types/auth';

type AuthState = {
	user: User | null;
	isLoggedIn: boolean;
	loading: boolean;
	error: string | null;
	login: (credentials: { email: string; password: string }) => Promise<void>;
	signup: (data: RegisterData) => Promise<void>;
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
			
			// Fetch the full user details
			const userRes = await getCurrentUser(access_token);
			const userData = userRes.data;
			
			const userObj: User = { 
				id: userData.uuid || '',
				email: userData.email,
				name: userData.name || userData.email, 
				role: userData.role || 'employee',
				rank: userData.rank || null,
				token: access_token,
				zone_id: userData.zone_id || null
			};

			set({
				user: userObj,
				isLoggedIn: true,
				loading: false,
				error: null,
			});
			
			if (typeof window !== 'undefined') {
				localStorage.setItem('authToken', access_token);
				localStorage.setItem('currentUser', JSON.stringify(userObj));
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

	signup: async (data: RegisterData) => {
		set({ loading: true, error: null });
		try {
			await signupApi(data);
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
			if (!sessionUser || !token) throw new Error('No valid session found');
			
			const reqUserObj: User = {
				id: sessionUser.id,
				email: sessionUser.email,
				name: sessionUser.name,
				role: sessionUser.role,
				rank: sessionUser.rank,
				token,
				zone_id: sessionUser.zone_id
			};

			set({
				user: reqUserObj,
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
