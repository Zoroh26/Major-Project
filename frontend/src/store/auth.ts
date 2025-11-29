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
};

export const useAuthStore = create<AuthState>((set) => ({
	user: null,
	isLoggedIn: false,
	loading: false,
	error: null,

	login: async ({ email, password }) => {
		set({ loading: true, error: null });
		try {
			const response = await loginApi({ email, password });
			const { access_token } = response.data;
			if (!access_token) throw new Error('No access token in login response');
			// You may want to decode the token to get user info, or just store the token
			set({
				user: { id: '', name: email, role: 'employee', token: access_token },
				isLoggedIn: true,
				loading: false,
			});
			if (typeof window !== 'undefined') {
				sessionStorage.setItem('currentUser', JSON.stringify({ user: { id: '', name: email, role: 'employee', token: access_token }, token: access_token }));
			}
		} catch (error: any) {
			set({ error: error.response?.data?.message || error.message, loading: false });
			throw error;
		}
	},

	signup: async ({ email, password }) => {
		set({ loading: true, error: null });
		try {
			await signupApi({ email, password });
			set({ loading: false });
		} catch (error: any) {
			set({ error: error.response?.data?.message || error.message, loading: false });
			throw error;
		}
	},

	logout: () => {
		if (typeof window !== 'undefined') {
			sessionStorage.removeItem('currentUser');
		}
		set({ user: null, isLoggedIn: false, loading: false });
	},

	checkSession: () => {
		set({ loading: true, error: null });
		try {
			let token = '';
			let sessionUser = null;
			if (typeof window !== 'undefined') {
				const sessionRaw = sessionStorage.getItem('currentUser');
				if (sessionRaw) {
					const sessionData = JSON.parse(sessionRaw);
					token = sessionData.token;
					sessionUser = sessionData.user;
				}
			}
			if (!sessionUser || !token) throw new Error('No valid session found');
			set({
				user: {
					id: sessionUser.id,
					name: sessionUser.name,
					role: sessionUser.role,
					token,
				},
				isLoggedIn: true,
				loading: false,
			});
		} catch {
			set({ user: null, isLoggedIn: false, loading: false });
			if (typeof window !== 'undefined') {
				sessionStorage.removeItem('currentUser');
			}
		}
	},
}));
