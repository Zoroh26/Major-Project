export type User = {
  id?: string;
  uuid: string; // The backend returns uuid
  email: string;
  name?: string | null;
  role: 'admin' | 'employee' | 'security';
  rank?: string | null;
  token?: string; // made optional
  zone_id?: string | null;
};

export type AuthResponse = {
  access_token: string;
  token_type: string;
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export type RegisterData = {
  email: string;
  password: string;
  name?: string;
  role: 'employee' | 'admin' | 'security';
  rank?: string;
};