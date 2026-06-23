import { create } from 'zustand';
import { login as loginApi, signup as signupApi, getCurrentUser } from '../services/api';
import type { User, RegisterData } from '../types/auth';

const normalizeRole = (role: string | null | undefined): User['role'] => {
	const normalized = (role || '').toLowerCase();
	if (normalized === 'admin' || normalized === 'administrator' || normalized === 'user') return 'admin';
	if (normalized === 'security' || normalized === 'guard') return 'security';
	return 'employee';
};

type AuthState = {
	user: User | null;
	isLoggedIn: boolean;
	loading: boolean;
	error: string | null;
	login: (credentials: { email: string; password: string }) => Promise<void>;
	signup: (data: RegisterData) => Promise<void>;
	logout: () => void;
	checkSession: () => Promise<void>;
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
				uuid: userData.uuid || '',
				email: userData.email,
				name: userData.name || userData.email, 
				role: normalizeRole(userData.role),
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

	checkSession: async () => {
		set({ loading: true, error: null });
		try {
			let token = '';
			let sessionUser: Partial<User> | null = null;
			
			if (typeof window !== 'undefined') {
				token = localStorage.getItem('authToken') || '';
				const userRaw = localStorage.getItem('currentUser');
				if (userRaw) {
					sessionUser = JSON.parse(userRaw) as Partial<User>;
				}
			}
			if (!token) throw new Error('No valid session found');

			// Validate token on app boot to prevent showing protected pages with stale local data.
			const userRes = await getCurrentUser(token);
			const userData = userRes.data;

			const reqUserObj: User = {
				id: userData.uuid || sessionUser?.id || '',
				uuid: userData.uuid || sessionUser?.uuid || sessionUser?.id || '',
				email: userData.email || sessionUser?.email || '',
				name: userData.name || sessionUser?.name || userData.email || '',
				role: normalizeRole(userData.role || sessionUser?.role),
				rank: userData.rank || sessionUser?.rank || null,
				token,
				zone_id: userData.zone_id || sessionUser?.zone_id || null,
			};

			set({
				user: reqUserObj,
				isLoggedIn: true,
				loading: false,
			});

			if (typeof window !== 'undefined') {
				localStorage.setItem('currentUser', JSON.stringify(reqUserObj));
			}
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
